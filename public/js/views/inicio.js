// Início: saudação, busca, filtro por categoria e lista de restaurantes.
import { api } from "../api.js";
import { getSession } from "../store.js";
import { esc, icon, firstName, emptyState, skeletons } from "../ui.js";
import { restaurantCard, loadCovers, ensureFavorites, bindFavorites } from "./shared.js";

export async function renderInicio({ view, stale, go }) {
  const session = getSession();
  const hello = session ? `Olá, ${esc(firstName(session.user.name))}` : "Olá!";

  view.innerHTML = `<div class="greeting-hello">${hello}</div>
    <h1 class="title">O que vamos pedir hoje?</h1>
    <a class="searchbox" href="#/buscar">${icon("search")}<input tabindex="-1" placeholder="Buscar restaurante ou categoria" readonly aria-hidden="true"></a>
    <div class="chips" id="chips" role="group" aria-label="Filtrar por categoria"></div>
    <div class="section-head"><h2>Restaurantes</h2><span class="muted small" id="count"></span></div>
    <div id="list">${skeletons(3)}</div>`;

  // Os favoritos vêm junto para os corações já aparecerem pintados
  const [restaurants] = await Promise.all([api.listRestaurants(), ensureFavorites()]);
  if (stale()) return;

  const list = view.querySelector("#list");
  const chips = view.querySelector("#chips");
  const count = view.querySelector("#count");
  bindFavorites(list, { go });
  const categories = [...new Set(restaurants.map((r) => r.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  let selected = "";

  function draw() {
    const shown = selected ? restaurants.filter((r) => r.category === selected) : restaurants;
    chips.innerHTML = ["", ...categories]
      .map((c) => `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${c === selected}">${esc(c || "Todos")}</button>`)
      .join("");
    count.textContent = `${shown.length} ${shown.length === 1 ? "lugar" : "lugares"}`;
    list.innerHTML = shown.length
      ? shown.map(restaurantCard).join("")
      : emptyState("building-store", "Nenhum restaurante por aqui", "Quem tem restaurante pode cadastrar o seu pelo Perfil.");
    loadCovers(list, shown);
  }

  chips.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    selected = chip.dataset.cat;
    draw();
  });

  draw();
}
