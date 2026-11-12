// Carrinho salvo no localStorage (um restaurante por vez).
// Finalizar o pedido depende do módulo de pedidos, que a API ainda não tem.
import { getCart, setQty, clearCart, cartTotal, onChange } from "../store.js";
import { esc, icon, cover, money, emptyState } from "../ui.js";

export function renderCarrinho({ view: main, stale }) {
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
      <p class="muted small">Finalizar o pedido chega junto com o módulo de pedidos da API.</p>
      <button class="btn secondary" type="button" id="clear" style="margin-top:14px">${icon("trash")}Esvaziar carrinho</button>`;

    view.querySelector("#clear").addEventListener("click", () => {
      if (confirm("Esvaziar o carrinho?")) clearCart();
    });
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
