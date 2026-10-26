import { store } from '../state';
import { dbService } from '../db/indexedDb';
import { mergeDatasets, MergeResult } from './mergeEngine';
import { Category, Rule, Transaction } from '../types';

export interface BackupPayload {
  version: string;
  exportedAt: string;
  activeProfile: string;
  transactions: Transaction[];
  categories: Category[];
  rules: Rule[];
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

  const result = mergeDatasets(
    localTxs,
    backupData.transactions || [],
    localCats,
    backupData.categories || [],
    localRules,
    backupData.rules || []
  );

  // Persistir no IndexedDB
  const db = await dbService.getDb();
  const tx = db.transaction(['transactions', 'categories', 'rules'], 'readwrite');

  const txStore = tx.objectStore('transactions');
  const catStore = tx.objectStore('categories');
  const ruleStore = tx.objectStore('rules');

  result.mergedTransactions.forEach((t) => txStore.put(t));
  result.mergedCategories.forEach((c) => catStore.put(c));
  result.mergedRules.forEach((r) => ruleStore.put(r));

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Atualizar Store em memória
  await store.init();

  return result;
}

/**
 * Restauração completa (substituição total da base)
 */
export async function restoreCompleteBackup(backupData: BackupPayload): Promise<void> {
  const db = await dbService.getDb();
  const tx = db.transaction(['transactions', 'categories', 'rules'], 'readwrite');

  tx.objectStore('transactions').clear();
  tx.objectStore('categories').clear();
  tx.objectStore('rules').clear();

  backupData.transactions.forEach((t) => tx.objectStore('transactions').put(t));
  backupData.categories.forEach((c) => tx.objectStore('categories').put(c));
  backupData.rules.forEach((r) => tx.objectStore('rules').put(r));

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  await store.init();
}
