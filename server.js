const express = require("express");
const cors = require("cors");
const path = require("path");
const restaurantRoutes = require("./src/modules/restaurants/restaurant.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/restaurants", restaurantRoutes);

app.listen(3000, () => {
  console.log("EasyFood rodando na porta 3000");
});
