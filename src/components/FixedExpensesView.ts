import { store } from '../state';
import { formatCurrency, formatDateBR, formatMonthYearBR, getTodayIso, parseCurrencyInput } from '../formatters';
import { ExpenseNature, FixedExpense, PaymentMethod, UserProfile } from '../types';

export type FixedStatus = 'paid' | 'overdue' | 'due_soon' | 'pending';

export function getFixedExpenseDueDateIso(yearMonth: string, dueDay: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  // Último dia válido do mês (ex: fevereiro tem 28 ou 29)
  const maxDay = new Date(y, m, 0).getDate();
  const safeDay = Math.min(Math.max(1, dueDay), maxDay);
  return `${yearMonth}-${String(safeDay).padStart(2, '0')}`;
}

export function getFixedExpenseStatusForMonth(
  fixed: FixedExpense,
  yearMonth: string,
  todayIso: string = getTodayIso()
): { status: FixedStatus; dueDateIso: string; daysUntilDue: number } {
  const dueDateIso = getFixedExpenseDueDateIso(yearMonth, fixed.dueDay);
  const payment = fixed.payments?.[yearMonth];

  const [ty, tm, td] = todayIso.split('-').map(Number);
  const [dy, dm, dd] = dueDateIso.split('-').map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const dueUtc = Date.UTC(dy, dm - 1, dd);
  const daysUntilDue = Math.round((dueUtc - todayUtc) / (1000 * 60 * 60 * 24));

  if (payment) {
    return { status: 'paid', dueDateIso, daysUntilDue };
  }

  if (daysUntilDue < 0) {
    return { status: 'overdue', dueDateIso, daysUntilDue };
  }

  if (daysUntilDue <= 2) {
    return { status: 'due_soon', dueDateIso, daysUntilDue };
  }

  return { status: 'pending', dueDateIso, daysUntilDue };
}

