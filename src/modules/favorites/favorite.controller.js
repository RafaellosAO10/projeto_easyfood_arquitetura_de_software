const favoriteService = require("./favorite.service");
const { sendError, parseId } = require("../shared/http-error");

// O usuário sempre vem do token (req.user.id): ninguém lê ou altera favoritos de outra pessoa
async function list(req, res) {
  try {
    const restaurants = await favoriteService.listFavorites(req.user.id);
    res.json(restaurants);
  } catch (error) {
    sendError(res, error, "listar favoritos");
  }
}

async function add(req, res) {
  try {
    await favoriteService.addFavorite(req.user.id, parseId(req.params.restaurantId));
    res.status(204).end();
  } catch (error) {
    sendError(res, error, "favoritar restaurante");
  }
}

async function remove(req, res) {
  try {
    await favoriteService.removeFavorite(req.user.id, parseId(req.params.restaurantId));
    res.status(204).end();
  } catch (error) {
    sendError(res, error, "remover favorito");
  }
}

module.exports = { list, add, remove };
