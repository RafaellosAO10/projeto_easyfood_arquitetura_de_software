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

describe("GET /restaurants?search=", () => {
  // Marca única por execução: os testes não dependem dos restaurantes que já estão no banco
  const tag = `busca${Date.now().toString(36)}`;
  const ids = {};

  function search(term) {
    return fetch(`${baseUrl}/restaurants?search=${encodeURIComponent(term)}`);
  }

  // Ids dos restaurantes criados por este bloco que vieram na resposta
  async function foundKeys(response) {
    const body = await response.json();
    return Object.keys(ids).filter((key) => body.some((restaurant) => restaurant.id === ids[key]));
  }

  before(async () => {
    const fixtures = {
      acai: { name: `Açaí da Esquina ${tag}`, category: "Sobremesas", rating: 4.5 },
      cantina: { name: `Cantina ${tag}`, category: `Massas ${tag}` },
      pizza100: { name: `Pizza 100% ${tag}`, category: "Pizzaria" },
      pizza1000: { name: `Pizza 1000 ${tag}`, category: "Pizzaria" },
      bar: { name: `Bar ${tag}x1`, category: "Bares" }
    };

    for (const [key, data] of Object.entries(fixtures)) {
      const response = await postRestaurant(data);
      const body = await response.json();
      ids[key] = body.id;
      createdIds.push(body.id);
    }
  });

  it("encontra pelo nome sem diferenciar maiúsculas nem acentos", async () => {
    const response = await search(`ACAI DA ESQUINA ${tag}`);

    assert.equal(response.status, 200);
    assert.deepEqual(await foundKeys(response), ["acai"]);
  });

  it("encontra também quando o termo é digitado com acento e o nome não tem", async () => {
    const response = await search(`Cantína ${tag}`);

    assert.deepEqual(await foundKeys(response), ["cantina"]);
  });

  it("encontra pela categoria", async () => {
    const response = await search(`massas ${tag}`);

    assert.deepEqual(await foundKeys(response), ["cantina"]);
  });

  it("encontra por um trecho do nome e devolve em ordem alfabética", async () => {
    const response = await search(tag);
    const body = await response.json();
    const order = body
      .map((restaurant) => Object.keys(ids).find((key) => ids[key] === restaurant.id))
      .filter(Boolean);

    assert.equal(order.length, 5);
    // A ordem entre "Pizza 100%" e "Pizza 1000" depende da colação do banco (pontuação),
    // então só conferimos que as duas pizzas vêm depois de Açaí, Bar e Cantina
    assert.deepEqual(order.slice(0, 3), ["acai", "bar", "cantina"]);
    assert.deepEqual(order.slice(3).sort(), ["pizza100", "pizza1000"]);
  });

  it("mantém o formato da listagem (rating como número)", async () => {
    const response = await search(`acai da esquina ${tag}`);
    const [restaurant] = await response.json();

    assert.deepEqual(Object.keys(restaurant).sort(), ["category", "id", "name", "ownerId", "rating"]);
    assert.equal(restaurant.rating, 4.5);
    assert.equal(typeof restaurant.ownerId, "number");
  });

  it("trata % como caractere comum, não como curinga", async () => {
    const response = await search(`100% ${tag}`);

    assert.deepEqual(await foundKeys(response), ["pizza100"]);
  });

  it("trata _ como caractere comum, não como curinga", async () => {
    const response = await search(`${tag}_1`);

    assert.deepEqual(await foundKeys(response), []);
  });

  it("ignora espaços no começo e no fim do termo", async () => {
    const response = await search(`   cantina ${tag}   `);

    assert.deepEqual(await foundKeys(response), ["cantina"]);
  });

  it("retorna 200 com lista vazia quando nada corresponde", async () => {
    const response = await search(`inexistente ${tag}`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
  });

  it("não é vulnerável a SQL injection pelo termo", async () => {
    const response = await search("' OR 1=1 --");

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
  });

  // Não comparamos o tamanho com GET /restaurants: os arquivos de teste rodam em paralelo
  // e outro arquivo pode criar/apagar restaurantes entre as duas chamadas. Conferimos que
  // vieram todos os restaurantes deste arquivo, inclusive os que não têm a marca no nome.
  it("termo vazio ou só com espaços devolve a lista completa", async () => {
    for (const term of ["", "   "]) {
      const response = await search(term);
      const body = await response.json();

      assert.equal(response.status, 200);
      for (const id of createdIds) {
        assert.ok(body.some((restaurant) => restaurant.id === id), `faltou o restaurante ${id}`);
      }
    }
  });

  it("retorna 400 quando search é enviado mais de uma vez", async () => {
    const response = await fetch(`${baseUrl}/restaurants?search=pizza&search=bar`);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "O parâmetro search deve ser um único texto");
  });

  it("aceita até 150 caracteres e retorna 400 acima disso", async () => {
    assert.equal((await search("a".repeat(150))).status, 200);

    const response = await search("a".repeat(151));
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "A busca deve ter até 150 caracteres");
  });
});
