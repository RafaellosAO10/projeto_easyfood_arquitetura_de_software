const express = require("express");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// O Prisma devolve colunas DECIMAL como objetos Decimal, que viram string no JSON.
// Convertemos para número para manter o mesmo formato de resposta da versão em memória.
function formatRestaurant(restaurant) {
  return {
    ...restaurant,
    rating: restaurant.rating === null ? null : Number(restaurant.rating)
  };
}

// GET — Listar restaurantes
app.get("/restaurants", async (req, res) => {
  try {
    const restaurantes = await prisma.restaurant.findMany();
    res.json(restaurantes.map(formatRestaurant));
  } catch (error) {
    console.error("Erro ao buscar restaurantes:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST — Cadastrar restaurante
app.post("/restaurants", async (req, res) => {
  // Sem corpo JSON, o Express 5 deixa req.body como undefined
  const { name, category, rating } = req.body || {};

  if (!name || !category) {
    return res.status(400).json({ error: "Nome e categoria são obrigatórios" });
  }

  // Limites definidos pelas colunas VARCHAR(150) e VARCHAR(100) da tabela Restaurant
  if (typeof name !== "string" || name.length > 150) {
    return res.status(400).json({ error: "O nome deve ser um texto de até 150 caracteres" });
  }

  if (typeof category !== "string" || category.length > 100) {
    return res.status(400).json({ error: "A categoria deve ser um texto de até 100 caracteres" });
  }

  if (rating != null && (typeof rating !== "number" || rating < 0 || rating > 5)) {
    return res.status(400).json({ error: "A avaliação deve ser um número entre 0 e 5" });
  }

  try {
    const novoRestaurante = await prisma.restaurant.create({
      data: { name, category, rating: rating || 0 }
    });

    res.status(201).json(formatRestaurant(novoRestaurante));
  } catch (error) {
    console.error("Erro ao cadastrar restaurante:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.listen(3000, () => {
  console.log("EasyFood rodando na porta 3000");
});
