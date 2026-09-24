const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const { prisma, startServer, uniqueEmail, postJson } = require("./helpers");

let server;
let baseUrl;
let token;
const user = {
  name: "Aluno de Teste",
  email: uniqueEmail("auth"),
  password: "123456"
};

before(async () => {
  ({ server, baseUrl } = await startServer());
});

after(async () => {
  try {
    await prisma.user.deleteMany({ where: { email: user.email } });
  } finally {
    await prisma.$disconnect();
    server.close();
  }
});

describe("POST /auth/register", () => {
  it("cadastra o usuário, retorna 201 e não devolve a senha", async () => {
    const response = await postJson(`${baseUrl}/auth/register`, user);
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(typeof body.id, "number");
    assert.equal(body.name, user.name);
    assert.equal(body.email, user.email);
    assert.equal(body.password, undefined);
  });

  it("armazena a senha como hash bcrypt", async () => {
    const saved = await prisma.user.findUnique({ where: { email: user.email } });

    assert.notEqual(saved.password, user.password);
    assert.match(saved.password, /^\$2[aby]\$10\$/);
  });

  it("retorna 409 para e-mail já cadastrado", async () => {
    const response = await postJson(`${baseUrl}/auth/register`, user);

    assert.equal(response.status, 409);
  });

  it("retorna 400 quando faltam campos obrigatórios", async () => {
    const response = await postJson(`${baseUrl}/auth/register`, { email: user.email });

    assert.equal(response.status, 400);
  });

  it("retorna 400 para e-mail inválido", async () => {
    const response = await postJson(`${baseUrl}/auth/register`, {
      ...user,
      email: "email-invalido"
    });

    assert.equal(response.status, 400);
  });

  it("retorna 400 para senha com menos de 6 caracteres", async () => {
    const response = await postJson(`${baseUrl}/auth/register`, {
      ...user,
      email: uniqueEmail("senha-curta"),
      password: "123"
    });

    assert.equal(response.status, 400);
  });
});

describe("POST /auth/login", () => {
  it("retorna um JWT e os dados do usuário", async () => {
    const response = await postJson(`${baseUrl}/auth/login`, {
      email: user.email,
      password: user.password
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(typeof body.token, "string");
    assert.equal(body.user.email, user.email);
    assert.equal(body.user.password, undefined);

    const payload = jwt.verify(body.token, process.env.JWT_SECRET);
    assert.equal(payload.sub, body.user.id);
    assert.equal(payload.email, user.email);

    token = body.token;
  });

  it("retorna 401 para senha incorreta", async () => {
    const response = await postJson(`${baseUrl}/auth/login`, {
      email: user.email,
      password: "senha-errada"
    });

    assert.equal(response.status, 401);
  });

  it("retorna 401 para usuário inexistente", async () => {
    const response = await postJson(`${baseUrl}/auth/login`, {
      email: uniqueEmail("inexistente"),
      password: "123456"
    });

    assert.equal(response.status, 401);
  });

  it("retorna 400 quando e-mail ou senha não são enviados", async () => {
    const response = await postJson(`${baseUrl}/auth/login`, { email: user.email });

    assert.equal(response.status, 400);
  });
});

describe("GET /auth/me", () => {
  it("retorna 401 sem token", async () => {
    const response = await fetch(`${baseUrl}/auth/me`);

    assert.equal(response.status, 401);
  });

  it("retorna 401 com token expirado", async () => {
    const expiredToken = jwt.sign(
      { sub: 1, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: -10 }
    );

    const response = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });

    assert.equal(response.status, 401);
  });

  it("retorna 200 e o usuário autenticado com token válido", async () => {
    const response = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.message, "Você está autenticado!");
    assert.equal(body.user.email, user.email);
  });
});
