const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { prisma, startServer, uniqueEmail, postJson } = require("./helpers");

let server;
let baseUrl;
let token;
const userEmail = uniqueEmail("restaurantes");
const createdIds = [];

function postRestaurant(body, authToken = token) {
  return postJson(`${baseUrl}/restaurants`, body, authToken);
}

before(async () => {
  ({ server, baseUrl } = await startServer());

  await postJson(`${baseUrl}/auth/register`, {
    name: "Usuário de Teste",
    email: userEmail,
    password: "123456"
  });

  const response = await postJson(`${baseUrl}/auth/login`, {
    email: userEmail,
    password: "123456"
  });
  ({ token } = await response.json());
});

after(async () => {
  try {
    // Remove apenas os dados criados pelos testes
    await prisma.restaurant.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.user.deleteMany({ where: { email: userEmail } });
  } finally {
    await prisma.$disconnect();
    server.close();
  }
});

describe("GET /restaurants", () => {
  it("é público e retorna 200 com a lista de restaurantes", async () => {
    const response = await fetch(`${baseUrl}/restaurants`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body));
  });
});

describe("POST /restaurants", () => {
  it("retorna 401 sem token", async () => {
    const response = await postRestaurant(
      { name: "Sem Token", category: "Teste" },
      null
    );

    assert.equal(response.status, 401);
  });

  it("retorna 401 com token inválido", async () => {
    const response = await postRestaurant(
      { name: "Token Inválido", category: "Teste" },
      "token-invalido"
    );

    assert.equal(response.status, 401);
  });

  it("cadastra um restaurante com token válido e retorna 201", async () => {
    const response = await postRestaurant({
      name: "Restaurante de Teste",
      category: "Teste",
      rating: 4.3
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    createdIds.push(body.id);

    assert.equal(typeof body.id, "number");
    assert.equal(body.name, "Restaurante de Teste");
    assert.equal(body.category, "Teste");
    assert.equal(body.rating, 4.3);
  });

  it("persiste o restaurante cadastrado", async () => {
    const response = await fetch(`${baseUrl}/restaurants`);
    const body = await response.json();

    assert.ok(body.some((restaurant) => createdIds.includes(restaurant.id)));
  });

  it("usa avaliação 0 quando o rating não é enviado", async () => {
    const response = await postRestaurant({ name: "Sem Avaliação", category: "Teste" });
    const body = await response.json();

    assert.equal(response.status, 201);
    createdIds.push(body.id);

    assert.equal(body.rating, 0);
  });

  it("retorna 400 quando nome ou categoria não são enviados", async () => {
    const response = await postRestaurant({ name: "Sem Categoria" });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "Nome e categoria são obrigatórios");
  });

  it("retorna 400 quando a requisição não possui corpo", async () => {
    const response = await fetch(`${baseUrl}/restaurants`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(response.status, 400);
  });

  it("retorna 400 quando a avaliação está fora do intervalo de 0 a 5", async () => {
    const response = await postRestaurant({ name: "Nota Alta", category: "Teste", rating: 7 });

    assert.equal(response.status, 400);
  });

  it("retorna 400 quando o nome ultrapassa 150 caracteres", async () => {
    const response = await postRestaurant({ name: "a".repeat(151), category: "Teste" });

    assert.equal(response.status, 400);
  });
});
