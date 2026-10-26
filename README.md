# Finança2 — Controle Financeiro do Casal (Ricardo & Natália)

Aplicação web e PWA (*Progressive Web App*) de controle financeiro doméstico desenvolvida exclusivamente para o casal **Ricardo e Natália**.

---

## 1. Visão Geral e Princípios
O **Finança2** centraliza despesas pessoais e familiares de bancos, cartões de crédito, Pix e pagamentos em dinheiro com foco em:
- **Agilidade Máxima**: Lançamento rápido de novos gastos em menos de 5 segundos;
- **Privacidade Absoluta & Custo Zero**: Arquitetura *Local-First* com dados armazenados diretamente no navegador de cada smartphone (*IndexedDB*);
- **Independência de Bancos na Nuvem**: Não depende de serviços que congelam no plano gratuito (como Supabase), sem *cold starts* e com resposta instantânea em 0 ms;
- **Sincronização Descomplicada**: Troca de registros entre celulares via arquivo JSON com mesclagem inteligente (*Last-Write-Wins*) e sincronização direta P2P (Wi-Fi);
- **Integridade Contábil**: Valores em centavos inteiros (sem erros de arredondamento), compras no crédito registradas sem duplicar faturas bancárias e parcelamentos diluídos nos meses correspondentes.

---

## 2. Tecnologias Utilizadas
- **Linguagem**: TypeScript (estrito)
- **Compilador / Servidor**: Vite
- **Estilização**: Vanilla CSS modular e responsivo (Tokens HSL, Dark Mode, Glassmorphism)
- **Banco de Dados Local**: IndexedDB com persistência no smartphone
- **PWA**: Manifesto (`manifest.json`) + Service Worker (`sw.js`) para operação 100% offline
- **Testes Automatizados**: Vitest

---

## 3. Pré-requisitos
- **Node.js**: versão 18 ou superior (testado na v24.14.0)
- **npm**: versão 9 ou superior (testado na 11.9.0)

---

## 4. Instalação e Execução Local

```bash
# 1. Instalar as dependências de desenvolvimento
npm install

# 2. Iniciar o servidor de desenvolvimento local
npm run dev

# 3. Rodar a suíte de testes automatizados
npm test

# 4. Gerar o pacote otimizado de produção
npm run build
```

---

## 5. Como Instalar nos Smartphones de Ricardo e Natália

O aplicativo foi projetado prioritariamente para uso em smartphones pessoais via PWA:

### No Android (Google Chrome):
1. Acesse o endereço do aplicativo no navegador do celular;
2. Toque no menu de três pontos no canto superior direito;
3. Selecione a opção **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**;
4. O ícone do **Finança2** aparecerá na grade de aplicativos do celular e abrirá em tela cheia como um app nativo, mesmo sem internet.

### No iPhone (Apple Safari):
1. Abra o link do aplicativo no Safari;
2. Toque no botão de compartilhamento (ícone de quadrado com seta para cima na barra inferior);
3. Role para baixo e selecione **"Adicionar à Tela de Início"**;
4. O ícone do **Finança2** será instalado na tela do iPhone com inicialização instantânea e suporte offline.

---

## 6. Publicação Gratuita na Nuvem (Hospedagem Estática com HTTPS)

Como o aplicativo é *Local-First*, os dados financeiros **nunca saem dos celulares**. O servidor em nuvem apenas distribui os arquivos estáticos compilados (HTML/CSS/JS).

### Opção 1: GitHub Pages (Recomendado - 100% Gratuito)
1. Crie um repositório no seu GitHub (público ou privado);
2. Conecte este diretório ao repositório:
   ```bash
   git init
   git add .
   git commit -m "feat: lancamento inicial financa2"
   git remote add origin https://github.com/SEU_USUARIO/financa2.git
   git push -u origin main
   ```
3. No GitHub, vá em **Settings** ➔ **Pages** ➔ **Build and deployment** ➔ Selecione **GitHub Actions** (ou configure deploy da pasta `dist/`).
4. Seu aplicativo estará disponível no endereço: `https://SEU_USUARIO.github.io/financa2/`.

### Opção 2: Cloudflare Pages (100% Gratuito e Instantâneo)
1. Acesse o painel do Cloudflare (gratuito);
2. Em **Workers & Pages**, clique em **Create application** ➔ **Pages**;
3. Conecte ao repositório ou arraste a pasta `dist/` gerada por `npm run build`;
4. O aplicativo recebe um domínio seguro com HTTPS automático (ex: `https://financa2.pages.dev`).

---

## 7. Como Sincronizar e Fazer Backup entre os Celulares

Consulte o guia completo em [docs/backup-recovery.md](docs/backup-recovery.md):
- **Backup Periódico**: Na aba **Ajustes**, clique em **Baixar Backup Completo (.json)** e salve no WhatsApp ou Google Drive.
- **Passar Gastos de um Celular para o Outro**: Baixe o backup em um aparelho, envie pelo WhatsApp para o outro e clique em **Mesclar Backup do Cônjuge (.json)**. As compras serão combinadas sem duplicar nada.
- **Exportar para Excel**: Clique em **Exportar Planilha para Excel (.csv)**.

---

## 8. Estrutura de Documentação do Projeto
- [docs/requirements.md](docs/requirements.md): Requisitos de negócio aprovados e critérios de aceite.
- [docs/architecture.md](docs/architecture.md): Comparativo de arquiteturas, diagrama de componentes e decisões técnicas.
- [docs/data-model.md](docs/data-model.md): Entidades, tipos TypeScript e regras de integridade contábil.
- [docs/testing.md](docs/testing.md): Bateria de testes automatizados e evidências de execução.
- [docs/backup-recovery.md](docs/backup-recovery.md): Procedimentos operacionais de segurança e recuperação.
