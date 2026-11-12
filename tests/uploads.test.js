// Testes da Atividade 8, Parte 5 (upload de imagens de perfil e de pratos).
const os = require("os");
const fs = require("fs");
const path = require("path");

// Grava as imagens dos testes em uma pasta temporária, não em uploads/ do projeto.
// Precisa ser definido antes de carregar a aplicação.
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "easyfood-uploads-"));

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");

const { prisma, startServer, postJson, createUser } = require("./helpers");

let server;
let baseUrl;
let owner;
let other;
let restaurantId;
let dishId;
let pngImage; // 1200x900, maior que os limites dos presets

function sendImage(url, { token, buffer = pngImage, type = "image/png", field = "image", name = "foto.png" } = {}) {
  const form = new FormData();

  if (buffer) {
    form.append(field, new Blob([buffer], { type }), name);
  }

  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return fetch(url, { method: "POST", headers, body: form });
}

async function fetchImage(publicUrl) {
  const response = await fetch(`${baseUrl}${publicUrl}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  return { response, buffer };
}

before(async () => {
  ({ server, baseUrl } = await startServer());

  pngImage = await sharp({
    create: { width: 1200, height: 900, channels: 3, background: { r: 200, g: 80, b: 40 } }
  }).png().toBuffer();

  owner = await createUser(baseUrl, "upload.dono");
  other = await createUser(baseUrl, "upload.outro");

  const restaurant = await postJson(
    `${baseUrl}/restaurants`,
    { name: "Restaurante dos Testes de Upload", category: "Teste" },
    owner.token
  );
  ({ id: restaurantId } = await restaurant.json());

  const dish = await postJson(
    `${baseUrl}/restaurants/${restaurantId}/dishes`,
    { name: "Prato com Foto", category: "Teste", price: 25 },
    owner.token
  );
  assert.equal(dish.status, 201, "Cadastrar um prato deve retornar 201 Created");
  ({ id: dishId } = await dish.json());
});

after(async () => {
  try {
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    await prisma.user.deleteMany({ where: { email: { in: [owner.email, other.email] } } });
  } finally {
    await prisma.$disconnect();
    server.close();
    fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
  }
});

describe("POST /auth/me/image (foto de perfil)", () => {
  const url = () => `${baseUrl}/auth/me/image`;
  let firstImageUrl;

  it("retorna 401 sem JWT", async () => {
    const response = await sendImage(url());
    assert.equal(response.status, 401);
  });

  it("retorna 400 sem arquivo", async () => {
    const response = await sendImage(url(), { token: owner.token, buffer: null });
    assert.equal(response.status, 400);
  });

  it("retorna 415 para formato não permitido", async () => {
    const response = await sendImage(url(), {
      token: owner.token,
      buffer: Buffer.from("não sou uma imagem"),
      type: "text/plain",
      name: "arquivo.txt"
    });
    assert.equal(response.status, 415);
  });

  it("retorna 422 para arquivo que diz ser imagem mas está corrompido", async () => {
    const response = await sendImage(url(), {
      token: owner.token,
      buffer: Buffer.from("conteúdo qualquer"),
      type: "image/png"
    });
    assert.equal(response.status, 422);
  });

  it("retorna 413 para arquivo acima de 5 MB", async () => {
    const response = await sendImage(url(), {
      token: owner.token,
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
      type: "image/jpeg",
      name: "grande.jpg"
    });
    assert.equal(response.status, 413);
  });

  it("vincula a imagem ao usuário do token e a otimiza (WebP, até 400x400)", async () => {
    const response = await sendImage(url(), { token: owner.token });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.id, owner.id);
    assert.match(body.imageUrl, /^\/uploads\/users\/\d+-[0-9a-f]+\.webp$/);
    assert.equal(body.password, undefined);

    const saved = await prisma.user.findUnique({ where: { id: owner.id } });
    assert.equal(saved.imageUrl, body.imageUrl);

    const { response: image, buffer } = await fetchImage(body.imageUrl);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get("content-type"), "image/webp");

    const meta = await sharp(buffer).metadata();
    assert.equal(meta.format, "webp");
    assert.ok(meta.width <= 400 && meta.height <= 400);

    firstImageUrl = body.imageUrl;
  });

  it("GET /auth/me retorna o caminho da imagem", async () => {
    const response = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${owner.token}` }
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.user.imageUrl, firstImageUrl);
  });

  it("nova foto substitui a anterior e remove o arquivo antigo", async () => {
    const response = await sendImage(url(), { token: owner.token });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.notEqual(body.imageUrl, firstImageUrl);

    const { response: old } = await fetchImage(firstImageUrl);
    assert.equal(old.status, 404);
  });
});

describe("POST /dishes/:dishId/image (foto do prato)", () => {
  const url = (id = dishId) => `${baseUrl}/dishes/${id}/image`;
  let dishImageUrl;

  it("retorna 401 sem JWT", async () => {
    const response = await sendImage(url());
    assert.equal(response.status, 401);
  });

  it("retorna 404 para prato inexistente", async () => {
    const response = await sendImage(url(999999999), { token: owner.token });
    assert.equal(response.status, 404);
  });

  it("retorna 403 para quem não é o dono do restaurante", async () => {
    const response = await sendImage(url(), { token: other.token });
    assert.equal(response.status, 403);
  });

  it("retorna 415 para formato não permitido", async () => {
    const response = await sendImage(url(), {
      token: owner.token,
      buffer: Buffer.from("GIF89a"),
      type: "image/gif",
      name: "animacao.gif"
    });
    assert.equal(response.status, 415);
  });

  it("vincula a imagem ao prato e a otimiza (WebP, até 800x600)", async () => {
    const response = await sendImage(url(), { token: owner.token });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.id, dishId);
    assert.match(body.imageUrl, /^\/uploads\/dishes\/\d+-[0-9a-f]+\.webp$/);

    const { response: image, buffer } = await fetchImage(body.imageUrl);
    assert.equal(image.status, 200);

    const meta = await sharp(buffer).metadata();
    assert.equal(meta.format, "webp");
    assert.ok(meta.width <= 800 && meta.height <= 600);

    dishImageUrl = body.imageUrl;
  });

  it("o cardápio retorna a imagem associada ao prato", async () => {
    const response = await fetch(`${baseUrl}/restaurants/${restaurantId}/dishes`);
    const body = await response.json();

    assert.equal(body.find((d) => d.id === dishId).imageUrl, dishImageUrl);
  });

  it("remover o prato apaga a imagem do disco", async () => {
    const response = await fetch(`${baseUrl}/dishes/${dishId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${owner.token}` }
    });
    assert.equal(response.status, 204);

    const { response: image } = await fetchImage(dishImageUrl);
    assert.equal(image.status, 404);
  });
});
