const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");
const { HttpError } = require("./http-error");

// Pasta física das imagens, servida em /uploads (ver app.js).
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, "../../../uploads"));
const PUBLIC_PREFIX = "/uploads";

// Perfis de otimização por tipo de imagem. Todas viram WebP (menor e suportado
// pelos navegadores atuais), sem metadados (EXIF/GPS) e na orientação correta.
const PRESETS = {
  users: { width: 400, height: 400, fit: "cover" }, // avatar quadrado
  dishes: { width: 800, height: 600, fit: "inside" } // foto do cardápio, sem cortar
};

/**
 * Otimiza e grava uma imagem; devolve o caminho público (ex.: /uploads/dishes/7-ab12.webp).
 * Serviço compartilhado: auth (perfil) e dishes (pratos) usam o mesmo processamento.
 * @param {Buffer} buffer conteúdo enviado (já validado pelo upload.middleware)
 * @param {"users"|"dishes"} folder tipo da imagem
 * @param {number} ownerId id do usuário ou do prato (só compõe o nome do arquivo)
 */
async function saveImage(buffer, folder, ownerId) {
  const preset = PRESETS[folder];

  if (!preset) {
    throw new Error(`Tipo de imagem desconhecido: ${folder}`);
  }

  let output;

  try {
    output = await sharp(buffer)
      .rotate() // aplica a orientação EXIF antes de descartar os metadados
      .resize({ ...preset, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    // O tipo declarado era imagem, mas o conteúdo não pôde ser lido (arquivo corrompido/falso)
    throw new HttpError(422, "Não foi possível processar a imagem enviada");
  }

  // Nome aleatório: evita cache de imagem antiga e não permite adivinhar arquivos
  const fileName = `${ownerId}-${crypto.randomBytes(6).toString("hex")}.webp`;
  const dir = path.join(UPLOAD_DIR, folder);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), output);

  return `${PUBLIC_PREFIX}/${folder}/${fileName}`;
}

// Remove uma imagem gravada por saveImage. Falha em silêncio (arquivo já ausente
// não deve derrubar a operação principal) e ignora caminhos fora de /uploads.
async function deleteImage(publicUrl) {
  if (typeof publicUrl !== "string" || !publicUrl.startsWith(`${PUBLIC_PREFIX}/`)) {
    return;
  }

  const filePath = path.resolve(UPLOAD_DIR, publicUrl.slice(PUBLIC_PREFIX.length + 1));

  if (!filePath.startsWith(UPLOAD_DIR + path.sep)) {
    return;
  }

  await fs.rm(filePath, { force: true }).catch(() => {});
}

module.exports = { saveImage, deleteImage, UPLOAD_DIR, PUBLIC_PREFIX };
