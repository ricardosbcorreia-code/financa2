import { store } from '../state';
import { formatCurrency, formatDateBR, formatMonthYearBR } from '../formatters';

export function renderHistoryList(container: HTMLElement, showToast: (msg: string) => void): void {
  const selectedMonth = store.getSelectedMonth();
  const allTxs = store.getTransactionsForMonth(selectedMonth);
  const categories = store.getCategories();

  let searchQuery = '';
  let activeFilter: 'todos' | 'familiar' | 'ricardo' | 'natalia' = 'todos';

  function filterTransactions() {
    return allTxs.filter((tx) => {
      // Filtro de texto
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = tx.description.toLowerCase().includes(q);
        const cat = categories.find((c) => c.id === tx.categoryId);
        const matchesCat = cat?.name.toLowerCase().includes(q);
        if (!matchesDesc && !matchesCat) return false;
      }

      // Filtro rápido
      if (activeFilter === 'familiar') return tx.nature === 'familiar';
      if (activeFilter === 'ricardo') return tx.paidBy === 'ricardo';
      if (activeFilter === 'natalia') return tx.paidBy === 'natalia';

      return true;
    });
  }

  function updateView(): void {
    const filteredTxs = filterTransactions();

    container.innerHTML = `
      <!-- Seletor de Mês -->
      <div class="month-selector">
        <button class="month-btn" id="prev-month-btn">◀</button>
        <span class="month-title">${formatMonthYearBR(selectedMonth)}</span>
        <button class="month-btn" id="next-month-btn">▶</button>
      </div>

      <!-- Barra de Busca -->
      <div class="search-bar">
        <input
          type="text"
          id="history-search-input"
          class="text-input"
          placeholder="🔍 Buscar por descrição ou categoria..."
          value="${searchQuery}"
        />
      </div>

      <!-- Filtros Rápidos -->
      <div class="filter-chips">
        <button class="filter-chip ${activeFilter === 'todos' ? 'active' : ''}" data-filter="todos">Todos (${allTxs.length})</button>
        <button class="filter-chip ${activeFilter === 'familiar' ? 'active' : ''}" data-filter="familiar">🏡 Familiares</button>
        <button class="filter-chip ${activeFilter === 'ricardo' ? 'active' : ''}" data-filter="ricardo">👤 Ricardo</button>
        <button class="filter-chip ${activeFilter === 'natalia' ? 'active' : ''}" data-filter="natalia">👤 Natália</button>
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
                .map((tx) => {
                  const cat = categories.find((c) => c.id === tx.categoryId);
                  return `
            <div class="transaction-card" data-tx-id="${tx.id}">
              <div class="tx-main">
                <div class="tx-icon-box" style="background-color: ${cat?.color ? cat.color + '22' : 'var(--bg-input)'}; color: ${cat?.color || 'var(--text-main)'};">
                  ${cat?.icon || '📦'}
                </div>
                <div class="tx-info">
                  <div class="tx-title">${tx.description}</div>
                  <div class="tx-meta">
                    <span>${formatDateBR(tx.date)}</span>
                    <span>•</span>
                    <span class="tx-badge ${tx.paidBy}">${tx.paidBy === 'ricardo' ? 'Ricardo' : 'Natália'}</span>
                    <span>•</span>
                    <span style="font-size: 0.7rem;">${cat?.name || 'Geral'}</span>
                    ${tx.isInstallment ? `<span style="color: var(--primary); font-weight: 700;">(${tx.installmentNumber}/${tx.installmentTotal})</span>` : ''}
                  </div>
                </div>
              </div>
              <div class="tx-right">
                <div class="tx-amount">${formatCurrency(tx.amountCents)}</div>
                <button class="tx-delete-btn" data-delete-id="${tx.id}" title="Excluir despesa">🗑️</button>
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
      // Manter foco no input após re-render
      const newSearch = container.querySelector('#history-search-input') as HTMLInputElement;
      if (newSearch) {
        newSearch.focus();
        newSearch.setSelectionRange(searchQuery.length, searchQuery.length);
      }
    });

    container.querySelectorAll('[data-filter]').forEach((chip) => {
      chip.addEventListener('click', () => {
        activeFilter = chip.getAttribute('data-filter') as any;
        updateView();
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
          updateView();
        }
      });
    });
  }

  updateView();
}
