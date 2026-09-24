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

module.exports = {
  prisma,
  startServer,
  uniqueEmail,
  postJson
};
