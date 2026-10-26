# Guia de Exportação, Backup e Restauração — Finança2

## 1. Visão Geral
Como o **Finança2** adota a arquitetura *Local-First* (sem banco de dados em nuvem comercial permanente para evitar custos e congelamento de base), a posse e salvaguarda dos dados pertence exclusivamente ao casal Ricardo e Natália.

O aplicativo fornece dois mecanismos complementares para garantir segurança e sincronização contínua:
1. **Sincronização Direta P2P (Wi-Fi)**: Para quando ambos estiverem juntos em casa.
2. **Backup e Mesclagem por Arquivo JSON**: O método definitivo e infalível que funciona mesmo se os celulares estiverem em locais diferentes.

---

## 2. Rotinas de Backup e Exportação

### 2.1. Como Baixar o Backup do Sistema (.json)
1. No celular, toque na aba **⚙️ Ajustes**.
2. Na seção **Backup, Importação e Exportação**, toque em **📦 Baixar Backup Completo (.json)**.
3. O aparelho baixará instantaneamente um arquivo nomeado como:
   `financa2-backup-AAAA-MM-DD.json`
4. **O que este arquivo contém**:
   - Todas as transações e parcelamentos registrados por Ricardo e Natália;
   - Histórico de exclusões lógicas (*soft deletes*);
   - Todas as categorias ativas e personalizadas;
   - Todas as regras determinísticas de sugestão automática;
   - Carimbo de data/hora da exportação e versão do esquema.

> **Dica de Segurança**: Envie esse arquivo periodicamente para o seu e-mail pessoal, WhatsApp do casal ou guarde no Google Drive/iCloud para ter sempre um ponto de restauração seguro.

### 2.2. Como Exportar para Planilha Excel (.csv)
1. Na aba **⚙️ Ajustes**, toque em **📊 Exportar Planilha para Excel (.csv)**.
2. O aplicativo gera um arquivo formatado com cabeçalhos legíveis (`Data`, `Descricao`, `Valor_BRL`, `Quem_Pagou`, `Categoria`, `Natureza`, `Forma_Pagamento`, `Parcela`), com separador `;` e codificação UTF-8 compatível com o Microsoft Excel e Google Planilhas.

---

## 3. Sincronização entre os Celulares de Ricardo e Natália

### 3.1. Método por Arquivo (Mais Simples e Confiável)
Quando Ricardo registrar compras na rua e quiser passar para o celular da Natália (ou vice-versa):
1. No celular de Ricardo: Toque em **📦 Baixar Backup Completo (.json)** e envie o arquivo pelo WhatsApp para Natália.
2. No celular de Natália: Abra o WhatsApp, baixe o arquivo recebido.
3. No app da Natália: Vá em **⚙️ Ajustes** e toque em **🔀 Mesclar Backup do Cônjuge (.json)**.
4. Selecione o arquivo baixado.
5. O motor de sincronização (*mergeEngine*) unirá as compras novas de Ricardo com as que Natália já tinha no celular dela, aplicando o algoritmo *Last-Write-Wins*:
   - Nenhuma despesa já existente será duplicada;
   - Despesas que tiverem sido editadas serão atualizadas pela versão mais recente;
   - Despesas excluídas serão ocultadas.
6. Uma notificação confirmará: *"✅ Mesclagem concluída: X novos, Y atualizados!"*.

### 3.2. Método Direto Wi-Fi (P2P sem Arquivos)
Quando ambos estiverem conectados na mesma rede Wi-Fi doméstica:
1. No Celular 1: Vá em **⚙️ Ajustes** ➔ **📲 Iniciar Pareamento P2P (Wi-Fi)** ➔ Toque em **📲 Aparelho 1: Gerar Código de Pareamento**.
2. O aparelho exibirá um código na tela.
3. No Celular 2: Vá em **⚙️ Ajustes** ➔ **📲 Iniciar Pareamento P2P (Wi-Fi)** ➔ Toque em **📥 Aparelho 2: Conectar ao Código** e cole o código.
4. O canal de dados seguro *WebRTC DataChannel* é aberto diretamente entre os celulares pela rede local e a mesclagem ocorre em ~2 segundos.

---

## 4. Procedimento de Restauração em Aparelho Novo ou Formatado

Caso troque de smartphone ou precise reinstalar o aplicativo do zero:
1. No novo smartphone, acesse o link do aplicativo pelo navegador (ex: link do GitHub Pages) e clique em *"Adicionar à tela de início"*.
2. Abra o app, vá na aba **⚙️ Ajustes**.
3. Toque no botão **⚠️ Restaurar Backup Completo (Substituir)**.
4. Selecione o arquivo `.json` de backup mais recente que você guardou no seu e-mail/nuvem.
5. O sistema substituirá a base vazia com 100% dos dados originais, reconstituindo todo o histórico e categorias fielmente.
