// Tela de pedidos (variante B, que escolhi na prévia claro/escuro): os pedidos em andamento
// ficam em destaque com a barra de 4 etapas, e os anteriores em linhas simples.
// No detalhe (#/pedido/:id) mostro os itens, deixo cancelar enquanto o restaurante não
// começou e ofereço "pedir de novo" quando o pedido já terminou.
import { api } from "../api.js";
import { getSession, getCart, addToCart, setQty, clearCart } from "../store.js";
import { esc, icon, money, emptyState, skeletons, toast } from "../ui.js";

const STATUS = {
  PLACED: { label: "Recebido", step: 1 },
  PREPARING: { label: "Em preparo", step: 2 },
  OUT_FOR_DELIVERY: { label: "Saiu para entrega", step: 3 },
  DELIVERED: { label: "Entregue", step: 4 },
  CANCELLED: { label: "Cancelado", step: 0 }
};
const STEPS = 4;
const isActive = (order) => !["DELIVERED", "CANCELLED"].includes(order.status);
const itemCount = (order) => order.items.reduce((sum, item) => sum + item.quantity, 0);
const itens = (n) => `${n} ${n === 1 ? "item" : "itens"}`;

const TIME = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const DAY = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });

const day = (date) => (new Date().toDateString() === date.toDateString() ? "hoje" : DAY.format(date));
const when = (iso) => `${day(new Date(iso))} às ${TIME.format(new Date(iso))}`;

// Barra de etapas. Para leitor de tela eu transformo tudo num texto só ("Etapa 2 de 4: Em preparo")
function progress(order) {
  const { label, step } = STATUS[order.status];
  const bars = Array.from({ length: STEPS }, (_, i) => `<i class="${i < step ? "done" : ""}"></i>`).join("");
  return `<div class="order-steps" role="img" aria-label="Etapa ${step} de ${STEPS}: ${label}">${bars}</div>`;
}

function activeCard(order) {
  return `<a class="order-active" href="#/pedido/${order.id}">
      <div class="order-line"><strong>${esc(order.restaurant.name)}</strong><span class="muted small">#${order.id}</span></div>
      ${progress(order)}
      <div class="order-line"><span class="order-status">${STATUS[order.status].label}</span><span>${money(order.total)}</span></div>
      <span class="muted small">${itens(itemCount(order))} · pedido ${when(order.createdAt)}</span>
    </a>`;
}

function pastRow(order) {
  const cancelled = order.status === "CANCELLED";
  return `<a class="order-row" href="#/pedido/${order.id}">
      <span><strong>${esc(order.restaurant.name)}</strong>
        <span class="small ${cancelled ? "danger-text" : "muted"}">${day(new Date(order.createdAt))} · ${STATUS[order.status].label}</span></span>
      <span>${money(order.total)}</span>
    </a>`;
}

const loginInvite = (volta) =>
  emptyState("receipt", "Entre para ver seus pedidos", "Seus pedidos ficam salvos na sua conta.",
    `<a class="btn small" style="margin:12px auto 0" href="#/entrar?volta=${encodeURIComponent(volta)}">Entrar</a>`);

export async function renderPedidos({ view, stale }) {
  if (!getSession()) {
    view.innerHTML = loginInvite("#/pedidos");
    return;
  }

  view.innerHTML = skeletons(2);
  const orders = await api.listOrders();
  if (stale()) return;

  if (!orders.length) {
    view.innerHTML = emptyState("receipt", "Nenhum pedido ainda", "Finalize o carrinho e acompanhe o pedido por aqui.",
      `<a class="btn small" style="margin:12px auto 0" href="#/">Ver restaurantes</a>`);
    return;
  }

  const active = orders.filter(isActive);
  const past = orders.filter((order) => !isActive(order));

  view.innerHTML = `${active.length ? `<div class="section-head" style="margin-top:0"><h2>Em andamento</h2></div>${active.map(activeCard).join("")}` : ""}
    ${past.length ? `<div class="section-head"${active.length ? "" : ' style="margin-top:0"'}><h2>Anteriores</h2></div><div class="order-list">${past.map(pastRow).join("")}</div>` : ""}`;
}

