import {
  ActiveTab,
  Category,
  ExpenseNature,
  FixedExpense,
  IncomeEntry,
  PaymentMethod,
  Rule,
  SyncConflict,
  Transaction,
  UserProfile
} from './types';
import {
  INITIAL_CATEGORIES,
  INITIAL_MOCK_FIXED_EXPENSES,
  INITIAL_MOCK_INCOMES,
  INITIAL_MOCK_TRANSACTIONS,
  INITIAL_RULES
} from './mockData';
import { addMonthsIso, getTodayIso } from './formatters';
import { dbService } from './db/indexedDb';

type Listener = () => void;

class AppStore {
  private activeTab: ActiveTab = 'dashboard';
  private selectedMonth: string = '2026-10'; // Padrão: Outubro de 2026
  private activeProfile: UserProfile = 'ricardo'; // Dono do aparelho
  private categories: Category[] = [...INITIAL_CATEGORIES];
  private rules: Rule[] = [...INITIAL_RULES];
  private transactions: Transaction[] = [...INITIAL_MOCK_TRANSACTIONS];
  private incomes: IncomeEntry[] = [...INITIAL_MOCK_INCOMES];
  private fixedExpenses: FixedExpense[] = [...INITIAL_MOCK_FIXED_EXPENSES];
  private syncConflicts: SyncConflict[] = [];
  private isLoaded: boolean = false;
  private listeners: Set<Listener> = new Set();

  constructor() {
    if (typeof localStorage !== 'undefined') {
      const savedProfile = localStorage.getItem('financa2_profile');
      if (savedProfile === 'ricardo' || savedProfile === 'natalia') {
        this.activeProfile = savedProfile;
      }
    }
  }

