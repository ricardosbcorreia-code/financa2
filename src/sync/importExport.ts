import { store } from '../state';
import { dbService } from '../db/indexedDb';
import { mergeDatasets, MergeResult } from './mergeEngine';
import { Category, FixedExpense, IncomeEntry, Rule, Transaction } from '../types';

export interface BackupPayload {
  version: string;
  exportedAt: string;
  activeProfile: string;
  transactions: Transaction[];
  categories: Category[];
  rules: Rule[];
  incomes?: IncomeEntry[];
  fixedExpenses?: FixedExpense[];
}

/**
 * Valida a estrutura básica de um arquivo de backup
 */
export function validateBackupPayload(data: any): data is BackupPayload {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.transactions)) return false;
  if (!Array.isArray(data.categories)) return false;
  return true;
}

/**
 * Realiza a mesclagem dos dados de um arquivo de backup na base local
 */
export async function mergeBackupData(backupData: BackupPayload): Promise<MergeResult> {
  const localTxs = store.getAllTransactionsRaw();
  const localCats = store.getCategories();
  const localRules = store.getRules();
  const localIncomes = store.getAllIncomesRaw();
  const localFixed = store.getAllFixedExpensesRaw();

  let resolvedPairs: string[] = [];
  try {
    resolvedPairs = JSON.parse(localStorage.getItem('financa2_resolved_conflicts') || '[]');
  } catch {
    resolvedPairs = [];
  }

  const result = mergeDatasets(
    localTxs,
    backupData.transactions || [],
    localCats,
    backupData.categories || [],
    localRules,
    backupData.rules || [],
    localIncomes,
    backupData.incomes || [],
    localFixed,
    backupData.fixedExpenses || [],
    resolvedPairs
  );

  // Persistir no IndexedDB
  const db = await dbService.getDb();
  const tx = db.transaction(
    ['transactions', 'categories', 'rules', 'incomes', 'fixed_expenses', 'sync_conflicts'],
    'readwrite'
  );

  const txStore = tx.objectStore('transactions');
  const catStore = tx.objectStore('categories');
  const ruleStore = tx.objectStore('rules');
  const incStore = tx.objectStore('incomes');
  const fixStore = tx.objectStore('fixed_expenses');
  const confStore = tx.objectStore('sync_conflicts');

  result.mergedTransactions.forEach((t) => txStore.put(t));
  result.mergedCategories.forEach((c) => catStore.put(c));
  result.mergedRules.forEach((r) => ruleStore.put(r));
  result.mergedIncomes.forEach((i) => incStore.put(i));
  result.mergedFixedExpenses.forEach((f) => fixStore.put(f));
  result.conflicts.forEach((conf) => confStore.put(conf));

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Atualizar Store em memória forçando recarregamento do IndexedDB
  await store.init(true);

  return result;
}

/**
 * Restauração completa (substituição total da base)
 */
export async function restoreCompleteBackup(backupData: BackupPayload): Promise<void> {
  const db = await dbService.getDb();
  const tx = db.transaction(
    ['transactions', 'categories', 'rules', 'incomes', 'fixed_expenses', 'sync_conflicts'],
    'readwrite'
  );

  tx.objectStore('transactions').clear();
  tx.objectStore('categories').clear();
  tx.objectStore('rules').clear();
  tx.objectStore('incomes').clear();
  tx.objectStore('fixed_expenses').clear();
  tx.objectStore('sync_conflicts').clear();

  backupData.transactions.forEach((t) => tx.objectStore('transactions').put(t));
  backupData.categories.forEach((c) => tx.objectStore('categories').put(c));
  backupData.rules.forEach((r) => tx.objectStore('rules').put(r));
  (backupData.incomes || []).forEach((i) => tx.objectStore('incomes').put(i));
  (backupData.fixedExpenses || []).forEach((f) => tx.objectStore('fixed_expenses').put(f));

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  await store.init(true);
}
