import { Category, FixedExpense, IncomeEntry, Rule, Transaction } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-moradia', name: 'Moradia', icon: '🏠', color: '#3b82f6', isActive: true, isSystem: true, isEssential: true },
  { id: 'cat-alimentacao', name: 'Alimentação e supermercado', icon: '🛒', color: '#10b981', isActive: true, isSystem: true, isEssential: true },
  { id: 'cat-transporte', name: 'Transporte e veículos', icon: '🚗', color: '#f59e0b', isActive: true, isSystem: true, isEssential: true },
  { id: 'cat-saude', name: 'Saúde', icon: '💊', color: '#ef4444', isActive: true, isSystem: true, isEssential: true },
  { id: 'cat-filhos', name: 'Filhos e educação', icon: '🎓', color: '#8b5cf6', isActive: true, isSystem: true, isEssential: true },
  { id: 'cat-pets', name: 'Pets', icon: '🐾', color: '#ec4899', isActive: true, isSystem: true, isEssential: false },
  { id: 'cat-lazer', name: 'Lazer e restaurantes', icon: '🍕', color: '#14b8a6', isActive: true, isSystem: true, isEssential: false },
  { id: 'cat-assinaturas', name: 'Assinaturas e serviços', icon: '📱', color: '#6366f1', isActive: true, isSystem: true, isEssential: false },
  { id: 'cat-compras', name: 'Compras pessoais', icon: '🛍️', color: '#f97316', isActive: true, isSystem: true, isEssential: false },
  { id: 'cat-dividas', name: 'Dívidas e encargos', icon: '💳', color: '#64748b', isActive: true, isSystem: true, isEssential: true },
  { id: 'cat-patrimonio', name: 'Patrimônio e reformas', icon: '🔨', color: '#0ea5e9', isActive: true, isSystem: true, isEssential: true },
  { id: 'cat-impostos', name: 'Impostos e taxas', icon: '📄', color: '#a855f7', isActive: true, isSystem: true, isEssential: true },
  { id: 'cat-outros', name: 'Outros', icon: '📦', color: '#94a3b8', isActive: true, isSystem: true, isEssential: false }
];

export const INITIAL_RULES: Rule[] = [
  { id: 'rule-1', keyword: 'SUPERMERCADO', categoryId: 'cat-alimentacao', matchType: 'contains', isActive: true },
  { id: 'rule-2', keyword: 'PAO DE ACUCAR', categoryId: 'cat-alimentacao', matchType: 'contains', isActive: true },
  { id: 'rule-3', keyword: 'EXTRA', categoryId: 'cat-alimentacao', matchType: 'contains', isActive: true },
  { id: 'rule-4', keyword: 'POSTO', categoryId: 'cat-transporte', matchType: 'contains', isActive: true },
  { id: 'rule-5', keyword: 'IPIRANGA', categoryId: 'cat-transporte', matchType: 'contains', isActive: true },
  { id: 'rule-6', keyword: 'SHELL', categoryId: 'cat-transporte', matchType: 'contains', isActive: true },
  { id: 'rule-7', keyword: 'UBER', categoryId: 'cat-transporte', matchType: 'contains', isActive: true },
  { id: 'rule-8', keyword: 'FARMACIA', categoryId: 'cat-saude', matchType: 'contains', isActive: true },
  { id: 'rule-9', keyword: 'DROGASIL', categoryId: 'cat-saude', matchType: 'contains', isActive: true },
  { id: 'rule-10', keyword: 'NETFLIX', categoryId: 'cat-assinaturas', matchType: 'contains', isActive: true },
  { id: 'rule-11', keyword: 'SPOTIFY', categoryId: 'cat-assinaturas', matchType: 'contains', isActive: true },
  { id: 'rule-12', keyword: 'CONDOMINIO', categoryId: 'cat-moradia', matchType: 'contains', isActive: true },
  { id: 'rule-13', keyword: 'ENERGIA', categoryId: 'cat-moradia', matchType: 'contains', isActive: true },
  { id: 'rule-14', keyword: 'PET SHOP', categoryId: 'cat-pets', matchType: 'contains', isActive: true },
  { id: 'rule-15', keyword: 'RESTAURANTE', categoryId: 'cat-lazer', matchType: 'contains', isActive: true }
];

