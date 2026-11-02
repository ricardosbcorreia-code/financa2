import { store } from '../state';
import { formatCurrency, formatMonthYearBR, addMonthsIso } from '../formatters';

const ESSENTIAL_CATEGORY_IDS = new Set([
  'cat-moradia',
  'cat-alimentacao',
  'cat-transporte',
  'cat-saude',
  'cat-filhos',
  'cat-dividas',
  'cat-patrimonio',
  'cat-impostos'
]);

export function renderDashboard(container: HTMLElement): void {
  const selectedMonth = store.getSelectedMonth();
  const currentTxs = store.getTransactionsForMonth(selectedMonth);
  const categories = store.getCategories();
  const monthIncomes = store.getIncomesForMonth(selectedMonth);

  // Calcular mês anterior para comparativo
  const prevMonth = addMonthsIso(`${selectedMonth}-01`, -1).slice(0, 7);
  const prevTxs = store.getTransactionsForMonth(prevMonth);

  // Cálculos de Entradas / Receitas do Mês
  const ricardoIncomeCents = monthIncomes
    .filter((i) => i.receivedBy === 'ricardo')
    .reduce((acc, i) => acc + i.amountCents, 0);
  const nataliaIncomeCents = monthIncomes
    .filter((i) => i.receivedBy === 'natalia')
    .reduce((acc, i) => acc + i.amountCents, 0);
  const totalIncomeCents = ricardoIncomeCents + nataliaIncomeCents;

  // Cálculos de Totais de Despesas
  let totalCents = 0;
  let ricardoCents = 0;
  let nataliaCents = 0;
  let familiarCents = 0;
  let indRicardoCents = 0;
  let indNataliaCents = 0;

  // Regra 50-30-20 (Essenciais/Fixos vs Estilo de Vida/Variáveis)
  let essentialCents = 0;
  let lifestyleCents = 0;

  const categoryTotals: Record<string, { total: number; ricardo: number; natalia: number }> = {};

  for (const tx of currentTxs) {
    const val = tx.isRefund ? -tx.amountCents : tx.amountCents;
    totalCents += val;

    if (tx.paidBy === 'ricardo') ricardoCents += val;
    if (tx.paidBy === 'natalia') nataliaCents += val;

    if (tx.nature === 'familiar') familiarCents += val;
    if (tx.nature === 'individual_ricardo') indRicardoCents += val;
    if (tx.nature === 'individual_natalia') indNataliaCents += val;

    const catObj = categories.find((c) => c.id === tx.categoryId);
    const isEssential =
      Boolean(tx.fixedExpenseId) ||
      Boolean(catObj?.isEssential) ||
      ESSENTIAL_CATEGORY_IDS.has(tx.categoryId);

    if (isEssential) {
      essentialCents += val;
    } else {
      lifestyleCents += val;
    }

    if (!categoryTotals[tx.categoryId]) {
      categoryTotals[tx.categoryId] = { total: 0, ricardo: 0, natalia: 0 };
    }
    categoryTotals[tx.categoryId].total += val;
    if (tx.paidBy === 'ricardo') categoryTotals[tx.categoryId].ricardo += val;
    if (tx.paidBy === 'natalia') categoryTotals[tx.categoryId].natalia += val;
  }

  // Total do mês anterior
  let prevTotalCents = 0;
  for (const tx of prevTxs) {
    prevTotalCents += tx.isRefund ? -tx.amountCents : tx.amountCents;
  }

  // Cálculo de variação percentual
  let comparisonHtml = '';
  if (prevTotalCents > 0) {
    const diff = totalCents - prevTotalCents;
    const pct = Math.round((diff / prevTotalCents) * 100);
    const isUp = diff > 0;
    const sign = isUp ? '+' : '';
    const badgeClass = isUp ? 'up' : 'down';
    const icon = isUp ? '▲' : '▼';
    comparisonHtml = `
      <div class="kpi-comparison ${badgeClass}">
        <span>${icon} ${sign}${pct}%</span>
        <span>vs. mês anterior</span>
      </div>
    `;
  } else {
    comparisonHtml = `
      <div class="kpi-comparison neutral">
        <span>Sem histórico anterior</span>
      </div>
    `;
  }

  // Percentuais de Ricardo e Natália nos Gastos
  const ricardoPct = totalCents > 0 ? Math.round((ricardoCents / totalCents) * 100) : 50;
  const nataliaPct = totalCents > 0 ? 100 - ricardoPct : 50;

  // Cálculos da Divisão da Renda (50-30-20 Adaptado)
  const freeBalanceCents = totalIncomeCents - totalCents;
  const essentialPctIncome = totalIncomeCents > 0 ? Math.round((essentialCents / totalIncomeCents) * 100) : 0;
  const lifestylePctIncome = totalIncomeCents > 0 ? Math.round((lifestyleCents / totalIncomeCents) * 100) : 0;
  const freePctIncome =
    totalIncomeCents > 0 ? Math.max(0, 100 - essentialPctIncome - lifestylePctIncome) : 0;

  const ricardoEffortPct =
    ricardoIncomeCents > 0 ? Math.round((ricardoCents / ricardoIncomeCents) * 100) : null;
  const nataliaEffortPct =
    nataliaIncomeCents > 0 ? Math.round((nataliaCents / nataliaIncomeCents) * 100) : null;

  // Categorias ordenadas por maior valor + Mapa "Quem banca o quê?"
  const sortedCategories = Object.entries(categoryTotals)
    .filter(([_, data]) => data.total > 0)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([catId, data]) => {
      const cat = categories.find((c) => c.id === catId);
      const pct = totalCents > 0 ? Math.round((data.total / totalCents) * 100) : 0;
      const ricCatPct = data.total > 0 ? Math.round((data.ricardo / data.total) * 100) : 0;
      const natCatPct = data.total > 0 ? 100 - ricCatPct : 0;
      return {
        name: cat?.name || 'Outros',
        icon: cat?.icon || '📦',
        color: cat?.color || '#94a3b8',
        cents: data.total,
        ricardoCents: data.ricardo,
        nataliaCents: data.natalia,
        ricCatPct,
        natCatPct,
        pct
      };
    });

  // Top 5 maiores despesas
  const topExpenses = [...currentTxs]
    .filter((t) => !t.isRefund)
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 5);

  container.innerHTML = `
    <!-- Seletor de Mês -->
    <div class="month-selector">
      <button class="month-btn" id="prev-month-btn" aria-label="Mês anterior">◀</button>
      <span class="month-title">${formatMonthYearBR(selectedMonth)}</span>
      <button class="month-btn" id="next-month-btn" aria-label="Próximo mês">▶</button>
    </div>

    <!-- KPI Principal: Total do Mês -->
    <div class="kpi-main-card">
      <div class="kpi-label">Despesas Totais do Mês</div>
      <div class="kpi-amount-large">${formatCurrency(totalCents)}</div>
      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
        ${comparisonHtml}
        ${
          totalIncomeCents > 0
            ? `<div class="kpi-comparison neutral" style="background: hsla(217, 91%, 60%, 0.16); color: var(--primary);">
                <span>📊 ${Math.round((totalCents / totalIncomeCents) * 100)}% da renda de ${formatCurrency(totalIncomeCents)}</span>
              </div>`
            : ''
        }
      </div>
    </div>

    <!-- Card Quem Pagou -->
    <div class="split-card">
      <div class="card-title">
        <span>Quem Pagou</span>
        <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal;">Divisão do Mês</span>
      </div>

      <div class="split-stats">
        <div class="split-user ricardo">
          <div class="split-user-name">Ricardo</div>
          <div class="split-user-val">${formatCurrency(ricardoCents)}</div>
          <div class="split-user-pct">
            ${ricardoPct}% dos gastos
            ${ricardoEffortPct !== null ? ` • <strong>${ricardoEffortPct}% da sua renda</strong>` : ''}
          </div>
        </div>
        <div class="split-user natalia">
          <div class="split-user-name">Natália</div>
          <div class="split-user-val">${formatCurrency(nataliaCents)}</div>
          <div class="split-user-pct">
            ${nataliaPct}% dos gastos
            ${nataliaEffortPct !== null ? ` • <strong>${nataliaEffortPct}% da sua renda</strong>` : ''}
          </div>
        </div>
      </div>

      <!-- Barra de Proporção -->
      <div class="proportion-bar" title="Ricardo: ${ricardoPct}% | Natália: ${nataliaPct}%">
        <div class="prop-ricardo" style="width: ${ricardoPct}%"></div>
        <div class="prop-natalia" style="width: ${nataliaPct}%"></div>
      </div>

      <!-- Natureza dos Gastos -->
      <div class="nature-stats">
        <div class="nature-badge" title="Gastos da casa e família">
          <span class="nature-dot"></span>
          <span>Familiar: <strong>${formatCurrency(familiarCents)}</strong></span>
        </div>
        <div class="nature-badge" title="Gastos individuais">
          <span class="nature-dot" style="background: var(--text-muted);"></span>
          <span>Individuais: <strong>${formatCurrency(indRicardoCents + indNataliaCents)}</strong></span>
        </div>
      </div>
    </div>

    <!-- ANÁLISE 1: Divisão da Renda por Natureza (50-30-20 Adaptado) -->
    <div class="split-card">
      <div class="card-title">
        <span>⚖️ Divisão da Renda (50-30-20)</span>
        <button id="goto-incomes-btn" style="background: none; border: none; color: var(--primary); font-size: 0.72rem; font-weight: 600; cursor: pointer;">
          ${totalIncomeCents > 0 ? '✏️ Editar Entradas' : '+ Cadastrar Entradas'}
        </button>
      </div>

      ${
        totalIncomeCents === 0
          ? `
        <div style="text-align: center; padding: 12px; background: var(--bg-input); border-radius: var(--radius-sm); font-size: 0.8rem; color: var(--text-muted);">
          Cadastre os salários e entradas de <strong>${formatMonthYearBR(selectedMonth)}</strong> em Ajustes para visualizar a distribuição 50-30-20 e o saldo livre.
        </div>
      `
          : `
        <!-- Barra Tripla 50-30-20 -->
        <div class="proportion-bar" style="height: 10px; margin-bottom: 12px;">
          <div style="width: ${Math.min(100, essentialPctIncome)}%; background: #3b82f6; height: 100%;" title="Essenciais/Fixos: ${essentialPctIncome}%"></div>
          <div style="width: ${Math.min(100, lifestylePctIncome)}%; background: #f59e0b; height: 100%;" title="Estilo de Vida: ${lifestylePctIncome}%"></div>
          <div style="width: ${Math.max(0, freePctIncome)}%; background: var(--success); height: 100%;" title="Saldo Livre: ${freePctIncome}%"></div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center;">
          <div style="background: var(--bg-input); padding: 8px 6px; border-radius: var(--radius-sm); border-top: 3px solid #3b82f6;">
            <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 600;">🏠 Essenciais (Meta 50%)</div>
            <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin: 2px 0;">${formatCurrency(essentialCents)}</div>
            <div style="font-size: 0.72rem; color: #3b82f6; font-weight: 700;">${essentialPctIncome}% da renda</div>
          </div>

          <div style="background: var(--bg-input); padding: 8px 6px; border-radius: var(--radius-sm); border-top: 3px solid #f59e0b;">
            <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 600;">🍕 Estilo Vida (Meta 30%)</div>
            <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin: 2px 0;">${formatCurrency(lifestyleCents)}</div>
            <div style="font-size: 0.72rem; color: #f59e0b; font-weight: 700;">${lifestylePctIncome}% da renda</div>
          </div>

          <div style="background: var(--bg-input); padding: 8px 6px; border-radius: var(--radius-sm); border-top: 3px solid ${freeBalanceCents >= 0 ? 'var(--success)' : 'var(--danger)'};">
            <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 600;">💰 Saldo Livre (Meta 20%)</div>
            <div style="font-size: 0.88rem; font-weight: 700; color: ${freeBalanceCents >= 0 ? 'var(--success)' : 'var(--danger)'}; margin: 2px 0;">${formatCurrency(freeBalanceCents)}</div>
            <div style="font-size: 0.72rem; color: ${freeBalanceCents >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 700;">
              ${freeBalanceCents >= 0 ? `${freePctIncome}% poupado` : 'Orçamento excedido'}
            </div>
          </div>
        </div>
      `
      }
    </div>

    <!-- ANÁLISE 2: Mapa "Quem banca o quê?" (Perfil de Gastos por Categoria) -->
    <div class="split-card">
      <div class="card-title">
        <span>🗺️ Mapa "Quem banca o quê?"</span>
        <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: normal;">Por Categoria</span>
      </div>
      <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 12px;">
        Participação de <strong style="color: var(--accent-ricardo);">Ricardo</strong> vs. <strong style="color: var(--accent-natalia);">Natália</strong> em cada categoria do mês.
      </p>
      ${
        sortedCategories.length === 0
          ? `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 12px 0;">Nenhuma despesa registrada neste mês.</div>`
          : sortedCategories
              .map(
                (cat) => `
          <div class="category-item" style="margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border-subtle);">
            <div class="category-header">
              <span class="category-name">${cat.icon} ${cat.name}</span>
              <span class="category-amount">${formatCurrency(cat.cents)} <span style="font-weight: 500; color: var(--text-muted);">(${cat.pct}% do mês)</span></span>
            </div>

            <!-- Barra Bicolor Ricardo vs Natália na Categoria -->
            <div class="proportion-bar" style="height: 7px; margin: 6px 0;" title="Ricardo: ${cat.ricCatPct}% | Natália: ${cat.natCatPct}%">
              <div class="prop-ricardo" style="width: ${cat.ricCatPct}%"></div>
              <div class="prop-natalia" style="width: ${cat.natCatPct}%"></div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted);">
              <span><strong style="color: var(--accent-ricardo);">Ricardo:</strong> ${formatCurrency(cat.ricardoCents)} (${cat.ricCatPct}%)</span>
              <span><strong style="color: var(--accent-natalia);">Natália:</strong> ${formatCurrency(cat.nataliaCents)} (${cat.natCatPct}%)</span>
            </div>
          </div>
        `
              )
              .join('')
      }
    </div>

    <!-- Maiores Gastos -->
    <div class="split-card">
      <div class="card-title">Maiores Despesas</div>
      ${
        topExpenses.length === 0
          ? `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 12px 0;">Nenhum lançamento no período.</div>`
          : topExpenses
              .map((tx) => {
                const cat = categories.find((c) => c.id === tx.categoryId);
                return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-subtle);">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span>${cat?.icon || '📦'}</span>
                <div>
                  <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-main);">${tx.description}</div>
                  <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: capitalize;">${tx.paidBy} • ${tx.nature.replace('individual_', 'Ind. ')}</div>
                </div>
              </div>
              <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-main);">${formatCurrency(tx.amountCents)}</div>
            </div>
          `;
              })
              .join('')
      }
    </div>
  `;

  // Listeners dos botões de navegação de mês
  container.querySelector('#prev-month-btn')?.addEventListener('click', () => store.prevMonth());
  container.querySelector('#next-month-btn')?.addEventListener('click', () => store.nextMonth());
  container.querySelector('#goto-incomes-btn')?.addEventListener('click', () => store.setActiveTab('settings'));
}