export function renderFixedExpensesView(container: HTMLElement, showToast: (msg: string) => void): void {
  const selectedMonth = store.getSelectedMonth();
  const activeProfile = store.getActiveProfile();
  const categories = store.getCategories();
  const fixedList = store.getFixedExpenses().filter((f) => f.isActive);
  const todayIso = getTodayIso();

  // Ordenar: Vencidos primeiro, depois A Vencer, Pendentes (por dia de vencimento) e Pagos por último
  const enrichedList = fixedList
    .map((f) => {
      const info = getFixedExpenseStatusForMonth(f, selectedMonth, todayIso);
      return { fixed: f, ...info, payment: f.payments?.[selectedMonth] };
    })
    .sort((a, b) => {
      const priority: Record<FixedStatus, number> = {
        overdue: 0,
        due_soon: 1,
        pending: 2,
        paid: 3
      };
      if (priority[a.status] !== priority[b.status]) {
        return priority[a.status] - priority[b.status];
      }
      return a.fixed.dueDay - b.fixed.dueDay;
    });

  let totalFixedMonthCents = 0;
  let paidFixedMonthCents = 0;
  let pendingFixedMonthCents = 0;
  let overdueCount = 0;

  for (const item of enrichedList) {
    const val = item.payment ? item.payment.amountCents : item.fixed.amountCents;
    totalFixedMonthCents += val;
    if (item.status === 'paid') {
      paidFixedMonthCents += val;
    } else {
      pendingFixedMonthCents += val;
      if (item.status === 'overdue') overdueCount++;
    }
  }

  function showFixedFormModal(existing?: FixedExpense) {
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

    let selectedNature: ExpenseNature = existing?.nature || 'familiar';
    let selectedMethod: PaymentMethod = existing?.paymentMethod || 'pix';
    const initialVal = existing
      ? (existing.amountCents / 100).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
      : '';

    modal.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 20px; width: 100%; max-width: 410px; max-height: 92vh; overflow-y: auto; box-shadow: var(--shadow-lg);">
        <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 12px;">
          ${existing ? '✏️ Editar Gasto Fixo' : '📌 Novo Gasto Fixo'}
        </div>

        <div class="form-group">
          <label class="form-label">Nome da Conta Fixa</label>
          <input
            type="text"
            id="fixed-name-input"
            class="text-input"
            placeholder="Ex: Aluguel, Internet, Seguro Auto, Escola..."
            value="${(existing?.name || '').replace(/"/g, '&quot;')}"
          />
        </div>

        <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 10px;">
          <div class="form-group">
            <label class="form-label">Valor Padrão (R$)</label>
            <input
              type="text"
              id="fixed-amount-input"
              class="text-input"
              placeholder="0,00"
              inputmode="decimal"
              style="font-weight: 700;"
              value="${initialVal}"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Dia Vencimento</label>
            <input
              type="number"
              id="fixed-dueday-input"
              class="text-input"
              min="1"
              max="31"
              value="${existing?.dueDay || 10}"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Categoria</label>
          <select id="fixed-category-select" class="text-input">
            ${categories
              .filter((c) => c.isActive)
              .map(
                (c) =>
                  `<option value="${c.id}" ${c.id === (existing?.categoryId || 'cat-moradia') ? 'selected' : ''}>${c.icon} ${c.name}</option>`
              )
              .join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Natureza do Custo</label>
          <div class="pill-group">
            <div class="pill-option ${selectedNature === 'familiar' ? 'active' : ''}" data-fix-nature="familiar">🏡 Familiar</div>
            <div class="pill-option ${selectedNature === 'individual_ricardo' ? 'active' : ''}" data-fix-nature="individual_ricardo">👤 Ind. Ricardo</div>
            <div class="pill-option ${selectedNature === 'individual_natalia' ? 'active' : ''}" data-fix-nature="individual_natalia">👤 Ind. Natália</div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Forma de Pagamento Padrão</label>
          <div class="pill-group">
            <div class="pill-option ${selectedMethod === 'pix' ? 'active' : ''}" data-fix-method="pix">Pix</div>
            <div class="pill-option ${selectedMethod === 'credito' ? 'active' : ''}" data-fix-method="credito">Crédito</div>
            <div class="pill-option ${selectedMethod === 'debito' ? 'active' : ''}" data-fix-method="debito">Débito</div>
          </div>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 18px;">
          <button type="button" id="cancel-fixed-btn" class="settings-btn" style="flex: 1; justify-content: center; margin: 0;">Cancelar</button>
          <button type="button" id="save-fixed-btn" class="submit-btn" style="flex: 1; padding: 10px;">Salvar Custo Fixo</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const nameInput = modal.querySelector('#fixed-name-input') as HTMLInputElement;
    const amountInput = modal.querySelector('#fixed-amount-input') as HTMLInputElement;
    const dueDayInput = modal.querySelector('#fixed-dueday-input') as HTMLInputElement;

    setTimeout(() => nameInput?.focus(), 80);

    amountInput?.addEventListener('input', () => {
      const val = amountInput.value.replace(/\D/g, '');
      if (!val) {
        amountInput.value = '';
        return;
      }
      const cents = parseInt(val, 10);
      amountInput.value = (cents / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    });

    modal.querySelectorAll('[data-fix-nature]').forEach((el) => {
      el.addEventListener('click', () => {
        const n = el.getAttribute('data-fix-nature') as ExpenseNature;
        if (n) {
          selectedNature = n;
          modal.querySelectorAll('[data-fix-nature]').forEach((item) => {
            item.classList.toggle('active', item.getAttribute('data-fix-nature') === selectedNature);
          });
        }
      });
    });

    modal.querySelectorAll('[data-fix-method]').forEach((el) => {
      el.addEventListener('click', () => {
        const m = el.getAttribute('data-fix-method') as PaymentMethod;
        if (m) {
          selectedMethod = m;
          modal.querySelectorAll('[data-fix-method]').forEach((item) => {
            item.classList.toggle('active', item.getAttribute('data-fix-method') === selectedMethod);
          });
        }
      });
    });

    modal.querySelector('#cancel-fixed-btn')?.addEventListener('click', () => modal.remove());

    modal.querySelector('#save-fixed-btn')?.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      const cents = parseCurrencyInput(amountInput.value);
      const dueDay = Math.min(31, Math.max(1, parseInt(dueDayInput.value, 10) || 10));
      const categoryId = (modal.querySelector('#fixed-category-select') as HTMLSelectElement).value;

      if (!name) {
        showToast('⚠️ Informe o nome do gasto fixo.');
        nameInput.focus();
        return;
      }
      if (cents <= 0) {
        showToast('⚠️ Informe um valor válido maior que zero.');
        amountInput.focus();
        return;
      }

      if (existing) {
        await store.updateFixedExpense({
          ...existing,
          name,
          amountCents: cents,
          dueDay,
          categoryId,
          nature: selectedNature,
          paymentMethod: selectedMethod
        });
        showToast(`✅ "${name}" atualizado com sucesso!`);
      } else {
        await store.addFixedExpense({
          name,
          amountCents: cents,
          dueDay,
          categoryId,
          nature: selectedNature,
          paymentMethod: selectedMethod,
          isActive: true
        });
        showToast(`✅ Gasto fixo "${name}" cadastrado!`);
      }

      modal.remove();
    });
  }

  function showPayFixedModal(fixed: FixedExpense) {
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

    let paidBy: UserProfile = activeProfile;
    const initialVal = (fixed.amountCents / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const defaultDate = todayIso.startsWith(selectedMonth)
      ? todayIso
      : getFixedExpenseDueDateIso(selectedMonth, fixed.dueDay);

    modal.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 20px; width: 100%; max-width: 390px; box-shadow: var(--shadow-lg);">
        <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 6px;">✅ Confirmar Pagamento</div>
        <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px;">
          Marcar <strong>${fixed.name}</strong> (${formatMonthYearBR(selectedMonth)}) como pago e lançar automaticamente no Painel e Extrato.
        </p>

        <div class="form-group">
          <label class="form-label">Quem Pagou?</label>
          <div class="pill-group">
            <div class="pill-option ${paidBy === 'ricardo' ? 'active ricardo' : ''}" data-pay-user="ricardo">
              Ricardo ${activeProfile === 'ricardo' ? '★' : ''}
            </div>
            <div class="pill-option ${paidBy === 'natalia' ? 'active natalia' : ''}" data-pay-user="natalia">
              Natália ${activeProfile === 'natalia' ? '★' : ''}
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Valor Pago neste Mês (R$)</label>
          <input
            type="text"
            id="pay-fixed-amount"
            class="text-input"
            inputmode="decimal"
            style="font-weight: 700; font-size: 1.1rem;"
            value="${initialVal}"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Data do Pagamento</label>
          <input type="date" id="pay-fixed-date" class="text-input" value="${defaultDate}" />
        </div>

        <div style="display: flex; gap: 8px; margin-top: 18px;">
          <button type="button" id="cancel-pay-fixed-btn" class="settings-btn" style="flex: 1; justify-content: center; margin: 0;">Cancelar</button>
          <button type="button" id="confirm-pay-fixed-btn" class="submit-btn" style="flex: 1; padding: 10px;">Confirmar Pago</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const amountInput = modal.querySelector('#pay-fixed-amount') as HTMLInputElement;
    amountInput?.addEventListener('input', () => {
      const val = amountInput.value.replace(/\D/g, '');
      if (!val) {
        amountInput.value = '';
        return;
      }
      const cents = parseInt(val, 10);
      amountInput.value = (cents / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    });

    modal.querySelectorAll('[data-pay-user]').forEach((el) => {
      el.addEventListener('click', () => {
        const u = el.getAttribute('data-pay-user') as UserProfile;
        if (u) {
          paidBy = u;
          modal.querySelectorAll('[data-pay-user]').forEach((item) => {
            const val = item.getAttribute('data-pay-user');
            item.className = `pill-option ${val === paidBy ? `active ${val}` : ''}`;
          });
        }
      });
    });

    modal.querySelector('#cancel-pay-fixed-btn')?.addEventListener('click', () => modal.remove());

    modal.querySelector('#confirm-pay-fixed-btn')?.addEventListener('click', async () => {
      const cents = parseCurrencyInput(amountInput.value);
      const payDate = (modal.querySelector('#pay-fixed-date') as HTMLInputElement).value || defaultDate;

      if (cents <= 0) {
        showToast('⚠️ Informe um valor válido.');
        return;
      }

      await store.markFixedExpensePaid(fixed.id, selectedMonth, paidBy, cents, payDate);
      modal.remove();
      showToast(`✅ "${fixed.name}" marcado como pago por ${paidBy === 'ricardo' ? 'Ricardo' : 'Natália'}!`);
    });
  }

  container.innerHTML = `
    <!-- Seletor de Mês -->
    <div class="month-selector">
      <button class="month-btn" id="prev-month-btn">◀</button>
      <span class="month-title">${formatMonthYearBR(selectedMonth)}</span>
      <button class="month-btn" id="next-month-btn">▶</button>
    </div>

    <!-- Cabeçalho e Resumo de Gastos Fixos -->
    <div class="split-card" style="margin-bottom: 14px;">
      <div class="card-title" style="margin-bottom: 10px;">
        <div>
          <span style="font-size: 1rem;">📌 Contas e Gastos Fixos</span>
          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: normal;">
            Lembretes automáticos a cada 6h a partir de 2 dias antes do vencimento
          </div>
        </div>
        <button id="btn-new-fixed" class="submit-btn" style="width: auto; padding: 8px 12px; font-size: 0.78rem;">
          + Novo Fixo
        </button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center;">
        <div style="background: var(--bg-input); padding: 8px; border-radius: var(--radius-sm);">
          <div style="font-size: 0.68rem; color: var(--text-muted);">Total Previsto</div>
          <div style="font-size: 0.9rem; font-weight: 700;">${formatCurrency(totalFixedMonthCents)}</div>
        </div>
        <div style="background: var(--bg-input); padding: 8px; border-radius: var(--radius-sm);">
          <div style="font-size: 0.68rem; color: var(--success);">Já Pago</div>
          <div style="font-size: 0.9rem; font-weight: 700; color: var(--success);">${formatCurrency(paidFixedMonthCents)}</div>
        </div>
        <div style="background: var(--bg-input); padding: 8px; border-radius: var(--radius-sm);">
          <div style="font-size: 0.68rem; color: ${overdueCount > 0 ? 'var(--danger)' : 'var(--warning)'};">Em Aberto</div>
          <div style="font-size: 0.9rem; font-weight: 700; color: ${overdueCount > 0 ? 'var(--danger)' : 'var(--text-main)'};">${formatCurrency(pendingFixedMonthCents)}</div>
        </div>
      </div>
    </div>

    <!-- Lista de Contas Fixas do Mês -->
    <div class="fixed-expenses-list">
      ${
        enrichedList.length === 0
          ? `
        <div class="empty-state">
          <div class="empty-icon">📌</div>
          <div class="empty-title">Nenhum gasto fixo cadastrado</div>
          <p style="font-size: 0.8rem;">Cadastre aluguel, condomínio, internet, seguro ou mensalidades para controlar os vencimentos.</p>
        </div>
      `
          : enrichedList
              .map(({ fixed, status, dueDateIso, daysUntilDue, payment }) => {
                const cat = categories.find((c) => c.id === fixed.categoryId);
                const isOverdue = status === 'overdue';
                const isDueSoon = status === 'due_soon';
                const isPaid = status === 'paid';

                let statusBadge = '';
                if (isPaid && payment) {
                  statusBadge = `<span class="fixed-badge paid">✅ Pago por ${
                    payment.paidBy === 'ricardo' ? 'Ricardo' : 'Natália'
                  } (${formatDateBR(payment.paidAt)})</span>`;
                } else if (isOverdue) {
                  const atraso = Math.abs(daysUntilDue);
                  statusBadge = `<span class="fixed-badge overdue">🚨 VENCIDO há ${atraso} ${
                    atraso === 1 ? 'dia' : 'dias'
                  } (Venceu ${formatDateBR(dueDateIso)})</span>`;
                } else if (isDueSoon) {
                  const labelDia =
                    daysUntilDue === 0
                      ? 'Vence HOJE!'
                      : daysUntilDue === 1
                        ? 'Vence AMANHÃ!'
                        : `Vence em ${daysUntilDue} dias`;
                  statusBadge = `<span class="fixed-badge due-soon">⏰ ${labelDia} (${formatDateBR(dueDateIso)})</span>`;
                } else {
                  statusBadge = `<span class="fixed-badge pending">📅 Vence dia ${String(fixed.dueDay).padStart(
                    2,
                    '0'
                  )} (${formatDateBR(dueDateIso)})</span>`;
                }

                return `
          <div class="fixed-expense-card ${status}">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
              <div style="display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 0;">
                <div class="tx-icon-box" style="background-color: ${
                  isOverdue ? 'hsla(0, 84%, 60%, 0.25)' : cat?.color ? cat.color + '22' : 'var(--bg-input)'
                }; color: ${isOverdue ? 'var(--danger)' : cat?.color || 'var(--text-main)'};">
                  ${isOverdue ? '🚨' : cat?.icon || '📌'}
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 0.95rem; font-weight: 700; color: ${
                    isOverdue ? '#fecaca' : 'var(--text-main)'
                  };">
                    ${fixed.name}
                  </div>
                  <div style="margin-top: 4px;">
                    ${statusBadge}
                  </div>
                </div>
              </div>

              <div style="text-align: right; flex-shrink: 0;">
                <div style="font-size: 1.05rem; font-weight: 800; color: ${
                  isOverdue ? 'var(--danger)' : isPaid ? 'var(--success)' : 'var(--text-main)'
                };">
                  ${formatCurrency(payment ? payment.amountCents : fixed.amountCents)}
                </div>
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin-top: 6px;">
                  <button class="tx-edit-btn" data-edit-fixed="${fixed.id}" title="Editar custo fixo">✏️</button>
                  <button class="tx-delete-btn" data-del-fixed="${fixed.id}" title="Excluir custo fixo">🗑️</button>
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid ${
              isOverdue ? 'hsla(0, 84%, 60%, 0.35)' : 'var(--border-subtle)'
            };">
              <span style="font-size: 0.72rem; color: ${isOverdue ? '#fca5a5' : 'var(--text-muted)'};">
                ${cat?.name || 'Geral'} • ${fixed.nature === 'familiar' ? '🏡 Familiar' : fixed.nature === 'individual_ricardo' ? '👤 Ind. Ricardo' : '👤 Ind. Natália'}
              </span>

              ${
                isPaid
                  ? `<button type="button" class="fixed-action-btn undo" data-unpay-fixed="${fixed.id}">
                      ↺ Desmarcar Pago
                    </button>`
                  : `<button type="button" class="fixed-action-btn pay ${isOverdue ? 'overdue-btn' : ''}" data-pay-fixed="${fixed.id}">
                      ✓ Marcar como Pago
                    </button>`
              }
            </div>
          </div>
        `;
              })
              .join('')
      }
    </div>
  `;

  // Eventos
  container.querySelector('#prev-month-btn')?.addEventListener('click', () => store.prevMonth());
  container.querySelector('#next-month-btn')?.addEventListener('click', () => store.nextMonth());
  container.querySelector('#btn-new-fixed')?.addEventListener('click', () => showFixedFormModal());

  container.querySelectorAll('[data-pay-fixed]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-pay-fixed');
      const target = fixedList.find((f) => f.id === id);
      if (target) showPayFixedModal(target);
    });
  });

  container.querySelectorAll('[data-unpay-fixed]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-unpay-fixed');
      const target = fixedList.find((f) => f.id === id);
      if (id && target && window.confirm(`Deseja desmarcar o pagamento de "${target.name}" e remover o lançamento do mês?`)) {
        await store.unmarkFixedExpensePaid(id, selectedMonth);
        showToast(`↩️ "${target.name}" voltou para pendente.`);
      }
    });
  });

  container.querySelectorAll('[data-edit-fixed]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-edit-fixed');
      const target = fixedList.find((f) => f.id === id);
      if (target) showFixedFormModal(target);
    });
  });

  container.querySelectorAll('[data-del-fixed]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-del-fixed');
      const target = fixedList.find((f) => f.id === id);
      if (
        id &&
        target &&
        window.confirm(`Deseja realmente excluir o gasto fixo "${target.name}"? (Pagamentos passados no extrato serão mantidos)`)
      ) {
        await store.deleteFixedExpense(id);
        showToast(`🗑️ Gasto fixo "${target.name}" excluído.`);
      }
    });
  });
}

