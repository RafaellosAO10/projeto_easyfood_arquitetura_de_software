// Abas da barra inferior que ainda dependem de módulos novos na API.
import { emptyState } from "../ui.js";

const TEXTOS = {
  pedidos: ["receipt", "Seus pedidos aparecem aqui", "O acompanhamento de pedidos chega com o módulo de pedidos da API."]
};

export function renderEmBreve({ view, route }) {
  const [iconName, title, text] = TEXTOS[route.feature];
  view.innerHTML = emptyState(iconName, title, text, `<a class="btn small" style="margin:12px auto 0" href="#/">Ver restaurantes</a>`);
}
