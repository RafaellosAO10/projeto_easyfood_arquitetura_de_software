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

app.listen(3000, () => {
  console.log("EasyFood rodando na porta 3000");
});
