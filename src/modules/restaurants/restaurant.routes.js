const express = require("express");
const controller = require("./restaurant.controller");

const router = express.Router();

router.get("/", controller.list);
router.post("/", controller.create);

module.exports = router;