export const INITIAL_MOCK_INCOMES: IncomeEntry[] = [
  {
    id: 'inc-101',
    yearMonth: '2026-10',
    date: '2026-10-01',
    description: 'Salário Mensal',
    amountCents: 650000, // R$ 6.500,00
    receivedBy: 'ricardo',
    type: 'salary',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z'
  },
  {
    id: 'inc-102',
    yearMonth: '2026-10',
    date: '2026-10-01',
    description: 'Salário Mensal',
    amountCents: 580000, // R$ 5.800,00
    receivedBy: 'natalia',
    type: 'salary',
    createdAt: '2026-10-01T08:05:00Z',
    updatedAt: '2026-10-01T08:05:00Z'
  },
  {
    id: 'inc-103',
    yearMonth: '2026-10',
    date: '2026-10-15',
    description: 'Projeto Extra Consultoria',
    amountCents: 90000, // R$ 900,00
    receivedBy: 'ricardo',
    type: 'extra',
    createdAt: '2026-10-15T10:00:00Z',
    updatedAt: '2026-10-15T10:00:00Z'
  },
  {
    id: 'inc-201',
    yearMonth: '2026-09',
    date: '2026-09-01',
    description: 'Salário Mensal',
    amountCents: 650000,
    receivedBy: 'ricardo',
    type: 'salary',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z'
  },
  {
    id: 'inc-202',
    yearMonth: '2026-09',
    date: '2026-09-01',
    description: 'Salário Mensal',
    amountCents: 580000,
    receivedBy: 'natalia',
    type: 'salary',
    createdAt: '2026-09-01T08:05:00Z',
    updatedAt: '2026-09-01T08:05:00Z'
  }
];

export const INITIAL_MOCK_FIXED_EXPENSES: FixedExpense[] = [
  {
    id: 'fix-1',
    name: 'Condomínio do Apartamento',
    amountCents: 85000, // R$ 850,00
    dueDay: 5,
    categoryId: 'cat-moradia',
    nature: 'familiar',
    paymentMethod: 'pix',
    isActive: true,
    payments: {
      '2026-10': {
        paidAt: '2026-10-02',
        paidBy: 'ricardo',
        amountCents: 85000,
        transactionId: 'tx-101'
      },
      '2026-09': {
        paidAt: '2026-09-02',
        paidBy: 'ricardo',
        amountCents: 85000,
        transactionId: 'tx-201'
      }
    },
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-10-02T10:00:00Z'
  },
  {
    id: 'fix-2',
    name: 'Internet Fibra 600MB',
    amountCents: 12990, // R$ 129,90
    dueDay: 15,
    categoryId: 'cat-moradia',
    nature: 'familiar',
    paymentMethod: 'pix',
    isActive: true,
    payments: {},
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z'
  },
  {
    id: 'fix-3',
    name: 'Seguro do Carro',
    amountCents: 24900, // R$ 249,00
    dueDay: 20,
    categoryId: 'cat-transporte',
    nature: 'familiar',
    paymentMethod: 'credito',
    isActive: true,
    payments: {},
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z'
  },
  {
    id: 'fix-4',
    name: 'Assinatura Netflix & Spotify',
    amountCents: 7980, // R$ 79,80
    dueDay: 23,
    categoryId: 'cat-assinaturas',
    nature: 'familiar',
    paymentMethod: 'credito',
    isActive: true,
    payments: {
      '2026-10': {
        paidAt: '2026-10-23',
        paidBy: 'ricardo',
        amountCents: 7980,
        transactionId: 'tx-110'
      }
    },
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-10-23T08:00:00Z'
  }
];

