// Carrega o .env antes da aplicação: os módulos de auth leem o JWT_SECRET ao serem importados
require("dotenv").config({ quiet: true });

const app = require("../src/app");
const prisma = require("../src/database/prisma");

// Sobe a aplicação em uma porta livre, sem depender do server.js
async function startServer() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));

  return {
    server,
    baseUrl: `http://localhost:${server.address().port}`
  };
}

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@teste.easyfood.com`;
}

function postJson(url, body, token) {
  const headers = { "Content-Type": "application/json" };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
}

// Requisição JSON com qualquer método (PUT, DELETE...)
function requestJson(method, url, body, token) {
  const headers = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

// Cadastra um usuário de teste e devolve { email, token, id }
async function createUser(baseUrl, prefix) {
  const email = uniqueEmail(prefix);

  await postJson(`${baseUrl}/auth/register`, {
    name: "Usuário de Teste",
    email,
    password: "123456"
  });

  const response = await postJson(`${baseUrl}/auth/login`, { email, password: "123456" });
  const { token } = await response.json();
  const { id } = await prisma.user.findUnique({ where: { email } });

  return { email, token, id };
}

module.exports = {
  prisma,
  startServer,
  uniqueEmail,
  postJson,
  requestJson,
  createUser
};
