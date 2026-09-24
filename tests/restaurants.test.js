const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");
const prisma = require("../src/database/prisma");

let server;
let baseUrl;
const createdIds = [];

function postRestaurant(body) {
  return fetch(`${baseUrl}/restaurants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  // Remove apenas os restaurantes criados pelos testes
  await prisma.restaurant.deleteMany({ where: { id: { in: createdIds } } });
  await prisma.$disconnect();
  server.close();
});

describe("GET /restaurants", () => {
  it("retorna 200 com a lista de restaurantes", async () => {
    const response = await fetch(`${baseUrl}/restaurants`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body));
  });
});

describe("POST /restaurants", () => {
  it("cadastra um restaurante e retorna 201", async () => {
    const response = await postRestaurant({
      name: "Restaurante de Teste",
      category: "Teste",
      rating: 4.3
    });
    const body = await response.json();
    createdIds.push(body.id);

    assert.equal(response.status, 201);
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
    createdIds.push(body.id);

    assert.equal(response.status, 201);
    assert.equal(body.rating, 0);
  });

  it("retorna 400 quando nome ou categoria não são enviados", async () => {
    const response = await postRestaurant({ name: "Sem Categoria" });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "Nome e categoria são obrigatórios");
  });

  it("retorna 400 quando a requisição não possui corpo", async () => {
    const response = await fetch(`${baseUrl}/restaurants`, { method: "POST" });

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
