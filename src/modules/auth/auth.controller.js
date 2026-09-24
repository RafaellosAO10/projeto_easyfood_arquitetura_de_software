const authService = require("./auth.service");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Retorna a mensagem de erro de validação ou null quando os dados são válidos.
// Os limites seguem as colunas VARCHAR(150) da tabela User e o limite de 72 bytes do bcrypt.
function validateRegister({ name, email, password }) {
  if (!name || !email || !password) {
    return "Nome, e-mail e senha são obrigatórios";
  }

  if (typeof name !== "string" || name.length > 150) {
    return "O nome deve ser um texto de até 150 caracteres";
  }

  if (typeof email !== "string" || email.length > 150 || !EMAIL_REGEX.test(email.trim())) {
    return "Informe um e-mail válido";
  }

  if (typeof password !== "string" || password.length < 6 || password.length > 72) {
    return "A senha deve ter entre 6 e 72 caracteres";
  }

  return null;
}

async function register(req, res) {
  // Sem corpo JSON, o Express 5 deixa req.body como undefined
  const { name, email, password } = req.body || {};

  const validationError = validateRegister({ name, email, password });

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const user = await authService.register({
      name,
      email,
      password
    });

    res.status(201).json(user);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "E-mail já cadastrado" });
    }

    console.error("Erro ao cadastrar usuário:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

async function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
  }

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "E-mail e senha devem ser textos" });
  }

  try {
    const result = await authService.login({
      email,
      password
    });

    if (!result) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    res.json(result);
  } catch (error) {
    console.error("Erro ao realizar login:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

module.exports = {
  register,
  login
};
