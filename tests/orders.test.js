const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { prisma, startServer, postJson, requestJson, createUser } = require("./helpers");

let server;
let baseUrl;
let dona; // dona do restaurante: vê os pedidos dele e avança o status
let cliente; // faz os pedidos
let outro; // não pode ver nem mexer nos pedidos do cliente
let restaurantId;
let otherRestaurantId; // de outra dona: pratos dele não entram num pedido do primeiro
let pizza; // 12.90
let suco; // 7.50
let pratoDeOutroRestaurante;
const restaurantIds = [];
const userEmails = [];

const createOrder = (body, user = cliente) => postJson(`${baseUrl}/orders`, body, user?.token);
const getOrder = (id, user = cliente) => requestJson("GET", `${baseUrl}/orders/${id}`, undefined, user?.token);
const setStatus = (id, status, user) => requestJson("PATCH", `${baseUrl}/orders/${id}/status`, { status }, user?.token);

async function createRestaurant(name, owner) {
  const response = await postJson(`${baseUrl}/restaurants`, { name, category: "Teste" }, owner.token);
  const { id } = await response.json();
  restaurantIds.push(id);
  return id;
}

async function createDish(restId, name, price, owner) {
  const response = await postJson(`${baseUrl}/restaurants/${restId}/dishes`, { name, category: "Teste", price }, owner.token);
  assert.equal(response.status, 201);
  return (await response.json()).id;
}

// Pedido válido que uso em vários testes: 2 pizzas + 1 suco (2 x 12,90 + 7,50 = 33,30)
async function placeValidOrder(user = cliente) {
  const response = await createOrder({
    restaurantId,
    items: [{ dishId: pizza, quantity: 2 }, { dishId: suco, quantity: 1 }]
  }, user);
  assert.equal(response.status, 201);
  return response.json();
}

before(async () => {
  ({ server, baseUrl } = await startServer());

  dona = await createUser(baseUrl, "pedidos.dona");
  cliente = await createUser(baseUrl, "pedidos.cliente");
  outro = await createUser(baseUrl, "pedidos.outro");
  userEmails.push(dona.email, cliente.email, outro.email);

  restaurantId = await createRestaurant("Pedidos Pizzaria", dona);
  otherRestaurantId = await createRestaurant("Pedidos Outro", outro);
  pizza = await createDish(restaurantId, "Pizza Teste", 12.9, dona);
  suco = await createDish(restaurantId, "Suco Teste", 7.5, dona);
  pratoDeOutroRestaurante = await createDish(otherRestaurantId, "Prato Alheio", 5, outro);
});

after(async () => {
  try {
    // Apagando usuários e restaurantes, os pedidos e itens vão junto (cascata)
    await prisma.restaurant.deleteMany({ where: { id: { in: restaurantIds } } });
    await prisma.user.deleteMany({ where: { email: { in: userEmails } } });
  } finally {
    await prisma.$disconnect();
    server.close();
  }
});

describe("Pedidos exigem token", () => {
  it("retorna 401 sem token em todas as rotas", async () => {
    const responses = await Promise.all([
      createOrder({ restaurantId, items: [{ dishId: pizza, quantity: 1 }] }, null),
      fetch(`${baseUrl}/orders`),
      getOrder(1, null),
      setStatus(1, "CANCELLED", null),
      fetch(`${baseUrl}/restaurants/${restaurantId}/orders`)
    ]);

    assert.deepEqual(responses.map((r) => r.status), [401, 401, 401, 401, 401]);
  });
});

