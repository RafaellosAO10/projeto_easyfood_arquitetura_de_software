const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { prisma, startServer, postJson, requestJson, createUser } = require("./helpers");

let server;
let baseUrl;
let owner; // dono do restaurante
let other; // outro usuário autenticado, sem posse do restaurante
let restaurantId;
let legacyRestaurantId; // restaurante sem dono (anterior à versão com ownerId)
let dishId;

const validDish = {
  name: "Pizza Margherita",
  category: "Pizza",
  description: "Molho de tomate, muçarela e manjericão",
  price: 49.9
};

before(async () => {
  ({ server, baseUrl } = await startServer());

  owner = await createUser(baseUrl, "pratos.dono");
  other = await createUser(baseUrl, "pratos.outro");

  const response = await postJson(
    `${baseUrl}/restaurants`,
    { name: "Restaurante dos Testes de Pratos", category: "Teste" },
    owner.token
  );
  ({ id: restaurantId } = await response.json());

  ({ id: legacyRestaurantId } = await prisma.restaurant.create({
    data: { name: "Restaurante Sem Dono", category: "Teste" }
  }));
});

after(async () => {
  try {
    // Os pratos são removidos em cascata junto com os restaurantes
    await prisma.restaurant.deleteMany({ where: { id: { in: [restaurantId, legacyRestaurantId] } } });
    await prisma.user.deleteMany({ where: { email: { in: [owner.email, other.email] } } });
  } finally {
    await prisma.$disconnect();
    server.close();
  }
});

describe("POST /restaurants grava o dono", () => {
  it("o restaurante criado tem ownerId do usuário do token", async () => {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    assert.equal(restaurant.ownerId, owner.id);
  });
});

describe("POST /restaurants/:restaurantId/dishes", () => {
  const url = () => `${baseUrl}/restaurants/${restaurantId}/dishes`;

  it("retorna 401 sem token", async () => {
    const response = await postJson(url(), validDish);
    assert.equal(response.status, 401);
  });

  it("retorna 403 quando o usuário não é o dono do restaurante", async () => {
    const response = await postJson(url(), validDish, other.token);
    assert.equal(response.status, 403);
  });

  it("retorna 403 em restaurante sem dono", async () => {
    const response = await postJson(
      `${baseUrl}/restaurants/${legacyRestaurantId}/dishes`,
      validDish,
      owner.token
    );
    assert.equal(response.status, 403);
  });

  it("retorna 404 quando o restaurante não existe", async () => {
    const response = await postJson(`${baseUrl}/restaurants/999999999/dishes`, validDish, owner.token);
    assert.equal(response.status, 404);
  });

  it("retorna 400 com identificador inválido", async () => {
    const response = await postJson(`${baseUrl}/restaurants/abc/dishes`, validDish, owner.token);
    assert.equal(response.status, 400);
  });

  it("retorna 400 sem nome ou categoria", async () => {
    const response = await postJson(url(), { price: 10 }, owner.token);
    assert.equal(response.status, 400);
  });

  it("retorna 400 com preço negativo ou não numérico", async () => {
    for (const price of [-1, "10", null]) {
      const response = await postJson(url(), { ...validDish, price }, owner.token);
      assert.equal(response.status, 400, `preço ${JSON.stringify(price)}`);
    }
  });

  it("retorna 400 quando o nome ultrapassa 150 caracteres", async () => {
    const response = await postJson(url(), { ...validDish, name: "a".repeat(151) }, owner.token);
    assert.equal(response.status, 400);
  });

  it("o dono cadastra o prato (201), sem imagem e com preço numérico", async () => {
    const response = await postJson(url(), validDish, owner.token);
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.name, validDish.name);
    assert.equal(body.price, 49.9);
    assert.equal(body.imageUrl, null);
    assert.equal(body.restaurantId, restaurantId);

    dishId = body.id;
  });
});

describe("GET (público)", () => {
  it("lista os pratos do restaurante sem token", async () => {
    const response = await fetch(`${baseUrl}/restaurants/${restaurantId}/dishes`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body.map((d) => d.id), [dishId]);
  });

  it("retorna 404 ao listar pratos de restaurante inexistente", async () => {
    const response = await fetch(`${baseUrl}/restaurants/999999999/dishes`);
    assert.equal(response.status, 404);
  });

  it("busca um prato por id", async () => {
    const response = await fetch(`${baseUrl}/dishes/${dishId}`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.id, dishId);
  });

  it("retorna 404 para prato inexistente", async () => {
    const response = await fetch(`${baseUrl}/dishes/999999999`);
    assert.equal(response.status, 404);
  });
});

describe("PUT /dishes/:dishId", () => {
  const changed = { ...validDish, name: "Pizza Margherita Especial", price: 55 };

  it("retorna 401 sem token", async () => {
    const response = await requestJson("PUT", `${baseUrl}/dishes/${dishId}`, changed);
    assert.equal(response.status, 401);
  });

  it("retorna 403 para quem não é o dono", async () => {
    const response = await requestJson("PUT", `${baseUrl}/dishes/${dishId}`, changed, other.token);
    assert.equal(response.status, 403);
  });

  it("retorna 400 com dados inválidos", async () => {
    const response = await requestJson("PUT", `${baseUrl}/dishes/${dishId}`, { name: "" }, owner.token);
    assert.equal(response.status, 400);
  });

  it("o dono atualiza o prato (200)", async () => {
    const response = await requestJson("PUT", `${baseUrl}/dishes/${dishId}`, changed, owner.token);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.name, changed.name);
    assert.equal(body.price, 55);
  });
});

describe("DELETE /dishes/:dishId", () => {
  it("retorna 403 para quem não é o dono", async () => {
    const response = await requestJson("DELETE", `${baseUrl}/dishes/${dishId}`, undefined, other.token);
    assert.equal(response.status, 403);
  });

  it("o dono remove o prato (204) e ele deixa de existir", async () => {
    const response = await requestJson("DELETE", `${baseUrl}/dishes/${dishId}`, undefined, owner.token);
    assert.equal(response.status, 204);

    const check = await fetch(`${baseUrl}/dishes/${dishId}`);
    assert.equal(check.status, 404);
  });
});
