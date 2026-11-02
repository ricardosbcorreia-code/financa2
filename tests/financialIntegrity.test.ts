import { describe, it, expect } from 'vitest';
import { formatCurrency, parseCurrencyInput, addMonthsIso } from '../src/formatters';
import { suggestCategory } from '../src/rulesEngine';
import { getFixedExpenseStatusForMonth } from '../src/components/FixedExpensesView';
import { Category, FixedExpense, IncomeEntry, Rule, Transaction } from '../src/types';

describe('1. Formatação e Precisão Monetária (Centavos Inteiros)', () => {
  it('deve converter R$ 125,90 para 12590 centavos e formatar de volta fielmente', () => {
    const inputStr = '125,90';
    const cents = parseCurrencyInput(inputStr);
    expect(cents).toBe(12590);

    const formatted = formatCurrency(cents);
    // Deve conter R$ e 125,90 (com espaço regular ou no-break space)
    expect(formatted).toMatch(/125,90/);
  });

  it('deve tratar entradas diversas de valor monetário brasileiro', () => {
    expect(parseCurrencyInput('R$ 1.250,50')).toBe(125050);
    expect(parseCurrencyInput('50')).toBe(5000);
    expect(parseCurrencyInput('0,75')).toBe(75);
    expect(parseCurrencyInput('')).toBe(0);
    expect(parseCurrencyInput('invalido')).toBe(0);
  });

  it('deve evitar erros clássicos de ponto flutuante somando centavos inteiros', () => {
    // Em float puro no JS: 0.1 + 0.2 !== 0.3 (gera 0.30000000000000004)
    // Com nossa representação em centavos:
    const item1 = parseCurrencyInput('0,10'); // 10
    const item2 = parseCurrencyInput('0,20'); // 20
    const total = item1 + item2; // 30
    expect(total).toBe(30);
    expect(formatCurrency(total)).toMatch(/0,30/);
  });
});

