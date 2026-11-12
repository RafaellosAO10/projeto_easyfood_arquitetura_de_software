# ADR-013 - Pedidos com preço calculado no servidor e máquina de estados

## Status
Aceita

## Data
12/11/2026

## Responsável
Equipe EasyFood

## Contexto
O carrinho do front (ADR-010) fica só no `localStorage` e não tem como ser finalizado, e a aba
Pedidos mostra "em breve". Falta o módulo central de um app de delivery: transformar o carrinho
em um pedido guardado na conta, que o restaurante recebe e acompanha até a entrega.

Três questões guiaram a decisão:
1. **Quem define o preço?** O carrinho guarda nome e preço dos pratos no navegador, onde
   qualquer pessoa pode alterá-los.
2. **O que acontece com pedidos antigos** quando o dono muda o preço ou apaga um prato?
3. **Quem muda o status** do pedido, e entre quais etapas?

## Alternativas consideradas
Preço:
1. Aceitar `price` e `total` enviados pelo front: simples, mas permite pedir uma pizza por R$ 0,01.
2. **O front manda só `dishId` e `quantity`; o servidor busca o preço no banco e soma o total.**

Itens do pedido:
1. Só referenciar o prato (`dishId`): o histórico mudaria junto com o cardápio.
2. **Copiar nome e preço para o item (`OrderItem`) no momento da compra**, mantendo `dishId`
   apenas como vínculo, que vira nulo se o prato for apagado.

Status:
1. Campo de texto livre atualizado por qualquer `PUT`: nada impede ir de "entregue" para
   "em preparo".
2. **Enum `OrderStatus` + tabela de transições permitidas por papel (máquina de estados).**

## Decisão
Tabelas `Order` (cliente, restaurante, status, total, datas) e `OrderItem` (nome, preço unitário
e quantidade copiados do prato). Um pedido tem pratos de um único restaurante, como o carrinho.
O total é somado com `Prisma.Decimal` (`3 × 12,90 = 38,70`, sem o `38,6999…` do ponto flutuante)
e gravado junto com os itens na mesma transação (criação aninhada do Prisma). O banco reforça as
regras com `CHECK (quantity > 0)` e valores não negativos.

Máquina de estados (`TRANSITIONS` em `order.service.js`):

```
PLACED ──► PREPARING ──► OUT_FOR_DELIVERY ──► DELIVERED
   │           │
   └───────────┴──► CANCELLED
```

| Quem | Pode fazer |
|------|-----------|
| Dono do restaurante | `PLACED → PREPARING → OUT_FOR_DELIVERY → DELIVERED`; cancelar em `PLACED` ou `PREPARING` |
| Cliente | Cancelar só em `PLACED` (antes de o restaurante começar) |

`DELIVERED` e `CANCELLED` são finais. Pedir o status que o pedido já tem responde `200` sem
mudança (clique duplo em "Cancelar" não vira erro). A gravação usa **concorrência otimista**:
`UPDATE ... WHERE id = ? AND status = <status lido>`; se o cliente cancelar no mesmo instante
em que o restaurante aceita, só um vence e o outro recebe `409`.

Rotas (módulo `src/modules/orders`, todas com token; o usuário vem sempre do token):

| Rota | Resposta |
|------|----------|
| `POST /orders` | `201` com o pedido; corpo inválido ou prato de outro restaurante: `400`; restaurante inexistente: `404` |
| `GET /orders` | `200` com os pedidos do usuário, do mais recente para o mais antigo |
| `GET /orders/:orderId` | `200` para o cliente ou o dono do restaurante; para outros: `404` |
| `PATCH /orders/:orderId/status` | `200`; status desconhecido: `400`; papel sem permissão: `403`; transição impossível ou conflito: `409` |
| `GET /restaurants/:restaurantId/orders` | `200` para o dono; outros: `403` |

Quem não é cliente nem dono recebe `404` (e não `403`) em `GET /orders/:id`: pedidos são dados
pessoais, e o `403` confirmaria que aquele id existe. Já a lista por restaurante usa `403`,
como os pratos (ADR-007), porque o restaurante é público.

As chaves estrangeiras de `Order` usam `ON DELETE CASCADE` para usuário e restaurante, como
favoritos (ADR-012). A API não tem rota para apagar restaurante nem usuário; se um dia tiver,
esta escolha deve ser revista (provavelmente impedir a exclusão de quem tem pedidos).

## Consequências
- Positivas: o preço não pode ser manipulado pelo navegador; o histórico de pedidos não muda
  com o cardápio; as regras de status ficam em uma tabela única e testável, e a concorrência
  entre cliente e restaurante é tratada sem bloqueios.
- Negativas: duas tabelas, um enum e uma migration a mais; o nome e o preço do prato ficam
  duplicados em cada item (intencional); não há pagamento nem endereço de entrega, que ficam
  para uma próxima etapa.
