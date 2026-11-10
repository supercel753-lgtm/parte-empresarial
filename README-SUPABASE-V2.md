# CriAItor 3D — Parte Empresarial / Supabase V2

Esta versão mantém o catálogo existente e adiciona sincronização empresarial e importação universal.

## Antes de publicar

1. Abra o SQL Editor do Supabase e execute `SUPABASE-MIGRACAO.sql` uma única vez.
2. Confirme que o bucket `projetos` já existe (o projeto já o utilizava para imagens).
3. Publique todos os arquivos no GitHub Pages.
4. Abra **Publicar > Central de Importação**.

## Formatos aceitos

CSV, TSV, TXT, JSON, XLS, XLSX, XLSM, ODS, DOCX e PDF.

- Produtos: gravados na coluna `produtos` existente da tabela `catalogo`.
- Pedidos, custos, filamentos, configuração de precificação, adicionais e histórico: sincronizados para colunas JSONB da mesma linha `catalogo.id = 1`.
- Arquivos originais: enviados para `projetos/importacoes/...` quando a opção estiver marcada.
- Histórico das importações: armazenado em `catalogo.importacoes`.

## Segurança

A chave publishable pode ficar no navegador. **Nunca** coloque uma chave `service_role` no JavaScript do site. Como o painel atual não possui login, revise as políticas RLS da tabela `catalogo` e do bucket `projetos` antes de expor o painel publicamente.
