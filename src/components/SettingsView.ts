import { store } from '../state';
import { formatCurrency, formatDateBR } from '../formatters';
import { UserProfile } from '../types';
import { mergeBackupData, restoreCompleteBackup, validateBackupPayload } from '../sync/importExport';
import { p2pService } from '../sync/webrtcSync';

export function renderSettingsView(container: HTMLElement, showToast: (msg: string) => void): void {
  const activeProfile = store.getActiveProfile();
  const txs = store.getTransactions();
  const categories = store.getCategories();
  const rules = store.getRules();

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportJsonBackup() {
    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      activeProfile,
      transactions: store.getAllTransactionsRaw(),
      categories,
      rules
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(jsonStr, `financa2-backup-${dateStr}.json`, 'application/json');
    showToast('📦 Arquivo de backup (.json) exportado com sucesso!');
  }

  function exportCsvReport() {
    const headers = ['Data', 'Descricao', 'Valor_BRL', 'Quem_Pagou', 'Categoria', 'Natureza', 'Forma_Pagamento', 'Parcela'];
    const rows = txs.map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId)?.name || 'Geral';
      const parcelaStr = t.isInstallment ? `${t.installmentNumber}/${t.installmentTotal}` : 'A vista';
      return [
        `"${formatDateBR(t.date)}"`,
        `"${t.description.replace(/"/g, '""')}"`,
        `"${formatCurrency(t.amountCents).replace('R$', '').trim()}"`,
        `"${t.paidBy === 'ricardo' ? 'Ricardo' : 'Natália'}"`,
        `"${cat}"`,
        `"${t.nature}"`,
        `"${t.paymentMethod || 'Outro'}"`,
        `"${parcelaStr}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(csvContent, `financa2-despesas-${dateStr}.csv`, 'text/csv;charset=utf-8;');
    showToast('📊 Planilha (.csv) gerada com sucesso para Excel!');
  }

  function handleFileImport(isRestore: boolean) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!validateBackupPayload(data)) {
          showToast('⚠️ Arquivo de backup inválido ou incompatível.');
          return;
        }

        if (isRestore) {
          if (confirm('Atenção: A restauração completa substituirá todos os dados deste aparelho pelo arquivo. Deseja continuar?')) {
            await restoreCompleteBackup(data);
            showToast('✅ Base de dados restaurada com sucesso!');
            renderSettingsView(container, showToast);
          }
        } else {
          const res = await mergeBackupData(data);
          showToast(`✅ Mesclagem concluída: ${res.addedCount} novos, ${res.updatedCount} atualizados!`);
          renderSettingsView(container, showToast);
        }
      } catch (err) {
        showToast('❌ Erro ao ler arquivo de backup.');
      }
    };
    input.click();
  }

  function showAddRuleModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '200';
    modal.style.padding = '20px';

    modal.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 20px; width: 100%; max-width: 380px;">
        <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 12px;">Nova Regra Inteligente</div>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 16px;">
          Ao digitar essa palavra na descrição, a categoria será sugerida automaticamente.
        </p>
        <div class="form-group">
          <label class="form-label">Palavra-Chave / Termo</label>
          <input type="text" id="rule-keyword-input" class="text-input" placeholder="Ex: PADARIA, POSTO, SPOTIFY" />
        </div>
        <div class="form-group">
          <label class="form-label">Categoria Correspondente</label>
          <select id="rule-category-select" class="text-input">
            ${categories.filter((c) => c.isActive).map((c) => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}
          </select>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 20px;">
          <button id="cancel-rule-btn" class="settings-btn" style="flex: 1; justify-content: center;">Cancelar</button>
          <button id="save-rule-btn" class="submit-btn" style="flex: 1; padding: 10px;">Salvar Regra</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#cancel-rule-btn')?.addEventListener('click', () => modal.remove());
    modal.querySelector('#save-rule-btn')?.addEventListener('click', async () => {
      const keyword = (modal.querySelector('#rule-keyword-input') as HTMLInputElement).value.trim();
      const categoryId = (modal.querySelector('#rule-category-select') as HTMLSelectElement).value;

      if (!keyword) {
        showToast('⚠️ Informe a palavra-chave.');
        return;
      }

      await store.addRule({
        keyword: keyword.toUpperCase(),
        categoryId,
        matchType: 'contains',
        isActive: true
      });

      modal.remove();
      showToast(`✅ Regra para "${keyword.toUpperCase()}" criada com sucesso!`);
      renderSettingsView(container, showToast);
    });
  }

  function showAddCategoryModal() {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '200';
    modal.style.padding = '20px';

    modal.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 20px; width: 100%; max-width: 380px;">
        <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 12px;">Nova Categoria</div>
        <div class="form-group">
          <label class="form-label">Nome da Categoria</label>
          <input type="text" id="cat-name-input" class="text-input" placeholder="Ex: Viagens e Férias" />
        </div>
        <div class="form-group">
          <label class="form-label">Ícone / Emoji</label>
          <input type="text" id="cat-icon-input" class="text-input" placeholder="Ex: ✈️" value="🏷️" />
        </div>
        <div style="display: flex; gap: 8px; margin-top: 20px;">
          <button id="cancel-cat-btn" class="settings-btn" style="flex: 1; justify-content: center;">Cancelar</button>
          <button id="save-cat-btn" class="submit-btn" style="flex: 1; padding: 10px;">Criar Categoria</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#cancel-cat-btn')?.addEventListener('click', () => modal.remove());
    modal.querySelector('#save-cat-btn')?.addEventListener('click', async () => {
      const name = (modal.querySelector('#cat-name-input') as HTMLInputElement).value.trim();
      const icon = (modal.querySelector('#cat-icon-input') as HTMLInputElement).value.trim() || '🏷️';

      if (!name) {
        showToast('⚠️ Informe o nome da categoria.');
        return;
      }

      await store.addCategory({
        name,
        icon,
        color: '#6366f1',
        isActive: true,
        isSystem: false
      });

      modal.remove();
      showToast(`✅ Categoria "${name}" criada com sucesso!`);
      renderSettingsView(container, showToast);
    });
  }

  async function showP2PModal() {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.backgroundColor = 'rgba(0,0,0,0.85)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '200';
    modal.style.padding = '16px';

    modal.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 20px; max-width: 400px; width: 100%; box-shadow: var(--shadow-lg);">
        <div style="font-size: 1.15rem; font-weight: 700; margin-bottom: 8px; text-align: center;">Sincronização P2P Wi-Fi</div>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 16px; text-align: center;">
          Conecte os celulares de Ricardo e Natália na mesma rede doméstica para trocar registros instantaneamente.
        </p>

        <div id="p2p-step-1" style="display: flex; flex-direction: column; gap: 10px;">
          <button id="p2p-start-offer-btn" class="submit-btn">
            <span>📲 Aparelho 1: Gerar Código de Pareamento</span>
          </button>
          <button id="p2p-start-answer-btn" class="settings-btn" style="justify-content: center;">
            <span>📥 Aparelho 2: Conectar ao Código</span>
          </button>
        </div>

        <div id="p2p-offer-view" style="display: none; text-align: center;">
          <div style="background: white; padding: 12px; border-radius: var(--radius-md); display: inline-block; margin-bottom: 12px;">
            <svg width="150" height="150" viewBox="0 0 100 100" fill="black">
              <rect width="100" height="100" fill="white"/>
              <rect x="10" y="10" width="25" height="25" fill="#0f172a"/>
              <rect x="15" y="15" width="15" height="15" fill="white"/>
              <rect x="18" y="18" width="9" height="9" fill="#0f172a"/>
              <rect x="65" y="10" width="25" height="25" fill="#0f172a"/>
              <rect x="70" y="15" width="15" height="15" fill="white"/>
              <rect x="73" y="18" width="9" height="9" fill="#0f172a"/>
              <rect x="10" y="65" width="25" height="25" fill="#0f172a"/>
              <rect x="15" y="70" width="15" height="15" fill="white"/>
              <rect x="18" y="73" width="9" height="9" fill="#0f172a"/>
              <rect x="42" y="15" width="8" height="8" fill="#0f172a"/>
              <rect x="45" y="35" width="15" height="8" fill="#0f172a"/>
              <rect x="25" y="45" width="10" height="12" fill="#0f172a"/>
              <rect x="65" y="50" width="12" height="15" fill="#0f172a"/>
              <rect x="45" y="65" width="18" height="10" fill="#0f172a"/>
              <rect x="75" y="75" width="12" height="12" fill="#0f172a"/>
            </svg>
          </div>
          <div style="font-size: 0.75rem; color: var(--success); font-weight: 600; margin-bottom: 8px;">
            ● Aguardando conexão do outro aparelho...
          </div>
          <textarea id="p2p-offer-code" class="text-input" readonly style="font-size: 0.65rem; height: 50px; margin-bottom: 10px;"></textarea>
          <button id="p2p-copy-offer-btn" class="settings-btn" style="justify-content: center; padding: 6px; font-size: 0.75rem;">
            Copiar Código de Pareamento
          </button>
        </div>

        <div id="p2p-answer-view" style="display: none;">
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">
            Cole o código de pareamento gerado no outro celular:
          </p>
          <textarea id="p2p-input-code" class="text-input" placeholder="Cole o código aqui..." style="font-size: 0.75rem; height: 70px; margin-bottom: 10px;"></textarea>
          <button id="p2p-connect-btn" class="submit-btn" style="padding: 10px;">
            Confirmar Conexão
          </button>
        </div>

        <div style="margin-top: 16px;">
          <button id="close-modal-btn" class="settings-btn" style="justify-content: center; margin: 0; width: 100%;">
            Fechar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#p2p-start-offer-btn')?.addEventListener('click', async () => {
      modal.querySelector('#p2p-step-1')!.setAttribute('style', 'display: none;');
      modal.querySelector('#p2p-offer-view')!.setAttribute('style', 'display: block;');
      try {
        const { offerCode, onConnected } = await p2pService.createOffer();
        const codeEl = modal.querySelector('#p2p-offer-code') as HTMLTextAreaElement;
        if (codeEl) codeEl.value = offerCode;

        onConnected.then(() => {
          showToast('🎉 Sincronização P2P concluída com sucesso!');
          modal.remove();
          renderSettingsView(container, showToast);
        });
      } catch (err) {
        showToast('ℹ️ Modo demonstrativo ativo.');
      }
    });

    modal.querySelector('#p2p-copy-offer-btn')?.addEventListener('click', () => {
      const codeEl = modal.querySelector('#p2p-offer-code') as HTMLTextAreaElement;
      navigator.clipboard?.writeText(codeEl.value);
      showToast('📋 Código copiado para a área de transferência!');
    });

    modal.querySelector('#p2p-start-answer-btn')?.addEventListener('click', () => {
      modal.querySelector('#p2p-step-1')!.setAttribute('style', 'display: none;');
      modal.querySelector('#p2p-answer-view')!.setAttribute('style', 'display: block;');
    });

    modal.querySelector('#p2p-connect-btn')?.addEventListener('click', async () => {
      const codeInput = (modal.querySelector('#p2p-input-code') as HTMLTextAreaElement).value.trim();
      if (!codeInput) {
        showToast('⚠️ Cole o código de pareamento.');
        return;
      }
      try {
        const { onConnected } = await p2pService.handleOfferAndCreateAnswer(codeInput);
        onConnected.then(() => {
          showToast('🎉 Sincronização P2P concluída com sucesso!');
          modal.remove();
          renderSettingsView(container, showToast);
        });
      } catch (err) {
        showToast('⚠️ Código inválido ou erro de conexão local.');
      }
    });

    modal.querySelector('#close-modal-btn')?.addEventListener('click', () => {
      p2pService.close();
      modal.remove();
    });
  }

  container.innerHTML = `
    <!-- Perfil do Aparelho -->
    <div class="settings-section">
      <div class="card-title">
        <span>Identidade deste Aparelho</span>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">
        Define quem é o usuário padrão deste celular para preencher os gastos automaticamente.
      </p>

      <div class="pill-group">
        <div class="pill-option ${activeProfile === 'ricardo' ? 'active ricardo' : ''}" data-set-profile="ricardo">
          📱 Celular do Ricardo
        </div>
        <div class="pill-option ${activeProfile === 'natalia' ? 'active natalia' : ''}" data-set-profile="natalia">
          📱 Celular da Natália
        </div>
      </div>
    </div>

    <!-- Sincronização P2P -->
    <div class="settings-section">
      <div class="card-title">Sincronização Direta entre Aparelhos</div>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">
        Conecte os celulares de Ricardo e Natália via Wi-Fi sem servidores na nuvem.
      </p>
      <button class="settings-btn" id="p2p-sync-btn">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>📲</span>
          <span>Iniciar Pareamento P2P (Wi-Fi / QR Code)</span>
        </div>
        <span>➔</span>
      </button>
    </div>

    <!-- Gestão de Categorias -->
    <div class="settings-section">
      <div class="card-title">
        <span>Categorias Configuráveis</span>
        <button id="btn-add-category" class="expand-toggle" style="margin: 0; color: var(--primary);">+ Criar</button>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">
        Toque para ativar ou desativar categorias nos formulários.
      </p>
      <div style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 140px; overflow-y: auto; padding: 2px;">
        ${categories
          .map(
            (c) => `
          <button
            class="chip-btn ${c.isActive ? 'active' : ''}"
            data-toggle-cat="${c.id}"
            style="${!c.isActive ? 'opacity: 0.45;' : ''}"
            title="${c.isActive ? 'Ativa' : 'Desativada'}"
          >
            <span>${c.icon}</span>
            <span>${c.name}</span>
          </button>
        `
          )
          .join('')}
      </div>
    </div>

    <!-- Regras Inteligentes de Classificação -->
    <div class="settings-section">
      <div class="card-title">
        <span>Regras de Sugestão Automática</span>
        <button id="btn-add-rule" class="expand-toggle" style="margin: 0; color: var(--primary);">+ Criar Regra</button>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">
        Regras locais que sugerem categorias automaticamente ao digitar.
      </p>
      <div style="max-height: 150px; overflow-y: auto;">
        ${rules
          .map((r) => {
            const cat = categories.find((c) => c.id === r.categoryId);
            return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; border-bottom: 1px solid var(--border-subtle); font-size: 0.8rem;">
              <div>
                <strong>"${r.keyword}"</strong> ➔ <span>${cat?.icon || ''} ${cat?.name || 'Geral'}</span>
              </div>
              <div style="display: flex; gap: 6px;">
                <button data-toggle-rule="${r.id}" style="background: none; border: none; cursor: pointer; color: ${r.isActive ? 'var(--success)' : 'var(--text-dim)'};">
                  ${r.isActive ? '● Ativa' : '○ Inativa'}
                </button>
                <button data-delete-rule="${r.id}" style="background: none; border: none; cursor: pointer; color: var(--danger);">✕</button>
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
    </div>

    <!-- Backup, Importação e Exportação -->
    <div class="settings-section">
      <div class="card-title">Backup, Importação e Exportação</div>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">
        Garante a posse e troca de dados por arquivos seguros.
      </p>

      <button class="settings-btn" id="export-json-btn">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>📦</span>
          <span>Baixar Backup Completo (.json)</span>
        </div>
        <span>⬇</span>
      </button>

      <button class="settings-btn" id="merge-json-btn">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>🔀</span>
          <span>Mesclar Backup do Cônjuge (.json)</span>
        </div>
        <span>⬆</span>
      </button>

      <button class="settings-btn" id="restore-json-btn" style="color: var(--warning);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>⚠️</span>
          <span>Restaurar Backup Completo (Substituir)</span>
        </div>
        <span>↺</span>
      </button>

      <button class="settings-btn" id="export-csv-btn">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>📊</span>
          <span>Exportar Planilha para Excel (.csv)</span>
        </div>
        <span>⬇</span>
      </button>
    </div>

    <!-- Ambiente de Demonstração -->
    <div class="settings-section">
      <div class="card-title">Ambiente de Demonstração</div>
      <button class="settings-btn" id="reset-mock-btn" style="color: var(--warning);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>🔄</span>
          <span>Restaurar Banco de Dados Inicial</span>
        </div>
        <span>↺</span>
      </button>
    </div>
  `;

  // Listeners
  container.querySelectorAll('[data-set-profile]').forEach((el) => {
    el.addEventListener('click', async () => {
      const p = el.getAttribute('data-set-profile') as UserProfile;
      if (p) {
        await store.setActiveProfile(p);
        showToast(`📱 Aparelho configurado como Celular de ${p === 'ricardo' ? 'Ricardo' : 'Natália'}.`);
      }
    });
  });

  container.querySelector('#btn-add-category')?.addEventListener('click', showAddCategoryModal);
  container.querySelector('#btn-add-rule')?.addEventListener('click', showAddRuleModal);

  container.querySelectorAll('[data-toggle-cat]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-toggle-cat');
      if (id) {
        await store.toggleCategory(id);
        renderSettingsView(container, showToast);
      }
    });
  });

  container.querySelectorAll('[data-toggle-rule]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-toggle-rule');
      if (id) {
        await store.toggleRule(id);
        renderSettingsView(container, showToast);
      }
    });
  });

  container.querySelectorAll('[data-delete-rule]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-delete-rule');
      if (id) {
        await store.deleteRule(id);
        showToast('Regra excluída.');
        renderSettingsView(container, showToast);
      }
    });
  });

  container.querySelector('#p2p-sync-btn')?.addEventListener('click', showP2PModal);
  container.querySelector('#export-json-btn')?.addEventListener('click', exportJsonBackup);
  container.querySelector('#merge-json-btn')?.addEventListener('click', () => handleFileImport(false));
  container.querySelector('#restore-json-btn')?.addEventListener('click', () => handleFileImport(true));
  container.querySelector('#export-csv-btn')?.addEventListener('click', exportCsvReport);
  container.querySelector('#reset-mock-btn')?.addEventListener('click', async () => {
    if (window.confirm('Deseja restaurar as transações fictícias iniciais?')) {
      await store.restoreMockData();
      showToast('🔄 Banco de dados restaurado!');
      renderSettingsView(container, showToast);
    }
  });
}
