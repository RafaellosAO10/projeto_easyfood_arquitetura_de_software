// Camada de acesso à API: todas as chamadas HTTP do front passam por aqui.
import { getSession, clearSession } from "./store.js";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body, form, auth = false } = {}) {
  const headers = {};
  const session = getSession();

  if (auth && session) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  let payload;
  if (form) {
    payload = form; // multipart: o navegador define o Content-Type com o boundary
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(path, { method, headers, body: payload });
  } catch (error) {
    throw new ApiError(0, "Não foi possível conectar à EasyFood. Confira se o servidor está rodando.");
  }

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearSession();
      throw new ApiError(401, "Sua sessão expirou. Entre novamente.");
    }
    throw new ApiError(response.status, data.error || "Algo deu errado. Tente de novo.");
  }

  return data;
}

function imageForm(file) {
  const form = new FormData();
  form.append("image", file);
  return form;
}

export const api = {
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  register: (name, email, password) => request("/auth/register", { method: "POST", body: { name, email, password } }),
  // GET /auth/me responde { message, user }
  me: () => request("/auth/me", { auth: true }).then((data) => data.user),
  uploadProfileImage: (file) => request("/auth/me/image", { method: "POST", form: imageForm(file), auth: true }),

  listRestaurants: () => request("/restaurants"),
  createRestaurant: (data) => request("/restaurants", { method: "POST", body: data, auth: true }),

  listDishes: (restaurantId) => request(`/restaurants/${restaurantId}/dishes`),
  getDish: (dishId) => request(`/dishes/${dishId}`),
  createDish: (restaurantId, data) => request(`/restaurants/${restaurantId}/dishes`, { method: "POST", body: data, auth: true }),
  updateDish: (dishId, data) => request(`/dishes/${dishId}`, { method: "PUT", body: data, auth: true }),
  deleteDish: (dishId) => request(`/dishes/${dishId}`, { method: "DELETE", auth: true }),
  uploadDishImage: (dishId, file) => request(`/dishes/${dishId}/image`, { method: "POST", form: imageForm(file), auth: true })
};