describe("POST /orders", () => {
  it("cria o pedido com status PLACED e total calculado no servidor", async () => {
    const order = await placeValidOrder();

    assert.equal(order.status, "PLACED");
    assert.equal(order.total, 33.3);
    assert.equal(order.userId, cliente.id);
    assert.deepEqual(order.restaurant, { id: restaurantId, name: "Pedidos Pizzaria" });
    assert.deepEqual(
      order.items.map(({ dishId, name, unitPrice, quantity, subtotal }) => ({ dishId, name, unitPrice, quantity, subtotal })),
      [
        { dishId: pizza, name: "Pizza Teste", unitPrice: 12.9, quantity: 2, subtotal: 25.8 },
        { dishId: suco, name: "Suco Teste", unitPrice: 7.5, quantity: 1, subtotal: 7.5 }
      ]
    );
  });

  it("ignora preço e total enviados pelo cliente", async () => {
    const response = await createOrder({
      restaurantId,
      total: 0.01,
      items: [{ dishId: pizza, quantity: 1, price: 0.01, unitPrice: 0.01 }]
    });
    const order = await response.json();

    assert.equal(response.status, 201);
    assert.equal(order.total, 12.9);
    assert.equal(order.items[0].unitPrice, 12.9);
  });

  it("soma com precisão de centavos (sem erro de ponto flutuante)", async () => {
    // 3 x 12,90 = 38,70 (em float puro, 12.9 * 3 = 38.699999999999996)
    const response = await createOrder({ restaurantId, items: [{ dishId: pizza, quantity: 3 }] });

    assert.equal((await response.json()).total, 38.7);
  });

  it("guarda nome e preço do momento da compra, mesmo se o prato mudar depois", async () => {
    const dishId = await createDish(restaurantId, "Prato Que Muda", 10, dona);
    const response = await createOrder({ restaurantId, items: [{ dishId, quantity: 1 }] });
    const order = await response.json();

    await requestJson("PUT", `${baseUrl}/dishes/${dishId}`, { name: "Prato Novo", category: "Teste", price: 99 }, dona.token);
    const afterUpdate = await (await getOrder(order.id)).json();
    assert.equal(afterUpdate.items[0].name, "Prato Que Muda");
    assert.equal(afterUpdate.items[0].unitPrice, 10);
    assert.equal(afterUpdate.total, 10);

    // Apago o prato: o item tem que continuar no pedido, só sem o vínculo
    await requestJson("DELETE", `${baseUrl}/dishes/${dishId}`, undefined, dona.token);
    const afterDelete = await (await getOrder(order.id)).json();
    assert.equal(afterDelete.items[0].dishId, null);
    assert.equal(afterDelete.items[0].name, "Prato Que Muda");
  });

  it("retorna 404 para restaurante inexistente", async () => {
    const response = await createOrder({ restaurantId: 2147483647, items: [{ dishId: pizza, quantity: 1 }] });

    assert.equal(response.status, 404);
    assert.equal((await response.json()).error, "Restaurante não encontrado");
  });

  it("recusa prato de outro restaurante ou inexistente", async () => {
    for (const dishId of [pratoDeOutroRestaurante, 2147483647]) {
      const response = await createOrder({ restaurantId, items: [{ dishId: pizza, quantity: 1 }, { dishId, quantity: 1 }] });
      assert.equal(response.status, 400, `prato ${dishId}`);
      assert.match((await response.json()).error, /não existe neste restaurante/);
    }
  });

  it("recusa corpo inválido com 400", async () => {
    const invalid = [
      {},
      { restaurantId },
      { restaurantId, items: [] },
      { restaurantId, items: "pizza" },
      { restaurantId: "abc", items: [{ dishId: pizza, quantity: 1 }] },
      { restaurantId, items: [{ dishId: "abc", quantity: 1 }] },
      { restaurantId, items: [{ dishId: pizza }] },
      { restaurantId, items: [{ dishId: pizza, quantity: 0 }] },
      { restaurantId, items: [{ dishId: pizza, quantity: -1 }] },
      { restaurantId, items: [{ dishId: pizza, quantity: 1.5 }] },
      { restaurantId, items: [{ dishId: pizza, quantity: "2" }] },
      { restaurantId, items: [{ dishId: pizza, quantity: 100 }] },
      { restaurantId, items: [null] },
      { restaurantId, items: [{ dishId: pizza, quantity: 1 }, { dishId: pizza, quantity: 2 }] },
      { restaurantId, items: Array.from({ length: 51 }, (_, i) => ({ dishId: i + 1, quantity: 1 })) }
    ];

    for (const body of invalid) {
      const response = await createOrder(body);
      assert.equal(response.status, 400, JSON.stringify(body).slice(0, 80));
    }
  });

  it("não grava nada quando o pedido é recusado", async () => {
    const before = await prisma.order.count({ where: { userId: outro.id } });
    await createOrder({ restaurantId, items: [{ dishId: pizza, quantity: 1 }, { dishId: pratoDeOutroRestaurante, quantity: 1 }] }, outro);

    assert.equal(await prisma.order.count({ where: { userId: outro.id } }), before);
  });
});

describe("GET /orders e GET /orders/:id", () => {
  let orderId;

  before(async () => {
    orderId = (await placeValidOrder()).id;
  });

  it("lista só os pedidos do próprio usuário, do mais recente para o mais antigo", async () => {
    const response = await requestJson("GET", `${baseUrl}/orders`, undefined, cliente.token);
    const orders = await response.json();

    assert.equal(response.status, 200);
    assert.ok(orders.length >= 1);
    assert.equal(orders[0].id, orderId);
    assert.ok(orders.every((order) => order.userId === cliente.id));

    const ids = orders.map((order) => order.id);
    assert.deepEqual(ids, [...ids].sort((a, b) => b - a));
  });

  it("outro usuário tem lista vazia", async () => {
    const response = await requestJson("GET", `${baseUrl}/orders`, undefined, outro.token);

    assert.deepEqual(await response.json(), []);
  });

  it("cliente e dona do restaurante veem o pedido; resposta não expõe o ownerId", async () => {
    for (const user of [cliente, dona]) {
      const response = await getOrder(orderId, user);
      const order = await response.json();
      assert.equal(response.status, 200);
      assert.equal(order.id, orderId);
      assert.deepEqual(Object.keys(order.restaurant).sort(), ["id", "name"]);
    }
  });

  it("outro usuário recebe 404 (não 403): não revela que o pedido existe", async () => {
    const response = await getOrder(orderId, outro);

    assert.equal(response.status, 404);
    assert.equal((await response.json()).error, "Pedido não encontrado");
  });

  it("retorna 404 para pedido inexistente e 400 para id inválido", async () => {
    assert.equal((await getOrder(2147483647)).status, 404);

    for (const id of ["abc", "0", "-1", "1.5", "2147483648"]) {
      assert.equal((await getOrder(id)).status, 400, `id ${id}`);
    }
  });
});

