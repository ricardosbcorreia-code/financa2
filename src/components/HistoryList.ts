import { store } from '../state';
import { formatCurrency, formatDateBR, formatMonthYearBR, parseCurrencyInput } from '../formatters';
import { ExpenseNature, PaymentMethod, Transaction, UserProfile } from '../types';

export function renderHistoryList(container: HTMLElement, showToast: (msg: string) => void): void {
  const selectedMonth = store.getSelectedMonth();
  const allTxs = store.getTransactionsForMonth(selectedMonth);
  const categories = store.getCategories();
  const monthIncomes = store.getIncomesForMonth(selectedMonth);

  const totalMonthIncomeCents = monthIncomes.reduce((acc, inc) => acc + inc.amountCents, 0);
  const totalMonthExpenseCents = allTxs.reduce(
    (acc, t) => (t.isRefund ? acc - t.amountCents : acc + t.amountCents),
    0
  );

  let searchQuery = '';
  let activeFilter: 'todos' | 'familiar' | 'ricardo' | 'natalia' | 'top' = 'todos';
  let selectedCategoryFilter: string = 'all';

  function filterTransactions(): Transaction[] {
    const filtered = allTxs.filter((tx) => {
      // Filtro de texto
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = tx.description.toLowerCase().includes(q);
        const cat = categories.find((c) => c.id === tx.categoryId);
        const matchesCat = cat?.name.toLowerCase().includes(q);
        const matchesNotes = tx.notes?.toLowerCase().includes(q);
        if (!matchesDesc && !matchesCat && !matchesNotes) return false;
      }

      // Filtro de categoria
      if (selectedCategoryFilter !== 'all' && tx.categoryId !== selectedCategoryFilter) {
        return false;
      }

      // Filtro rápido
      if (activeFilter === 'familiar') return tx.nature === 'familiar';
      if (activeFilter === 'ricardo') return tx.paidBy === 'ricardo';
      if (activeFilter === 'natalia') return tx.paidBy === 'natalia';

      return true;
    });

    if (activeFilter === 'top') {
      return [...filtered].sort((a, b) => b.amountCents - a.amountCents);
    }

    // Ordenação padrão: data decrescente
    return [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  }

  function showEditTransactionModal(tx: Transaction): void {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.backgroundColor = 'rgba(0,0,0,0.85)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '250';
    modal.style.padding = '16px';
    modal.style.overflowY = 'auto';

    let editPaidBy: UserProfile = tx.paidBy;
    let editNature: ExpenseNature = tx.nature;
    let editCategoryId: string = tx.categoryId;
    let editPaymentMethod: PaymentMethod = tx.paymentMethod || 'credito';
    let editScope: 'single' | 'future' = 'single';

    const initialAmountStr = (tx.amountCents / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    modal.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 20px; width: 100%; max-width: 420px; max-height: 92vh; overflow-y: auto; box-shadow: var(--shadow-lg);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
          <div style="font-size: 1.1rem; font-weight: 700;">✏️ Editar Lançamento</div>
          <button type="button" id="close-edit-tx-btn" style="background: transparent; border: none; color: var(--text-muted); font-size: 1.2rem; cursor: pointer;">✕</button>
        </div>

        <div class="form-group">
          <label class="form-label">Valor (R$)</label>
          <div class="amount-input-wrapper">
            <span class="amount-prefix" style="font-size: 1.1rem;">R$</span>
            <input
              type="text"
              id="edit-tx-amount"
              class="amount-input"
              style="font-size: 1.35rem; padding: 10px 12px 10px 44px;"
              inputmode="decimal"
              value="${initialAmountStr}"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Descrição</label>
          <input
            type="text"
            id="edit-tx-desc"
            class="text-input"
            value="${tx.description.replace(/"/g, '&quot;')}"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Data da Ocorrência</label>
          <input type="date" id="edit-tx-date" class="text-input" value="${tx.date}" />
        </div>

        <div class="form-group">
          <label class="form-label">Quem Pagou</label>
          <div class="pill-group">
            <div class="pill-option ${editPaidBy === 'ricardo' ? 'active ricardo' : ''}" data-edit-payer="ricardo">
              Ricardo
            </div>
            <div class="pill-option ${editPaidBy === 'natalia' ? 'active natalia' : ''}" data-edit-payer="natalia">
              Natália
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Categoria</label>
          <select id="edit-tx-category" class="text-input">
            ${categories
              .map(
                (c) =>
                  `<option value="${c.id}" ${c.id === editCategoryId ? 'selected' : ''}>${c.icon} ${c.name}</option>`
              )
              .join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Natureza do Gasto</label>
          <div class="pill-group">
            <div class="pill-option ${editNature === 'familiar' ? 'active' : ''}" data-edit-nature="familiar">
              🏡 Familiar
            </div>
            <div class="pill-option ${editNature === 'individual_ricardo' ? 'active' : ''}" data-edit-nature="individual_ricardo">
              👤 Ind. Ricardo
            </div>
            <div class="pill-option ${editNature === 'individual_natalia' ? 'active' : ''}" data-edit-nature="individual_natalia">
              👤 Ind. Natália
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Forma de Pagamento</label>
          <div class="pill-group">
            <div class="pill-option ${editPaymentMethod === 'credito' ? 'active' : ''}" data-edit-method="credito">Crédito</div>
            <div class="pill-option ${editPaymentMethod === 'pix' ? 'active' : ''}" data-edit-method="pix">Pix</div>
            <div class="pill-option ${editPaymentMethod === 'debito' ? 'active' : ''}" data-edit-method="debito">Débito</div>
            <div class="pill-option ${editPaymentMethod === 'dinheiro' ? 'active' : ''}" data-edit-method="dinheiro">Dinheiro</div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Observações</label>
          <input
            type="text"
            id="edit-tx-notes"
            class="text-input"
            placeholder="Observações opcionais..."
            value="${(tx.notes || '').replace(/"/g, '&quot;')}"
          />
        </div>

        ${
          tx.isInstallment && tx.installmentGroupId
            ? `
          <div class="form-group" style="background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px;">
            <label class="form-label" style="color: var(--primary); margin-bottom: 8px;">
              💳 Compra Parcelada (${tx.installmentNumber}/${tx.installmentTotal}) — Aplicar alteração em:
            </label>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.8rem;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="radio" name="edit-installment-scope" value="single" checked />
                <span>Somente esta parcela (${tx.installmentNumber}/${tx.installmentTotal})</span>
              </label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="radio" name="edit-installment-scope" value="future" />
                <span>Esta e todas as próximas parcelas (${tx.installmentNumber} até ${tx.installmentTotal})</span>
              </label>
            </div>
          </div>
        `
            : ''
        }

        <div style="display: flex; gap: 10px; margin-top: 18px;">
          <button type="button" id="cancel-edit-tx-btn" class="settings-btn" style="flex: 1; justify-content: center; margin: 0;">
            Cancelar
          </button>
          <button type="button" id="save-edit-tx-btn" class="submit-btn" style="flex: 1; padding: 12px;">
            💾 Salvar Alterações
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const amountEl = modal.querySelector('#edit-tx-amount') as HTMLInputElement;
    amountEl?.addEventListener('input', () => {
      const val = amountEl.value.replace(/\D/g, '');
      if (!val) {
        amountEl.value = '';
        return;
      }
      const cents = parseInt(val, 10);
      amountEl.value = (cents / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    });

    modal.querySelectorAll('[data-edit-payer]').forEach((el) => {
      el.addEventListener('click', () => {
        const p = el.getAttribute('data-edit-payer') as UserProfile;
        if (p) {
          editPaidBy = p;
          modal.querySelectorAll('[data-edit-payer]').forEach((item) => {
            const val = item.getAttribute('data-edit-payer');
            item.className = `pill-option ${val === editPaidBy ? `active ${val}` : ''}`;
          });
        }
      });
    });

    modal.querySelectorAll('[data-edit-nature]').forEach((el) => {
      el.addEventListener('click', () => {
        const n = el.getAttribute('data-edit-nature') as ExpenseNature;
        if (n) {
          editNature = n;
          modal.querySelectorAll('[data-edit-nature]').forEach((item) => {
            item.classList.toggle('active', item.getAttribute('data-edit-nature') === editNature);
          });
        }
      });
    });

    modal.querySelectorAll('[data-edit-method]').forEach((el) => {
      el.addEventListener('click', () => {
        const m = el.getAttribute('data-edit-method') as PaymentMethod;
        if (m) {
          editPaymentMethod = m;
          modal.querySelectorAll('[data-edit-method]').forEach((item) => {
            item.classList.toggle('active', item.getAttribute('data-edit-method') === editPaymentMethod);
          });
        }
      });
    });

    modal.querySelectorAll('input[name="edit-installment-scope"]').forEach((radio) => {
      radio.addEventListener('change', (ev) => {
        editScope = (ev.target as HTMLInputElement).value as 'single' | 'future';
      });
    });

    const closeModal = () => modal.remove();
    modal.querySelector('#close-edit-tx-btn')?.addEventListener('click', closeModal);
    modal.querySelector('#cancel-edit-tx-btn')?.addEventListener('click', closeModal);

    modal.querySelector('#save-edit-tx-btn')?.addEventListener('click', async () => {
      const newCents = parseCurrencyInput(amountEl.value);
      const newDesc = (modal.querySelector('#edit-tx-desc') as HTMLInputElement).value.trim();
      const newDate = (modal.querySelector('#edit-tx-date') as HTMLInputElement).value || tx.date;
      const newCatId = (modal.querySelector('#edit-tx-category') as HTMLSelectElement).value;
      const newNotes = (modal.querySelector('#edit-tx-notes') as HTMLInputElement).value.trim() || undefined;

      if (newCents <= 0) {
        showToast('⚠️ Informe um valor válido maior que zero.');
        amountEl.focus();
        return;
      }
      if (!newDesc) {
        showToast('⚠️ Informe uma descrição válida.');
        return;
      }

      await store.updateTransaction(
        {
          ...tx,
          amountCents: newCents,
          description: newDesc,
          date: newDate,
          paidBy: editPaidBy,
          categoryId: newCatId,
          nature: editNature,
          paymentMethod: editPaymentMethod,
          notes: newNotes
        },
        editScope
      );

      modal.remove();
      showToast('✅ Lançamento atualizado e recalculado em todo o app!');
    });
  }

  function updateView(): void {
    const filteredTxs = filterTransactions();

    // Cálculos do Raio-X Dinâmico do Filtro Atual (Obs 3)
    let filteredTotalCents = 0;
    let filteredRicardoCents = 0;
    let filteredNataliaCents = 0;

    for (const tx of filteredTxs) {
      const val = tx.isRefund ? -tx.amountCents : tx.amountCents;
      filteredTotalCents += val;
      if (tx.paidBy === 'ricardo') filteredRicardoCents += val;
      if (tx.paidBy === 'natalia') filteredNataliaCents += val;
    }

    const pctOfIncome =
      totalMonthIncomeCents > 0 ? ((filteredTotalCents / totalMonthIncomeCents) * 100).toFixed(1) : null;
    const pctOfMonthExpenses =
      totalMonthExpenseCents > 0 ? Math.round((filteredTotalCents / totalMonthExpenseCents) * 100) : 0;
    const avgTicketCents = filteredTxs.length > 0 ? Math.round(filteredTotalCents / filteredTxs.length) : 0;

    const filterRicPct = filteredTotalCents > 0 ? Math.round((filteredRicardoCents / filteredTotalCents) * 100) : 50;
    const filterNatPct = filteredTotalCents > 0 ? 100 - filterRicPct : 50;

    container.innerHTML = `
      <!-- Seletor de Mês -->
      <div class="month-selector">
        <button class="month-btn" id="prev-month-btn">◀</button>
        <span class="month-title">${formatMonthYearBR(selectedMonth)}</span>
        <button class="month-btn" id="next-month-btn">▶</button>
      </div>

      <!-- Barra de Busca + Filtro de Categoria -->
      <div class="search-bar" style="display: flex; gap: 8px;">
        <input
          type="text"
          id="history-search-input"
          class="text-input"
          style="flex: 1;"
          placeholder="🔍 Buscar descrição ou categoria..."
          value="${searchQuery}"
        />
        <select id="history-cat-filter" class="text-input" style="width: auto; max-width: 150px; padding: 8px 10px; font-size: 0.8rem;">
          <option value="all" ${selectedCategoryFilter === 'all' ? 'selected' : ''}>📂 Todas Cat.</option>
          ${categories
            .map(
              (c) =>
                `<option value="${c.id}" ${selectedCategoryFilter === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`
            )
            .join('')}
        </select>
      </div>

      <!-- Filtros Rápidos + Ranking Top Gastos -->
      <div class="filter-chips">
        <button class="filter-chip ${activeFilter === 'todos' ? 'active' : ''}" data-filter="todos">Todos (${allTxs.length})</button>
        <button class="filter-chip ${activeFilter === 'top' ? 'active' : ''}" data-filter="top">🔥 Top Gastos</button>
        <button class="filter-chip ${activeFilter === 'familiar' ? 'active' : ''}" data-filter="familiar">🏡 Familiares</button>
        <button class="filter-chip ${activeFilter === 'ricardo' ? 'active' : ''}" data-filter="ricardo">👤 Ricardo</button>
        <button class="filter-chip ${activeFilter === 'natalia' ? 'active' : ''}" data-filter="natalia">👤 Natália</button>
      </div>

      <!-- Card Raio-X Dinâmico do Filtro Atual (Obs 3) -->
      <div class="split-card" style="padding: 12px 14px; margin-bottom: 14px; background: linear-gradient(135deg, hsla(222, 44%, 18%, 0.95), hsla(222, 44%, 15%, 0.95)); border-color: var(--glass-border);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div>
            <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">
              🔎 Raio-X do Filtro (${filteredTxs.length} ${filteredTxs.length === 1 ? 'item' : 'itens'})
            </div>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">
              ${formatCurrency(filteredTotalCents)}
            </div>
          </div>
          <div style="text-align: right; font-size: 0.75rem;">
            ${
              pctOfIncome !== null
                ? `<div style="color: var(--primary); font-weight: 700;">${pctOfIncome}% da renda do mês</div>`
                : `<div style="color: var(--text-muted);">${pctOfMonthExpenses}% dos gastos do mês</div>`
            }
            <div style="color: var(--text-muted);">Média: <strong>${formatCurrency(avgTicketCents)}</strong>/item</div>
          </div>
        </div>

        <div class="proportion-bar" style="height: 6px; margin-bottom: 6px;">
          <div class="prop-ricardo" style="width: ${filterRicPct}%"></div>
          <div class="prop-natalia" style="width: ${filterNatPct}%"></div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted);">
          <span><strong style="color: var(--accent-ricardo);">Ricardo:</strong> ${formatCurrency(filteredRicardoCents)} (${filterRicPct}%)</span>
          <span><strong style="color: var(--accent-natalia);">Natália:</strong> ${formatCurrency(filteredNataliaCents)} (${filterNatPct}%)</span>
        </div>
      </div>

      <!-- Lista de Transações -->
      <div class="transactions-container">
        ${
          filteredTxs.length === 0
            ? `
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <div class="empty-title">Nenhuma despesa encontrada</div>
            <p style="font-size: 0.8rem;">Tente ajustar o termo de busca ou adicione um novo lançamento.</p>
          </div>
        `
            : filteredTxs
                .map((tx, idx) => {
                  const cat = categories.find((c) => c.id === tx.categoryId);
                  const txIncomeImpact =
                    totalMonthIncomeCents > 0 ? ((tx.amountCents / totalMonthIncomeCents) * 100).toFixed(1) : null;

                  return `
            <div class="transaction-card" data-tx-id="${tx.id}">
              <div class="tx-main">
                <div class="tx-icon-box" style="background-color: ${cat?.color ? cat.color + '22' : 'var(--bg-input)'}; color: ${cat?.color || 'var(--text-main)'};">
                  ${activeFilter === 'top' ? `<span style="font-size: 0.85rem; font-weight: 800;">#${idx + 1}</span>` : cat?.icon || '📦'}
                </div>
                <div class="tx-info">
                  <div class="tx-title">${tx.description}</div>
                  <div class="tx-meta" style="flex-wrap: wrap;">
                    <span>${formatDateBR(tx.date)}</span>
                    <span>•</span>
                    <span class="tx-badge ${tx.paidBy}">${tx.paidBy === 'ricardo' ? 'Ricardo' : 'Natália'}</span>
                    <span>•</span>
                    <span style="font-size: 0.7rem;">${cat?.name || 'Geral'}</span>
                    ${tx.isInstallment ? `<span style="color: var(--primary); font-weight: 700;">(${tx.installmentNumber}/${tx.installmentTotal})</span>` : ''}
                    ${tx.fixedExpenseId ? `<span style="color: var(--warning); font-size: 0.68rem;">📌 Fixo</span>` : ''}
                    ${
                      activeFilter === 'top' && txIncomeImpact !== null
                        ? `<span style="background: hsla(217, 91%, 60%, 0.15); color: var(--primary); padding: 1px 6px; border-radius: 99px; font-size: 0.65rem; font-weight: 700;">${txIncomeImpact}% da renda</span>`
                        : ''
                    }
                  </div>
                </div>
              </div>
              <div class="tx-right">
                <div class="tx-amount">${formatCurrency(tx.amountCents)}</div>
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 4px; margin-top: 2px;">
                  <button class="tx-edit-btn" data-edit-id="${tx.id}" title="Editar despesa">✏️</button>
                  <button class="tx-delete-btn" data-delete-id="${tx.id}" title="Excluir despesa">🗑️</button>
                </div>
              </div>
            </div>
          `;
                })
                .join('')
        }
      </div>
    `;

    bindEvents();
  }

  function bindEvents(): void {
    container.querySelector('#prev-month-btn')?.addEventListener('click', () => store.prevMonth());
    container.querySelector('#next-month-btn')?.addEventListener('click', () => store.nextMonth());

    const searchInput = container.querySelector('#history-search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      searchQuery = searchInput.value;
      updateView();
      const newSearch = container.querySelector('#history-search-input') as HTMLInputElement;
      if (newSearch) {
        newSearch.focus();
        newSearch.setSelectionRange(searchQuery.length, searchQuery.length);
      }
    });

    const catSelect = container.querySelector('#history-cat-filter') as HTMLSelectElement;
    catSelect?.addEventListener('change', () => {
      selectedCategoryFilter = catSelect.value;
      updateView();
    });

    container.querySelectorAll('[data-filter]').forEach((chip) => {
      chip.addEventListener('click', () => {
        activeFilter = chip.getAttribute('data-filter') as any;
        updateView();
      });
    });

    // Edição de despesa (Obs 2)
    container.querySelectorAll('[data-edit-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-edit-id');
        if (!id) return;
        const tx = allTxs.find((t) => t.id === id);
        if (tx) {
          showEditTransactionModal(tx);
        }
      });
    });

    // Exclusão com confirmação
    container.querySelectorAll('[data-delete-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-delete-id');
        if (!id) return;

        const tx = allTxs.find((t) => t.id === id);
        const confirmMsg = `Deseja realmente excluir a despesa "${tx?.description || 'selecionada'}"?`;

        if (window.confirm(confirmMsg)) {
          store.deleteTransaction(id);
          showToast('🗑️ Despesa excluída com sucesso.');
        }
      });
    });
  }

  updateView();
}
