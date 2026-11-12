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
  const restaurants = await prisma.restaurant.findMany({ orderBy: { id: "asc" } });
  return restaurants.map(formatRestaurant);
}

// Escapa os curingas do LIKE (% e _) e a própria barra de escape, para que o termo
// digitado seja procurado literalmente: buscar "50%" não deve virar "50 seguido de qualquer coisa".
function escapeLike(term) {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// Busca por trecho do nome OU da categoria, sem diferenciar maiúsculas nem acentos
// ("acai" encontra "Açaí"). O Prisma não tem filtro sem acento, então a consulta é SQL;
// $queryRaw com template envia o termo como parâmetro ($1), sem risco de SQL injection.
async function searchRestaurants(term) {
  const pattern = `%${escapeLike(term)}%`;

  const restaurants = await prisma.$queryRaw`
    SELECT "id", "name", "category", "rating", "ownerId"
    FROM "Restaurant"
    WHERE unaccent("name") ILIKE unaccent(${pattern})
       OR unaccent("category") ILIKE unaccent(${pattern})
    ORDER BY "name" ASC, "id" ASC
  `;

  return restaurants.map(formatRestaurant);
}

// ownerId vem do token JWT (req.user.id): quem cadastra é o dono do restaurante
async function createRestaurant(data, ownerId) {
  const restaurant = await prisma.restaurant.create({
    data: {
      name: data.name,
      category: data.category,
      rating: data.rating || 0,
      ownerId
    }
  });

  return formatRestaurant(restaurant);
}

module.exports = {
  listRestaurants,
  searchRestaurants,
  createRestaurant
};
