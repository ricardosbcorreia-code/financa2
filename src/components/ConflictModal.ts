import { store } from '../state';
import { formatCurrency, formatDateBR } from '../formatters';

export function showConflictResolutionModal(showToast: (msg: string) => void): void {
  const existing = document.getElementById('sync-conflict-modal');
  if (existing) existing.remove();

  const conflicts = store.getSyncConflicts();
  if (conflicts.length === 0) return;

  const categories = store.getCategories();

  const modal = document.createElement('div');
  modal.id = 'sync-conflict-modal';
  modal.className = 'modal-backdrop';
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.backgroundColor = 'rgba(0,0,0,0.85)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '300';
  modal.style.padding = '16px';

  function renderContent(): void {
    const currentConflicts = store.getSyncConflicts();
    if (currentConflicts.length === 0) {
      modal.remove();
      showToast('✅ Todas as pendências de sincronismo foram resolvidas!');
      return;
    }

    const item = currentConflicts[0];
    const cat = categories.find((c) => c.id === item.localTx.categoryId);

    modal.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--warning); border-radius: var(--radius-lg); padding: 20px; width: 100%; max-width: 430px; max-height: 92vh; overflow-y: auto; box-shadow: var(--shadow-lg);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="font-size: 1.05rem; font-weight: 800; color: var(--warning);">
            ⚠️ Pendência de Sincronismo (${currentConflicts.length} restante${currentConflicts.length > 1 ? 's' : ''})
          </div>
          <button id="close-conflict-modal-btn" style="background: none; border: none; color: var(--text-muted); font-size: 1.2rem; cursor: pointer;">✕</button>
        </div>

        <p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 14px;">
          Encontramos lançamentos nos dois aparelhos com o <strong>mesmo valor</strong> e <strong>mesma categoria</strong>, porém com descrições diferentes. Escolha como proceder:
        </p>

        <!-- Resumo em Comum -->
        <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-input); padding: 10px 12px; border-radius: var(--radius-sm); margin-bottom: 12px; border: 1px solid var(--border-subtle);">
          <span style="font-size: 0.85rem; font-weight: 600;">${cat?.icon || '📦'} ${cat?.name || 'Categoria'}</span>
          <span style="font-size: 1.1rem; font-weight: 800; color: var(--primary);">${formatCurrency(item.localTx.amountCents)}</span>
        </div>

        <!-- Comparativo Lado a Lado -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
          <!-- Opção 1: Aparelho Local -->
          <div style="background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px;">
            <div style="font-size: 0.68rem; text-transform: uppercase; color: var(--accent-ricardo); font-weight: 700; margin-bottom: 4px;">
              📱 Registro 1 (Neste aparelho)
            </div>
            <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">
              "${item.localTx.description}"
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">
              📅 ${formatDateBR(item.localTx.date)}<br/>
              👤 Pago por: <strong>${item.localTx.paidBy === 'ricardo' ? 'Ricardo' : 'Natália'}</strong>
            </div>
          </div>

          <!-- Opção 2: Outro Aparelho -->
          <div style="background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px;">
            <div style="font-size: 0.68rem; text-transform: uppercase; color: var(--accent-natalia); font-weight: 700; margin-bottom: 4px;">
              📲 Registro 2 (Outro aparelho)
            </div>
            <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">
              "${item.remoteTx.description}"
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">
              📅 ${formatDateBR(item.remoteTx.date)}<br/>
              👤 Pago por: <strong>${item.remoteTx.paidBy === 'ricardo' ? 'Ricardo' : 'Natália'}</strong>
            </div>
          </div>
        </div>

        <!-- Botões de Decisão -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button type="button" id="btn-keep-local" class="settings-btn" style="margin: 0; border-color: var(--accent-ricardo); justify-content: center;">
            1️⃣ É duplicado: Manter apenas "${item.localTx.description}"
          </button>

          <button type="button" id="btn-keep-remote" class="settings-btn" style="margin: 0; border-color: var(--accent-natalia); justify-content: center;">
            2️⃣ É duplicado: Manter apenas "${item.remoteTx.description}"
          </button>

          <button type="button" id="btn-keep-both" class="submit-btn" style="padding: 11px;">
            ✅ São gastos diferentes: Manter os Dois Registros
          </button>
        </div>
      </div>
    `;

    modal.querySelector('#close-conflict-modal-btn')?.addEventListener('click', () => modal.remove());

    modal.querySelector('#btn-keep-local')?.addEventListener('click', async () => {
      await store.resolveSyncConflict(item.id, 'keep_local');
      renderContent();
    });

    modal.querySelector('#btn-keep-remote')?.addEventListener('click', async () => {
      await store.resolveSyncConflict(item.id, 'keep_remote');
      renderContent();
    });

    modal.querySelector('#btn-keep-both')?.addEventListener('click', async () => {
      await store.resolveSyncConflict(item.id, 'keep_both');
      renderContent();
    });
  }

  document.body.appendChild(modal);
  renderContent();
}

