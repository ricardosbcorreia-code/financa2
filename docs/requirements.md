# Documento de Requisitos — Finança2 (Controle Financeiro para Casal)

## 1. Problema a Resolver
Atualmente, as informações financeiras de Ricardo e Natália estão dispersas entre múltiplos bancos, faturas de cartão de crédito, comprovantes Pix e pagamentos em dinheiro. Não existe uma base centralizada que permita ao casal:
- Visualizar os gastos consolidados da família em um só lugar;
- Compreender a distribuição dos gastos por categoria e natureza (familiar vs. individual);
- Identificar para onde o dinheiro está indo sem depender de sincronização bancária invasiva ou ferramentas pagas.

A dependência de bancos em nuvem convencionais (como Supabase no plano gratuito) apresenta limitações de desempenho, especialmente o congelamento de bases inativas (*cold starts*). Além disso, soluções em planilha geram atrito no celular e desestimulam o registro diário imediato.

## 2. Objetivos do Produto
1. **Centralização Prática**: Registrar receitas e despesas com agilidade no momento em que ocorrem.
2. **Diagnóstico e Padrões**: Oferecer um painel analítico claro que mostre os totais gerais, por pessoa, por categoria e gastos familiares vs. individuais.
3. **Privacidade e Desempenho Máximo**: Operar em arquitetura *Local-First*, garantindo resposta instantânea (0 ms), sem dependência de banco de dados na nuvem e com proteção absoluta dos dados no aparelho.
4. **Sincronização P2P Descomplicada**: Permitir consolidar os dados entre os dois smartphones via pareamento direto (WebRTC / QR Code) ou backup/restauração de arquivos.
5. **Custo Zero Vitalício**: Funcionar sem qualquer mensalidade, assinatura ou taxa de infraestrutura.

---

## 3. Usuários e Modelo de Acesso
- **Usuários**: Ricardo e Natália.
- **Ambiente de Acesso**: Smartphones de uso pessoal de cada um (navegadores Chrome / Safari, instalados como PWA).
- **Identificação**: 
  - Perfil pré-definido por aparelho (o celular de Ricardo assume "Ricardo" por padrão; o de Natália assume "Natália").
  - Sem necessidade de senhas ou PINs diários, aproveitando a segurança biométrica nativa do sistema operacional do smartphone.
  - Possibilidade de alternar o pagador em um toque durante o lançamento.
- **Relação Financeira**: O app **não** calcula cobranças, saldos devedores ou compensações financeiras entre o casal. Registra estritamente quem realizou o pagamento e os totais correspondentes.

---

## 4. Escopo Funcional do MVP

### 4.1. Cadastro Rápido de Despesas
- **Campos Obrigatórios / Essenciais**:
  - **Valor**: Notação brasileira (ex: `R$ 125,90` ou `125,90`), armazenado com precisão inteira em centavos.
  - **Descrição**: Texto livre (ex: "Supermercado Pão de Açúcar").
  - **Categoria**: Seleção com sugestão automática inteligente.
  - **Natureza da Despesa**: *Familiar*, *Individual de Ricardo* ou *Individual de Natália*.
  - **Responsável pelo Pagamento**: Padrão do aparelho com opção de troca.
  - **Data da Ocorrência**: Padrão data de hoje, com seletor rápido para datas passadas.
- **Campos Secundários (Painel "+ Detalhes")**:
  - **Forma de Pagamento**: Pix, Dinheiro, Débito, Crédito ou Outro.
  - **Origem / Cartão**: Identificador do cartão ou banco (opcional).
  - **Parcelamento**: Indicação de número de parcelas (ex: 3x, 10x) com diluição automática nos meses subsequentes.
  - **Observações**: Campo de texto livre opcional.
  - **Sinalizador de Estorno / Reembolso**: Lançamento com valor negativo ou indicador de abatimento de categoria.

### 4.2. Classificação Assistida (Regras Inteligentes Locais)
- Regras determinísticas e explicáveis executadas 100% no cliente (sem IA externa).
- Associação por palavras-chave ou histórico anterior (ex: "SUPERMERCADO" sugere "Alimentação e supermercado"; "POSTO" sugere "Transporte e veículos").
- Sugestão visual sem alterar silenciosamente uma categoria já confirmada pelo usuário.
- Interface simples para criar, editar ou desativar regras de classificação.

### 4.3. Categorias Configuráveis
- Categorias iniciais padrão pré-carregadas:
  - Moradia
  - Alimentação e supermercado
  - Transporte e veículos
  - Saúde
  - Filhos e educação
  - Pets
  - Lazer
  - Assinaturas e serviços
  - Compras pessoais
  - Dívidas e encargos financeiros
  - Patrimônio e imóveis
  - Impostos e taxas
  - Outros
- Gestão: Permitir cadastrar novas categorias, renomear e ativar/desativar existentes.

