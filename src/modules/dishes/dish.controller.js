const dishService = require("./dish.service");
const { sendError, parseId } = require("../shared/http-error");

const MAX_PRICE = 99999999.99; // limite da coluna DECIMAL(10, 2)

// Retorna { error } ou { data } com os campos normalizados.
// Os limites de tamanho seguem as colunas VARCHAR(150) e VARCHAR(100) da tabela Dish.
function validateDish(body) {
  const { name, category, description = "", price } = body || {};

  if (typeof name !== "string" || !name.trim() || typeof category !== "string" || !category.trim()) {
    return { error: "Nome e categoria são obrigatórios" };
  }

  if (name.trim().length > 150) {
    return { error: "O nome deve ser um texto de até 150 caracteres" };
  }

  if (category.trim().length > 100) {
    return { error: "A categoria deve ser um texto de até 100 caracteres" };
  }

  if (typeof description !== "string" || description.length > 1000) {
    return { error: "A descrição deve ser um texto de até 1000 caracteres" };
  }

  if (typeof price !== "number" || !Number.isFinite(price) || price < 0 || price > MAX_PRICE) {
    return { error: "O preço deve ser um número maior ou igual a zero" };
  }

  return {
    data: {
      name: name.trim(),
      category: category.trim(),
      description: description.trim(),
      price: Math.round(price * 100) / 100
    }
  };
}

async function list(req, res) {
  try {
    const dishes = await dishService.listDishes(parseId(req.params.restaurantId));
    res.json(dishes);
  } catch (error) {
    sendError(res, error, "listar pratos");
  }
}

async function getById(req, res) {
  try {
    const dish = await dishService.getDish(parseId(req.params.dishId));
    res.json(dish);
  } catch (error) {
    sendError(res, error, "buscar prato");
  }
}

async function create(req, res) {
  try {
    const restaurantId = parseId(req.params.restaurantId);
    const { error, data } = validateDish(req.body);

    if (error) {
      return res.status(400).json({ error });
    }

    const dish = await dishService.createDish(restaurantId, data, req.user.id);
    res.status(201).json(dish);
  } catch (error) {
    sendError(res, error, "cadastrar prato");
  }
}

async function update(req, res) {
  try {
    const dishId = parseId(req.params.dishId);
    const { error, data } = validateDish(req.body);

    if (error) {
      return res.status(400).json({ error });
    }

    const dish = await dishService.updateDish(dishId, data, req.user.id);
    res.json(dish);
  } catch (error) {
    sendError(res, error, "atualizar prato");
  }
}

async function remove(req, res) {
  try {
    await dishService.deleteDish(parseId(req.params.dishId), req.user.id);
    res.status(204).send();
  } catch (error) {
    sendError(res, error, "remover prato");
  }
}

// O arquivo já chega validado (tipo e tamanho) pelo upload.middleware
async function uploadImage(req, res) {
  try {
    const dish = await dishService.updateDishImage(parseId(req.params.dishId), req.file.buffer, req.user.id);
    res.json(dish);
  } catch (error) {
    sendError(res, error, "enviar imagem do prato");
  }
}

module.exports = { list, getById, create, update, remove, uploadImage };
