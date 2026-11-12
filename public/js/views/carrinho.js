// Carrinho salvo no localStorage (um restaurante por vez).
// Ao finalizar, viro o carrinho num pedido na API (ADR-013): mando só pratos e quantidades,
// e o servidor usa os preços atuais do banco (o preço guardado aqui pode estar velho).
import { api } from "../api.js";
import { getSession, getCart, setQty, clearCart, cartTotal, onChange } from "../store.js";
import { esc, icon, cover, money, emptyState, setMessage, toast } from "../ui.js";

// Troco as mensagens técnicas da API por algo que diga à pessoa o que fazer
function orderError(error) {
  if (error.status === 400 && /não existe neste restaurante/.test(error.message)) {
    return "Algum prato saiu do cardápio. Abra o restaurante e monte o carrinho de novo.";
  }
  if (error.status === 404) return "Este restaurante não está mais disponível.";
  return error.message;
}

export function renderCarrinho({ view: main, stale, go }) {
  // Wrapper próprio: o #view é reaproveitado entre telas e não pode acumular listeners
  main.innerHTML = "<div></div>";
  const view = main.firstElementChild;

  function draw() {
    const cart = getCart();

    if (!cart.items.length) {
      view.innerHTML = emptyState("shopping-cart", "Seu carrinho está vazio", "Escolha um restaurante e toque no + dos pratos.",
        `<a class="btn small" style="margin:12px auto 0" href="#/">Ver restaurantes</a>`);
      return;
    }

    view.innerHTML = `<div class="section-head" style="margin-top:0"><h2>${esc(cart.restaurantName)}</h2>
        <a href="#/restaurante/${cart.restaurantId}">Adicionar mais</a></div>
      <div>${cart.items
        .map(
          (i) => `<div class="dish"><div class="dish-photo" style="width:56px;height:56px">${cover(i.imageUrl, i.category)}</div>
            <div class="dish-info"><strong>${esc(i.name)}</strong><span class="muted small">${money(i.price)} cada</span></div>
            <div class="qty"><button type="button" data-id="${i.dishId}" data-delta="-1" aria-label="Tirar um ${esc(i.name)}">${icon(i.qty === 1 ? "trash" : "minus")}</button>
              <span aria-label="Quantidade">${i.qty}</span>
              <button type="button" data-id="${i.dishId}" data-delta="1" aria-label="Mais um ${esc(i.name)}">${icon("plus")}</button></div></div>`
        )
        .join("")}</div>
      <div class="total"><span>Total</span><span>${money(cartTotal())}</span></div>
      <p class="message" id="order-msg" role="alert"></p>
      <button class="btn" type="button" id="checkout" style="margin-top:14px">${icon("check")}${getSession() ? "Finalizar pedido" : "Entrar para finalizar"}</button>
      <button class="btn secondary" type="button" id="clear" style="margin-top:10px">${icon("trash")}Esvaziar carrinho</button>`;

    view.querySelector("#checkout").addEventListener("click", checkout);

    view.querySelector("#clear").addEventListener("click", () => {
      if (confirm("Esvaziar o carrinho?")) clearCart();
    });
  }

  let sending = false;

  async function checkout(event) {
    if (!getSession()) {
      go(`#/entrar?volta=${encodeURIComponent("#/carrinho")}`);
      return;
    }
    if (sending) return; // trava contra clique duplo: senão sairiam dois pedidos

    const button = event.currentTarget;
    const message = view.querySelector("#order-msg");
    const cart = getCart();
    const expected = cartTotal();
    sending = true;
    button.disabled = true;
    setMessage(message, "");

    try {
      const order = await api.createOrder(cart.restaurantId, cart.items.map((i) => ({ dishId: i.dishId, quantity: i.qty })));
      clearCart();
      // Se o dono mudou o preço depois que a pessoa montou o carrinho, aviso o total novo
      toast(Math.abs(order.total - expected) >= 0.005 ? `Pedido enviado. Total atualizado: ${money(order.total)}` : "Pedido enviado");
      go(`#/pedido/${order.id}`);
    } catch (error) {
      if (stale()) return;
      if (error.status === 401) {
        go(`#/entrar?volta=${encodeURIComponent("#/carrinho")}`);
        return;
      }
      setMessage(message, orderError(error));
      button.disabled = false;
    } finally {
      sending = false;
    }
  }

  view.addEventListener("click", (event) => {
    const button = event.target.closest(".qty button");
    if (!button) return;
    const item = getCart().items.find((i) => i.dishId === Number(button.dataset.id));
    if (item) setQty(item.dishId, item.qty + Number(button.dataset.delta));
  });

  const off = onChange((key) => {
    if (stale()) return off();
    if (key === "easyfood-cart") draw();
  });
  draw();
}
