const prisma = require("../../database/prisma");
const { HttpError } = require("../shared/http-error");
const { formatRestaurant } = require("../restaurants/restaurant.service");

// Restaurantes favoritos do usuário, do mais recente para o mais antigo,
// no mesmo formato de GET /restaurants
async function listFavorites(userId) {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: { restaurant: true },
    orderBy: [{ createdAt: "desc" }, { restaurantId: "desc" }]
  });

  return favorites.map((favorite) => formatRestaurant(favorite.restaurant));
}

// Idempotente: favoritar de novo um restaurante já favorito não gera erro nem duplicata
// (a chave composta userId + restaurantId garante isso também no banco).
async function addFavorite(userId, restaurantId) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });

  if (!restaurant) {
    throw new HttpError(404, "Restaurante não encontrado");
  }

  try {
    await prisma.favorite.upsert({
      where: { userId_restaurantId: { userId, restaurantId } },
      create: { userId, restaurantId },
      update: {}
    });
  } catch (error) {
    // P2003 = chave estrangeira inexistente: o restaurante foi apagado entre a consulta
    // e a gravação, ou o usuário do token (ainda válido) não existe mais
    if (error.code === "P2003") {
      const stillExists = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
      throw stillExists
        ? new HttpError(401, "Usuário do token não encontrado")
        : new HttpError(404, "Restaurante não encontrado");
    }
    throw error;
  }
}

// Idempotente: remover um favorito que não existe também responde com sucesso
async function removeFavorite(userId, restaurantId) {
  await prisma.favorite.deleteMany({ where: { userId, restaurantId } });
}

module.exports = { listFavorites, addFavorite, removeFavorite };
