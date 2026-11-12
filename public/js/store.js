// Estado salvo no navegador: sessão (token JWT), carrinho e tema.
// Sem acesso ao localStorage (aba anônima, bloqueio), tudo vale só enquanto a página estiver aberta.
const KEYS = { session: "easyfood-session", cart: "easyfood-cart", theme: "easyfood-theme" };
const memory = {};
const listeners = new Set();

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? memory[key] ?? null : JSON.parse(raw);
  } catch (error) {
    return memory[key] ?? null;
  }
}

function write(key, value) {
  memory[key] = value;
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // segue só com a memória
  }
  listeners.forEach((fn) => fn(key));
}

// Devolve a função que cancela a inscrição
export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---------- Sessão ----------
export const getSession = () => read(KEYS.session);
export const setSession = (session) => write(KEYS.session, session);
export const clearSession = () => write(KEYS.session, null);

// ---------- Carrinho (um restaurante por vez) ----------
const emptyCart = () => ({ restaurantId: null, restaurantName: "", items: [] });

export const getCart = () => read(KEYS.cart) || emptyCart();

export function cartCount() {
  return getCart().items.reduce((sum, item) => sum + item.qty, 0);
}

export function cartTotal() {
  return getCart().items.reduce((sum, item) => sum + item.qty * item.price, 0);
}

// Retorna false quando o carrinho tem itens de outro restaurante (quem chama decide se troca)
export function addToCart(restaurant, dish, { replace = false } = {}) {
  let cart = getCart();

  if (cart.items.length && cart.restaurantId !== restaurant.id) {
    if (!replace) return false;
    cart = emptyCart();
  }

  cart.restaurantId = restaurant.id;
  cart.restaurantName = restaurant.name;
  const item = cart.items.find((i) => i.dishId === dish.id);
  if (item) item.qty += 1;
  else cart.items.push({ dishId: dish.id, name: dish.name, price: dish.price, imageUrl: dish.imageUrl, category: dish.category, qty: 1 });

  write(KEYS.cart, cart);
  return true;
}

export function setQty(dishId, qty) {
  const cart = getCart();
  cart.items = cart.items
    .map((i) => (i.dishId === dishId ? { ...i, qty } : i))
    .filter((i) => i.qty > 0);
  write(KEYS.cart, cart.items.length ? cart : null);
}

export const clearCart = () => write(KEYS.cart, null);

// ---------- Tema: "system" (segue o aparelho), "light" ou "dark" ----------
export const getTheme = () => read(KEYS.theme) || "system";

export function setTheme(theme) {
  write(KEYS.theme, theme === "system" ? null : theme);
  applyTheme();
}

export function applyTheme() {
  const theme = getTheme();
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
}
