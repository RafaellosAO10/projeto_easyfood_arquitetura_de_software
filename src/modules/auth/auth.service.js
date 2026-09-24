const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const prisma = require("../../database/prisma");

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

module.exports = {
  register,
  login
};
