import { ActiveTab, Category, Rule, Transaction, UserProfile } from './types';
import { INITIAL_CATEGORIES, INITIAL_MOCK_TRANSACTIONS, INITIAL_RULES } from './mockData';
import { addMonthsIso } from './formatters';
import { dbService } from './db/indexedDb';

type Listener = () => void;

class AppStore {
  private activeTab: ActiveTab = 'dashboard';
  private selectedMonth: string = '2026-10'; // Padrão: Outubro de 2026
  private activeProfile: UserProfile = 'ricardo'; // Dono do aparelho
  private categories: Category[] = [...INITIAL_CATEGORIES];
  private rules: Rule[] = [...INITIAL_RULES];
  private transactions: Transaction[] = [...INITIAL_MOCK_TRANSACTIONS];
  private isLoaded: boolean = false;
  private listeners: Set<Listener> = new Set();

  constructor() {
    // Carregar configurações locais salvas em localStorage imediatamente
    const savedProfile = localStorage.getItem('financa2_profile');
    if (savedProfile === 'ricardo' || savedProfile === 'natalia') {
      this.activeProfile = savedProfile;
    }
  }

  public async init(): Promise<void> {
    if (this.isLoaded) return;
    try {
      const [storedCats, storedRules, storedTxs] = await Promise.all([
        dbService.getAllFromStore<Category>('categories'),
        dbService.getAllFromStore<Rule>('rules'),
        dbService.getAllFromStore<Transaction>('transactions')
      ]);

      if (storedCats.length > 0) this.categories = storedCats;
      if (storedRules.length > 0) this.rules = storedRules;
      if (storedTxs.length > 0) this.transactions = storedTxs;

      this.isLoaded = true;
      this.notify();
    } catch (err) {
      console.warn('Erro ao carregar dados do IndexedDB, usando memória:', err);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  // Getters
  public getActiveTab(): ActiveTab {
    return this.activeTab;
  }

  public getSelectedMonth(): string {
    return this.selectedMonth;
  }

  public getActiveProfile(): UserProfile {
    return this.activeProfile;
  }

  public getCategories(): Category[] {
    return this.categories;
  }

  public getRules(): Rule[] {
    return this.rules;
  }

  public getTransactions(): Transaction[] {
    // Retorna apenas transações não excluídas logicamente
    return this.transactions.filter((t) => !t.deletedAt);
  }

  public getAllTransactionsRaw(): Transaction[] {
    return this.transactions;
  }

  public getTransactionsForMonth(yearMonth: string): Transaction[] {
    return this.getTransactions().filter((t) => t.date.startsWith(yearMonth));
  }

  // Actions
  public setActiveTab(tab: ActiveTab): void {
    this.activeTab = tab;
    this.notify();
  }

  public setSelectedMonth(month: string): void {
    this.selectedMonth = month;
    this.notify();
  }

  public nextMonth(): void {
    const next = addMonthsIso(`${this.selectedMonth}-01`, 1).slice(0, 7);
    this.setSelectedMonth(next);
  }

  public prevMonth(): void {
    const prev = addMonthsIso(`${this.selectedMonth}-01`, -1).slice(0, 7);
    this.setSelectedMonth(prev);
  }

  public async setActiveProfile(profile: UserProfile): Promise<void> {
    this.activeProfile = profile;
    localStorage.setItem('financa2_profile', profile);
    try {
      await dbService.putItem('settings', { key: 'activeProfile', value: profile });
    } catch {
      // Ignora erro se db offline
    }
    this.notify();
  }

  public async addTransaction(tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = new Date().toISOString();
    const id = 'tx-' + Math.random().toString(36).substring(2, 9);

    if (tx.isInstallment && tx.installmentTotal && tx.installmentTotal > 1) {
      const groupId = 'grp-' + Math.random().toString(36).substring(2, 9);
      const totalParts = tx.installmentTotal;
      const baseAmount = tx.amountCents;
      const createdTxs: Transaction[] = [];

      for (let i = 1; i <= totalParts; i++) {
        const installmentDate = addMonthsIso(tx.date, i - 1);
        const item: Transaction = {
          ...tx,
          id: `${groupId}-p${i}`,
          date: installmentDate,
          description: `${tx.description} (${i}/${totalParts})`,
          amountCents: baseAmount,
          isInstallment: true,
          installmentGroupId: groupId,
          installmentNumber: i,
          installmentTotal: totalParts,
          createdAt: now,
          updatedAt: now
        };
        createdTxs.push(item);
        dbService.putItem('transactions', item).catch(() => {});
      }

      this.transactions = [...createdTxs, ...this.transactions];
    } else {
      const newTx: Transaction = {
        ...tx,
        id,
        createdAt: now,
        updatedAt: now
      };
      this.transactions = [newTx, ...this.transactions];
      dbService.putItem('transactions', newTx).catch(() => {});
    }

    this.notify();
  }

  public async deleteTransaction(id: string): Promise<void> {
    const now = new Date().toISOString();
    const target = this.transactions.find((t) => t.id === id);
    if (!target) return;

    const updated: Transaction = { ...target, deletedAt: now, updatedAt: now };
    this.transactions = this.transactions.map((t) => (t.id === id ? updated : t));

    try {
      await dbService.putItem('transactions', updated);
    } catch {
      // Fallback
    }

    this.notify();
  }

  public async updateTransaction(tx: Transaction): Promise<void> {
    const now = new Date().toISOString();
    const updated: Transaction = { ...tx, updatedAt: now };
    this.transactions = this.transactions.map((t) => (t.id === tx.id ? updated : t));
    try {
      await dbService.putItem('transactions', updated);
    } catch {
      // Fallback
    }
    this.notify();
  }

  // Gestão de Categorias
  public async addCategory(cat: Omit<Category, 'id'>): Promise<void> {
    const id = 'cat-' + Math.random().toString(36).substring(2, 9);
    const newCat: Category = { ...cat, id };
    this.categories.push(newCat);
    try {
      await dbService.putItem('categories', newCat);
    } catch {
      // Fallback
    }
    this.notify();
  }

  public async toggleCategory(id: string): Promise<void> {
    const target = this.categories.find((c) => c.id === id);
    if (!target) return;
    target.isActive = !target.isActive;
    try {
      await dbService.putItem('categories', target);
    } catch {
      // Fallback
    }
    this.notify();
  }

  // Gestão de Regras
  public async addRule(rule: Omit<Rule, 'id'>): Promise<void> {
    const id = 'rule-' + Math.random().toString(36).substring(2, 9);
    const newRule: Rule = { ...rule, id };
    this.rules.push(newRule);
    try {
      await dbService.putItem('rules', newRule);
    } catch {
      // Fallback
    }
    this.notify();
  }

  public async toggleRule(id: string): Promise<void> {
    const target = this.rules.find((r) => r.id === id);
    if (!target) return;
    target.isActive = !target.isActive;
    try {
      await dbService.putItem('rules', target);
    } catch {
      // Fallback
    }
    this.notify();
  }

  public async deleteRule(id: string): Promise<void> {
    this.rules = this.rules.filter((r) => r.id !== id);
    try {
      await dbService.deleteItem('rules', id);
    } catch {
      // Fallback
    }
    this.notify();
  }

  public async restoreMockData(): Promise<void> {
    await dbService.resetAllToMockData();
    this.transactions = [...INITIAL_MOCK_TRANSACTIONS];
    this.categories = [...INITIAL_CATEGORIES];
    this.rules = [...INITIAL_RULES];
    this.notify();
  }
}

export const store = new AppStore();
