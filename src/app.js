const express = require("express");
const cors = require("cors");
const path = require("path");

const restaurantRoutes = require("./modules/restaurants/restaurant.routes");
const authRoutes = require("./modules/auth/auth.routes");
const dishRoutes = require("./modules/dishes/dish.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.use("/auth", authRoutes);
app.use("/restaurants", restaurantRoutes);
// As rotas de pratos usam caminhos completos (/restaurants/:id/dishes e /dishes/:id)
app.use(dishRoutes);

module.exports = app;
