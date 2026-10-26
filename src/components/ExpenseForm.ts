import { store } from '../state';
import { suggestCategory } from '../rulesEngine';
import { getTodayIso, parseCurrencyInput } from '../formatters';
import { ExpenseNature, PaymentMethod, UserProfile } from '../types';

export function renderExpenseForm(container: HTMLElement, showToast: (msg: string) => void): void {
  const categories = store.getCategories();
  const rules = store.getRules();
  const activeProfile = store.getActiveProfile();

  // Estados locais do formulário
  let selectedCategoryId = categories[1]?.id || categories[0]?.id; // Padrão: Alimentação
  let selectedPaidBy: UserProfile = activeProfile;
  let selectedNature: ExpenseNature = 'familiar';
  let isExpanded = false;
  let isInstallment = false;
  let installmentTotal = 2;
  let selectedPaymentMethod: PaymentMethod = 'credito';

  function updateView(): void {
    container.innerHTML = `
      <div class="form-card">
        <div class="form-title">
          <span>Novo Lançamento</span>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal;">Lançamento Rápido</span>
        </div>

        <form id="expense-form">
          <!-- Campo de Valor em Grande Destaque -->
          <div class="form-group">
            <label class="form-label" for="expense-amount">Valor (R$)</label>
            <div class="amount-input-wrapper">
              <span class="amount-prefix">R$</span>
              <input
                type="text"
                id="expense-amount"
                class="amount-input"
                placeholder="0,00"
                inputmode="decimal"
                autocomplete="off"
                required
              />
            </div>
          </div>

          <!-- Descrição -->
          <div class="form-group">
            <label class="form-label" for="expense-desc">Descrição / Estabelecimento</label>
            <input
              type="text"
              id="expense-desc"
              class="text-input"
              placeholder="Ex: Supermercado, Farmácia, Posto..."
              autocomplete="off"
              required
            />
            <div id="suggestion-container"></div>
          </div>

          <!-- Quem Pagou -->
          <div class="form-group">
            <label class="form-label">Quem Pagou</label>
            <div class="pill-group">
              <div class="pill-option ${selectedPaidBy === 'ricardo' ? 'active ricardo' : ''}" data-payer="ricardo">
                Ricardo ${activeProfile === 'ricardo' ? '★ (Você)' : ''}
              </div>
              <div class="pill-option ${selectedPaidBy === 'natalia' ? 'active natalia' : ''}" data-payer="natalia">
                Natália ${activeProfile === 'natalia' ? '★ (Você)' : ''}
              </div>
            </div>
          </div>

          <!-- Categoria -->
          <div class="form-group">
            <label class="form-label">Categoria</label>
            <div class="category-chips">
              ${categories
                .filter((c) => c.isActive)
                .map(
                  (c) => `
                <button
                  type="button"
                  class="chip-btn ${selectedCategoryId === c.id ? 'active' : ''}"
                  data-cat-id="${c.id}"
                >
                  <span>${c.icon}</span>
                  <span>${c.name}</span>
                </button>
              `
                )
                .join('')}
            </div>
          </div>

          <!-- Natureza da Despesa -->
          <div class="form-group">
            <label class="form-label">Natureza do Gasto</label>
            <div class="pill-group">
              <div class="pill-option ${selectedNature === 'familiar' ? 'active' : ''}" data-nature="familiar">
                🏡 Familiar
              </div>
              <div class="pill-option ${selectedNature === 'individual_ricardo' ? 'active' : ''}" data-nature="individual_ricardo">
                👤 Ind. Ricardo
              </div>
              <div class="pill-option ${selectedNature === 'individual_natalia' ? 'active' : ''}" data-nature="individual_natalia">
                👤 Ind. Natália
              </div>
            </div>
          </div>

          <!-- Botão Expansível Detalhes Opcionais -->
          <div style="margin: 16px 0 8px 0;">
            <button type="button" class="expand-toggle" id="toggle-details-btn">
              <span>${isExpanded ? '▼ Ocultar Detalhes Secundários' : '▶ + Detalhes Opcionais (Parcelas, Cartão, Data)'}</span>
            </button>
          </div>

          <!-- Seção Detalhes Opcionais Recolhida por Padrão -->
          <div class="expandable-content" style="display: ${isExpanded ? 'block' : 'none'};">
            <!-- Forma de Pagamento -->
            <div class="form-group">
              <label class="form-label">Forma de Pagamento</label>
              <div class="pill-group">
                <div class="pill-option ${selectedPaymentMethod === 'credito' ? 'active' : ''}" data-method="credito">Crédito</div>
                <div class="pill-option ${selectedPaymentMethod === 'pix' ? 'active' : ''}" data-method="pix">Pix</div>
                <div class="pill-option ${selectedPaymentMethod === 'debito' ? 'active' : ''}" data-method="debito">Débito</div>
                <div class="pill-option ${selectedPaymentMethod === 'dinheiro' ? 'active' : ''}" data-method="dinheiro">Dinheiro</div>
              </div>
            </div>

            <!-- Compra Parcelada -->
            <div class="form-group" style="padding: 8px 0; border-top: 1px solid var(--border-subtle);">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
                <input type="checkbox" id="is-installment-check" ${isInstallment ? 'checked' : ''} />
                <span>Compra Parcelada (Dividir nos meses seguintes)</span>
              </label>

              <div id="installment-options" style="display: ${isInstallment ? 'flex' : 'none'}; align-items: center; gap: 10px; margin-top: 8px;">
                <span style="font-size: 0.8rem; color: var(--text-muted);">Número de parcelas:</span>
                <select id="installment-total-select" class="text-input" style="width: auto; padding: 6px 12px; font-size: 0.85rem;">
                  ${[2, 3, 4, 5, 6, 8, 10, 12, 18, 24]
                    .map((n) => `<option value="${n}" ${n === installmentTotal ? 'selected' : ''}>${n}x vezes</option>`)
                    .join('')}
                </select>
              </div>
            </div>

            <!-- Data Ocorrência -->
            <div class="form-group">
              <label class="form-label" for="expense-date">Data da Compra</label>
              <input type="date" id="expense-date" class="text-input" value="${getTodayIso()}" />
            </div>

            <!-- Observações -->
            <div class="form-group">
              <label class="form-label" for="expense-notes">Observações</label>
              <input type="text" id="expense-notes" class="text-input" placeholder="Detalhes opcionais..." />
            </div>
          </div>

          <!-- Botão Submeter -->
          <button type="submit" class="submit-btn" id="save-expense-btn">
            <span>💾 Salvar Despesa</span>
          </button>
        </form>
      </div>
    `;

    bindEvents();
  }

  function bindEvents(): void {
    const form = container.querySelector('#expense-form') as HTMLFormElement;
    const amountInput = container.querySelector('#expense-amount') as HTMLInputElement;
    const descInput = container.querySelector('#expense-desc') as HTMLInputElement;
    const suggestionBox = container.querySelector('#suggestion-container') as HTMLElement;
    const toggleDetailsBtn = container.querySelector('#toggle-details-btn') as HTMLButtonElement;
    const isInstallmentCheck = container.querySelector('#is-installment-check') as HTMLInputElement;
    const installmentSelect = container.querySelector('#installment-total-select') as HTMLSelectElement;

    // Foco automático no campo de valor para lançamento rápido
    setTimeout(() => amountInput?.focus(), 150);

    // Formatação de valor monetário em tempo real
    amountInput?.addEventListener('input', () => {
      // Deixa digitar números e formata amigavelmente
      let val = amountInput.value.replace(/\D/g, '');
      if (val === '') {
        amountInput.value = '';
        return;
      }
      const cents = parseInt(val, 10);
      amountInput.value = (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    });

    // Sugestão Inteligente ao Digitar a Descrição
    descInput?.addEventListener('input', () => {
      const query = descInput.value;
      const match = suggestCategory(query, rules, categories);

      if (match) {
        selectedCategoryId = match.category.id;
        // Atualiza botões de categoria visualmente
        container.querySelectorAll('.chip-btn').forEach((btn) => {
          const catId = btn.getAttribute('data-cat-id');
          btn.classList.toggle('active', catId === selectedCategoryId);
        });

        suggestionBox.innerHTML = `
          <div class="suggestion-banner">
            <span>💡 Sugestão automática: <strong>${match.category.icon} ${match.category.name}</strong></span>
            <span style="font-size: 0.7rem; opacity: 0.8;">(Regra: "${match.rule.keyword}")</span>
          </div>
        `;
      } else {
        suggestionBox.innerHTML = '';
      }
    });

    // Seleção de Categoria Manual
    container.querySelectorAll('.chip-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const catId = btn.getAttribute('data-cat-id');
        if (catId) {
          selectedCategoryId = catId;
          container.querySelectorAll('.chip-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
        }
      });
    });

    // Seleção de Pagador
    container.querySelectorAll('[data-payer]').forEach((el) => {
      el.addEventListener('click', () => {
        const payer = el.getAttribute('data-payer') as UserProfile;
        if (payer) {
          selectedPaidBy = payer;
          updateView();
        }
      });
    });

    // Seleção de Natureza
    container.querySelectorAll('[data-nature]').forEach((el) => {
      el.addEventListener('click', () => {
        const nature = el.getAttribute('data-nature') as ExpenseNature;
        if (nature) {
          selectedNature = nature;
          updateView();
        }
      });
    });

    // Toggle de Detalhes
    toggleDetailsBtn?.addEventListener('click', () => {
      isExpanded = !isExpanded;
      updateView();
    });

    // Toggle de Parcelamento
    isInstallmentCheck?.addEventListener('change', () => {
      isInstallment = isInstallmentCheck.checked;
      const opts = container.querySelector('#installment-options') as HTMLElement;
      if (opts) opts.style.display = isInstallment ? 'flex' : 'none';
    });

    installmentSelect?.addEventListener('change', () => {
      installmentTotal = parseInt(installmentSelect.value, 10);
    });

    // Seleção de Forma de Pagamento
    container.querySelectorAll('[data-method]').forEach((el) => {
      el.addEventListener('click', () => {
        const m = el.getAttribute('data-method') as PaymentMethod;
        if (m) {
          selectedPaymentMethod = m;
          container.querySelectorAll('[data-method]').forEach((x) => x.classList.remove('active'));
          el.classList.add('active');
        }
      });
    });

    // Submissão do Formulário
    form?.addEventListener('submit', (e) => {
      e.preventDefault();

      const cents = parseCurrencyInput(amountInput.value);
      if (cents <= 0) {
        showToast('⚠️ Por favor, informe um valor válido acima de zero.');
        amountInput.focus();
        return;
      }

      const desc = descInput.value.trim();
      if (!desc) {
        showToast('⚠️ Por favor, informe a descrição da despesa.');
        descInput.focus();
        return;
      }

      const dateInput = container.querySelector('#expense-date') as HTMLInputElement;
      const notesInput = container.querySelector('#expense-notes') as HTMLInputElement;

      const date = dateInput?.value || getTodayIso();
      const notes = notesInput?.value.trim() || undefined;

      // Adicionar à Store Reativa
      store.addTransaction({
        date,
        description: desc,
        amountCents: cents,
        paidBy: selectedPaidBy,
        categoryId: selectedCategoryId,
        nature: selectedNature,
        paymentMethod: selectedPaymentMethod,
        isInstallment,
        installmentTotal: isInstallment ? installmentTotal : undefined,
        isRefund: false,
        notes
      });

      showToast(`✅ Despesa de ${(cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} gravada com sucesso!`);

      // Redireciona para o Painel para ver os novos números
      store.setActiveTab('dashboard');
    });
  }

  updateView();
}
