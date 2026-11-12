// Partes reaproveitadas entre telas que mostram restaurantes.
import { api } from "../api.js";
import { getSession, onChange } from "../store.js";
import { esc, icon, cover, rating, toast } from "../ui.js";

// O restaurante não tem foto própria na API: usamos a foto do primeiro prato que tiver uma.
const coverCache = new Map();

// ---------- Favoritos (GET/PUT/DELETE /favorites, ADR-012) ----------
// Ids favoritos do usuário logado; null = ainda não carregado. Zera ao entrar ou sair da conta.
let favoriteIds = null;
const pending = new Set(); // restaurantes com favoritar/remover em andamento

onChange((key) => {
  if (key === "easyfood-session") favoriteIds = null;
});

// Carrega os favoritos uma vez por sessão. Falha (ou sessão expirada) não impede a tela
// de abrir: os corações aparecem vazios. O 401 já encerra a sessão em api.js.
export async function ensureFavorites() {
  if (!getSession()) return new Set();
  if (favoriteIds) return favoriteIds;

  try {
    const restaurants = await api.listFavorites();
    favoriteIds = new Set(restaurants.map((r) => r.id));
    return favoriteIds;
  } catch (error) {
    return new Set();
  }
}

export const isFavorite = (restaurantId) => Boolean(favoriteIds?.has(restaurantId));

function heartButton(restaurant) {
  const fav = isFavorite(restaurant.id);
  return `<button class="fav-btn" type="button" data-fav="${restaurant.id}" aria-pressed="${fav}"
    aria-label="Favoritar ${esc(restaurant.name)}">${icon(fav ? "heart-filled" : "heart")}</button>`;
}

function paintHeart(button, fav) {
  button.setAttribute("aria-pressed", String(fav));
  button.innerHTML = icon(fav ? "heart-filled" : "heart");
}

// O card é um contêiner com o link e o botão lado a lado: botão dentro de <a> é HTML inválido
// (o clique no coração abriria o restaurante e o leitor de tela misturaria os dois).
export function restaurantCard(restaurant) {
  return `<div class="restaurant-card" data-restaurant="${restaurant.id}">
    <a href="#/restaurante/${restaurant.id}">
    ${cover(coverCache.get(restaurant.id), restaurant.category)}
    <div class="restaurant-card-body"><strong>${esc(restaurant.name)}</strong>
      <span class="meta">${esc(restaurant.category || "Restaurante")} · ${icon("star")} ${rating(restaurant.rating)}</span></div></a>
    ${heartButton(restaurant)}</div>`;
}

// Liga os corações de um contêiner. Atualização otimista: o coração muda na hora e volta
// ao estado anterior se a API falhar. onToggle(id, fav) avisa a tela (ex.: Favoritos remove o card).
export function bindFavorites(container, { go, onToggle } = {}) {
  container.addEventListener("click", async (event) => {
    const button = event.target.closest(".fav-btn");
    if (!button) return;

    if (!getSession()) {
      toast("Entre na sua conta para favoritar");
      go?.(`#/entrar?volta=${encodeURIComponent(location.hash || "#/")}`);
      return;
    }

    const id = Number(button.dataset.fav);
    if (pending.has(id)) return; // ignora cliques repetidos enquanto a API responde

    const fav = !isFavorite(id);
    pending.add(id);
    favoriteIds = favoriteIds || new Set();
    fav ? favoriteIds.add(id) : favoriteIds.delete(id);
    paintHeart(button, fav);

    try {
      await (fav ? api.addFavorite(id) : api.removeFavorite(id));
      toast(fav ? "Adicionado aos favoritos" : "Removido dos favoritos");
      onToggle?.(id, fav);
    } catch (error) {
      fav ? favoriteIds?.delete(id) : favoriteIds?.add(id);
      if (button.isConnected) paintHeart(button, !fav);
      toast(error.status === 401 ? error.message : "Não deu para salvar o favorito. Tente de novo.");
      if (error.status === 401) go?.(`#/entrar?volta=${encodeURIComponent(location.hash || "#/")}`);
    } finally {
      pending.delete(id);
    }
  });
}

// Busca as capas em paralelo e troca o bloco colorido pela foto quando ela existir
export async function loadCovers(container, restaurants) {
  await Promise.all(
    restaurants
      .filter((r) => !coverCache.has(r.id))
      .map(async (r) => {
        try {
          const dishes = await api.listDishes(r.id);
          coverCache.set(r.id, dishes.find((d) => d.imageUrl)?.imageUrl || null);
        } catch (error) {
          // sem capa: continua o bloco colorido
        }
      })
  );

  for (const r of restaurants) {
    const url = coverCache.get(r.id);
    const card = container.querySelector(`[data-restaurant="${r.id}"] .cover`);
    if (url && card && !card.querySelector("img")) card.outerHTML = cover(url, r.category);
  }
}

export function rememberCover(restaurantId, dishes) {
  coverCache.set(Number(restaurantId), dishes.find((d) => d.imageUrl)?.imageUrl || null);
}
