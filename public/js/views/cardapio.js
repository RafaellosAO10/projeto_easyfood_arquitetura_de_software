// Cardápio de um restaurante: pratos por categoria, adicionar ao carrinho e,
// para o dono, atalhos de cadastrar e editar pratos.
import { api, ApiError } from "../api.js";
import { getSession, addToCart } from "../store.js";
import { esc, icon, cover, money, rating, emptyState, skeletons, toast } from "../ui.js";
import { rememberCover } from "./shared.js";

export async function renderCardapio({ view, params, stale, setTitle }) {
  const restaurantId = Number(params[0]);
  view.innerHTML = `<div style="padding-top:14px">${skeletons(3)}</div>`;

  // A API não tem GET /restaurants/:id; buscamos a lista e filtramos
  const [restaurants, dishes] = await Promise.all([api.listRestaurants(), api.listDishes(restaurantId)]);
  if (stale()) return;

  const restaurant = restaurants.find((r) => r.id === restaurantId);
  if (!restaurant) throw new ApiError(404, "Restaurante não encontrado.");

  setTitle(restaurant.name);
  rememberCover(restaurantId, dishes);

  const session = getSession();
  const isOwner = Boolean(session && restaurant.ownerId === session.user.id);
  const categories = [...new Set(dishes.map((d) => d.category))];
  const heroImage = dishes.find((d) => d.imageUrl)?.imageUrl;
  let selected = "";

  view.innerHTML = `${cover(heroImage, restaurant.category, "hero")}
    <div class="restaurant-head"><div><h1>${esc(restaurant.name)}</h1>
      <span class="meta">${esc(restaurant.category || "Restaurante")} · ${icon("star")} ${rating(restaurant.rating)} · ${dishes.length} ${dishes.length === 1 ? "prato" : "pratos"}</span></div>
      ${isOwner ? `<a class="btn small" href="#/restaurante/${restaurantId}/novo-prato">${icon("plus")}Prato</a>` : ""}</div>
    ${isOwner ? `<p class="message success" style="margin-top:12px">${icon("building-store")} Você é o dono deste restaurante. Toque em "Editar" para trocar fotos e preços.</p>` : ""}
    <div class="chips" id="chips" role="group" aria-label="Filtrar por categoria"></div>
    <div id="dishes"></div>`;

  const chips = view.querySelector("#chips");
  const list = view.querySelector("#dishes");

  function draw() {
    const shown = selected ? dishes.filter((d) => d.category === selected) : dishes;
    chips.hidden = categories.length < 2;
    chips.innerHTML = ["", ...categories]
      .map((c) => `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${c === selected}">${esc(c || "Todos")}</button>`)
      .join("");

    list.innerHTML = shown.length
      ? shown
          .map(
            (d) => `<article class="dish"><div class="dish-info"><strong>${esc(d.name)}</strong>
              ${d.description ? `<p class="dish-desc">${esc(d.description)}</p>` : ""}
              <span class="dish-price">${money(d.price)}</span>
              ${isOwner ? `<br><a class="link dish-edit" href="#/prato/${d.id}/editar">${icon("pencil")}Editar</a>` : ""}</div>
              <div class="dish-photo">${cover(d.imageUrl, d.category)}
                <button type="button" class="dish-add" data-dish="${d.id}" aria-label="Adicionar ${esc(d.name)} ao carrinho">${icon("plus")}</button></div></article>`
          )
          .join("")
      : emptyState(
          "tools-kitchen-2",
          isOwner ? "Monte o seu cardápio" : "Cardápio em preparo",
          isOwner ? "Cadastre o primeiro prato com foto e preço." : "Este restaurante ainda não cadastrou pratos.",
          isOwner ? `<a class="btn small" style="margin:12px auto 0" href="#/restaurante/${restaurantId}/novo-prato">${icon("plus")}Cadastrar prato</a>` : ""
        );
  }

  chips.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    selected = chip.dataset.cat;
    draw();
  });

  list.addEventListener("click", (event) => {
    const button = event.target.closest(".dish-add");
    if (!button) return;
    const dish = dishes.find((d) => d.id === Number(button.dataset.dish));

    if (!addToCart(restaurant, dish)) {
      const replace = confirm("Seu carrinho tem itens de outro restaurante. Quer esvaziar e começar um novo pedido aqui?");
      if (!replace) return;
      addToCart(restaurant, dish, { replace: true });
    }
    toast(`${dish.name} no carrinho`);
  });

  draw();
}