describe("GET /restaurants/:restaurantId/orders", () => {
  it("a dona vê os pedidos recebidos pelo restaurante", async () => {
    const { id } = await placeValidOrder();
    const response = await requestJson("GET", `${baseUrl}/restaurants/${restaurantId}/orders`, undefined, dona.token);
    const orders = await response.json();

    assert.equal(response.status, 200);
    assert.equal(orders[0].id, id);
    assert.ok(orders.every((order) => order.restaurant.id === restaurantId));
  });

  it("quem não é dono recebe 403", async () => {
    for (const user of [cliente, outro]) {
      const response = await requestJson("GET", `${baseUrl}/restaurants/${restaurantId}/orders`, undefined, user.token);
      assert.equal(response.status, 403);
    }
  });

  it("retorna 404 para restaurante inexistente", async () => {
    const response = await requestJson("GET", `${baseUrl}/restaurants/2147483647/orders`, undefined, dona.token);

    assert.equal(response.status, 404);
  });
});

describe("PATCH /orders/:id/status (máquina de estados)", () => {
  it("a dona leva o pedido de PLACED até DELIVERED", async () => {
    const { id } = await placeValidOrder();

    for (const status of ["PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"]) {
      const response = await setStatus(id, status, dona);
      assert.equal(response.status, 200, status);
      assert.equal((await response.json()).status, status);
    }
  });

  it("não pula etapas nem sai de um status final (409)", async () => {
    const { id } = await placeValidOrder();

    assert.equal((await setStatus(id, "DELIVERED", dona)).status, 409);
    assert.equal((await setStatus(id, "OUT_FOR_DELIVERY", dona)).status, 409);

    await setStatus(id, "CANCELLED", dona);
    const response = await setStatus(id, "PREPARING", dona);
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /CANCELLED para PREPARING/);
  });

  it("o cliente cancela enquanto o pedido está PLACED", async () => {
    const { id } = await placeValidOrder();
    const response = await setStatus(id, "CANCELLED", cliente);

    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, "CANCELLED");
  });

  it("cancelar de novo é idempotente (200, sem mudança)", async () => {
    const { id } = await placeValidOrder();
    await setStatus(id, "CANCELLED", cliente);
    const response = await setStatus(id, "CANCELLED", cliente);

    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, "CANCELLED");
  });

  it("o cliente não cancela depois que o preparo começou, nem avança o pedido (403)", async () => {
    const { id } = await placeValidOrder();

    assert.equal((await setStatus(id, "PREPARING", cliente)).status, 403);
    await setStatus(id, "PREPARING", dona);
    assert.equal((await setStatus(id, "CANCELLED", cliente)).status, 403);
  });

  it("outro usuário recebe 404", async () => {
    const { id } = await placeValidOrder();

    assert.equal((await setStatus(id, "CANCELLED", outro)).status, 404);
  });

  it("recusa status desconhecido (400)", async () => {
    const { id } = await placeValidOrder();

    for (const status of ["ENTREGUE", "placed", "", undefined, 1]) {
      assert.equal((await setStatus(id, status, dona)).status, 400, String(status));
    }
  });

  it("cliente cancelando e dona aceitando ao mesmo tempo: só um vence", async () => {
    const { id } = await placeValidOrder();
    const responses = await Promise.all([setStatus(id, "CANCELLED", cliente), setStatus(id, "PREPARING", dona)]);
    const statuses = responses.map((r) => r.status);

    // Um tem que vencer (200). O outro leva 409 se leu o pedido antes da gravação (concorrência
    // otimista) ou 403/409 pela máquina de estados se leu depois. O que nunca pode: dois 200.
    assert.equal(statuses.filter((s) => s === 200).length, 1, String(statuses));
    assert.ok(statuses.every((s) => [200, 403, 409].includes(s)), String(statuses));
    const final = await (await getOrder(id)).json();
    const winner = responses[0].status === 200 ? "CANCELLED" : "PREPARING";
    assert.equal(final.status, winner);
  });
});
