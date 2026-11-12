const express = require("express");
const cors = require("cors");
const path = require("path");

const restaurantRoutes = require("./modules/restaurants/restaurant.routes");
const authRoutes = require("./modules/auth/auth.routes");
const dishRoutes = require("./modules/dishes/dish.routes");
const favoriteRoutes = require("./modules/favorites/favorite.routes");
const orderRoutes = require("./modules/orders/order.routes");
const { UPLOAD_DIR, PUBLIC_PREFIX } = require("./modules/shared/image.service");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));
// Imagens otimizadas pelo image.service (perfil e pratos), acessíveis pelo navegador
app.use(
  PUBLIC_PREFIX,
  express.static(UPLOAD_DIR, { index: false }),
  (req, res) => res.status(404).json({ error: "Imagem não encontrada" })
);

app.use("/auth", authRoutes);
app.use("/restaurants", restaurantRoutes);
app.use("/favorites", favoriteRoutes);
// As rotas de pratos usam caminhos completos (/restaurants/:id/dishes e /dishes/:id)
app.use(dishRoutes);
// Pedidos: /orders e /restaurants/:id/orders (o router já tem os caminhos completos, como pratos)
app.use(orderRoutes);

module.exports = app;
