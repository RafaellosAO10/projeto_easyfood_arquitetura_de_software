// Buscar: pesquisa restaurantes por nome ou categoria no servidor (GET /restaurants?search=).
// A API ignora maiúsculas e acentos; aqui só esperamos o usuário parar de digitar.
import { api } from "../api.js";
import { esc, icon, emptyState, skeletons } from "../ui.js";
import { restaurantCard, loadCovers } from "./shared.js";

const DEBOUNCE_MS = 300;
const MAX_LENGTH = 150; // mesmo limite validado pela API

export async function renderBuscar({ view, query, stale }) {
  view.innerHTML = `<label class="searchbox" style="margin-top:0">${icon("search")}
      <input type="search" id="q" placeholder="Buscar restaurante ou categoria" aria-label="Buscar"
        maxlength="${MAX_LENGTH}" autocomplete="off" value=""></label>
    <p class="sr-only" id="status" role="status" aria-live="polite"></p>
    <div id="results" style="margin-top:14px">${skeletons(2)}</div>`;

  const input = view.querySelector("#q");
  const results = view.querySelector("#results");
  const status = view.querySelector("#status");
  input.value = (query.get("q") || "").slice(0, MAX_LENGTH);
  input.focus();

  let timer;
  let lastSearch = 0;

  // Guarda o termo na URL (#/buscar?q=...) sem recarregar a tela: voltar e atualizar mantêm a busca
  function keepInUrl(term) {
    const hash = term ? `#/buscar?q=${encodeURIComponent(term)}` : "#/buscar";
    if (location.hash !== hash) history.replaceState(null, "", hash);
  }

  async function runSearch() {
    const term = input.value.trim();
    const id = ++lastSearch;
    keepInUrl(term);
    results.setAttribute("aria-busy", "true");

    let restaurants;
    try {
      restaurants = term ? await api.searchRestaurants(term) : await api.listRestaurants();
    } catch (error) {
      // Resposta antiga ou tela trocada: ignora
      if (stale() || id !== lastSearch) return;
      results.removeAttribute("aria-busy");
      results.innerHTML = `<div class="empty">${icon("plug-connected-x")}<strong>Não deu para buscar</strong><p>${esc(error.message)}</p>
        <button class="btn secondary small" type="button" id="retry" style="margin:0 auto">Tentar de novo</button></div>`;
      results.querySelector("#retry").addEventListener("click", runSearch);
      status.textContent = "Erro na busca";
      return;
    }

    // Uma busca mais nova já foi disparada (ou o usuário saiu da tela): descarta esta resposta
    if (stale() || id !== lastSearch) return;

    results.removeAttribute("aria-busy");
    results.innerHTML = restaurants.length
      ? restaurants.map(restaurantCard).join("")
      : emptyState("mood-empty", "Nada encontrado", "Tente outro nome ou uma categoria, como pizza ou lanches.");
    status.textContent = restaurants.length
      ? `${restaurants.length} ${restaurants.length === 1 ? "restaurante encontrado" : "restaurantes encontrados"}`
      : "Nenhum restaurante encontrado";
    loadCovers(results, restaurants);
  }

  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!stale()) runSearch();
    }, DEBOUNCE_MS);
  });

  // Enter busca na hora, sem esperar o intervalo
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      clearTimeout(timer);
      runSearch();
    }
  });

  await runSearch();
}