// Dados fictícios para teste e visualização do protótipo (Outubro e Setembro de 2026)
export const INITIAL_MOCK_TRANSACTIONS: Transaction[] = [
  // Outubro 2026
  {
    id: 'tx-101',
    date: '2026-10-02',
    description: 'Condomínio do Apartamento',
    amountCents: 85000, // R$ 850,00
    paidBy: 'ricardo',
    categoryId: 'cat-moradia',
    nature: 'familiar',
    paymentMethod: 'pix',
    isInstallment: false,
    fixedExpenseId: 'fix-1',
    isRefund: false,
    createdAt: '2026-10-02T10:00:00Z',
    updatedAt: '2026-10-02T10:00:00Z'
  },
  {
    id: 'tx-102',
    date: '2026-10-05',
    description: 'Supermercado Pão de Açúcar (Compras do mês)',
    amountCents: 112040, // R$ 1.120,40
    paidBy: 'natalia',
    categoryId: 'cat-alimentacao',
    nature: 'familiar',
    paymentMethod: 'credito',
    origin: 'Cartão Nubank',
    isInstallment: false,
    isRefund: false,
    createdAt: '2026-10-05T14:30:00Z',
    updatedAt: '2026-10-05T14:30:00Z'
  },
  {
    id: 'tx-103',
    date: '2026-10-08',
    description: 'Abastecimento Posto Shell',
    amountCents: 24500, // R$ 245,00
    paidBy: 'ricardo',
    categoryId: 'cat-transporte',
    nature: 'familiar',
    paymentMethod: 'debito',
    isInstallment: false,
    isRefund: false,
    createdAt: '2026-10-08T09:15:00Z',
    updatedAt: '2026-10-08T09:15:00Z'
  },
  {
    id: 'tx-104',
    date: '2026-10-10',
    description: 'Energia Elétrica (Enel)',
    amountCents: 19580, // R$ 195,80
    paidBy: 'ricardo',
    categoryId: 'cat-moradia',
    nature: 'familiar',
    paymentMethod: 'pix',
    isInstallment: false,
    isRefund: false,
    createdAt: '2026-10-10T11:00:00Z',
    updatedAt: '2026-10-10T11:00:00Z'
  },
  {
    id: 'tx-105',
    date: '2026-10-12',
    description: 'Jantar Restaurante Pizzaria',
    amountCents: 16500, // R$ 165,00
    paidBy: 'natalia',
    categoryId: 'cat-lazer',
    nature: 'familiar',
    paymentMethod: 'credito',
    isInstallment: false,
    isRefund: false,
    createdAt: '2026-10-12T21:40:00Z',
    updatedAt: '2026-10-12T21:40:00Z'
  },
  {
    id: 'tx-106',
    date: '2026-10-15',
    description: 'Drogasil Vitaminas e Remédios',
    amountCents: 13590, // R$ 135,90
    paidBy: 'natalia',
    categoryId: 'cat-saude',
    nature: 'familiar',
    paymentMethod: 'pix',
    isInstallment: false,
    isRefund: false,
    createdAt: '2026-10-15T16:20:00Z',
    updatedAt: '2026-10-15T16:20:00Z'
  },
  {
    id: 'tx-107',
    date: '2026-10-17',
    description: 'Ração e Vacina Pet Shop',
    amountCents: 21000, // R$ 210,00
    paidBy: 'ricardo',
    categoryId: 'cat-pets',
    nature: 'familiar',
    paymentMethod: 'credito',
    isInstallment: false,
    isRefund: false,
    createdAt: '2026-10-17T11:30:00Z',
    updatedAt: '2026-10-17T11:30:00Z'
  },
  {
    id: 'tx-108',
    date: '2026-10-19',
    description: 'Livros de Estudo (Ricardo)',
    amountCents: 18000, // R$ 180,00
    paidBy: 'ricardo',
    categoryId: 'cat-compras',
    nature: 'individual_ricardo',
    paymentMethod: 'credito',
    isInstallment: false,
    isRefund: false,
    notes: 'Livros técnicos de engenharia',
    createdAt: '2026-10-19T18:00:00Z',
    updatedAt: '2026-10-19T18:00:00Z'
  },
  {
    id: 'tx-109',
    date: '2026-10-21',
    description: 'Salão de Beleza e Cuidados (Natália)',
    amountCents: 22000, // R$ 220,00
    paidBy: 'natalia',
    categoryId: 'cat-compras',
    nature: 'individual_natalia',
    paymentMethod: 'pix',
    isInstallment: false,
    isRefund: false,
    createdAt: '2026-10-21T17:15:00Z',
    updatedAt: '2026-10-21T17:15:00Z'
  },
  {
    id: 'tx-110',
    date: '2026-10-23',
    description: 'Assinatura Netflix & Spotify',
    amountCents: 7980, // R$ 79,80
    paidBy: 'ricardo',
    categoryId: 'cat-assinaturas',
    nature: 'familiar',
    paymentMethod: 'credito',
    isInstallment: false,
    fixedExpenseId: 'fix-4',
    isRefund: false,
    createdAt: '2026-10-23T08:00:00Z',
    updatedAt: '2026-10-23T08:00:00Z'
  },
  {
    id: 'tx-111',
    date: '2026-10-24',
    description: 'Geladeira Nova (1/10)',
    amountCents: 28900, // R$ 289,00
    paidBy: 'ricardo',
    categoryId: 'cat-patrimonio',
    nature: 'familiar',
    paymentMethod: 'credito',
    isInstallment: true,
    installmentGroupId: 'grp-geladeira',
    installmentNumber: 1,
    installmentTotal: 10,
    isRefund: false,
    notes: 'Compra das Casas Bahia',
    createdAt: '2026-10-24T15:00:00Z',
    updatedAt: '2026-10-24T15:00:00Z'
  },
  {
    id: 'tx-112',
    date: '2026-11-24',
    description: 'Geladeira Nova (2/10)',
    amountCents: 28900, // R$ 289,00
    paidBy: 'ricardo',
    categoryId: 'cat-patrimonio',
    nature: 'familiar',
    paymentMethod: 'credito',
    isInstallment: true,
    installmentGroupId: 'grp-geladeira',
    installmentNumber: 2,
    installmentTotal: 10,
    isRefund: false,
    notes: 'Compra das Casas Bahia',
    createdAt: '2026-10-24T15:00:00Z',
    updatedAt: '2026-10-24T15:00:00Z'
  },

  // Setembro 2026 (Para permitir o teste real do comparativo com mês anterior)
  {
    id: 'tx-201',
    date: '2026-09-02',
    description: 'Condomínio do Apartamento',
    amountCents: 85000,
    paidBy: 'ricardo',
    categoryId: 'cat-moradia',
    nature: 'familiar',
    paymentMethod: 'pix',
    isInstallment: false,
    fixedExpenseId: 'fix-1',
    isRefund: false,
    createdAt: '2026-09-02T10:00:00Z',
    updatedAt: '2026-09-02T10:00:00Z'
  },
  {
    id: 'tx-202',
    date: '2026-09-06',
    description: 'Supermercado Extra (Mensal)',
    amountCents: 125000,
    paidBy: 'natalia',
    categoryId: 'cat-alimentacao',
    nature: 'familiar',
    paymentMethod: 'credito',
    isInstallment: false,
    isRefund: false,
    createdAt: '2026-09-06T14:00:00Z',
    updatedAt: '2026-09-06T14:00:00Z'
  },
  {
    id: 'tx-203',
    date: '2026-09-11',
    description: 'Manutenção do Carro e Revisão',
    amountCents: 68000,
    paidBy: 'ricardo',
    categoryId: 'cat-transporte',
    nature: 'familiar',
    paymentMethod: 'credito',
    isInstallment: false,
    isRefund: false,
    createdAt: '2026-09-11T16:00:00Z',
    updatedAt: '2026-09-11T16:00:00Z'
  },
  {
    id: 'tx-204',
    date: '2026-09-15',
    description: 'Energia Elétrica',
    amountCents: 18850,
    paidBy: 'ricardo',
    categoryId: 'cat-moradia',
    nature: 'familiar',
    paymentMethod: 'pix',
    isInstallment: false,
    isRefund: false,
    createdAt: '2026-09-15T10:00:00Z',
    updatedAt: '2026-09-15T10:00:00Z'
  },
  {
    id: 'tx-205',
    date: '2026-09-20',
    description: 'Passeio Parque e Restaurante',
    amountCents: 21500,
    paidBy: 'natalia',
    categoryId: 'cat-lazer',
    nature: 'familiar',
    paymentMethod: 'credito',
    isInstallment: false,
    isRefund: false,
    createdAt: '2026-09-20T20:00:00Z',
    updatedAt: '2026-09-20T20:00:00Z'
  }
];