### 4.4. Histórico de Transações e Filtros
- Listagem cronológica com paginação/rolagem suave.
- Busca textual instantânea por descrição.
- Filtros rápidos por:
  - Mês/Ano;
  - Responsável (Todos, Ricardo, Natália);
  - Categoria;
  - Natureza (Familiar, Individual);
  - Forma de pagamento.
- Edição e exclusão de transações com confirmação prévia.

### 4.5. Painel Analítico Financeiro
- Total geral de despesas do mês selecionado.
- Total pago por Ricardo vs. Total pago por Natália.
- Total de gastos Familiares vs. Gastos Individuais.
- Gráfico/Barras de distribuição percentual por categoria.
- Comparativo com o mês anterior (% de variação e valor absoluto).
- Lista rápida das maiores despesas do mês.
- *Total respeito às regras de integridade*: sem saldos devedores ou compensações.

### 4.6. Sincronização P2P e Salvaguarda de Dados
- **Sincronização P2P (QR Code + WebRTC)**:
  - Pareamento direto entre os dois celulares quando estiverem juntos.
  - Intercâmbio e mesclagem de novos registros sem intermediários.
- **Backup e Restauração (.json)**:
  - Exportação completa em 1 clique (todas as despesas, categorias, regras e preferências).
  - Restauração fiel a partir do arquivo JSON com validação de formato e integridade.
- **Exportação para Planilha (.csv)**:
  - Download das despesas em formato compatível com Excel / Google Sheets com formatação brasileira.

---

## 5. Requisitos Não Funcionais
- **Arquitetura**: *Local-First* PWA (Progressive Web App).
- **Desempenho**: Interface responsiva e instantânea (< 50ms para qualquer ação), banco de dados IndexedDB local no aparelho.
- **Disponibilidade**: Funcionamento 100% offline. O app pode ser aberto no modo avião e registrar despesas normalmente.
- **Segurança e Privacidade**:
  - Zero envio de dados financeiros para servidores externos ou inteligências artificiais.
  - Hospedagem estática pública contém apenas o código frontend compilado (HTML/CSS/JS).
  - Integridade monetária com valores em centavos (sem erros de arredondamento de ponto flutuante).
- **Compatibilidade**: Totalmente responsivo para telas móveis (Android Chrome e iOS Safari), instalável na tela inicial (*Add to Home Screen*).
- **Idioma**: Português brasileiro (pt-BR), com símbolos e formatos monetários (`R$ 1.250,50`) e de datas (`DD/MM/AAAA`).

---

## 6. Restrições Inegociáveis
1. **Sem Custos Recorrentes**: Hospedagem e ferramentas devem ser estritamente gratuitas.
2. **Sem Banco em Nuvem Tradicional**: Não utilizar Supabase, Firebase ou servidores que congelem ou exijam manutenção.
3. **Sem Integração Bancária Automática**: Registro manual para preservar simplicidade e privacidade.
4. **Sem Cálculo de Dívidas**: Não apontar "quem deve para quem".
5. **Sem Duplicidade de Fatura**: O pagamento da fatura de cartão não deve ser lançado como despesa se as compras do cartão já tiverem sido registradas.

---

## 7. Hipóteses e Riscos
- **Risco 1**: Falha de conexão P2P no WebRTC devido a bloqueios em certas redes Wi-Fi ou políticas restritivas do Safari no iOS.  
  *Mitigação*: Manter o fluxo de exportação/importação de arquivo de backup JSON como plano de contingência infalível de sincronização.
- **Risco 2**: Limpeza involuntária de cache/dados do navegador pelo sistema operacional do celular.  
  *Mitigação*: Utilizar a API `navigator.storage.persist()` para solicitar armazenamento persistente no aparelho e incentivar downloads periódicos de backup.

---

## 8. Funcionalidades Fora do Escopo do MVP (Fase 7 — Evolução)
- Metas de orçamento previstas vs. realizadas com limites por categoria.
- Importação direta de extratos bancários em arquivo CSV/OFX.
- Relatórios anuais consolidados e projeções de longo prazo.
- Automação de despesas recorrentes complexas com assinatura digital.
- Anexar fotos de comprovantes fiscais.

---

## 9. Critérios de Sucesso do MVP
1. Ricardo e Natália conseguem instalar o PWA em seus celulares e abrir instantaneamente.
2. Um gasto é registrado em menos de 5 segundos no formulário simplificado.
3. As regras de classificação automática sugerem a categoria correta com base no histórico.
4. O painel apresenta totais mensais exatos, discriminando Ricardo, Natália, familiar e individual.
5. Compras parceladas são distribuídas nos meses seguintes sem duplicidade.
6. A sincronização P2P ou importação de backup consolida os dados de ambos sem corromper o histórico.
7. Arquivo de backup em JSON pode ser gerado e restaurado com 100% de integridade comprovada em teste real.
