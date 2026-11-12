# ADR-010 - Front-end sem framework, servido pela própria API

## Status
Aceita

## Data
12/11/2026

## Responsável
Equipe EasyFood

## Contexto
A página antiga era um formulário único de teste. Precisávamos de um front com cara de app,
fiel ao mockup da Aula 2 (cabeçalho com logo e carrinho, barra inferior Início/Buscar/Pedidos/
Favoritos/Perfil), com login, cardápio com fotos e o upload de fotos de perfil e de pratos da
Atividade 8. O projeto é uma disciplina de arquitetura: o front deve ser fácil de ler e rodar
sem etapa de build.

## Alternativas consideradas
1. Framework SPA (React/Vue) com build (Vite), em um container separado.
2. **HTML, CSS e JavaScript puro com ES Modules**, servido pelo `express.static` da API.
3. Páginas renderizadas no servidor (templates).

## Decisão
Opção 2. O front fica em `public/` e segue a mesma ideia de camadas da API:

- `js/api.js`: única camada que faz `fetch` (token JWT, erros, multipart do upload);
- `js/store.js`: estado no navegador (sessão, carrinho e tema no `localStorage`);
- `js/ui.js`: utilitários de interface (escape de HTML, moeda, campos, validação de imagem);
- `js/views/*.js`: uma tela por arquivo;
- `js/app.js`: roteamento por hash (`#/restaurante/2`), cabeçalho e barra inferior.

Design "Opção A" (branco + verde do mockup), com tema claro e escuro (segue o aparelho ou a
escolha do usuário no Perfil). Ícones da fonte Tabler Icons via CDN.

## Consequências
- Positivas: zero dependência nova e zero build; `npm start` já entrega API e front no mesmo
  endereço (sem CORS); cada camada do front tem uma responsabilidade clara.
- Negativas: sem componentes reativos, cada tela redesenha o próprio HTML; os ícones exigem
  internet (CDN); o roteamento por hash não gera URLs "limpas".
- Lacunas da API que o front contorna: não há `GET /restaurants/:id` (o cardápio filtra a lista)
  nem foto de restaurante (a capa é a foto do primeiro prato que tiver uma).
- Ainda sem API: pedidos e favoritos (abas mostram "aparecem aqui"); finalizar o carrinho.
