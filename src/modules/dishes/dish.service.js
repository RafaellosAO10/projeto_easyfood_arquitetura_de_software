const prisma = require("../../database/prisma");
const { HttpError } = require("../shared/http-error");

// O Prisma devolve DECIMAL como objeto Decimal (string no JSON); expomos número.
function formatDish(dish) {
  const { restaurant, ...rest } = dish;
  return { ...rest, price: Number(dish.price) };
}

// Autorização por dono: só quem cadastrou o restaurante gerencia os pratos dele.
// Restaurantes sem dono (anteriores a esta versão) não podem ser gerenciados.
function ensureOwnership(restaurant, userId) {
  if (restaurant.ownerId === null || restaurant.ownerId !== Number(userId)) {
    throw new HttpError(403, "Você não tem permissão para gerenciar este restaurante");
  }
}

async function findRestaurant(restaurantId) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });

  if (!restaurant) {
    throw new HttpError(404, "Restaurante não encontrado");
  }

  return restaurant;
}

// Carrega o prato junto com o restaurante para ter o ownerId.
async function findDishWithRestaurant(dishId) {
  const dish = await prisma.dish.findUnique({
    where: { id: dishId },
    include: { restaurant: true }
  });

  if (!dish) {
    throw new HttpError(404, "Prato não encontrado");
  }

  return dish;
}

async function listDishes(restaurantId) {
  await findRestaurant(restaurantId);

  const dishes = await prisma.dish.findMany({
    where: { restaurantId },
    orderBy: { id: "asc" }
  });

  return dishes.map(formatDish);
}

async function getDish(dishId) {
  const dish = await prisma.dish.findUnique({ where: { id: dishId } });

  if (!dish) {
    throw new HttpError(404, "Prato não encontrado");
  }

  return formatDish(dish);
}

// O prato nasce sem imagem; a foto é enviada depois em POST /dishes/:id/image.
async function createDish(restaurantId, data, userId) {
  const restaurant = await findRestaurant(restaurantId);
  ensureOwnership(restaurant, userId);

  const dish = await prisma.dish.create({
    data: { ...data, restaurantId }
  });

  return formatDish(dish);
}

async function updateDish(dishId, data, userId) {
  const dish = await findDishWithRestaurant(dishId);
  ensureOwnership(dish.restaurant, userId);

  const updated = await prisma.dish.update({
    where: { id: dishId },
    data
  });

  return formatDish(updated);
}

// Devolve o prato removido para quem chamou poder apagar a imagem do disco.
async function deleteDish(dishId, userId) {
  const dish = await findDishWithRestaurant(dishId);
  ensureOwnership(dish.restaurant, userId);

  await prisma.dish.delete({ where: { id: dishId } });

  return formatDish(dish);
}

// Usado pelo upload: confere o dono antes de aceitar a imagem.
async function getManagedDish(dishId, userId) {
  const dish = await findDishWithRestaurant(dishId);
  ensureOwnership(dish.restaurant, userId);
  return formatDish(dish);
}

async function setDishImage(dishId, imageUrl) {
  const dish = await prisma.dish.update({
    where: { id: dishId },
    data: { imageUrl }
  });

  return formatDish(dish);
}

module.exports = {
  listDishes,
  getDish,
  createDish,
  updateDish,
  deleteDish,
  getManagedDish,
  setDishImage
};