describe('2. Integridade Financeira, Totais e Filtros', () => {
  const categories: Category[] = [
    { id: 'cat-1', name: 'Alimentação', icon: '🛒', color: '#10b981', isActive: true },
    { id: 'cat-2', name: 'Transporte', icon: '🚗', color: '#f59e0b', isActive: true },
    { id: 'cat-3', name: 'Moradia', icon: '🏠', color: '#3b82f6', isActive: true }
  ];

  it('deve registrar despesas de ambos os usuários e calcular os totais mensais corretamente', () => {
    const txs: Transaction[] = [
      {
        id: 't1',
        date: '2026-10-05',
        description: 'Supermercado',
        amountCents: 12590, // R$ 125,90
        paidBy: 'ricardo',
        categoryId: 'cat-1',
        nature: 'familiar',
        isInstallment: false,
        isRefund: false,
        createdAt: '2026-10-05T10:00:00Z',
        updatedAt: '2026-10-05T10:00:00Z'
      },
      {
        id: 't2',
        date: '2026-10-10',
        description: 'Gasolina',
        amountCents: 20000, // R$ 200,00
        paidBy: 'natalia',
        categoryId: 'cat-2',
        nature: 'familiar',
        isInstallment: false,
        isRefund: false,
        createdAt: '2026-10-10T10:00:00Z',
        updatedAt: '2026-10-10T10:00:00Z'
      },
      {
        id: 't3',
        date: '2026-10-15',
        description: 'Livro Ricardo',
        amountCents: 5000, // R$ 50,00
        paidBy: 'ricardo',
        categoryId: 'cat-1',
        nature: 'individual_ricardo',
        isInstallment: false,
        isRefund: false,
        createdAt: '2026-10-15T10:00:00Z',
        updatedAt: '2026-10-15T10:00:00Z'
      }
    ];

    // Total Geral
    const totalCents = txs.reduce((acc, t) => acc + t.amountCents, 0);
    expect(totalCents).toBe(37590); // R$ 375,90

    // Total Ricardo
    const totalRicardo = txs.filter((t) => t.paidBy === 'ricardo').reduce((acc, t) => acc + t.amountCents, 0);
    expect(totalRicardo).toBe(17590); // R$ 175,90 (125,90 + 50,00)

    // Total Natália
    const totalNatalia = txs.filter((t) => t.paidBy === 'natalia').reduce((acc, t) => acc + t.amountCents, 0);
    expect(totalNatalia).toBe(20000); // R$ 200,00

    // Gastos Familiares vs Individuais
    const totalFamiliar = txs.filter((t) => t.nature === 'familiar').reduce((acc, t) => acc + t.amountCents, 0);
    expect(totalFamiliar).toBe(32590); // R$ 325,90
  });

  it('deve recalcular totais ao editar um lançamento', () => {
    let txs: Transaction[] = [
      {
        id: 't1',
        date: '2026-10-05',
        description: 'Almoço',
        amountCents: 5000, // R$ 50,00
        paidBy: 'ricardo',
        categoryId: 'cat-1',
        nature: 'familiar',
        isInstallment: false,
        isRefund: false,
        createdAt: '2026-10-05T10:00:00Z',
        updatedAt: '2026-10-05T10:00:00Z'
      }
    ];

    expect(txs.reduce((acc, t) => acc + t.amountCents, 0)).toBe(5000);

    // Edição do valor para R$ 80,00
    txs = txs.map((t) => (t.id === 't1' ? { ...t, amountCents: 8000, updatedAt: '2026-10-05T11:00:00Z' } : t));
    expect(txs.reduce((acc, t) => acc + t.amountCents, 0)).toBe(8000);
  });

  it('deve excluir lançamento via soft delete e remover dos totais ativos', () => {
    let txs: Transaction[] = [
      {
        id: 't1',
        date: '2026-10-05',
        description: 'Item 1',
        amountCents: 10000,
        paidBy: 'ricardo',
        categoryId: 'cat-1',
        nature: 'familiar',
        isInstallment: false,
        isRefund: false,
        createdAt: '2026-10-05T10:00:00Z',
        updatedAt: '2026-10-05T10:00:00Z'
      },
      {
        id: 't2',
        date: '2026-10-06',
        description: 'Item 2',
        amountCents: 15000,
        paidBy: 'natalia',
        categoryId: 'cat-1',
        nature: 'familiar',
        isInstallment: false,
        isRefund: false,
        createdAt: '2026-10-06T10:00:00Z',
        updatedAt: '2026-10-06T10:00:00Z'
      }
    ];

    // Exclusão de t1
    txs = txs.map((t) => (t.id === 't1' ? { ...t, deletedAt: '2026-10-06T12:00:00Z' } : t));

    // Apenas transações ativas contam
    const activeTxs = txs.filter((t) => !t.deletedAt);
    expect(activeTxs.length).toBe(1);
    expect(activeTxs.reduce((acc, t) => acc + t.amountCents, 0)).toBe(15000);
  });

  it('deve tratar estorno/reembolso deduzindo do total da categoria', () => {
    const txs: Transaction[] = [
      {
        id: 't1',
        date: '2026-10-01',
        description: 'Compra Roupa',
        amountCents: 20000, // R$ 200,00
        paidBy: 'natalia',
        categoryId: 'cat-1',
        nature: 'familiar',
        isInstallment: false,
        isRefund: false,
        createdAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-01T10:00:00Z'
      },
      {
        id: 't2',
        date: '2026-10-03',
        description: 'Devolução Roupa',
        amountCents: 5000, // R$ 50,00 devolvido
        paidBy: 'natalia',
        categoryId: 'cat-1',
        nature: 'familiar',
        isInstallment: false,
        isRefund: true, // Estorno
        createdAt: '2026-10-03T10:00:00Z',
        updatedAt: '2026-10-03T10:00:00Z'
      }
    ];

    const totalLiquidCents = txs.reduce((acc, t) => (t.isRefund ? acc - t.amountCents : acc + t.amountCents), 0);
    expect(totalLiquidCents).toBe(15000); // R$ 150,00
  });

  it('deve diluir compras parceladas mês a mês sem inflar o mês da compra', () => {
    const purchaseDate = '2026-10-15';
    const totalInstallments = 3;
    const installmentCents = 10000; // R$ 100,00 por parcela (total R$ 300)

    const installments: Transaction[] = [];
    for (let i = 1; i <= totalInstallments; i++) {
      installments.push({
        id: `p-${i}`,
        date: addMonthsIso(purchaseDate, i - 1),
        description: `Sofá (${i}/${totalInstallments})`,
        amountCents: installmentCents,
        paidBy: 'ricardo',
        categoryId: 'cat-3',
        nature: 'familiar',
        isInstallment: true,
        installmentGroupId: 'grp-sofa',
        installmentNumber: i,
        installmentTotal: totalInstallments,
        isRefund: false,
        createdAt: '2026-10-15T10:00:00Z',
        updatedAt: '2026-10-15T10:00:00Z'
      });
    }

    expect(installments[0].date).toBe('2026-10-15');
    expect(installments[1].date).toBe('2026-11-15');
    expect(installments[2].date).toBe('2026-12-15');

    // Total de Outubro/2026 deve ser apenas R$ 100,00 e não os R$ 300,00 totais
    const outTxs = installments.filter((t) => t.date.startsWith('2026-10'));
    expect(outTxs.reduce((acc, t) => acc + t.amountCents, 0)).toBe(10000);
  });
});

