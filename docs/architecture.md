# Arquitetura e Decisões Técnicas — Finança2

## 1. Comparativo de Abordagens Arquiteturais

Para atender às necessidades de Ricardo e Natália com custo zero, privacidade total e independência de bases que congelam, foram avaliadas três alternativas:

| Critério | Abordagem A: PWA Local-First (Recomendada) | Abordagem B: Web App c/ Banco em Nuvem Tradicional | Abordagem C: PWA c/ Sync Serverless Edge |
| :--- | :--- | :--- | :--- |
| **Hospedagem da UI** | Estática (GitHub Pages / Cloudflare Pages) | Estática ou Servidor Web | Estática (Cloudflare Pages) |
| **Banco de Dados** | IndexedDB local no smartphone | PostgreSQL remoto (Supabase / Neon) | IndexedDB local + D1 (SQLite Edge) |
| **Sincronização** | P2P direto (QR Code + WebRTC) + Backup JSON | Chamadas de API HTTP centralizadas | Worker Serverless via REST API |
| **Latência e Velocidade** | 0 ms (Instantânea, 100% no aparelho) | 200 ms a 15s (sujeito a *cold start*) | 0 ms local + sync assíncrono (~50 ms) |
| **Risco de Congelamento** | **Nenhum** (não depende de servidores) | **Alto** (Supabase congela após 7 dias sem uso) | **Nenhum** (arquitetura *serverless*) |
| **Operação Offline** | 100% funcional no modo avião | Inoperante sem internet | 100% funcional com sync posterior |
| **Privacidade dos Dados** | Máxima (dados nunca saem dos celulares) | Média (dados gravados em servidor externo) | Alta (dados em nuvem sob credenciais próprias) |
| **Autenticação** | Perfil local no aparelho (sem senhas) | E-mail e senha / Magic Link obrigatório | Perfil local + Token de API seguro |
| **Custos Recorrentes** | R$ 0,00 vitalício | R$ 0,00 até expirar/pausar plano grátis | R$ 0,00 (camada gratuita perpétua) |
| **Complexidade e Falhas** | Baixa (arquitetura desacoplada e autônoma) | Alta (depende de rede, cotas e status da nuvem) | Média (exige configuração de Worker e D1) |

---

## 2. Arquitetura Recomendada: PWA Local-First Desacoplado

A **Abordagem A** é a solução que melhor atende aos requisitos do casal pelos seguintes motivos:
1. **Zero Fricção de Latência**: Toda leitura e escrita ocorre diretamente no banco *IndexedDB* do smartphone. Não há tempo de espera para salvar uma despesa.
2. **Independência de Infraestrutura**: Não há servidor backend para cair, bancos de dados para congelar, tokens para renovar ou custos inesperados de nuvem.
3. **Resiliência e Continuidade**: O casal é o único dono dos dados. Mesmo que não haja sinal de celular ou internet, tudo funciona normalmente.
4. **Instalação Simples**: Distribuído via HTTPS estático e instalado diretamente pelo navegador do celular como PWA nativo.

---

## 3. Diagrama e Componentes da Aplicação

```
+-----------------------------------------------------------------------------------+
|                        SMARTPHONE DO USUÁRIO (PWA)                                |
|                                                                                   |
|   +---------------------------------------------------------------------------+   |
|   |                           Camada de Apresentação                          |   |
|   |     - Formulário Rápido (Valor, Descrição, Categoria, Natureza)           |   |
|   |     - Painel Analítico Financeiro & Gráficos Mensais                      |   |
|   |     - Histórico com Filtros e Busca Rápida                                |   |
|   +---------------------------------------------------------------------------+   |
|                                       │                                           |
|   +───────────────────────────────────┼───────────────────────────────────────+   |
|   |                                   ▼                                       |   |
|   |                          Camada de Domínio e Regras                       |   |
|   |     - Regras de Classificação Determinística Automática                   |   |
|   |     - Validador Monetário em Centavos Inteiros                            |   |
|   |     - Gerador de Parcelamentos Diluídos (Competência)                     |   |
|   |     - Calculador de Totais, Agrupamentos e Médias                         |   |
|   +───────────────────────────────────────────────────────────────────────────+   |
|                                       │                                           |
|   +───────────────────────────────────┼───────────────────────────────────────+   |
|   |                                   ▼                                       |   |
|   |                  Camada de Persistência e Sincronização                   |   |
|   |     - Repositório Local IndexedDB (Transações, Categorias, Regras)       |   |
|   |     - Gerenciador de Backup (.json completo) e Exportação (.csv)          |   |
|   |     - Motor de Sincronização P2P (WebRTC DataChannel via QR Code)         |   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------+
                                        ▲
                                        │ Troca Direta Criptografada
                                        │ (WebRTC P2P por Wi-Fi ou Backup JSON)
                                        ▼
+-----------------------------------------------------------------------------------+
|                        SMARTPHONE DO CÔNJUGE (PWA)                                |
|       (Mesma arquitetura autônoma e espelhada - IndexedDB Local)                  |
+-----------------------------------------------------------------------------------+
```

