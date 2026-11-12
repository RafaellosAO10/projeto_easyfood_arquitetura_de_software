const orderService = require("./order.service");
const { sendError, parseId } = require("../shared/http-error");

// O controller só traduz HTTP: pego o usuário sempre do token (req.user.id), nunca da URL,
// e deixo para o service decidir o que ele pode ver e mudar
async function create(req, res) {
  try {
    const order = await orderService.createOrder(req.user.id, req.body);
    res.status(201).json(order);
  } catch (error) {
    sendError(res, error, "criar pedido");
  }
}

async function listMine(req, res) {
  try {
    res.json(await orderService.listMyOrders(req.user.id));
  } catch (error) {
    sendError(res, error, "listar pedidos");
  }
}

async function getById(req, res) {
  try {
    res.json(await orderService.getOrder(parseId(req.params.orderId), req.user.id));
  } catch (error) {
    sendError(res, error, "buscar pedido");
  }
}

async function listByRestaurant(req, res) {
  try {
    res.json(await orderService.listRestaurantOrders(parseId(req.params.restaurantId), req.user.id));
  } catch (error) {
    sendError(res, error, "listar pedidos do restaurante");
  }
}

async function updateStatus(req, res) {
  try {
    res.json(await orderService.updateStatus(parseId(req.params.orderId), req.user.id, req.body));
  } catch (error) {
    sendError(res, error, "atualizar status do pedido");
  }
}

module.exports = { create, listMine, getById, listByRestaurant, updateStatus };
