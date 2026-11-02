import { describe, it, expect } from 'vitest';
import { mergeDatasets } from '../src/sync/mergeEngine';
import { Transaction, Category, Rule } from '../src/types';

describe('5. Testes de Sincronização, Mesclagem e Conflitos (Fase 5)', () => {
  const localCats: Category[] = [
    { id: 'cat-1', name: 'Alimentação', icon: '🛒', color: '#10b981', isActive: true }
  ];
  const remoteCats: Category[] = [
    { id: 'cat-1', name: 'Alimentação', icon: '🛒', color: '#10b981', isActive: true },
    { id: 'cat-2', name: 'Viagens', icon: '✈️', color: '#6366f1', isActive: true }
  ];

  const localRules: Rule[] = [
    { id: 'r-1', keyword: 'MERCADO', categoryId: 'cat-1', matchType: 'contains', isActive: true }
  ];
  const remoteRules: Rule[] = [
    { id: 'r-2', keyword: 'HOTEL', categoryId: 'cat-2', matchType: 'contains', isActive: true }
  ];

  it('deve adicionar despesas novas do outro aparelho sem duplicar as existentes', () => {
    const localTxs: Transaction[] = [
      {
        id: 'tx-ricardo-1',
        date: '2026-10-10',
        description: 'Posto Gasolina',
        amountCents: 15000,
        paidBy: 'ricardo',
        categoryId: 'cat-1',
        nature: 'familiar',
        isInstallment: false,
        isRefund: false,
        createdAt: '2026-10-10T10:00:00Z',
        updatedAt: '2026-10-10T10:00:00Z'
      }
    ];

    const remoteTxs: Transaction[] = [
      {
        id: 'tx-natalia-1',
        date: '2026-10-11',
        description: 'Farmácia Remédios',
        amountCents: 8500,
        paidBy: 'natalia',
        categoryId: 'cat-1',
        nature: 'familiar',
        isInstallment: false,
        isRefund: false,
        createdAt: '2026-10-11T14:00:00Z',
        updatedAt: '2026-10-11T14:00:00Z'
      }
    ];

    const result = mergeDatasets(localTxs, remoteTxs, localCats, remoteCats, localRules, remoteRules);

    expect(result.addedCount).toBe(1);
    expect(result.updatedCount).toBe(0);
    expect(result.mergedTransactions.length).toBe(2);

    // Ambas as transações devem estar presentes
    expect(result.mergedTransactions.find((t) => t.id === 'tx-ricardo-1')).toBeDefined();
    expect(result.mergedTransactions.find((t) => t.id === 'tx-natalia-1')).toBeDefined();

    // Novas categorias e regras foram mescladas
    expect(result.mergedCategories.length).toBe(2);
    expect(result.mergedRules.length).toBe(2);
  });

  it('deve resolver conflitos usando Last-Write-Wins (versão com updatedAt mais recente prevalece)', () => {
    const localTxs: Transaction[] = [
      {
        id: 'tx-conflito',
        date: '2026-10-10',
        description: 'Jantar Restaurante (Versão Ricardo)',
        amountCents: 12000, // R$ 120,00
        paidBy: 'ricardo',
        categoryId: 'cat-1',
        nature: 'familiar',
        isInstallment: false,
        isRefund: false,
        createdAt: '2026-10-10T10:00:00Z',
        updatedAt: '2026-10-10T11:00:00Z' // Versão mais antiga
      }
    ];

    const remoteTxs: Transaction[] = [
      {
        id: 'tx-conflito',
        date: '2026-10-10',
        description: 'Jantar Restaurante c/ Sobremesa (Versão Natália Atualizada)',
        amountCents: 15500, // R$ 155,00
        paidBy: 'ricardo',
        categoryId: 'cat-1',
        nature: 'familiar',
        isInstallment: false,
        isRefund: false,
        createdAt: '2026-10-10T10:00:00Z',
        updatedAt: '2026-10-10T12:30:00Z' // Versão mais recente
      }
    ];

    const result = mergeDatasets(localTxs, remoteTxs, localCats, localCats, localRules, localRules);

    expect(result.addedCount).toBe(0);
    expect(result.updatedCount).toBe(1);
    expect(result.mergedTransactions.length).toBe(1);

    const winningTx = result.mergedTransactions[0];
    expect(winningTx.amountCents).toBe(15500);
    expect(winningTx.description).toContain('Natália');
  });

  it('deve propagar deleções lógicas (soft delete) durante a sincronização', () => {
    // Ricardo tem a despesa ativa
    const localTxs: Transaction[] = [
      {
        id: 'tx-deletada',
        date: '2026-10-12',
        description: 'Compra Cancelada',
        amountCents: 9000,
        paidBy: 'ricardo',
        categoryId: 'cat-1',
        nature: 'familiar',
        isInstallment: false,
        isRefund: false,
        createdAt: '2026-10-12T10:00:00Z',
        updatedAt: '2026-10-12T10:00:00Z'
      }
    ];

    // Natália excluiu essa despesa no aparelho dela
    const remoteTxs: Transaction[] = [
      {
        id: 'tx-deletada',
        date: '2026-10-12',
        description: 'Compra Cancelada',
        amountCents: 9000,
        paidBy: 'ricardo',
        categoryId: 'cat-1',
        nature: 'familiar',
        isInstallment: false,
        isRefund: false,
        createdAt: '2026-10-12T10:00:00Z',
        updatedAt: '2026-10-12T11:00:00Z',
        deletedAt: '2026-10-12T11:00:00Z' // Marcada como excluída
      }
    ];

    const result = mergeDatasets(localTxs, remoteTxs, localCats, localCats, localRules, localRules);

    expect(result.mergedTransactions.length).toBe(1);
    expect(result.mergedTransactions[0].deletedAt).toBe('2026-10-12T11:00:00Z');

    // Ao filtrar ativas, deve estar oculta
    const activeTxs = result.mergedTransactions.filter((t) => !t.deletedAt);
    expect(activeTxs.length).toBe(0);
  });

  it('deve detectar suspeita de duplicidade quando mesmo valor e categoria têm descrição diferente nos aparelhos (Obs 4)', () => {
    const localTxs: Transaction[] = [
      {
        id: 'tx-ric-99',
        date: '2026-10-18',
        description: 'Supermercado Extra',
        amountCents: 35000, // R$ 350,00
        paidBy: 'ricardo',
        categoryId: 'cat-1',
        nature: 'familiar',
        isInstallment: false,
        isRefund: false,
        createdAt: '2026-10-18T10:00:00Z',
        updatedAt: '2026-10-18T10:00:00Z'
      }
    ];

    const remoteTxs: Transaction[] = [
      {
        id: 'tx-nat-99',
        date: '2026-10-18',
        description: 'Compras do mês mercado',
        amountCents: 35000, // Mesmo valor R$ 350,00
        paidBy: 'natalia',
        categoryId: 'cat-1', // Mesma categoria
        nature: 'familiar',
        isInstallment: false,
        isRefund: false,
        createdAt: '2026-10-18T11:00:00Z',
        updatedAt: '2026-10-18T11:00:00Z'
      }
    ];

    const result = mergeDatasets(localTxs, remoteTxs, localCats, localCats, localRules, localRules);

    // Deve gerar 1 conflito pendente para escolha do usuário e não duplicar imediatamente
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0].localTx.description).toBe('Supermercado Extra');
    expect(result.conflicts[0].remoteTx.description).toBe('Compras do mês mercado');
    expect(result.mergedTransactions.length).toBe(1);
  });
});
