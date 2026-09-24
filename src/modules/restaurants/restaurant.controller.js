const restaurantService = require("./restaurant.service");

// Retorna a mensagem de erro de validação ou null quando os dados são válidos.
// Os limites de tamanho seguem as colunas VARCHAR(150) e VARCHAR(100) da tabela Restaurant.
function validateRestaurant({ name, category, rating }) {
  if (!name || !category) {
    return "Nome e categoria são obrigatórios";
  }

  if (typeof name !== "string" || name.length > 150) {
    return "O nome deve ser um texto de até 150 caracteres";
  }

  if (typeof category !== "string" || category.length > 100) {
    return "A categoria deve ser um texto de até 100 caracteres";
  }

  if (rating != null && (typeof rating !== "number" || rating < 0 || rating > 5)) {
    return "A avaliação deve ser um número entre 0 e 5";
  }

  return null;
}

async function list(req, res) {
  try {
    const restaurants = await restaurantService.listRestaurants();
    res.json(restaurants);
  } catch (error) {
    console.error("Erro ao buscar restaurantes:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

async function create(req, res) {
  // Sem corpo JSON, o Express 5 deixa req.body como undefined
  const { name, category, rating } = req.body || {};

  const validationError = validateRestaurant({ name, category, rating });

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const restaurant = await restaurantService.createRestaurant({
      name,
      category,
      rating
    });

    res.status(201).json(restaurant);
  } catch (error) {
    console.error("Erro ao cadastrar restaurante:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

module.exports = { list, create };
