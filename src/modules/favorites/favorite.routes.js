const express = require("express");
const controller = require("./favorite.controller");
const authenticate = require("../auth/auth.middleware");

const router = express.Router();

// Favoritos são pessoais: todas as rotas exigem token
router.use(authenticate);

router.get("/", controller.list);
// PUT e DELETE são idempotentes: repetir a mesma chamada não muda o resultado (ADR-012)
router.put("/:restaurantId", controller.add);
router.delete("/:restaurantId", controller.remove);

module.exports = router;
