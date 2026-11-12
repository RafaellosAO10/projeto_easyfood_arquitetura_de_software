// Ponto de entrada do front: roteamento por hash (#/...), cabeçalho e barra inferior.
import { getSession, clearSession, cartCount, onChange, applyTheme } from "./store.js";
import { esc, icon, toast } from "./ui.js";
import { renderInicio } from "./views/inicio.js";
import { renderEntrar } from "./views/entrar.js";
import { renderCardapio } from "./views/cardapio.js";
import { renderPratoForm } from "./views/prato-form.js";
import { renderPerfil } from "./views/perfil.js";
import { renderRestauranteForm } from "./views/restaurante-form.js";
import { renderBuscar } from "./views/buscar.js";
import { renderCarrinho } from "./views/carrinho.js";
import { renderEmBreve } from "./views/em-breve.js";
import { renderFavoritos } from "./views/favoritos.js";

// header "home" = menu, logo e carrinho; header com title = voltar + título
const ROUTES = [
  { path: /^\/$/, render: renderInicio, tab: "inicio", header: "home" },
  { path: /^\/entrar$/, render: renderEntrar, header: "none", tabbar: false },
  { path: /^\/restaurante\/(\d+)$/, render: renderCardapio, tab: "inicio", title: "Cardápio", flush: true },
  { path: /^\/restaurante\/(\d+)\/novo-prato$/, render: renderPratoForm, tab: "perfil", title: "Novo prato", auth: true },
  { path: /^\/prato\/(\d+)\/editar$/, render: renderPratoForm, tab: "perfil", title: "Editar prato", auth: true, edit: true },
  { path: /^\/perfil$/, render: renderPerfil, tab: "perfil", title: "Perfil", auth: true },
  { path: /^\/perfil\/novo-restaurante$/, render: renderRestauranteForm, tab: "perfil", title: "Novo restaurante", auth: true },
  { path: /^\/buscar$/, render: renderBuscar, tab: "buscar", title: "Buscar" },
  { path: /^\/carrinho$/, render: renderCarrinho, tab: "inicio", title: "Carrinho" },
  { path: /^\/pedidos$/, render: renderEmBreve, tab: "pedidos", title: "Pedidos", feature: "pedidos" },
  { path: /^\/favoritos$/, render: renderFavoritos, tab: "favoritos", title: "Favoritos" }
];

const topbar = document.getElementById("topbar");
const tabbar = document.getElementById("tabbar");
const viewEl = document.getElementById("view");
const menu = document.getElementById("menu");
const menuAuth = document.getElementById("menu-auth");

let renderId = 0;
let currentRoute = null;

export function go(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

function parseHash() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, queryString = ""] = raw.split("?");
  return { path, query: new URLSearchParams(queryString), full: `#${raw}` };
}

function cartButton() {
  const count = cartCount();
  return `<a class="icon-btn" href="#/carrinho" aria-label="Carrinho, ${count} ${count === 1 ? "item" : "itens"}">
    ${icon("shopping-cart")}${count ? `<span class="badge">${count}</span>` : ""}</a>`;
}

function renderHeader(route, title) {
  if (route.header === "none") {
    topbar.hidden = true;
    return;
  }
  topbar.hidden = false;

  if (route.header === "home") {
    topbar.innerHTML = `<button class="icon-btn" type="button" id="menu-open" aria-label="Abrir menu" aria-expanded="false">${icon("menu-2")}</button>
      <span class="brand"><span class="brand-mark">${icon("tools-kitchen-2")}</span>EasyFood</span>${cartButton()}`;
    document.getElementById("menu-open").addEventListener("click", openMenu);
  } else {
    topbar.innerHTML = `<button class="icon-btn" type="button" id="back" aria-label="Voltar">${icon("arrow-left")}</button>
      <span class="topbar-title" id="topbar-title">${esc(title)}</span>${route.path.source.includes("carrinho") ? '<span class="icon-spacer"></span>' : cartButton()}`;
    document.getElementById("back").addEventListener("click", () => {
      if (history.length > 1) history.back();
      else go("#/");
    });
  }
}

export function setTitle(text) {
  const el = document.getElementById("topbar-title");
  if (el) el.textContent = text;
}

function openMenu() {
  menuAuth.textContent = getSession() ? "Sair" : "Entrar";
  menu.hidden = false;
  document.getElementById("menu-open")?.setAttribute("aria-expanded", "true");
  menu.querySelector("a").focus();
}

function closeMenu() {
  menu.hidden = true;
  document.getElementById("menu-open")?.setAttribute("aria-expanded", "false");
}

menu.addEventListener("click", (event) => {
  if (event.target === menu || event.target.closest("a")) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !menu.hidden) closeMenu();
});
menuAuth.addEventListener("click", () => {
  closeMenu();
  if (getSession()) {
    clearSession();
    toast("Você saiu da sua conta");
    go("#/");
  } else {
    go("#/entrar");
  }
});

async function route() {
  closeMenu();
  const { path, query, full } = parseHash();
  const match = ROUTES.map((r) => ({ r, m: path.match(r.path) })).find((x) => x.m);

  if (!match) {
    go("#/");
    return;
  }

  const { r, m } = match;

  if (r.auth && !getSession()) {
    go(`#/entrar?volta=${encodeURIComponent(full)}`);
    return;
  }

  const id = ++renderId;
  currentRoute = r;
  renderHeader(r, r.title);
  tabbar.hidden = r.tabbar === false;
  tabbar.querySelectorAll("a").forEach((a) => {
    if (a.dataset.tab === r.tab) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  viewEl.className = `view${r.flush ? " flush" : ""}`;
  viewEl.innerHTML = "";
  window.scrollTo(0, 0);

  try {
    await r.render({
      view: viewEl,
      params: m.slice(1),
      query,
      route: r,
      go,
      setTitle,
      stale: () => id !== renderId
    });
  } catch (error) {
    if (id !== renderId) return;
    if (error.status === 401) {
      toast(error.message);
      go(`#/entrar?volta=${encodeURIComponent(full)}`);
      return;
    }
    viewEl.innerHTML = `<div class="empty">${icon("plug-connected-x")}<strong>Não deu para carregar</strong><p>${esc(error.message)}</p>
      <button class="btn secondary small" type="button" id="retry" style="margin:0 auto">Tentar de novo</button></div>`;
    document.getElementById("retry").addEventListener("click", route);
  }
}

// Atualiza o contador do carrinho quando ele muda (em qualquer tela)
onChange((key) => {
  if (key === "easyfood-cart" && currentRoute && currentRoute.header !== "none") {
    topbar.querySelectorAll('a[href="#/carrinho"]').forEach((a) => (a.outerHTML = cartButton()));
  }
});

applyTheme();
window.addEventListener("hashchange", route);
route();
