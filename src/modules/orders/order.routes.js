const express = require("express");
const controller = require("./order.controller");
const authenticate = require("../auth/auth.middleware");

const router = express.Router();

// Pedido é coisa pessoal, então todas as rotas pedem token (ADR-013).
// Uso caminhos completos porque uma das rotas fica sob /restaurants, igual fiz nos pratos.
router.post("/orders", authenticate, controller.create);
router.get("/orders", authenticate, controller.listMine);
router.get("/orders/:orderId", authenticate, controller.getById);
router.patch("/orders/:orderId/status", authenticate, controller.updateStatus);
router.get("/restaurants/:restaurantId/orders", authenticate, controller.listByRestaurant);

module.exports = router;
