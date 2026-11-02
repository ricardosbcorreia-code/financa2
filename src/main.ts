import './styles/theme.css';
import './styles/main.css';
import './styles/components.css';

import { store } from './state';
import { renderDashboard } from './components/Dashboard';
import { renderExpenseForm } from './components/ExpenseForm';
import { renderFixedExpensesView } from './components/FixedExpensesView';
import { renderHistoryList } from './components/HistoryList';
import { renderSettingsView } from './components/SettingsView';
import { showConflictResolutionModal } from './components/ConflictModal';
import { reminderService } from './services/reminderService';
import { formatCurrency } from './formatters';
import { ActiveTab } from './types';

function showToast(message: string, type: 'success' | 'info' = 'success'): void {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function initApp(): void {
  const appElement = document.getElementById('app');
  if (!appElement) return;

  function renderShell(): void {
    const activeProfile = store.getActiveProfile();
    const activeTab = store.getActiveTab();
    const syncConflicts = store.getSyncConflicts();
    const dueFixedAlerts = reminderService.getAlertableFixedExpenses(store.getSelectedMonth());
    const overdueAlerts = dueFixedAlerts.filter((a) => a.status === 'overdue');

    appElement!.innerHTML = `
      <!-- Cabeçalho Superior Fixo -->
      <header class="app-header">
        <div class="brand-wrapper">
          <div class="brand-logo">F2</div>
          <div class="brand-info">
            <h1>Finança2</h1>
            <div class="brand-subtitle">Ricardo & Natália</div>
          </div>
        </div>

        <!-- Seletor Rápido de Perfil Ativo do Aparelho -->
        <button
          class="profile-pill ${activeProfile}"
          id="toggle-profile-header-btn"
          title="Clique para alternar o usuário deste aparelho"
        >
          <span class="profile-indicator"></span>
          <span>${activeProfile === 'ricardo' ? 'Ricardo' : 'Natália'}</span>
        </button>
      </header>

      <!-- Container de Toasts -->
      <div class="toast-container" id="toast-container"></div>

      <!-- Banners Globais de Pendências de Sincronismo (Obs 4) e Lembretes de Vencimento (Obs 5) -->
      <div id="global-alerts-bar" style="padding: 0 16px;">
        ${
          syncConflicts.length > 0
            ? `
          <div class="alert-banner conflict" id="open-conflicts-banner-btn">
            <div>
              <strong>⚠️ ${syncConflicts.length} Pendência(s) no Sincronismo</strong>
              <div style="font-size: 0.72rem; opacity: 0.9;">Mesmo valor e categoria com descrição diferente. Toque para escolher.</div>
            </div>
            <span style="font-weight: 800; font-size: 0.8rem;">Resolver ➔</span>
          </div>
        `
            : ''
        }

        ${
          dueFixedAlerts.length > 0 && activeTab !== 'fixed-expenses'
            ? `
          <div class="alert-banner ${overdueAlerts.length > 0 ? 'overdue' : 'due-soon'}" id="open-fixed-alerts-btn">
            <div>
              <strong>${overdueAlerts.length > 0 ? `🚨 ${overdueAlerts.length} Gasto(s) Fixo(s) VENCIDO(S)!` : `⏰ ${dueFixedAlerts.length} Gasto(s) Fixo(s) próximo(s) do vencimento`}</strong>
              <div style="font-size: 0.72rem; opacity: 0.92;">
                ${dueFixedAlerts
                  .slice(0, 2)
                  .map((a) => `${a.fixed.name} (${formatCurrency(a.fixed.amountCents)})`)
                  .join(' • ')}
              </div>
            </div>
            <span style="font-weight: 800; font-size: 0.78rem; white-space: nowrap;">Ver Fixos ➔</span>
          </div>
        `
            : ''
        }
      </div>

      <!-- Área de Conteúdo da Aba Ativa -->
      <main class="app-content" id="tab-content"></main>

      <!-- Barra de Navegação Inferior Móvel (5 abas) -->
      <nav class="bottom-nav">
        <button class="nav-item ${activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
          <span class="nav-icon">📊</span>
          <span>Painel</span>
        </button>

        <button class="nav-item ${activeTab === 'fixed-expenses' ? 'active' : ''}" data-tab="fixed-expenses" style="position: relative;">
          <span class="nav-icon">📌</span>
          <span>Fixos</span>
          ${
            dueFixedAlerts.length > 0
              ? `<span class="nav-badge ${overdueAlerts.length > 0 ? 'danger' : 'warning'}">${dueFixedAlerts.length}</span>`
              : ''
          }
        </button>

        <button class="nav-item primary-action ${activeTab === 'new-expense' ? 'active' : ''}" data-tab="new-expense">
          <span class="nav-icon" style="font-size: 1.35rem;">➕</span>
          <span>Novo Gasto</span>
        </button>

        <button class="nav-item ${activeTab === 'history' ? 'active' : ''}" data-tab="history">
          <span class="nav-icon">📋</span>
          <span>Extrato</span>
        </button>

        <button class="nav-item ${activeTab === 'settings' ? 'active' : ''}" data-tab="settings" style="position: relative;">
          <span class="nav-icon">⚙️</span>
          <span>Ajustes</span>
          ${syncConflicts.length > 0 ? `<span class="nav-badge warning">${syncConflicts.length}</span>` : ''}
        </button>
      </nav>
    `;

    // Renderizar conteúdo da aba ativa
    const contentArea = document.getElementById('tab-content');
    if (contentArea) {
      if (activeTab === 'dashboard') {
        renderDashboard(contentArea);
      } else if (activeTab === 'new-expense') {
        renderExpenseForm(contentArea, showToast);
      } else if (activeTab === 'fixed-expenses') {
        renderFixedExpensesView(contentArea, showToast);
      } else if (activeTab === 'history') {
        renderHistoryList(contentArea, showToast);
      } else if (activeTab === 'settings') {
        renderSettingsView(contentArea, showToast);
      }
    }

    // Listeners da Barra de Navegação
    document.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab') as ActiveTab;
        if (tab) {
          store.setActiveTab(tab);
        }
      });
    });

    // Clique no banner de conflito de sincronismo
    document.getElementById('open-conflicts-banner-btn')?.addEventListener('click', () => {
      showConflictResolutionModal(showToast);
    });

    // Clique no banner de gastos fixos vencidos / a vencer
    document.getElementById('open-fixed-alerts-btn')?.addEventListener('click', () => {
      store.setActiveTab('fixed-expenses');
    });

    // Alternador de perfil rápido no cabeçalho
    document.getElementById('toggle-profile-header-btn')?.addEventListener('click', () => {
      const nextProfile = activeProfile === 'ricardo' ? 'natalia' : 'ricardo';
      store.setActiveProfile(nextProfile);
      showToast(`📱 Aparelho alternado para: ${nextProfile === 'ricardo' ? 'Ricardo' : 'Natália'}`);
    });
  }

  // Inscreve a renderização nas mudanças da store
  store.subscribe(renderShell);

  // Render inicial com carregamento do IndexedDB
  renderShell();
  store.init().then(() => {
    // Inicia o motor de lembretes recorrentes (6 em 6h a partir de 2 dias antes do vencimento)
    reminderService.startDaemon((items) => {
      const hasOverdue = items.some((i) => i.status === 'overdue');
      showToast(
        hasOverdue
          ? `🚨 Atenção: Você possui ${items.length} conta(s) fixa(s) vencida(s) ou vencendo!`
          : `⏰ Lembrete (6h): ${items.length} conta(s) fixa(s) vence(m) nos próximos 2 dias!`,
        'info'
      );
    });
  });
}

window.addEventListener('DOMContentLoaded', initApp);
