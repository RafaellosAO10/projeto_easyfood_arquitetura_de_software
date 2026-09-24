const express = require("express");

const app = express();

app.use(express.json());

const restaurants = [
  {
    id: 1,
    name: "Pizzaria Napoli",
    category: "Pizza",
    rating: 4.8
  },
  {
    id: 2,
    name: "Burger House",
    category: "Hambúrguer",
    rating: 4.7
  },
  {
    id: 3,
    name: "Sushi House",
    category: "Japonês",
    rating: 4.9
  }
];

// GET — Listar restaurantes
app.get("/restaurants", (req, res) => {
  res.json(restaurants);
});

// POST — Cadastrar restaurante
app.post("/restaurants", (req, res) => {
  const { name, category, rating } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: "Nome e categoria são obrigatórios" });
  }

  const novoRestaurante = {
    id: restaurants.length + 1,
    name,
    category,
    rating: rating || 0
  };

  restaurants.push(novoRestaurante);

  res.status(201).json(novoRestaurante);
});

app.listen(3000, () => {
  console.log("EasyFood rodando na porta 3000");
});
