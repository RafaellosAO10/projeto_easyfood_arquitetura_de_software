const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const prisma = require("../../database/prisma");
const imageService = require("../shared/image.service");
const { HttpError } = require("../shared/http-error");

const JWT_SECRET = process.env.JWT_SECRET;

// Evita cadastros duplicados por diferença de maiúsculas/espaços no e-mail
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function register({ name, email, password }) {
  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email: normalizeEmail(email), password: hash }
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) }
  });

  if (!user) {
    return null;
  }

  const senhaConfere = await bcrypt.compare(password, user.password);

  if (!senhaConfere) {
    return null;
  }

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email
    },
    JWT_SECRET,
    {
      expiresIn: "1d"
    }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  };
}

// Dados públicos do perfil (sem o hash da senha)
const PROFILE_FIELDS = { id: true, name: true, email: true, imageUrl: true };

async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: PROFILE_FIELDS
  });

  if (!user) {
    throw new HttpError(404, "Usuário não encontrado");
  }

  return user;
}

// O id vem do token (req.user.id), nunca do corpo da requisição: cada usuário
// só consegue alterar a própria foto.
async function updateProfileImage(userId, buffer) {
  const current = await getProfile(userId);
  const imageUrl = await imageService.saveImage(buffer, "users", current.id);

  let user;

  try {
    user = await prisma.user.update({
      where: { id: current.id },
      data: { imageUrl },
      select: PROFILE_FIELDS
    });
  } catch (error) {
    // Banco falhou: não deixa arquivo órfão no disco
    await imageService.deleteImage(imageUrl);
    throw error;
  }

  // Só remove a foto antiga depois que a nova foi salva com sucesso
  await imageService.deleteImage(current.imageUrl);

  return user;
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfileImage
};
