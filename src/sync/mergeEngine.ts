import { Category, Rule, Transaction } from '../types';

export interface MergeResult {
  addedCount: number;
  updatedCount: number;
  unchangedCount: number;
  mergedTransactions: Transaction[];
  mergedCategories: Category[];
  mergedRules: Rule[];
}

/**
 * Algoritmo de Mesclagem Last-Write-Wins (LWW) para sincronização P2P e importação de backups.
 * Garante que dados de ambos os smartphones sejam unidos sem duplicidade e com respeito a exclusões.
 */
export function mergeDatasets(
  localTxs: Transaction[],
  remoteTxs: Transaction[],
  localCats: Category[],
  remoteCats: Category[],
  localRules: Rule[],
  remoteRules: Rule[]
): MergeResult {
  let addedCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;

  // 1. Mesclagem de Transações
  const txMap = new Map<string, Transaction>();
  for (const tx of localTxs) {
    txMap.set(tx.id, tx);
  }

  for (const remote of remoteTxs) {
    const local = txMap.get(remote.id);

    if (!local) {
      // Nova transação vinda do outro aparelho
      txMap.set(remote.id, remote);
      addedCount++;
    } else {
      // Ambos possuem o registro: resolve por Last-Write-Wins (updatedAt)
      const localTime = new Date(local.updatedAt || local.createdAt).getTime();
      const remoteTime = new Date(remote.updatedAt || remote.createdAt).getTime();

      if (remoteTime > localTime) {
        txMap.set(remote.id, remote);
        updatedCount++;
      } else {
        unchangedCount++;
      }
    }
  }

  // 2. Mesclagem de Categorias (preserva existentes, adiciona novas)
  const catMap = new Map<string, Category>();
  for (const cat of localCats) {
    catMap.set(cat.id, cat);
  }
  for (const remote of remoteCats) {
    if (!catMap.has(remote.id)) {
      catMap.set(remote.id, remote);
    }
  }

  // 3. Mesclagem de Regras (preserva existentes, adiciona novas palavras-chave)
  const ruleMap = new Map<string, Rule>();
  for (const rule of localRules) {
    ruleMap.set(rule.id, rule);
  }
  for (const remote of remoteRules) {
    if (!ruleMap.has(remote.id)) {
      ruleMap.set(remote.id, remote);
    }
  }

  return {
    addedCount,
    updatedCount,
    unchangedCount,
    mergedTransactions: Array.from(txMap.values()),
    mergedCategories: Array.from(catMap.values()),
    mergedRules: Array.from(ruleMap.values())
  };
}
