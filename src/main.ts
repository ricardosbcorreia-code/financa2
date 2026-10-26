import './styles/theme.css';
import './styles/main.css';
import './styles/components.css';

import { store } from './state';
import { renderDashboard } from './components/Dashboard';
import { renderExpenseForm } from './components/ExpenseForm';
import { renderHistoryList } from './components/HistoryList';
import { renderSettingsView } from './components/SettingsView';
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

      <!-- Área de Conteúdo da Aba Ativa -->
      <main class="app-content" id="tab-content"></main>

      <!-- Barra de Navegação Inferior Móvel -->
      <nav class="bottom-nav">
        <button class="nav-item ${activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
          <span class="nav-icon">📊</span>
          <span>Painel</span>
        </button>

        <button class="nav-item primary-action ${activeTab === 'new-expense' ? 'active' : ''}" data-tab="new-expense">
          <span class="nav-icon" style="font-size: 1.4rem;">➕</span>
          <span>Novo Gasto</span>
        </button>

        <button class="nav-item ${activeTab === 'history' ? 'active' : ''}" data-tab="history">
          <span class="nav-icon">📋</span>
          <span>Extrato</span>
        </button>

        <button class="nav-item ${activeTab === 'settings' ? 'active' : ''}" data-tab="settings">
          <span class="nav-icon">⚙️</span>
          <span>Ajustes</span>
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
  store.init();
}

window.addEventListener('DOMContentLoaded', initApp);