  public async init(forceReload: boolean = false): Promise<void> {
    if (this.isLoaded && !forceReload) return;
    try {
      const [storedCats, storedRules, storedTxs, storedIncomes, storedFixed, storedConflicts] = await Promise.all([
        dbService.getAllFromStore<Category>('categories'),
        dbService.getAllFromStore<Rule>('rules'),
        dbService.getAllFromStore<Transaction>('transactions'),
        dbService.getAllFromStore<IncomeEntry>('incomes'),
        dbService.getAllFromStore<FixedExpense>('fixed_expenses'),
        dbService.getAllFromStore<SyncConflict>('sync_conflicts')
      ]);

      if (storedCats.length > 0) this.categories = storedCats;
      if (storedRules.length > 0) this.rules = storedRules;
      if (storedTxs.length > 0) this.transactions = storedTxs;
      if (storedIncomes.length > 0) this.incomes = storedIncomes;
      if (storedFixed.length > 0) this.fixedExpenses = storedFixed;
      this.syncConflicts = storedConflicts || [];

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

  public notify(): void {
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
    return this.transactions.filter((t) => !t.deletedAt);
  }

  public getAllTransactionsRaw(): Transaction[] {
    return this.transactions;
  }

  public getTransactionsForMonth(yearMonth: string): Transaction[] {
    return this.getTransactions().filter((t) => t.date.startsWith(yearMonth));
  }

  // Getters Entradas / Receitas
  public getIncomes(): IncomeEntry[] {
    return this.incomes.filter((i) => !i.deletedAt);
  }

  public getAllIncomesRaw(): IncomeEntry[] {
    return this.incomes;
  }

  public getIncomesForMonth(yearMonth: string): IncomeEntry[] {
    return this.getIncomes().filter((i) => i.yearMonth === yearMonth);
  }

  // Getters Gastos Fixos
  public getFixedExpenses(): FixedExpense[] {
    return this.fixedExpenses.filter((f) => !f.deletedAt);
  }

  public getAllFixedExpensesRaw(): FixedExpense[] {
    return this.fixedExpenses;
  }

  // Getters Conflitos de Sincronização
  public getSyncConflicts(): SyncConflict[] {
    return this.syncConflicts;
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

  // --- TRANSAÇÕES ---
  public async addTransaction(tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
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
      this.notify();
      return createdTxs[0];
    } else {
      const newTx: Transaction = {
        ...tx,
        id,
        createdAt: now,
        updatedAt: now
      };
      this.transactions = [newTx, ...this.transactions];
      dbService.putItem('transactions', newTx).catch(() => {});
      this.notify();
      return newTx;
    }
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

    // Se a transação estiver vinculada a um gasto fixo pago, desmarca no gasto fixo correspondente
    if (target.fixedExpenseId) {
      const fixed = this.fixedExpenses.find((f) => f.id === target.fixedExpenseId);
      if (fixed) {
        const ym = target.date.slice(0, 7);
        if (fixed.payments && fixed.payments[ym]?.transactionId === id) {
          const updatedPayments = { ...fixed.payments };
          delete updatedPayments[ym];
          const updatedFixed: FixedExpense = {
            ...fixed,
            payments: updatedPayments,
            updatedAt: now
          };
          this.fixedExpenses = this.fixedExpenses.map((f) => (f.id === fixed.id ? updatedFixed : f));
          dbService.putItem('fixed_expenses', updatedFixed).catch(() => {});
        }
      }
    }

    this.notify();
  }

  public async updateTransaction(
    tx: Transaction,
    scope: 'single' | 'future' = 'single'
  ): Promise<void> {
    const now = new Date().toISOString();

    if (scope === 'future' && tx.isInstallment && tx.installmentGroupId && tx.installmentNumber) {
      // Extrai descrição base sem sufixo (1/10) ou (Parcela 1/10)
      const baseDesc = tx.description
        .replace(/\s*\((?:Parcela\s*)?\d+\/\d+\)\s*$/i, '')
        .trim();

      const updatedList: Transaction[] = [];

      this.transactions = this.transactions.map((item) => {
        if (
          !item.deletedAt &&
          item.installmentGroupId === tx.installmentGroupId &&
          (item.installmentNumber || 0) >= (tx.installmentNumber || 1)
        ) {
          const isTarget = item.id === tx.id;
          const newDesc = `${baseDesc} (${item.installmentNumber}/${item.installmentTotal})`;
          const modified: Transaction = {
            ...item,
            date: isTarget ? tx.date : item.date,
            description: newDesc,
            amountCents: tx.amountCents,
            paidBy: tx.paidBy,
            categoryId: tx.categoryId,
            nature: tx.nature,
            paymentMethod: tx.paymentMethod,
            notes: tx.notes,
            updatedAt: now
          };
          updatedList.push(modified);
          return modified;
        }
        return item;
      });

      for (const u of updatedList) {
        dbService.putItem('transactions', u).catch(() => {});
      }
    } else {
      const updated: Transaction = { ...tx, updatedAt: now };
      this.transactions = this.transactions.map((t) => (t.id === tx.id ? updated : t));
      try {
        await dbService.putItem('transactions', updated);
      } catch {
        // Fallback
      }

      // Se vinculada a gasto fixo, atualiza o registro de pagamento do mês
      if (updated.fixedExpenseId) {
        const fixed = this.fixedExpenses.find((f) => f.id === updated.fixedExpenseId);
        const ym = updated.date.slice(0, 7);
        if (fixed && fixed.payments && fixed.payments[ym]?.transactionId === updated.id) {
          const updatedFixed: FixedExpense = {
            ...fixed,
            payments: {
              ...fixed.payments,
              [ym]: {
                ...fixed.payments[ym],
                paidBy: updated.paidBy,
                amountCents: updated.amountCents
              }
            },
            updatedAt: now
          };
          this.fixedExpenses = this.fixedExpenses.map((f) => (f.id === fixed.id ? updatedFixed : f));
          dbService.putItem('fixed_expenses', updatedFixed).catch(() => {});
        }
      }
    }

    this.notify();
  }

  // --- ENTRADAS / RECEITAS (Obs 3) ---
  public async addIncome(entry: Omit<IncomeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = new Date().toISOString();
    const id = 'inc-' + Math.random().toString(36).substring(2, 9);
    const newEntry: IncomeEntry = {
      ...entry,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.incomes = [newEntry, ...this.incomes];
    try {
      await dbService.putItem('incomes', newEntry);
    } catch {
      // Fallback
    }
    this.notify();
  }

  public async updateIncome(entry: IncomeEntry): Promise<void> {
    const now = new Date().toISOString();
    const updated: IncomeEntry = { ...entry, updatedAt: now };
    this.incomes = this.incomes.map((i) => (i.id === entry.id ? updated : i));
    try {
      await dbService.putItem('incomes', updated);
    } catch {
      // Fallback
    }
    this.notify();
  }

  public async deleteIncome(id: string): Promise<void> {
    const now = new Date().toISOString();
    const target = this.incomes.find((i) => i.id === id);
    if (!target) return;
    const updated: IncomeEntry = { ...target, deletedAt: now, updatedAt: now };
    this.incomes = this.incomes.map((i) => (i.id === id ? updated : i));
    try {
      await dbService.putItem('incomes', updated);
    } catch {
      // Fallback
    }
    this.notify();
  }

  // --- GASTOS FIXOS (Obs 5) ---
  public async addFixedExpense(
    data: Omit<FixedExpense, 'id' | 'payments' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const now = new Date().toISOString();
    const id = 'fix-' + Math.random().toString(36).substring(2, 9);
    const newFixed: FixedExpense = {
      ...data,
      id,
      payments: {},
      createdAt: now,
      updatedAt: now
    };
    this.fixedExpenses = [...this.fixedExpenses, newFixed];
    try {
      await dbService.putItem('fixed_expenses', newFixed);
    } catch {
      // Fallback
    }
    this.notify();
  }

  public async updateFixedExpense(fixed: FixedExpense): Promise<void> {
    const now = new Date().toISOString();
    const updated: FixedExpense = { ...fixed, updatedAt: now };
    this.fixedExpenses = this.fixedExpenses.map((f) => (f.id === fixed.id ? updated : f));
    try {
      await dbService.putItem('fixed_expenses', updated);
    } catch {
      // Fallback
    }
    this.notify();
  }

  public async deleteFixedExpense(id: string): Promise<void> {
    const now = new Date().toISOString();
    const target = this.fixedExpenses.find((f) => f.id === id);
    if (!target) return;
    const updated: FixedExpense = { ...target, deletedAt: now, updatedAt: now };
    this.fixedExpenses = this.fixedExpenses.map((f) => (f.id === id ? updated : f));
    try {
      await dbService.putItem('fixed_expenses', updated);
    } catch {
      // Fallback
    }
    this.notify();
  }

  public async markFixedExpensePaid(
    fixedId: string,
    yearMonth: string,
    paidBy: UserProfile,
    amountCents?: number,
    paymentDateIso?: string
  ): Promise<void> {
    const fixed = this.fixedExpenses.find((f) => f.id === fixedId);
    if (!fixed) return;

    const now = new Date().toISOString();
    const finalAmount = amountCents ?? fixed.amountCents;
    const today = getTodayIso();
    const defaultDay = String(Math.min(fixed.dueDay, 28)).padStart(2, '0');
    const txDate = paymentDateIso || (today.startsWith(yearMonth) ? today : `${yearMonth}-${defaultDay}`);

    // Cria a transação correspondente para refletir no Painel e Extrato
    const createdTx = await this.addTransaction({
      date: txDate,
      description: fixed.name,
      amountCents: finalAmount,
      paidBy,
      categoryId: fixed.categoryId,
      nature: fixed.nature as ExpenseNature,
      paymentMethod: (fixed.paymentMethod as PaymentMethod) || 'pix',
      isInstallment: false,
      fixedExpenseId: fixed.id,
      isRefund: false,
      notes: 'Custo fixo mensal'
    });

    const updatedFixed: FixedExpense = {
      ...fixed,
      payments: {
        ...(fixed.payments || {}),
        [yearMonth]: {
          paidAt: txDate,
          paidBy,
          amountCents: finalAmount,
          transactionId: createdTx.id
        }
      },
      updatedAt: now
    };

    this.fixedExpenses = this.fixedExpenses.map((f) => (f.id === fixedId ? updatedFixed : f));
    try {
      await dbService.putItem('fixed_expenses', updatedFixed);
    } catch {
      // Fallback
    }
    this.notify();
  }

  public async unmarkFixedExpensePaid(fixedId: string, yearMonth: string): Promise<void> {
    const fixed = this.fixedExpenses.find((f) => f.id === fixedId);
    if (!fixed || !fixed.payments || !fixed.payments[yearMonth]) return;

    const payment = fixed.payments[yearMonth];
    const now = new Date().toISOString();

    // Remove o pagamento do mapa
    const updatedPayments = { ...fixed.payments };
    delete updatedPayments[yearMonth];

    const updatedFixed: FixedExpense = {
      ...fixed,
      payments: updatedPayments,
      updatedAt: now
    };

    this.fixedExpenses = this.fixedExpenses.map((f) => (f.id === fixedId ? updatedFixed : f));
    try {
      await dbService.putItem('fixed_expenses', updatedFixed);
    } catch {
      // Fallback
    }

    // Exclui logicamente a transação vinculada
    if (payment.transactionId) {
      await this.deleteTransaction(payment.transactionId);
    } else {
      this.notify();
    }
  }

  // --- RESOLUÇÃO DE CONFLITOS DE SINCRONISMO (Obs 4) ---
  public async addSyncConflicts(conflicts: SyncConflict[]): Promise<void> {
    if (conflicts.length === 0) return;
    const existingIds = new Set(this.syncConflicts.map((c) => c.id));
    const newOnes = conflicts.filter((c) => !existingIds.has(c.id));
    if (newOnes.length === 0) return;

    this.syncConflicts = [...this.syncConflicts, ...newOnes];
    for (const c of newOnes) {
      dbService.putItem('sync_conflicts', c).catch(() => {});
    }
    this.notify();
  }

  public async resolveSyncConflict(
    conflictId: string,
    decision: 'keep_local' | 'keep_remote' | 'keep_both'
  ): Promise<void> {
    const conflict = this.syncConflicts.find((c) => c.id === conflictId);
    if (!conflict) return;

    const now = new Date().toISOString();
    const { localTx, remoteTx } = conflict;

    // Salva par como resolvido para não perguntar novamente em syncs futuros
    const resolvedPairsRaw = localStorage.getItem('financa2_resolved_conflicts') || '[]';
    let resolvedPairs: string[] = [];
    try {
      resolvedPairs = JSON.parse(resolvedPairsRaw);
    } catch {
      resolvedPairs = [];
    }
    const pairKey = [localTx.id, remoteTx.id].sort().join('::');
    if (!resolvedPairs.includes(pairKey)) {
      resolvedPairs.push(pairKey);
      localStorage.setItem('financa2_resolved_conflicts', JSON.stringify(resolvedPairs));
    }

    if (decision === 'keep_local') {
      // Mantém o local e grava o remoto como soft-deleted para não voltar em novos syncs
      const deletedRemote: Transaction = { ...remoteTx, deletedAt: now, updatedAt: now };
      const existsRemote = this.transactions.some((t) => t.id === remoteTx.id);
      this.transactions = existsRemote
        ? this.transactions.map((t) => (t.id === remoteTx.id ? deletedRemote : t))
        : [deletedRemote, ...this.transactions];
      await dbService.putItem('transactions', deletedRemote).catch(() => {});
    } else if (decision === 'keep_remote') {
      // Exclui logicamente o local e ativa/insere o remoto
      const deletedLocal: Transaction = { ...localTx, deletedAt: now, updatedAt: now };
      const activeRemote: Transaction = { ...remoteTx, deletedAt: null, updatedAt: now };
      this.transactions = this.transactions.map((t) => (t.id === localTx.id ? deletedLocal : t));
      if (this.transactions.some((t) => t.id === remoteTx.id)) {
        this.transactions = this.transactions.map((t) => (t.id === remoteTx.id ? activeRemote : t));
      } else {
        this.transactions = [activeRemote, ...this.transactions];
      }
      await dbService.putItem('transactions', deletedLocal).catch(() => {});
      await dbService.putItem('transactions', activeRemote).catch(() => {});
    } else if (decision === 'keep_both') {
      // Garante que ambos estejam ativos no banco
      if (!this.transactions.some((t) => t.id === remoteTx.id)) {
        this.transactions = [remoteTx, ...this.transactions];
      }
      await dbService.putItem('transactions', remoteTx).catch(() => {});
    }

    this.syncConflicts = this.syncConflicts.filter((c) => c.id !== conflictId);
    await dbService.deleteItem('sync_conflicts', conflictId).catch(() => {});
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
    this.incomes = [...INITIAL_MOCK_INCOMES];
    this.fixedExpenses = [...INITIAL_MOCK_FIXED_EXPENSES];
    this.syncConflicts = [];
    this.notify();
  }
}

export const store = new AppStore();
