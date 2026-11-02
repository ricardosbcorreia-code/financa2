import { Category, FixedExpense, IncomeEntry, Rule, SyncConflict, Transaction } from '../types';

export interface MergeResult {
  addedCount: number;
  updatedCount: number;
  unchangedCount: number;
  conflicts: SyncConflict[];
  mergedTransactions: Transaction[];
  mergedCategories: Category[];
  mergedRules: Rule[];
  mergedIncomes: IncomeEntry[];
  mergedFixedExpenses: FixedExpense[];
}

function daysBetweenDates(dateA: string, dateB: string): number {
  const [ya, ma, da] = dateA.split('-').map(Number);
  const [yb, mb, db] = dateB.split('-').map(Number);
  const utcA = Date.UTC(ya, ma - 1, da);
  const utcB = Date.UTC(yb, mb - 1, db);
  return Math.abs(Math.round((utcA - utcB) / (1000 * 60 * 60 * 24)));
}

/**
 * Algoritmo de Mesclagem Last-Write-Wins (LWW) com detecção inteligente de duplicidades/pendências (Obs 4).
 * Garante que dados de ambos os smartphones sejam unidos sem duplicidade e com respeito a exclusões.
 */
export function mergeDatasets(
  localTxs: Transaction[],
  remoteTxs: Transaction[],
  localCats: Category[],
  remoteCats: Category[],
  localRules: Rule[],
  remoteRules: Rule[],
  localIncomes: IncomeEntry[] = [],
  remoteIncomes: IncomeEntry[] = [],
  localFixed: FixedExpense[] = [],
  remoteFixed: FixedExpense[] = [],
  resolvedPairs: string[] = []
): MergeResult {
  let addedCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  const conflicts: SyncConflict[] = [];

  const resolvedSet = new Set(resolvedPairs);
  const nowIso = new Date().toISOString();

  // 1. Mesclagem de Transações
  const txMap = new Map<string, Transaction>();
  for (const tx of localTxs) {
    txMap.set(tx.id, tx);
  }

  for (const remote of remoteTxs) {
    const local = txMap.get(remote.id);

    if (!local) {
      // Verifica se há suspeita de duplicidade no aparelho local:
      // Mesmo valor + Mesma categoria + faixa de data <= 3 dias + descrição escrita diferente + ambos ativos
      let suspectedLocal: Transaction | undefined;

      if (!remote.deletedAt) {
        suspectedLocal = localTxs.find((l) => {
          if (l.deletedAt) return false;
          if (l.id === remote.id) return false;
          if (l.amountCents !== remote.amountCents) return false;
          if (l.categoryId !== remote.categoryId) return false;

          const diffDays = daysBetweenDates(l.date, remote.date);
          if (diffDays > 3) return false;

          const descLocal = l.description.trim().toLowerCase();
          const descRemote = remote.description.trim().toLowerCase();

          // Se for descrição diferente (Obs 4), dispara pendência de escolha
          if (descLocal !== descRemote) {
            const pairKey = [l.id, remote.id].sort().join('::');
            if (!resolvedSet.has(pairKey)) {
              return true;
            }
          }
          return false;
        });
      }

      if (suspectedLocal) {
        const conflictId = 'conf-' + [suspectedLocal.id, remote.id].sort().join('-');
        conflicts.push({
          id: conflictId,
          localTx: suspectedLocal,
          remoteTx: remote,
          detectedAt: nowIso
        });
        // Não insere automaticamente na lista final até que o usuário escolha na fila de pendências
      } else {
        // Nova transação vinda do outro aparelho sem conflito
        txMap.set(remote.id, remote);
        addedCount++;
      }
    } else {
      // Ambos possuem o registro de mesmo ID: resolve por Last-Write-Wins (updatedAt)
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

  // 4. Mesclagem de Entradas Mensais (LWW)
  const incMap = new Map<string, IncomeEntry>();
  for (const inc of localIncomes) {
    incMap.set(inc.id, inc);
  }
  for (const remote of remoteIncomes) {
    const local = incMap.get(remote.id);
    if (!local) {
      incMap.set(remote.id, remote);
    } else {
      const localTime = new Date(local.updatedAt || local.createdAt).getTime();
      const remoteTime = new Date(remote.updatedAt || remote.createdAt).getTime();
      if (remoteTime > localTime) {
        incMap.set(remote.id, remote);
      }
    }
  }

  // 5. Mesclagem de Gastos Fixos (LWW + união de pagamentos mensais)
  const fixMap = new Map<string, FixedExpense>();
  for (const f of localFixed) {
    fixMap.set(f.id, f);
  }
  for (const remote of remoteFixed) {
    const local = fixMap.get(remote.id);
    if (!local) {
      fixMap.set(remote.id, remote);
    } else {
      const localTime = new Date(local.updatedAt || local.createdAt).getTime();
      const remoteTime = new Date(remote.updatedAt || remote.createdAt).getTime();
      const mergedPayments = { ...(local.payments || {}), ...(remote.payments || {}) };
      if (remoteTime > localTime) {
        fixMap.set(remote.id, { ...remote, payments: mergedPayments });
      } else {
        fixMap.set(local.id, { ...local, payments: mergedPayments });
      }
    }
  }

  return {
    addedCount,
    updatedCount,
    unchangedCount,
    conflicts,
    mergedTransactions: Array.from(txMap.values()),
    mergedCategories: Array.from(catMap.values()),
    mergedRules: Array.from(ruleMap.values()),
    mergedIncomes: Array.from(incMap.values()),
    mergedFixedExpenses: Array.from(fixMap.values())
  };
}
