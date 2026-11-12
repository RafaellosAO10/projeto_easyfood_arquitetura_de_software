// Favoritos: restaurantes favoritados pelo usuário logado (GET /favorites).
// Sem login, a aba continua acessível e convida a entrar, em vez de redirecionar direto.
import { api } from "../api.js";
import { getSession } from "../store.js";
import { emptyState, skeletons } from "../ui.js";
import { restaurantCard, loadCovers, ensureFavorites, bindFavorites } from "./shared.js";

const lugares = (n) => `${n} ${n === 1 ? "lugar" : "lugares"}`;

const EMPTY = emptyState(
  "heart",
  "Nenhum favorito ainda",
  "Toque no coração de um restaurante para guardá-lo aqui.",
  `<a class="btn small" style="margin:12px auto 0" href="#/">Ver restaurantes</a>`
);

export async function renderFavoritos({ view, stale, go }) {
  if (!getSession()) {
    view.innerHTML = emptyState(
      "heart",
      "Entre para ver seus favoritos",
      "Seus restaurantes favoritos ficam salvos na sua conta.",
      `<a class="btn small" style="margin:12px auto 0" href="#/entrar?volta=${encodeURIComponent("#/favoritos")}">Entrar</a>`
    );
    return;
  }

  view.innerHTML = `<div class="section-head" style="margin-top:0"><h2>Seus favoritos</h2><span class="muted small" id="count"></span></div>
    <div id="list">${skeletons(2)}</div>`;

  // A lista vem da API (fonte da verdade) e também atualiza os corações das outras telas
  const [restaurants] = await Promise.all([api.listFavorites(), ensureFavorites()]);
  if (stale()) return;

  const list = view.querySelector("#list");
  const count = view.querySelector("#count");
  let shown = restaurants.length;

  count.textContent = shown ? lugares(shown) : "";
  list.innerHTML = shown ? restaurants.map(restaurantCard).join("") : EMPTY;
  loadCovers(list, restaurants);

  // Desfavoritar aqui tira o card da lista (só depois da API confirmar)
  bindFavorites(list, {
    go,
    onToggle(id, fav) {
      if (fav) return;
      list.querySelector(`[data-restaurant="${id}"]`)?.remove();
      shown -= 1;
      count.textContent = shown ? lugares(shown) : "";
      if (!shown) list.innerHTML = EMPTY;
    }
  });
}
