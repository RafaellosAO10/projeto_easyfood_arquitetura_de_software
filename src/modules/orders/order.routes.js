const express = require("express");
const controller = require("./order.controller");
const authenticate = require("../auth/auth.middleware");

const router = express.Router();

// Pedidos são pessoais: todas as rotas exigem token (ADR-013).
// Caminhos completos porque há uma rota sob /restaurants, como no módulo de pratos.
router.post("/orders", authenticate, controller.create);
router.get("/orders", authenticate, controller.listMine);
router.get("/orders/:orderId", authenticate, controller.getById);
router.patch("/orders/:orderId/status", authenticate, controller.updateStatus);
router.get("/restaurants/:restaurantId/orders", authenticate, controller.listByRestaurant);

module.exports = router;
