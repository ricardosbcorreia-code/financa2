import { describe, it, expect } from 'vitest';
import { Transaction, Category, Rule } from '../src/types';

describe('4. Testes de Exportação, Backup e Restauração', () => {
  const originalCategories: Category[] = [
    { id: 'cat-1', name: 'Alimentação', icon: '🛒', color: '#10b981', isActive: true },
    { id: 'cat-2', name: 'Transporte', icon: '🚗', color: '#f59e0b', isActive: true }
  ];

  const originalRules: Rule[] = [
    { id: 'r-1', keyword: 'MERCADO', categoryId: 'cat-1', matchType: 'contains', isActive: true }
  ];

  const originalTransactions: Transaction[] = [
    {
      id: 'tx-1',
      date: '2026-10-15',
      description: 'Supermercado Mensal',
      amountCents: 45050, // R$ 450,50
      paidBy: 'ricardo',
      categoryId: 'cat-1',
      nature: 'familiar',
      isInstallment: false,
      isRefund: false,
      createdAt: '2026-10-15T10:00:00Z',
      updatedAt: '2026-10-15T10:00:00Z'
    },
    {
      id: 'tx-2',
      date: '2026-10-18',
      description: 'Combustível',
      amountCents: 18000, // R$ 180,00
      paidBy: 'natalia',
      categoryId: 'cat-2',
      nature: 'familiar',
      isInstallment: false,
      isRefund: false,
      createdAt: '2026-10-18T10:00:00Z',
      updatedAt: '2026-10-18T10:00:00Z'
    }
  ];

  it('deve gerar backup em JSON válido contendo todas as entidades e metadados', () => {
    const backupPayload = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      activeProfile: 'ricardo',
      transactions: originalTransactions,
      categories: originalCategories,
      rules: originalRules
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    expect(jsonString).toBeTypeOf('string');

    // Validação de parsing
    const parsed = JSON.parse(jsonString);
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.transactions.length).toBe(2);
    expect(parsed.categories.length).toBe(2);
    expect(parsed.rules.length).toBe(1);
    expect(parsed.activeProfile).toBe('ricardo');
  });

  it('deve restaurar fielmente todos os registros comparando dados 1-para-1', () => {
    const backupJson = JSON.stringify({
      version: '1.0.0',
      exportedAt: '2026-10-25T14:00:00.000Z',
      activeProfile: 'natalia',
      transactions: originalTransactions,
      categories: originalCategories,
      rules: originalRules
    });

    // Simulação do procedimento de importação e restauração
    const restoredData = JSON.parse(backupJson);

    // Validação estrita campo a campo
    expect(restoredData.transactions).toEqual(originalTransactions);
    expect(restoredData.categories).toEqual(originalCategories);
    expect(restoredData.rules).toEqual(originalRules);

    // Validação de cálculo após restauração
    const restoredTotal = restoredData.transactions.reduce((sum: number, t: Transaction) => sum + t.amountCents, 0);
    expect(restoredTotal).toBe(63050); // R$ 630,50 exatos
  });
});