// Pedir de novo: busco o cardápio atual e recoloco no carrinho só os pratos que ainda
// existem, já com o preço de hoje (não reaproveito o preço antigo do pedido)
async function orderAgain(order, go) {
  const dishes = await api.listDishes(order.restaurant.id);
  const byId = new Map(dishes.map((dish) => [dish.id, dish]));
  const available = order.items.filter((item) => item.dishId !== null && byId.has(item.dishId));

  if (!available.length) {
    toast("Nenhum prato deste pedido está no cardápio hoje");
    return;
  }

  const cart = getCart();
  if (cart.items.length) {
    const sameRestaurant = cart.restaurantId === order.restaurant.id;
    const question = sameRestaurant
      ? "Seu carrinho já tem itens. Quer trocá-los pelos deste pedido?"
      : "Seu carrinho tem itens de outro restaurante. Quer esvaziar e pedir de novo aqui?";
    if (!confirm(question)) return;
  }

  // Esvazio antes (mesmo sendo o mesmo restaurante) e repito as quantidades do pedido antigo
  clearCart();
  available.forEach((item) => {
    addToCart(order.restaurant, byId.get(item.dishId));
    setQty(item.dishId, item.quantity);
  });

  const missing = order.items.length - available.length;
  toast(missing ? `${itens(missing)} saiu do cardápio e ficou de fora` : "Itens no carrinho, com os preços de hoje");
  go("#/carrinho");
}

const REFRESH_MS = 20000;

export async function renderPedido({ view, params, stale, setTitle, go }) {
  const orderId = Number(params[0]);
  view.innerHTML = skeletons(1);

  let order = await api.getOrder(orderId);
  if (stale()) return;
  setTitle(`Pedido #${order.id}`);

  function draw() {
    const { label } = STATUS[order.status];
    const status = order.status === "CANCELLED"
      ? `<p class="order-final danger-text">${icon("circle-x")}Pedido cancelado</p>`
      : order.status === "DELIVERED"
        ? `<p class="order-final">${icon("circle-check")}Pedido entregue</p>`
        : `<div class="order-active static">${progress(order)}<span class="order-status">${label}</span>
            <span class="muted small">${order.status === "PLACED" ? "Aguardando o restaurante aceitar" : "A tela se atualiza sozinha"}</span></div>`;

    view.innerHTML = `<div class="section-head" style="margin-top:0"><h2>${esc(order.restaurant.name)}</h2>
        <a href="#/restaurante/${order.restaurant.id}">Ver cardápio</a></div>
      <p class="muted small" style="margin:-4px 0 12px">Pedido ${when(order.createdAt)}</p>
      ${status}
      <div class="order-list" style="margin-top:14px">${order.items
        .map((item) => `<div class="order-row"><span>${item.quantity}× ${esc(item.name)}</span><span>${money(item.subtotal)}</span></div>`)
        .join("")}</div>
      <div class="total"><span>Total</span><span>${money(order.total)}</span></div>
      ${order.status === "PLACED" ? `<button class="btn danger" type="button" id="cancel" style="margin-top:14px">${icon("x")}Cancelar pedido</button>` : ""}
      ${isActive(order) ? "" : `<button class="btn secondary" type="button" id="again" style="margin-top:14px">${icon("refresh")}Pedir de novo</button>`}`;

    view.querySelector("#cancel")?.addEventListener("click", async (event) => {
      if (!confirm("Cancelar este pedido?")) return;
      const button = event.currentTarget;
      button.disabled = true;
      try {
        order = await api.setOrderStatus(order.id, "CANCELLED");
        toast("Pedido cancelado");
      } catch (error) {
        // 403/409: o restaurante aceitou antes do meu cancelamento chegar; recarrego o pedido
        toast(error.status === 403 || error.status === 409 ? "O restaurante já começou o preparo; não dá mais para cancelar" : error.message);
        order = await api.getOrder(order.id).catch(() => order);
      }
      if (!stale()) draw();
    });

    view.querySelector("#again")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        await orderAgain(order, go);
      } catch (error) {
        toast(error.message);
      } finally {
        button.disabled = false;
      }
    });
  }

  draw();

  // Enquanto o pedido está andando, consulto o status a cada 20 s. Paro quando saio da tela
  // ou o pedido termina, e não consulto com a aba escondida.
  const timer = setInterval(async () => {
    if (stale() || !isActive(order)) return clearInterval(timer);
    if (document.hidden) return;
    try {
      const fresh = await api.getOrder(order.id);
      if (stale()) return clearInterval(timer);
      if (fresh.status !== order.status) {
        order = fresh;
        draw();
      }
    } catch (error) {
      // falha passageira de rede: tento de novo no próximo ciclo
    }
  }, REFRESH_MS);
}