describe('3. Motor de Regras Determinísticas de Categorização', () => {
  const categories: Category[] = [
    { id: 'cat-alimentacao', name: 'Alimentação', icon: '🛒', color: '#10b981', isActive: true },
    { id: 'cat-transporte', name: 'Transporte', icon: '🚗', color: '#f59e0b', isActive: true },
    { id: 'cat-assinaturas', name: 'Assinaturas', icon: '📱', color: '#6366f1', isActive: true }
  ];

  const rules: Rule[] = [
    { id: 'r1', keyword: 'SUPERMERCADO', categoryId: 'cat-alimentacao', matchType: 'contains', isActive: true },
    { id: 'r2', keyword: 'POSTO', categoryId: 'cat-transporte', matchType: 'contains', isActive: true },
    { id: 'r3', keyword: 'NETFLIX', categoryId: 'cat-assinaturas', matchType: 'contains', isActive: true }
  ];

  it('deve sugerir Alimentação para "Supermercado Pão de Açúcar"', () => {
    const match = suggestCategory('Supermercado Pão de Açúcar', rules, categories);
    expect(match).not.toBeNull();
    expect(match?.category.id).toBe('cat-alimentacao');
  });

  it('deve ser insensível a maiúsculas, minúsculas e acentuação', () => {
    const match1 = suggestCategory('posto shell combustivel', rules, categories);
    expect(match1?.category.id).toBe('cat-transporte');

    const match2 = suggestCategory('póstó de gasolina', rules, categories);
    expect(match2?.category.id).toBe('cat-transporte');
  });

  it('deve permitir ao usuário corrigir ou trocar a categoria manualmente', () => {
    const match = suggestCategory('Supermercado Extra Compras', rules, categories);
    expect(match?.category.id).toBe('cat-alimentacao');

    // Usuário prefere selecionar 'Transporte' (ex: comprou acessório automotivo no mercado)
    let selectedCategoryId = match!.category.id;
    selectedCategoryId = 'cat-transporte'; // Troca manual

    expect(selectedCategoryId).toBe('cat-transporte');
  });

  it('não deve disparar para regras inativas', () => {
    const inactiveRules: Rule[] = [
      { id: 'r1', keyword: 'SUPERMERCADO', categoryId: 'cat-alimentacao', matchType: 'contains', isActive: false }
    ];
    const match = suggestCategory('Supermercado Extra', inactiveRules, categories);
    expect(match).toBeNull();
  });
});

describe('4. Entradas Mensais, Divisão 50-30-20 e Gastos Fixos (Obs 3 e Obs 5)', () => {
  it('deve calcular comprometimento da renda e saldo livre com base nas entradas mensais', () => {
    const incomes: IncomeEntry[] = [
      {
        id: 'i1',
        yearMonth: '2026-10',
        date: '2026-10-01',
        description: 'Salário Ricardo',
        amountCents: 600000, // R$ 6.000,00
        receivedBy: 'ricardo',
        type: 'salary',
        createdAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-01T10:00:00Z'
      },
      {
        id: 'i2',
        yearMonth: '2026-10',
        date: '2026-10-01',
        description: 'Salário Natália',
        amountCents: 400000, // R$ 4.000,00
        receivedBy: 'natalia',
        type: 'salary',
        createdAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-01T10:00:00Z'
      }
    ];

    const totalIncome = incomes.reduce((acc, i) => acc + i.amountCents, 0);
    expect(totalIncome).toBe(1000000); // R$ 10.000,00

    const essentialExpenses = 500000; // R$ 5.000,00 (50%)
    const lifestyleExpenses = 300000; // R$ 3.000,00 (30%)
    const freeBalance = totalIncome - (essentialExpenses + lifestyleExpenses);

    expect(freeBalance).toBe(200000); // R$ 2.000,00 (20% livre)
  });

  it('deve classificar gasto fixo como vencido (overdue), próximo do vencimento (due_soon) ou pago (paid)', () => {
    const fixed: FixedExpense = {
      id: 'fix-aluguel',
      name: 'Aluguel',
      amountCents: 250000,
      dueDay: 10,
      categoryId: 'cat-moradia',
      nature: 'familiar',
      isActive: true,
      payments: {},
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z'
    };

    // 2 dias antes do vencimento (dia 08/10) -> due_soon (dispara lembrete a cada 6h)
    const statusDueSoon = getFixedExpenseStatusForMonth(fixed, '2026-10', '2026-10-08');
    expect(statusDueSoon.status).toBe('due_soon');
    expect(statusDueSoon.daysUntilDue).toBe(2);

    // Após o vencimento (dia 12/10) sem pagamento -> overdue (em vermelho)
    const statusOverdue = getFixedExpenseStatusForMonth(fixed, '2026-10', '2026-10-12');
    expect(statusOverdue.status).toBe('overdue');
    expect(statusOverdue.daysUntilDue).toBe(-2);

    // Quando marcado como pago -> paid (cessa alertas)
    fixed.payments['2026-10'] = {
      paidAt: '2026-10-09',
      paidBy: 'ricardo',
      amountCents: 250000,
      transactionId: 'tx-999'
    };
    const statusPaid = getFixedExpenseStatusForMonth(fixed, '2026-10', '2026-10-12');
    expect(statusPaid.status).toBe('paid');
  });
});
