// Cadastrar restaurante (mockup do Segundo Desafio da Aula 2).
// A API guarda só nome e categoria; quem cadastra vira o dono.
import { api } from "../api.js";
import { icon, field, setMessage, toast } from "../ui.js";

const SUGESTOES = ["Lanches", "Pizza", "Japonesa", "Brasileira", "Saudável", "Doces", "Bebidas"];

export function renderRestauranteForm({ view, go }) {
  view.innerHTML = `<h1 class="title">Cadastrar restaurante</h1>
    <p class="subtitle">Preencha os dados do seu restaurante para fazer parte da EasyFood.</p>
    <form id="restaurant-form" novalidate>
      ${field({ label: "Nome do restaurante", name: "name", iconName: "building-store", placeholder: "Burger House", required: true, attrs: 'maxlength="150"' })}
      ${field({ label: "Categoria", name: "category", iconName: "tools-kitchen-2", placeholder: "Lanches", required: true, attrs: 'maxlength="100" list="restaurant-categories"' })}
      <datalist id="restaurant-categories">${SUGESTOES.map((c) => `<option value="${c}">`).join("")}</datalist>
      <button class="btn" type="submit" style="margin-top:6px">${icon("building-store")}Cadastrar restaurante</button>
      <p class="message" id="msg" role="alert"></p>
    </form>`;

  const form = view.querySelector("#restaurant-form");
  const msg = view.querySelector("#msg");
  form.querySelector("input").focus();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const body = { name: data.get("name").trim(), category: data.get("category").trim() };
    if (!body.name || !body.category) return setMessage(msg, "Preencha o nome e a categoria.");

    const button = form.querySelector("button");
    button.disabled = true;
    try {
      const restaurant = await api.createRestaurant(body);
      toast(`${restaurant.name} cadastrado`);
      go(`#/restaurante/${restaurant.id}`);
    } catch (error) {
      button.disabled = false;
      if (error.status === 401) return go(`#/entrar?volta=${encodeURIComponent(location.hash)}`);
      setMessage(msg, error.message);
    }
  });
}
