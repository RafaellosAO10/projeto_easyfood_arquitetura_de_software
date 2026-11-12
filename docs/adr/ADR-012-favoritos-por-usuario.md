# ADR-012 - Favoritos por usuário no banco, com rotas idempotentes

## Status
Aceita

## Data
12/11/2026

## Responsável
Equipe EasyFood

## Contexto
O mockup da Aula 2 tem o coração de favorito nos cards de restaurante e a aba Favoritos na
barra inferior. No front novo (ADR-010), o coração foi retirado e a aba mostra "aparecem
aqui", porque não havia onde guardar favoritos. Guardar no navegador (`localStorage`) faria os
favoritos sumirem ao trocar de aparelho ou limpar o navegador, e não seria uma funcionalidade
da API. Os favoritos precisam pertencer à conta do usuário.

## Alternativas consideradas
1. `localStorage` no front: sem backend, mas preso a um navegador.
2. Coluna de array (`favoriteIds Int[]`) em `User`: sem chave estrangeira; restaurantes
   apagados deixariam ids órfãos.
3. **Tabela de ligação `Favorite (userId, restaurantId)`**, relação N:N entre `User` e
   `Restaurant`.

E, para a API:
- `POST /favorites` com corpo + `409` se já existir, ou
- **`PUT` e `DELETE /favorites/:restaurantId`, idempotentes.**

## Decisão
Tabela `Favorite` com chave primária composta `(userId, restaurantId)`: o banco impede o mesmo
favorito duas vezes, mesmo com requisições simultâneas. As chaves estrangeiras usam
`ON DELETE CASCADE`: apagar o usuário ou o restaurante apaga os favoritos ligados. `createdAt`
ordena a lista do mais recente para o mais antigo.

Rotas (módulo `src/modules/favorites`, todas com token; o usuário vem sempre do token, nunca
da URL, então ninguém lê ou altera favoritos de outra pessoa):

| Rota | Resposta |
|------|----------|
| `GET /favorites` | `200` com os restaurantes favoritos, no formato de `GET /restaurants` |
| `PUT /favorites/:restaurantId` | `204`; restaurante inexistente: `404`; id inválido: `400` |
| `DELETE /favorites/:restaurantId` | `204`, mesmo se o favorito não existia; id inválido: `400` |

`PUT`/`DELETE` foram escolhidos porque favoritar é ligar/desligar um estado: repetir a chamada
(duplo clique, nova tentativa após falha de rede) não muda o resultado nem gera erro, o que
simplifica o front. Com `POST`, o segundo clique daria `409` e o front teria de tratá-lo.

No front, o coração é um botão redondo sobre a foto do card (variante escolhida em prévia
claro/escuro). O card virou um contêiner com o link e o botão lado a lado, porque botão dentro
de `<a>` é HTML inválido. A atualização é otimista: o coração muda na hora e volta ao estado
anterior, com aviso, se a API falhar; cliques repetidos durante a chamada são ignorados. Sem
login, o coração leva para Entrar e volta à tela de origem; a aba Favoritos convida a entrar.

## Consequências
- Positivas: favoritos acompanham a conta; integridade garantida pelo banco (sem duplicata, sem
  órfão); o front pode repetir chamadas sem tratamento especial.
- Negativas: uma tabela e uma migration a mais; o front faz uma chamada extra
  (`GET /favorites`) para saber quais corações pintar, quando o usuário está logado.
