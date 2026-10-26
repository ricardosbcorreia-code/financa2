# Modelo de Dados e Regras de Integridade — Finança2

## 1. Visão Geral
O modelo de dados do **Finança2** é projetado para operar localmente em *IndexedDB*, suportar sincronização distribuída sem perdas (via UUID e carimbos de data/hora) e garantir integridade financeira rigorosa.

---

## 2. Entidades Principais

### 2.1. Transações (`transactions`)
Representa cada despesa ou ocorrência financeira registrada.

| Campo | Tipo | Obrigatório | Descrição / Regra |
| :--- | :--- | :--- | :--- |
| `id` | String (UUID v4) | Sim | Identificador global único gerado no momento do lançamento. |
| `date` | String (`YYYY-MM-DD`) | Sim | Data de competência da despesa (padrão: hoje). |
| `description` | String | Sim | Descrição da despesa (ex: "Supermercado Extra"). |
| `amount_cents` | Integer | Sim | **Valor em centavos inteiros** (ex: R$ 125,90 = `12590`). Previne erros de ponto flutuante. |
| `paid_by` | String | Sim | Identifica o pagador: `'ricardo'` ou `'natalia'`. |
| `category_id` | String (UUID) | Sim | Chave estrangeira para a entidade `categories`. |
| `nature` | String | Sim | Natureza da despesa: `'familiar'`, `'individual_ricardo'` ou `'individual_natalia'`. |
| `payment_method` | String | Não | Forma de pagamento: `'pix'`, `'dinheiro'`, `'debito'`, `'credito'`, `'outro'`. |
| `origin` | String | Não | Conta ou cartão específico (ex: "Cartão Nubank", "Conta Itaú"). |
| `is_installment` | Boolean | Sim | Indica se faz parte de uma compra parcelada (padrão: `false`). |
| `installment_group_id` | String (UUID) | Não | Identificador que conecta todas as parcelas da mesma compra original. |
| `installment_number` | Integer | Não | Número da parcela atual (ex: `1`). |
| `installment_total` | Integer | Não | Total de parcelas da compra (ex: `10`). |
| `is_refund` | Boolean | Sim | Se `true`, indica que é um estorno/reembolso e deduz dos totais da categoria. |
| `notes` | String | Não | Observações adicionais do lançamento. |
| `created_at` | String (ISO 8601) | Sim | Timestamp de criação no aparelho de origem. |
| `updated_at` | String (ISO 8601) | Sim | Timestamp da última modificação (usado para resolução de conflitos LWW). |
| `deleted_at` | String (ISO) ou `null`| Não | Marcação de exclusão lógica (*soft delete*) para propagação na sincronização. |

---

### 2.2. Categorias (`categories`)
Classificação estruturada dos gastos familiares e individuais.

| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | String (UUID v4) | Sim | Identificador único da categoria. |
| `name` | String | Sim | Nome de exibição (ex: "Alimentação e supermercado"). |
| `icon` | String | Sim | Identificador do ícone visual (ex: "cart", "home", "car"). |
| `color` | String | Sim | Cor em formato HSL ou Hexadecimal para gráficos e crachás. |
| `is_active` | Boolean | Sim | Se `false`, oculta a categoria em novos lançamentos sem apagar o histórico. |
| `is_system` | Boolean | Sim | Se `true`, é uma categoria padrão do sistema. |
| `created_at` | String (ISO 8601) | Sim | Timestamp de criação. |
| `updated_at` | String (ISO 8601) | Sim | Timestamp de última alteração. |

---

### 2.3. Regras de Classificação Automática (`rules`)
Mecanismo determinístico local para sugerir categorias com base no texto informado.

| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | String (UUID v4) | Sim | Identificador único da regra. |
| `keyword` | String | Sim | Termo chave normalizado em caixa alta (ex: "SUPERMERCADO", "NETFLIX", "POSTO"). |
| `category_id` | String (UUID) | Sim | Categoria que será sugerida automaticamente. |
| `suggested_nature`| String ou `null` | Não | Natureza padrão sugerida para essa regra (opcional). |
| `match_type` | String | Sim | Tipo de correspondência: `'contains'` (contém termo) ou `'exact'` (exato). |
| `is_active` | Boolean | Sim | Habilita ou desabilita a regra. |
| `created_at` | String (ISO 8601) | Sim | Timestamp de criação. |
| `updated_at` | String (ISO 8601) | Sim | Timestamp de modificação. |

---

### 2.4. Configurações Locais do Aparelho (`settings`)
Armazena a identidade do dispositivo e preferências de uso local (armazenadas em `localStorage` ou store de `settings` no IndexedDB).

| Chave | Tipo | Valor Exemplo | Descrição |
| :--- | :--- | :--- | :--- |
| `device_user` | String | `'ricardo'` ou `'natalia'` | Perfil ativo por padrão neste aparelho. |
| `last_sync_at` | String (ISO) | `"2026-10-25T14:00:00Z"` | Carimbo da última sincronização bem-sucedida. |
| `theme` | String | `'dark'`, `'light'` ou `'system'` | Preferência de tema visual da interface. |
| `app_version` | String | `"1.0.0"` | Versão do esquema de dados local para migrações futuras. |

---

## 3. Regras de Integridade Financeira

1. **Acurácia Monetária**:
   - Todo cálculo interno é realizado estritamente em números inteiros (centavos).
   - Conversões para exibição utilizam a API nativa `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
   - Divisões de parcelas distribuem eventuais centavos residuais na primeira parcela (ex: R$ 100,00 em 3x = 1ª parcela de R$ 33,34 e 2ª e 3ª de R$ 33,33).

2. **Prevenção de Duplicidade de Fatura**:
   - Compras realizadas no cartão de crédito são registradas uma a uma com `payment_method = 'credito'`.
   - O pagamento mensal da fatura global do cartão bancário **não deve** ser lançado como despesa, pois as compras individuais já compõem o saldo do período.

3. **Tratamento de Parcelamentos**:
   - Ao lançar uma compra parcelada (ex: R$ 600,00 em 6x), o sistema gera 6 registros de transação com o mesmo `installment_group_id`, cada um com `installment_number = N`, `installment_total = 6` e a data de competência calculada para os meses seguintes (`date = Mês + N-1`).
   - Dessa forma, o fluxo mensal reflete o compromisso real de cada mês sem inflar o mês da compra.

4. **Tratamento de Estornos**:
   - Um estorno ou devolução com `is_refund = true` subtrai o valor dos totais consolidados da categoria e do mês correspondente, evitando a criação de distorções em gráficos.

5. **Exclusões Seguras e Sincronização**:
   - Quando o usuário exclui uma despesa, o registro não é apagado fisicamente de imediato; ele recebe `deleted_at = timestamp`.
   - Durante a sincronização, o outro aparelho identifica a deleção e também oculta o registro, impedindo que uma despesa apagada "ressuscite" após o pareamento.
