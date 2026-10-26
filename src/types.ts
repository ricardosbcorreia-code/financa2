export type UserProfile = 'ricardo' | 'natalia';

export type ExpenseNature = 'familiar' | 'individual_ricardo' | 'individual_natalia';

export type PaymentMethod = 'pix' | 'credito' | 'debito' | 'dinheiro' | 'outro';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isActive: boolean;
  isSystem?: boolean;
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
  isRefund: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Settings {
  activeProfile: UserProfile;
  lastSyncAt?: string;
  theme: 'dark' | 'light' | 'system';
}

export type ActiveTab = 'dashboard' | 'new-expense' | 'history' | 'settings';
