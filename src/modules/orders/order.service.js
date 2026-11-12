const { Prisma, OrderStatus } = require("@prisma/client");
const prisma = require("../../database/prisma");
const { HttpError, parseId } = require("../shared/http-error");

const MAX_ITEMS = 50;
const MAX_QUANTITY = 99;
const STATUSES = Object.values(OrderStatus);

// Máquina de estados do pedido (ADR-013). Deixo numa tabela só quem pode levar o pedido de
// um status a outro: o dono avança o preparo e o cliente só cancela enquanto o restaurante
// não começou. DELIVERED e CANCELLED não aparecem como origem porque são finais.
const TRANSITIONS = {
  owner: {
    PLACED: ["PREPARING", "CANCELLED"],
    PREPARING: ["OUT_FOR_DELIVERY", "CANCELLED"],
    OUT_FOR_DELIVERY: ["DELIVERED"]
  },
  customer: {
    PLACED: ["CANCELLED"]
  }
};

const ORDER_INCLUDE = {
  restaurant: { select: { id: true, name: true } },
  items: { orderBy: { id: "asc" } }
};

// O Prisma me devolve DECIMAL como objeto Decimal (vira string no JSON), então converto
// para número aqui, só na saída. As contas continuam em Decimal.
function formatOrder(order) {
  return {
    id: order.id,
    userId: order.userId,
    status: order.status,
    total: Number(order.total),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    restaurant: order.restaurant,
    items: order.items.map((item) => ({
      id: item.id,
      dishId: item.dishId,
      name: item.name,
      unitPrice: Number(item.unitPrice),
      quantity: item.quantity,
      subtotal: Number(item.unitPrice.mul(item.quantity))
    }))
  };
}

// Valido o corpo de POST /orders e devolvo { restaurantId, items: [{ dishId, quantity }] }.
// Do cliente eu só aceito ids e quantidades; nome e preço eu busco no banco, porque o
// carrinho fica no navegador e qualquer um poderia mudar o preço lá.
function parseOrderInput(body) {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Corpo da requisição inválido");
  }

  const restaurantId = parseId(body.restaurantId);
  const { items } = body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, "O pedido precisa de ao menos um item");
  }

  if (items.length > MAX_ITEMS) {
    throw new HttpError(400, `O pedido aceita no máximo ${MAX_ITEMS} pratos diferentes`);
  }

  const seen = new Set();
  const parsed = items.map((item) => {
    const dishId = parseId(item?.dishId);
    const quantity = item?.quantity;

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new HttpError(400, `Quantidade deve ser um inteiro de 1 a ${MAX_QUANTITY}`);
    }

    if (seen.has(dishId)) {
      throw new HttpError(400, "Prato repetido no pedido: some as quantidades em um só item");
    }

    seen.add(dishId);
    return { dishId, quantity };
  });

  return { restaurantId, items: parsed };
}

async function createOrder(userId, body) {
  const { restaurantId, items } = parseOrderInput(body);

  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });

  if (!restaurant) {
    throw new HttpError(404, "Restaurante não encontrado");
  }

  // Filtro pelo restaurante também: assim um prato de outro restaurante "não existe" aqui
  // e o pedido não mistura restaurantes
  const dishes = await prisma.dish.findMany({
    where: { id: { in: items.map((item) => item.dishId) }, restaurantId }
  });
  const dishById = new Map(dishes.map((dish) => [dish.id, dish]));
  const missing = items.find((item) => !dishById.has(item.dishId));

  if (missing) {
    throw new HttpError(400, `Prato ${missing.dishId} não existe neste restaurante`);
  }

  // Copio nome e preço do prato agora (a "foto" do pedido), para o histórico não mudar se o
  // dono mexer no cardápio depois. Somo com Decimal porque em float 12.9 * 3 dá 38.6999...
  const orderItems = items.map(({ dishId, quantity }) => {
    const dish = dishById.get(dishId);
    return { dishId, quantity, name: dish.name, unitPrice: dish.price };
  });
  const total = orderItems.reduce(
    (sum, item) => sum.add(new Prisma.Decimal(item.unitPrice).mul(item.quantity)),
    new Prisma.Decimal(0)
  );

  try {
    // Criação aninhada: o Prisma grava pedido e itens na mesma transação (ou tudo, ou nada)
    const order = await prisma.order.create({
      data: { userId, restaurantId, total, items: { create: orderItems } },
      include: ORDER_INCLUDE
    });

    return formatOrder(order);
  } catch (error) {
    // P2003 = chave estrangeira inexistente. Acontece se apagaram o prato/restaurante entre a
    // minha consulta e a gravação, ou se o usuário do token (ainda válido) já não existe.
    if (error.code === "P2003") {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      throw user
        ? new HttpError(409, "O cardápio mudou enquanto o pedido era feito; tente de novo")
        : new HttpError(401, "Usuário do token não encontrado");
    }
    throw error;
  }
}

