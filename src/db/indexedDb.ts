import { Category, FixedExpense, IncomeEntry } from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_MOCK_FIXED_EXPENSES,
  INITIAL_MOCK_INCOMES,
  INITIAL_MOCK_TRANSACTIONS,
  INITIAL_RULES
} from '../mockData';

const DB_NAME = 'financa2_db';
const DB_VERSION = 2;

export class DatabaseService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  public async getDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store: transações
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('date', 'date', { unique: false });
          txStore.createIndex('categoryId', 'categoryId', { unique: false });
          txStore.createIndex('paidBy', 'paidBy', { unique: false });
          txStore.createIndex('deletedAt', 'deletedAt', { unique: false });
        }

        // Store: categorias
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }

        // Store: regras de classificação
        if (!db.objectStoreNames.contains('rules')) {
          db.createObjectStore('rules', { keyPath: 'id' });
        }

        // Store: configurações do aparelho
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Store (v2): entradas / receitas mensais
        if (!db.objectStoreNames.contains('incomes')) {
          const incStore = db.createObjectStore('incomes', { keyPath: 'id' });
          incStore.createIndex('yearMonth', 'yearMonth', { unique: false });
          incStore.createIndex('receivedBy', 'receivedBy', { unique: false });
        }

        // Store (v2): gastos fixos
        if (!db.objectStoreNames.contains('fixed_expenses')) {
          db.createObjectStore('fixed_expenses', { keyPath: 'id' });
        }

        // Store (v2): conflitos / pendências de sincronização
        if (!db.objectStoreNames.contains('sync_conflicts')) {
          db.createObjectStore('sync_conflicts', { keyPath: 'id' });
        }
      };

      request.onsuccess = async (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        // Solicita armazenamento persistente no celular se disponível
        if (navigator.storage && navigator.storage.persist) {
          try {
            await navigator.storage.persist();
          } catch {
            // Ignora se não for concedido
          }
        }
        await this.seedInitialDataIfEmpty(this.db);
        resolve(this.db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.initPromise;
  }

  private async seedInitialDataIfEmpty(db: IDBDatabase): Promise<void> {
    const categories = await this.getAllFromStore<Category>('categories');
    if (categories.length === 0) {
      const tx = db.transaction(
        ['categories', 'rules', 'transactions', 'incomes', 'fixed_expenses', 'settings'],
        'readwrite'
      );
      const catStore = tx.objectStore('categories');
      INITIAL_CATEGORIES.forEach((c) => catStore.put(c));

      const ruleStore = tx.objectStore('rules');
      INITIAL_RULES.forEach((r) => ruleStore.put(r));

      const txStore = tx.objectStore('transactions');
      INITIAL_MOCK_TRANSACTIONS.forEach((t) => txStore.put(t));

      const incStore = tx.objectStore('incomes');
      INITIAL_MOCK_INCOMES.forEach((inc) => incStore.put(inc));

      const fixStore = tx.objectStore('fixed_expenses');
      INITIAL_MOCK_FIXED_EXPENSES.forEach((f) => fixStore.put(f));

      const settingsStore = tx.objectStore('settings');
      settingsStore.put({ key: 'activeProfile', value: 'ricardo' });

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } else {
      // Caso venha da v1 sem incomes ou fixed_expenses populados
      const [incomes, fixed] = await Promise.all([
        this.getAllFromStore<IncomeEntry>('incomes'),
        this.getAllFromStore<FixedExpense>('fixed_expenses')
      ]);
      if (incomes.length === 0 && fixed.length === 0) {
        const tx = db.transaction(['incomes', 'fixed_expenses'], 'readwrite');
        INITIAL_MOCK_INCOMES.forEach((inc) => tx.objectStore('incomes').put(inc));
        INITIAL_MOCK_FIXED_EXPENSES.forEach((f) => tx.objectStore('fixed_expenses').put(f));
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }
    }
  }

  // Métodos genéricos auxiliares
  public async getAllFromStore<T>(storeName: string): Promise<T[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  public async putItem<T>(storeName: string, item: T): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteItem(storeName: string, key: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async clearStore(storeName: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async resetAllToMockData(): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(
      ['categories', 'rules', 'transactions', 'incomes', 'fixed_expenses', 'sync_conflicts'],
      'readwrite'
    );
    tx.objectStore('categories').clear();
    tx.objectStore('rules').clear();
    tx.objectStore('transactions').clear();
    tx.objectStore('incomes').clear();
    tx.objectStore('fixed_expenses').clear();
    tx.objectStore('sync_conflicts').clear();

    INITIAL_CATEGORIES.forEach((c) => tx.objectStore('categories').put(c));
    INITIAL_RULES.forEach((r) => tx.objectStore('rules').put(r));
    INITIAL_MOCK_TRANSACTIONS.forEach((t) => tx.objectStore('transactions').put(t));
    INITIAL_MOCK_INCOMES.forEach((i) => tx.objectStore('incomes').put(i));
    INITIAL_MOCK_FIXED_EXPENSES.forEach((f) => tx.objectStore('fixed_expenses').put(f));

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const dbService = new DatabaseService();
