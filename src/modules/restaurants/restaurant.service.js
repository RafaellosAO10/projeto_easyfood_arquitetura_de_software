const prisma = require("../../database/prisma");

// O Prisma devolve colunas DECIMAL como objetos Decimal, que viram string no JSON.
// Convertemos para número para manter o mesmo formato de resposta da versão em memória.
function formatRestaurant(restaurant) {
  return {
    ...restaurant,
    rating: restaurant.rating === null ? null : Number(restaurant.rating)
  };
}

async function listRestaurants() {
  const restaurants = await prisma.restaurant.findMany();
  return restaurants.map(formatRestaurant);
}

async function createRestaurant(data) {
  const restaurant = await prisma.restaurant.create({
    data: {
      name: data.name,
      category: data.category,
      rating: data.rating || 0
    }
  });

  return formatRestaurant(restaurant);
}

module.exports = {
  listRestaurants,
  createRestaurant
};
