// Buscar: filtra restaurantes por nome ou categoria no próprio navegador.
// Próxima etapa: trocar pelo GET /restaurants?search= no servidor.
import { api } from "../api.js";
import { icon, emptyState, skeletons } from "../ui.js";
import { restaurantCard, loadCovers } from "./shared.js";

const normalize = (text) => String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export async function renderBuscar({ view, query, stale }) {
  view.innerHTML = `<label class="searchbox" style="margin-top:0">${icon("search")}
      <input type="search" id="q" placeholder="Buscar restaurante ou categoria" aria-label="Buscar" value=""></label>
    <div id="results" style="margin-top:14px">${skeletons(2)}</div>`;

  const input = view.querySelector("#q");
  input.value = query.get("q") || "";
  input.focus();

  const restaurants = await api.listRestaurants();
  if (stale()) return;
  const results = view.querySelector("#results");

  function draw() {
    const term = normalize(input.value.trim());
    const shown = term ? restaurants.filter((r) => normalize(`${r.name} ${r.category}`).includes(term)) : restaurants;
    results.innerHTML = shown.length
      ? shown.map(restaurantCard).join("")
      : emptyState("mood-empty", "Nada encontrado", "Tente outro nome ou uma categoria, como pizza ou lanches.");
    loadCovers(results, shown);
  }

  input.addEventListener("input", draw);
  draw();
}