---

## 4. Estratégia de Sincronização e Resolução de Conflitos

### 4.1. Pareamento P2P via QR Code (WebRTC)
1. **Passo 1 (Oferta)**: O aparelho de Ricardo clica em "Sincronizar". O app gera um *offer* WebRTC contendo os metadados da conexão e apresenta em um QR Code na tela.
2. **Passo 2 (Resposta)**: Natália abre o leitor no app dela e aponta a câmera para o QR Code de Ricardo. O celular dela processa o *answer* e estabelece o canal de dados direto (*DataChannel*).
3. **Passo 3 (Intercâmbio de Lote)**: Os celulares trocam as transações que possuem `updated_at > last_sync_at`.
4. **Passo 4 (Confirmação)**: Ambas as bases salvam os registros recebidos e atualizam seu carimbo `last_sync_at`. O processo dura menos de 3 segundos.

### 4.2. Algoritmo de Resolução de Conflitos (LWW - Last-Write-Wins)
- Cada entidade possui um identificador único universal (`id` gerado via UUID v4) e um carimbo de modificação (`updated_at` em ISO 8601).
- Se a mesma transação for editada em ambos os aparelhos antes da sincronização, a versão com o `updated_at` mais recente prevalece.
- **Exclusões Lógicas (*Soft Delete*)**: Quando uma despesa é excluída, ela recebe `deleted_at = timestamp`. Dessa forma, na sincronização, o outro aparelho sabe que a despesa deve ser removida da listagem e não reinserida como um item novo.

### 4.3. Plano de Contingência Infalível
Se houver restrição de rede Wi-Fi que impeça a conexão direta WebRTC:
- O usuário pode simplesmente clicar em **"Exportar Backup (.json)"** e enviar pelo WhatsApp para o cônjuge.
- O cônjuge clica em **"Mesclar Backup"**, e o mesmo algoritmo inteligente de unificação processa o arquivo sem sobrescrever ou perder dados.

---

## 5. Pilha de Tecnologias Selecionada

- **Linguagem**: TypeScript (segurança de tipos, integridade de dados e prevenção de bugs em tempo de compilação).
- **Build Tool**: Vite (rápido, moderno, compilação estática leve e otimizada para navegadores móveis).
- **Interface e Estilo**: Componentes web limpos com Vanilla CSS responsivo, variáveis de design (*tokens*), paleta HSL harmoniosa em modo escuro/claro e foco em usabilidade móvel.
- **Banco de Dados Local**: IndexedDB gerenciado via biblioteca minimalista e robusta (`idb`), fornecendo promises assíncronas e transações ACID locais.
- **Sincronização P2P**: WebRTC nativo do navegador com gerador/leitor de QR Code leve (`qrcode` / `html5-qrcode`).
- **PWA**: Manifesto de aplicativo (`manifest.json`) + Service Worker para funcionamento 100% offline e instalação direta na tela inicial.

---

## 6. Estimativa de Custos e Limites
- **Hospedagem Estática (GitHub Pages / Cloudflare Pages)**: R$ 0,00 / mês (gratuito para sempre, largura de banda e requisições ilimitadas para o porte do app).
- **Banco de Dados / Servidor**: R$ 0,00 / mês (armazenamento local).
- **Certificado SSL / HTTPS**: R$ 0,00 / mês (incluso nativamente).
- **Total Mensal**: **R$ 0,00** (Zero).

---

## 7. Plano de Implementação Incremental

1. **Fase 3 — Protótipo**:
   - Criação da casca do projeto com Vite, TypeScript e CSS responsivo.
   - Construção do Painel Visual, Formulário de Lançamento Rápido e Histórico com dados fictícios.
   - Validação da ergonomia em tela de celular.
2. **Fase 4 — Persistência e Regras de Negócio**:
   - Implementação da camada IndexedDB com o modelo de dados formal.
   - Motor de regras inteligentes locais para sugestão de categorias.
   - Operações CRUD completas, gerador de parcelas e filtros dinâmicos.
   - Execução da bateria de testes automatizados unitários e de integridade financeira.
3. **Fase 5 — Sincronização e Salvaguarda**:
   - Fluxo de exportação e restauração de backup JSON e CSV.
   - Implementação do pareamento P2P via QR Code.
   - Teste de integridade de restauração e conflitos.
4. **Fase 6 — Qualidade e Implantação**:
   - Testes ponta a ponta (E2E) dos fluxos críticos.
   - Configuração do manifesto PWA e Service Worker offline.
   - Documentação de uso e procedimento de publicação estática.
