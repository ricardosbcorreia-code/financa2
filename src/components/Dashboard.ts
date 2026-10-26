import { store } from '../state';
import { formatCurrency, formatMonthYearBR, addMonthsIso } from '../formatters';

export function renderDashboard(container: HTMLElement): void {
  const selectedMonth = store.getSelectedMonth();
  const currentTxs = store.getTransactionsForMonth(selectedMonth);
  const categories = store.getCategories();

  // Calcular mês anterior para comparativo
  const prevMonth = addMonthsIso(`${selectedMonth}-01`, -1).slice(0, 7);
  const prevTxs = store.getTransactionsForMonth(prevMonth);

  // Cálculos de Totais
  let totalCents = 0;
  let ricardoCents = 0;
  let nataliaCents = 0;
  let familiarCents = 0;
  let indRicardoCents = 0;
  let indNataliaCents = 0;

  const categoryTotals: Record<string, number> = {};

  for (const tx of currentTxs) {
    const val = tx.isRefund ? -tx.amountCents : tx.amountCents;
    totalCents += val;

    if (tx.paidBy === 'ricardo') ricardoCents += val;
    if (tx.paidBy === 'natalia') nataliaCents += val;

    if (tx.nature === 'familiar') familiarCents += val;
    if (tx.nature === 'individual_ricardo') indRicardoCents += val;
    if (tx.nature === 'individual_natalia') indNataliaCents += val;

    categoryTotals[tx.categoryId] = (categoryTotals[tx.categoryId] || 0) + val;
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

  // Percentuais de Ricardo e Natália
  const ricardoPct = totalCents > 0 ? Math.round((ricardoCents / totalCents) * 100) : 50;
  const nataliaPct = totalCents > 0 ? 100 - ricardoPct : 50;

  // Categorias ordenadas por maior valor
  const sortedCategories = Object.entries(categoryTotals)
    .filter(([_, cents]) => cents > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([catId, cents]) => {
      const cat = categories.find((c) => c.id === catId);
      const pct = totalCents > 0 ? Math.round((cents / totalCents) * 100) : 0;
      return {
        name: cat?.name || 'Outros',
        icon: cat?.icon || '📦',
        color: cat?.color || '#94a3b8',
        cents,
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
      ${comparisonHtml}
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
          <div class="split-user-pct">${ricardoPct}% do total</div>
        </div>
        <div class="split-user natalia">
          <div class="split-user-name">Natália</div>
          <div class="split-user-val">${formatCurrency(nataliaCents)}</div>
          <div class="split-user-pct">${nataliaPct}% do total</div>
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

    <!-- Distribuição por Categoria -->
    <div class="split-card">
      <div class="card-title">Gastos por Categoria</div>
      ${
        sortedCategories.length === 0
          ? `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 12px 0;">Nenhuma despesa registrada neste mês.</div>`
          : sortedCategories
              .map(
                (cat) => `
          <div class="category-item">
            <div class="category-header">
              <span class="category-name">${cat.icon} ${cat.name}</span>
              <span class="category-amount">${formatCurrency(cat.cents)} (${cat.pct}%)</span>
            </div>
            <div class="category-bar-bg">
              <div class="category-bar-fill" style="width: ${cat.pct}%; background-color: ${cat.color};"></div>
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
}
