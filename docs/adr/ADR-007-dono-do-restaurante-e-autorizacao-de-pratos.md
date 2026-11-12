# ADR-007 - Dono do restaurante e autorização no cadastro de pratos

## Status
Aceita

## Data
12/11/2026

## Responsável
Equipe EasyFood

## Contexto
O módulo de pratos (`/restaurants/:restaurantId/dishes` e `/dishes/:dishId`) exigia apenas um JWT
válido. Qualquer usuário autenticado podia criar, editar ou remover pratos de **qualquer**
restaurante, porque o restaurante não sabia quem era o seu dono. O repositório do professor corrigiu
isso no commit `70e459e` (`Restaurant.ownerId` + `req.user.id` no `dish.service`).

A [ADR-004](ADR-004-autenticacao-com-jwt.md) resolve **autenticação** (quem é o usuário); faltava
**autorização** (o que esse usuário pode fazer).

## Alternativas consideradas
1. Manter só a autenticação (situação anterior — falha de autorização).
2. **Gravar o dono no restaurante e conferir a posse no service** antes de alterar pratos.
3. Papéis (admin, dono, cliente) com tabela de permissões — mais completo, desnecessário agora.

## Decisão
- `Restaurant` ganha `ownerId` (FK para `User`), preenchido com `req.user.id` no
  `POST /restaurants`. O id vem sempre do token, nunca do corpo da requisição.
- O `dish.service` carrega o restaurante (direto ou via prato) e chama `ensureOwnership`: se
  `restaurant.ownerId` for diferente do usuário do token, lança 403.
- Leitura do cardápio continua pública; criar, editar, remover e enviar imagem exigem JWT **e** posse.
- Diferente do repositório do professor, `ownerId` é **opcional** (`Int?`): o banco já tinha
  restaurantes sem dono e uma coluna `NOT NULL` impediria a migration. Restaurantes sem dono não
  podem ser gerenciados por ninguém (403). Se um usuário for excluído, os restaurantes dele ficam
  sem dono (`ON DELETE SET NULL`).

## Justificativa
- A regra fica no service, junto da regra de negócio, e não nas rotas: qualquer rota nova que mexa
  em pratos reutiliza `ensureOwnership`.
- 403 (proibido) e 404 (não existe) são respostas diferentes, o que facilita o uso pelo front.

## Consequências

### Positivas
- Um usuário não altera mais o cardápio de outro restaurante.
- Base pronta para futuras regras (ex.: só o dono vê pedidos do restaurante).

### Negativas / trade-offs
- Os restaurantes antigos ficam "congelados" até alguém atribuir um dono direto no banco.
- Toda operação de escrita faz uma consulta extra para carregar o restaurante.

## Critérios de revisão
1. Surgir a necessidade de vários administradores por restaurante ou de um papel de administrador.
2. Os restaurantes sem dono precisarem ser editados pela API.
