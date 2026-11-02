export type UserProfile = 'ricardo' | 'natalia';

export type ExpenseNature = 'familiar' | 'individual_ricardo' | 'individual_natalia';

export type PaymentMethod = 'pix' | 'credito' | 'debito' | 'dinheiro' | 'outro';

export type IncomeType = 'salary' | 'extra' | 'reimbursement';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isActive: boolean;
  isSystem?: boolean;
  isEssential?: boolean; // Classificação para regra 50-30-20 (essencial vs estilo de vida)
}

export interface Rule {
  id: string;
  keyword: string;
  categoryId: string;
  suggestedNature?: ExpenseNature;
  matchType: 'contains' | 'exact';
  isActive: boolean;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amountCents: number; // Inteiro em centavos (ex: 12590 = R$ 125,90)
  paidBy: UserProfile;
  categoryId: string;
  nature: ExpenseNature;
  paymentMethod?: PaymentMethod;
  origin?: string;
  isInstallment: boolean;
  installmentGroupId?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  fixedExpenseId?: string; // Vínculo se foi gerado a partir de um gasto fixo
  isRefund: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface IncomeEntry {
  id: string;
  yearMonth: string; // YYYY-MM
  date: string; // YYYY-MM-DD
  description: string; // Ex: Salário Mensal, Bônus, Freela, Reembolso
  amountCents: number;
  receivedBy: UserProfile;
  type: IncomeType;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface FixedExpensePayment {
  paidAt: string; // ISO ou YYYY-MM-DD
  paidBy: UserProfile;
  amountCents: number;
  transactionId: string;
}

export interface FixedExpense {
  id: string;
  name: string; // Ex: Aluguel, Internet, Seguro Auto
  amountCents: number; // Valor pré-definido em centavos
  dueDay: number; // Dia de vencimento (1 a 31)
  categoryId: string;
  nature: ExpenseNature;
  paymentMethod?: PaymentMethod;
  isActive: boolean;
  payments: Record<string, FixedExpensePayment>; // Chave: 'YYYY-MM'
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface SyncConflict {
  id: string;
  localTx: Transaction;
  remoteTx: Transaction;
  detectedAt: string;
}

export interface Settings {
  activeProfile: UserProfile;
  lastSyncAt?: string;
  theme: 'dark' | 'light' | 'system';
}

export type ActiveTab = 'dashboard' | 'new-expense' | 'fixed-expenses' | 'history' | 'settings';
