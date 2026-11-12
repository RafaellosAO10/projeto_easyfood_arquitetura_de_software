const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { prisma, startServer, postJson, requestJson, createUser } = require("./helpers");

let server;
let baseUrl;
let ana; // usuária que favorita
let bruno; // outro usuário: não pode ver nem mexer nos favoritos da Ana
const restaurantIds = [];
const userEmails = [];

const favorite = (restaurantId, user = ana) => requestJson("PUT", `${baseUrl}/favorites/${restaurantId}`, undefined, user?.token);
const unfavorite = (restaurantId, user = ana) => requestJson("DELETE", `${baseUrl}/favorites/${restaurantId}`, undefined, user?.token);

async function listFavorites(user = ana) {
  const response = await requestJson("GET", `${baseUrl}/favorites`, undefined, user.token);
  assert.equal(response.status, 200);
  return response.json();
}

async function createRestaurant(name) {
  const response = await postJson(`${baseUrl}/restaurants`, { name, category: "Teste", rating: 4.2 }, ana.token);
  const { id } = await response.json();
  restaurantIds.push(id);
  return id;
}

before(async () => {
  ({ server, baseUrl } = await startServer());

  ana = await createUser(baseUrl, "favoritos.ana");
  bruno = await createUser(baseUrl, "favoritos.bruno");
  userEmails.push(ana.email, bruno.email);

  await createRestaurant("Favorito Um");
  await createRestaurant("Favorito Dois");
  await createRestaurant("Favorito Três");
});

after(async () => {
  try {
    // Os favoritos são removidos em cascata junto com usuários e restaurantes
    await prisma.restaurant.deleteMany({ where: { id: { in: restaurantIds } } });
    await prisma.user.deleteMany({ where: { email: { in: userEmails } } });
  } finally {
    await prisma.$disconnect();
    server.close();
  }
});

describe("Favoritos exigem token", () => {
  it("retorna 401 sem token em GET, PUT e DELETE", async () => {
    const responses = await Promise.all([
      fetch(`${baseUrl}/favorites`),
      favorite(restaurantIds[0], null),
      unfavorite(restaurantIds[0], null)
    ]);

    for (const response of responses) {
      assert.equal(response.status, 401);
    }
  });

  it("retorna 401 com token inválido", async () => {
    const response = await favorite(restaurantIds[0], { token: "token-invalido" });

    assert.equal(response.status, 401);
  });
});

describe("GET /favorites", () => {
  it("começa vazio", async () => {
    assert.deepEqual(await listFavorites(), []);
  });
});

describe("PUT /favorites/:restaurantId", () => {
  it("favorita e retorna 204 sem corpo", async () => {
    const response = await favorite(restaurantIds[0]);

    assert.equal(response.status, 204);
    assert.equal(await response.text(), "");
  });

  it("o favorito aparece na lista, no formato de GET /restaurants", async () => {
    const [restaurant] = await listFavorites();

    assert.equal(restaurant.id, restaurantIds[0]);
    assert.equal(restaurant.name, "Favorito Um");
    assert.equal(restaurant.rating, 4.2);
    assert.deepEqual(Object.keys(restaurant).sort(), ["category", "id", "name", "ownerId", "rating"]);
  });

  it("é idempotente: favoritar de novo não duplica", async () => {
    const response = await favorite(restaurantIds[0]);

    assert.equal(response.status, 204);
    assert.equal((await listFavorites()).length, 1);
  });

  it("aguenta cliques simultâneos no mesmo restaurante sem erro nem duplicata", async () => {
    const responses = await Promise.all(Array.from({ length: 5 }, () => favorite(restaurantIds[1])));

    assert.deepEqual(responses.map((r) => r.status), [204, 204, 204, 204, 204]);
    const ids = (await listFavorites()).map((r) => r.id);
    assert.equal(ids.filter((id) => id === restaurantIds[1]).length, 1);
  });

  it("lista do favorito mais recente para o mais antigo", async () => {
    await favorite(restaurantIds[2]);

    const ids = (await listFavorites()).map((r) => r.id);
    assert.deepEqual(ids, [restaurantIds[2], restaurantIds[1], restaurantIds[0]]);
  });

  it("retorna 404 para restaurante inexistente", async () => {
    const response = await favorite(2147483647);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.error, "Restaurante não encontrado");
  });

  it("retorna 400 para identificador inválido", async () => {
    for (const id of ["abc", "0", "-1", "1.5", "2147483648"]) {
      const response = await favorite(id);
      assert.equal(response.status, 400, `id ${id}`);
    }
  });
});

describe("Favoritos são pessoais", () => {
  it("outro usuário não vê os favoritos da Ana", async () => {
    assert.deepEqual(await listFavorites(bruno), []);
  });

  it("DELETE de outro usuário não remove o favorito da Ana", async () => {
    const response = await unfavorite(restaurantIds[0], bruno);

    assert.equal(response.status, 204);
    assert.ok((await listFavorites()).some((r) => r.id === restaurantIds[0]));
  });

  it("cada usuário tem a própria lista", async () => {
    await favorite(restaurantIds[0], bruno);

    assert.deepEqual((await listFavorites(bruno)).map((r) => r.id), [restaurantIds[0]]);
    assert.equal((await listFavorites()).length, 3);
  });
});

describe("DELETE /favorites/:restaurantId", () => {
  it("remove o favorito e retorna 204", async () => {
    const response = await unfavorite(restaurantIds[0]);

    assert.equal(response.status, 204);
    assert.ok(!(await listFavorites()).some((r) => r.id === restaurantIds[0]));
  });

  it("é idempotente: remover de novo também retorna 204", async () => {
    const response = await unfavorite(restaurantIds[0]);

    assert.equal(response.status, 204);
  });

  it("retorna 400 para identificador inválido", async () => {
    const response = await unfavorite("abc");

    assert.equal(response.status, 400);
  });
});

describe("Integridade", () => {
  it("apagar o restaurante apaga os favoritos dele (cascata)", async () => {
    const id = await createRestaurant("Favorito Temporário");
    await favorite(id);

    await prisma.restaurant.delete({ where: { id } });

    assert.ok(!(await listFavorites()).some((r) => r.id === id));
    assert.equal(await prisma.favorite.count({ where: { restaurantId: id } }), 0);
  });

  it("token de usuário que não existe mais: 401 ao favoritar", async () => {
    const ghost = await createUser(baseUrl, "favoritos.removido");
    userEmails.push(ghost.email);
    await prisma.user.delete({ where: { id: ghost.id } });

    const response = await favorite(restaurantIds[1], ghost);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error, "Usuário do token não encontrado");
  });
});
