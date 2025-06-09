# BuyZapp

BuyZapp é um e-commerce moderno com visual neon/azul, inspirado em grandes lojas online, que permite busca de produtos em múltiplas lojas, gerenciamento de carrinho, favoritos, histórico e autenticação de usuários.

## Funcionalidades

- **Visual neon/azul** responsivo, com ícones SVG e favicon personalizado.
- **Cadastro e login de usuários** (nome completo, e-mail, celular, usuário, senha).
- **Autenticação JWT** e backend Node.js com Express, SQLite, bcryptjs, JWT, axios, cheerio, cors.
- **Recuperação de senha** com token e tela customizada.
- **Mensagem de boas-vindas** personalizada no header fixo, com menu hamburguer e botão de logout.
- **Busca de produtos** por nome ou URL das principais lojas (Americanas, Amazon, Casas Bahia, Magazine Luiza, Mercado Livre).
- **Resultados de busca** exibidos em modal paginado (até 50 produtos, 10 por página, 5 páginas), com nomes idênticos aos das lojas de origem.
- **Filtro inteligente**: só exibe produtos relevantes, com nomes que contenham todas as palavras da busca e correspondam ao início ou similaridade do termo.
- **Adição rápida ao carrinho**: botão "Adicionar" preenche automaticamente o formulário com nome, preço, loja, URL e imagem do produto.
- **Carrinho estilizado**: cards centralizados, com botão de remover e botão de favorito (coração) integrado ao backend.
- **Favoritos**: salvar/remover favoritos no backend, integração visual.
- **Histórico de buscas e favoritos** salvos por usuário.
- **Máscara automática de moeda** para preços.

## Estrutura do Projeto

- `index.html` — Página principal, layout, header, integração frontend.
- `login.html` — Formulário de login/cadastro, recuperação de senha.
- `assets/css/styles.css` — Estilos globais neon, responsividade.
- `assets/js/script.js` — Lógica frontend: máscara moeda, busca, modal, favoritos, integração backend.
- `assets/img/favicon.svg` — Ícone da marca.
- `server.js` — Backend Node.js: rotas, banco, autenticação, scraping/API, busca por nome/URL, favoritos, histórico.
- `buyzapp.db` — Banco SQLite.

## Como rodar localmente

1. **Instale as dependências** (Node.js):
   ```sh
   npm install express sqlite3 bcryptjs jsonwebtoken axios cheerio cors
   ```
2. **Inicie o backend:**
   ```sh
   node server.js
   ```
3. **Abra o `index.html`** no navegador (recomenda-se usar Live Server ou similar para evitar problemas de CORS).

## Observações
- O backend deve estar rodando em `http://localhost:3001`.
- O frontend faz requisições diretas ao backend para login, cadastro, busca, favoritos, etc.
- O scraping pode ser limitado por bloqueios das lojas. Caso algum resultado não apareça, tente novamente ou refine a busca.
- O nome dos produtos exibidos SEMPRE corresponde ao nome real do site de origem.

## Melhorias Futuras
- Listagem de favoritos na interface.
- Filtros avançados de busca (exclusão de acessórios, similaridade por Levenshtein, etc).
- Publicação do backend para acesso externo.
- Implementação real das opções do menu (alterar cadastro, minha lista, etc).

---

Desenvolvido por BuyZapp Team — 2025.
