# CriAItor 3D — Painel empresarial (versão revisada)

Painel de administração estático em HTML, CSS e JavaScript, compatível com hospedagem no GitHub Pages e com a estrutura de Supabase do projeto original. Esta versão **preserva os sete módulos**: visão geral, produtos, pedidos, precificação, custos, filamentos e sincronização. Mantém também upload de fotos, importação CSV, exportações CSV, histórico de preço, baixa de filamento e backup.

## Melhorias desta versão

- Corrigido o **carregamento duplicado de scripts**, que podia executar eventos duas vezes ou impedir a inicialização.
- Padronizada a ordem de carregamento do Supabase e dos módulos.
- Falha da CDN/Supabase não interrompe o painel: a interface e os dados do navegador permanecem acessíveis, com indicador de estado.
- Última versão do catálogo lida com êxito fica no cache local, **somente para consulta** quando a conexão falha; alterações online não são simuladas.
- Mantido o controle de versão otimista na gravação do catálogo para evitar a substituição silenciosa de alterações feitas em outra sessão.
- Eliminada a consulta periódica duplicada do catálogo; o monitor de sincronização centraliza a atualização e aguarda o fechamento do editor de produto.
- Corrigida a data local para evitar mudança de dia por causa do fuso UTC.
- Fortalecida a verificação de backup: validação de estrutura, limite de tamanho, confirmação de substituição e opção **separada** para restaurar produtos no Supabase.
- Melhorado o diagnóstico de falha de armazenamento local.
- Dados locais atualizados em uma segunda aba são recarregados na primeira.
- Seleção pendente de imagem é limpa ao abrir outro produto; erros de upload são exibidos sem fechar o formulário.
- Importador CSV rejeita aspas não fechadas e arquivos grandes.
- Melhoradas responsividade, navegação por teclado, foco visível, títulos de janelas e redução de animações por preferência do usuário.

## O que fica salvo onde

| Dados | Armazenamento | Disponível em outros dispositivos? |
| --- | --- | --- |
| Produtos e imagens | Supabase (`catalogo` e Storage `projetos`) | Sim, com acesso configurado |
| Pedidos | `localStorage` do navegador | Não, salvo por backup/importação |
| Custos | `localStorage` do navegador | Não, salvo por backup/importação |
| Filamentos | `localStorage` do navegador | Não, salvo por backup/importação |
| Parâmetros, adicionais e histórico de precificação | `localStorage` | Não, salvo por backup |
| Última cópia do catálogo | Cache em `localStorage` | Apenas consulta offline; não substitui o Supabase |

**Importante:** usar o painel em outro navegador/computador não sincroniza pedidos, custos, filamentos e histórico automaticamente. É uma limitação da arquitetura original, mantida para não exigir uma migração não testada do banco. Faça backup antes de trocar de dispositivo, limpar dados do navegador ou publicar grandes alterações.

## Publicação / instalação

1. Extraia o arquivo ZIP.
2. Copie `index.html` e a pasta `src/` para a raiz do repositório/pasta que hospeda o painel. Não mude os caminhos relativos sem ajustar o HTML.
3. Confirme que `src/supabase-config.js` aponta para o projeto Supabase correto. Ele contém uma **chave publicável**, não uma chave `service_role`.
4. No Supabase, o registro `catalogo` com `id = 1` deve existir com os campos `produtos` (array JSON) e `versao` (número). O Storage deve possuir o bucket `projetos` e permitir os acessos necessários para fotos. A versão revisada **não altera nem cria o esquema do banco**.
5. Publique pelo GitHub Pages ou outro servidor HTTPS. Para abrir localmente por servidor, navegue até a pasta extraída e execute `python -m http.server 8000`, depois visite `http://localhost:8000`.
6. No painel, confirme o indicador **“Catálogo online”**. Cadastre um produto de teste, carregue uma foto e teste a sincronização em uma segunda aba. Depois exporte um backup completo.

## Segurança — atenção antes de publicar

Este projeto mantém a modalidade **sem login** solicitada pela estrutura original. **Isso não constitui controle de acesso.** Dependendo das políticas RLS e de Storage definidas no seu Supabase, qualquer pessoa com acesso à página e às permissões públicas pode consultar, modificar ou excluir conteúdo. Não configure uma política pública de escrita como substituto de autenticação. Para uso em produção, o ideal é adicionar autenticação Supabase Auth e políticas **Row Level Security (RLS)** que autorizem somente os administradores, inclusive no Storage. Essa mudança requer configuração no projeto Supabase e testes em um ambiente de homologação; não pode ser garantida apenas alterando HTML/JS.

Não insira senhas, chaves secretas do Supabase ou `service_role` em arquivos servidos pelo GitHub Pages.

## Restauração de backup

- **Exportar backup** gera JSON contendo os dados locais e uma cópia dos produtos conhecidos pelo painel naquele momento.
- **Restaurar backup** pede confirmação para substituir as coleções locais presentes no arquivo.
- Se o backup tiver produtos, será oferecida **outra confirmação** para substituir o catálogo online. Escolha Cancelar nessa segunda pergunta para **manter os produtos do Supabase** e restaurar apenas os dados locais.
- Se houver conflito de versão ou problema de conexão, a gravação online será interrompida com aviso. Recomenda-se fazer backup do estado atual antes de qualquer restauração.

## Testes

Com Node.js instalado, execute a partir da raiz do projeto:

```bash
node tests/validar.js
node --check src/admin-sem-login.js
node --check src/fotos-empresa.js
node --check src/importar-csv.js
node --check src/sync-empresa.js
```

Esses testes verificam sintaxe, carregamento único, utilitários de catálogo, parser CSV com campos entre aspas e quebras de linha, normalização de filamento e integridade das referências dos módulos. **Não substituem testes ponta a ponta no navegador com o Supabase real.**

## Arquivos principais

- `index.html` — sete seções e formulários.
- `src/style.css` — aparência e responsividade.
- `src/admin-sem-login.js` — regras de negócio e funcionalidades do painel em uso.
- `src/supabase-config.js` — cliente e configuração do Supabase.
- `src/fotos-empresa.js` — upload e visualização de fotos.
- `src/sync-empresa.js` — acompanhamento da versão remota.
- `src/importar-csv.js` — importação de produtos, pedidos, custos e filamentos.
- `src/catalogo.js` — utilitários do catálogo.
- `src/admin.js` — **versão antiga, não carregada pelo `index.html`**, mantida apenas como referência para preservar o material enviado.

## Pontos para uma próxima versão arquitetural

Autenticação de administradores; migração segura dos módulos locais para tabelas próprias com RLS; testes de interface automatizados; logging e monitoramento; recuperação de upload órfão; confirmação de exclusões em fluxo transacional. Esses itens **não estão implementados** nesta versão, pois exigem decisões de acesso e alterações no banco de produção.
