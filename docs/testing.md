# Relatório e Documentação de Testes — Finança2

## 1. Visão Geral
Este documento registra a estratégia, os cenários executados e as evidências reais da bateria de testes automatizados e funcionais da **Fase 4 — Persistência e Regras** do **Finança2**.

Framework de execução: **Vitest v5.0.5** sob **Node.js v24.14.0**.

---

## 2. Cenários de Testes Automatizados (Seção 12 do Plano Mestre)

### 2.1. Precisão e Integridade Financeira (`tests/financialIntegrity.test.ts`)
| Cenário | Entrada | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- |
| **Precisão de R$ 125,90** | String `"125,90"` | Conversão para `12590` centavos inteiros e formatação para `"R$ 125,90"` | **Aprovado** |
| **Entradas Monetárias Brasileiras** | `"R$ 1.250,50"`, `"50"`, `"0,75"` | `125050`, `5000`, `75` centavos | **Aprovado** |
| **Prevenção de Ponto Flutuante** | `0.10 + 0.20` | `30` centavos exatos (sem desvio de float do JS) | **Aprovado** |
| **Registros de Ambos os Usuários** | Ricardo: R$ 125,90 + R$ 50,00; Natália: R$ 200,00 | Totais individuais e geral calculados com exatidão | **Aprovado** |
| **Gastos Familiares vs. Individuais** | R$ 325,90 Familiar / R$ 50,00 Individual | Segregação correta nos relatórios | **Aprovado** |
| **Recálculo após Edição** | Despesa alterada de R$ 50,00 para R$ 80,00 | Total recalculado instantaneamente para R$ 80,00 | **Aprovado** |
| **Exclusão Lógica (*Soft Delete*)** | Exclusão de lançamento de R$ 100,00 | Transação recebe `deletedAt` e sai dos totais ativos | **Aprovado** |
| **Tratamento de Estorno / Reembolso** | Compra R$ 200,00 + Estorno R$ 50,00 | Total líquido apurado: R$ 150,00 | **Aprovado** |
| **Diluição de Parcelamento** | Compra de R$ 300,00 em 3x | R$ 100,00 em Out/26, Nov/26 e Dez/26 (sem inflar Outubro) | **Aprovado** |

### 2.2. Motor de Classificação Determinística
| Cenário | Entrada | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- |
| **Sugestão por Palavra-Chave** | `"Supermercado Pão de Açúcar"` | Sugere categoria `"Alimentação"` | **Aprovado** |
| **Insensibilidade a Acentos e Caixa** | `"póstó de gasolina"`, `"posto shell"` | Sugere categoria `"Transporte"` | **Aprovado** |
| **Correção pelo Usuário** | Usuário troca a categoria sugerida | Nova categoria escolhida é preservada | **Aprovado** |
| **Regras Inativas** | Regra com `isActive = false` | Não dispara sugestão automática | **Aprovado** |

### 2.3. Backup e Restauração (`tests/backupRecovery.test.ts`)
| Cenário | Entrada | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- |
| **Geração de Arquivo JSON** | Transações, categorias e regras em memória | Objeto estruturado com versão `1.0.0` e timestamp | **Aprovado** |
| **Restauração 1-para-1** | Arquivo JSON importado | Reconstituição exata de todas as entidades e somas | **Aprovado** |

---

## 3. Evidência Real da Execução

```
> financa2@0.1.0 test
> vitest run

 RUN  v5.0.5 D:/PROJETO APP/PERSONAL/FINANCA2

 ✓ tests/backupRecovery.test.ts (2 tests) 15ms
 ✓ tests/financialIntegrity.test.ts (12 tests) 18ms

 Test Files  2 passed (2)
      Tests  14 passed (14)
   Start at  08:24:26
   Duration  937ms (transform 51%, import 36%, worker 7%, tests 6%)
```