// Pedidos do próprio usuário, do mais recente para o mais antigo (id desempata o mesmo instante)
async function listMyOrders(userId) {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: ORDER_INCLUDE,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });

  return orders.map(formatOrder);
}

// Descubro o papel do usuário neste pedido: cliente (quem pediu) e/ou dono do restaurante.
// Pode ser os dois, se o dono pedir no próprio restaurante.
function rolesFor(order, userId) {
  const roles = [];
  if (order.userId === userId) roles.push("customer");
  if (order.restaurant.ownerId !== null && order.restaurant.ownerId === userId) roles.push("owner");
  return roles;
}

// Carrego o pedido e confiro se o usuário pode vê-lo. Para quem não é cliente nem dono eu
// respondo 404, e não 403: pedido é dado pessoal, e um 403 confirmaria que aquele id existe.
async function findVisibleOrder(orderId, userId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { ...ORDER_INCLUDE, restaurant: { select: { id: true, name: true, ownerId: true } } }
  });

  if (!order) {
    throw new HttpError(404, "Pedido não encontrado");
  }

  const roles = rolesFor(order, userId);

  if (roles.length === 0) {
    throw new HttpError(404, "Pedido não encontrado");
  }

  return { order, roles };
}

// Uso o ownerId só para checar permissão; tiro da resposta para não expor o dono
function stripOwner(order) {
  const { ownerId, ...restaurant } = order.restaurant;
  return { ...order, restaurant };
}

async function getOrder(orderId, userId) {
  const { order } = await findVisibleOrder(orderId, userId);
  return formatOrder(stripOwner(order));
}

// Pedidos recebidos por um restaurante: só o dono vê. Aqui uso 403 (como nos pratos)
// porque o restaurante é público; não há o que esconder sobre ele existir.
async function listRestaurantOrders(restaurantId, userId) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });

  if (!restaurant) {
    throw new HttpError(404, "Restaurante não encontrado");
  }

  if (restaurant.ownerId === null || restaurant.ownerId !== userId) {
    throw new HttpError(403, "Você não tem permissão para ver os pedidos deste restaurante");
  }

  const orders = await prisma.order.findMany({
    where: { restaurantId },
    include: ORDER_INCLUDE,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });

  return orders.map(formatOrder);
}

async function updateStatus(orderId, userId, body) {
  const next = body?.status;

  if (!STATUSES.includes(next)) {
    throw new HttpError(400, `Status inválido. Use um destes: ${STATUSES.join(", ")}`);
  }

  const { order, roles } = await findVisibleOrder(orderId, userId);
  const current = order.status;

  // Deixo idempotente: pedir o status que o pedido já tem não é erro (ex.: clique duplo em "Cancelar")
  if (current === next) {
    return formatOrder(stripOwner(order));
  }

  const allowedForUser = roles.some((role) => TRANSITIONS[role][current]?.includes(next));

  if (!allowedForUser) {
    // Separo os dois erros: 403 se a mudança existe mas não é deste papel (cliente tentando
    // aceitar), 409 se ninguém pode fazê-la (pular etapa, sair de um status final)
    const allowedForSomeone = Object.values(TRANSITIONS).some((byStatus) => byStatus[current]?.includes(next));
    throw allowedForSomeone
      ? new HttpError(403, "Você não tem permissão para fazer esta mudança no pedido")
      : new HttpError(409, `Não é possível mudar o pedido de ${current} para ${next}`);
  }

  // Concorrência otimista: só gravo se o status ainda for o que eu li acima. Se o restaurante
  // aceitar no mesmo instante em que o cliente cancela, só um UPDATE acha a linha; o outro
  // recebe 409. Não preciso de lock nem de transação longa para isso.
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, status: current },
    data: { status: next }
  });

  if (count === 0) {
    throw new HttpError(409, "O pedido mudou enquanto você o alterava; recarregue e tente de novo");
  }

  return getOrder(orderId, userId);
}

module.exports = {
  createOrder,
  listMyOrders,
  getOrder,
  listRestaurantOrders,
  updateStatus,
  TRANSITIONS
};
