const express = require("express");
const controller = require("./dish.controller");
const authenticate = require("../auth/auth.middleware");

const router = express.Router();

// Leitura é pública (cardápio); escrita exige token e ser dono do restaurante.
router.get("/restaurants/:restaurantId/dishes", controller.list);
router.post("/restaurants/:restaurantId/dishes", authenticate, controller.create);

router.get("/dishes/:dishId", controller.getById);
router.put("/dishes/:dishId", authenticate, controller.update);
router.delete("/dishes/:dishId", authenticate, controller.remove);

module.exports = router;
