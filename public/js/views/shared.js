// Partes reaproveitadas entre telas que mostram restaurantes.
import { api } from "../api.js";
import { esc, icon, cover, rating } from "../ui.js";

// O restaurante não tem foto própria na API: usamos a foto do primeiro prato que tiver uma.
const coverCache = new Map();

export function restaurantCard(restaurant) {
  return `<a class="restaurant-card" href="#/restaurante/${restaurant.id}" data-restaurant="${restaurant.id}">
    ${cover(coverCache.get(restaurant.id), restaurant.category)}
    <div class="restaurant-card-body"><strong>${esc(restaurant.name)}</strong>
      <span class="meta">${esc(restaurant.category || "Restaurante")} · ${icon("star")} ${rating(restaurant.rating)}</span></div></a>`;
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
