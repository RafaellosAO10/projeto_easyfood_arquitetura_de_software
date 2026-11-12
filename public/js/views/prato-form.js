// Novo prato / Editar prato (só o dono do restaurante).
// Fluxo da API: primeiro salva os dados (JSON) e depois envia a foto (multipart, campo "image").
import { api } from "../api.js";
import { icon, field, setMessage, toast, checkImage, esc } from "../ui.js";

// Aceita "32,90", "32.90" ou "1.234,50"
function parsePrice(text) {
  const clean = String(text).trim().replace(/\s|R\$/g, "");
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  return /^\d+(\.\d{1,2})?$/.test(normalized) ? Number(normalized) : NaN;
}

const priceText = (value) => Number(value).toFixed(2).replace(".", ",");

export async function renderPratoForm({ view, params, route, go, stale }) {
  let dish = null;
  let restaurantId = Number(params[0]);

  if (route.edit) {
    dish = await api.getDish(Number(params[0]));
    if (stale()) return;
    restaurantId = dish.restaurantId;
  }

  // Sugestões de categoria a partir dos pratos que o restaurante já tem
  const existing = await api.listDishes(restaurantId).catch(() => []);
  if (stale()) return;
  const categories = [...new Set(existing.map((d) => d.category))];

  view.innerHTML = `<form id="dish-form" novalidate>
    <label class="photo-picker" id="picker">
      <input type="file" name="image" accept="image/jpeg,image/png,image/webp" aria-label="Foto do prato">
      ${icon("photo-plus")}<strong>${dish?.imageUrl ? "Trocar foto do prato" : "Adicionar foto do prato"}</strong>
      <span class="small muted">JPG, PNG ou WebP até 5 MB</span>
      ${dish?.imageUrl ? `<img src="${esc(dish.imageUrl)}" alt="Foto atual do prato"><span class="photo-change">Trocar foto</span>` : ""}
    </label>
    ${field({ label: "Nome do prato", name: "name", iconName: "tools-kitchen-2", placeholder: "X-Burger da casa", value: dish?.name, required: true, attrs: 'maxlength="150"' })}
    ${field({ label: "Categoria", name: "category", iconName: "category", placeholder: "Lanches", value: dish?.category, required: true, attrs: 'maxlength="100" list="categories"' })}
    <datalist id="categories">${categories.map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
    ${field({ label: "Descrição", name: "description", iconName: "file-text", placeholder: "Ingredientes, tamanho, porção…", value: dish?.description, textarea: true, attrs: 'maxlength="1000" rows="3"' })}
    ${field({ label: "Preço (R$)", name: "price", iconName: "currency-real", placeholder: "0,00", value: dish ? priceText(dish.price) : "", required: true, attrs: 'inputmode="decimal"' })}
    <div class="stack" style="margin-top:6px">
      <button class="btn" type="submit">${icon("device-floppy")}Salvar prato</button>
      ${dish ? `<button class="btn danger" type="button" id="delete">${icon("trash")}Remover prato</button>` : ""}
    </div>
    <p class="message" id="msg" role="alert"></p>
  </form>`;

  const form = view.querySelector("#dish-form");
  const picker = view.querySelector("#picker");
  const fileInput = form.querySelector('input[type="file"]');
  const msg = view.querySelector("#msg");
  let file = null;
  let previewUrl = null;

  fileInput.addEventListener("change", () => {
    const chosen = fileInput.files[0];
    if (!chosen) return;
    const problem = checkImage(chosen);
    if (problem) {
      fileInput.value = "";
      return setMessage(msg, problem);
    }
    setMessage(msg, "");
    file = chosen;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    picker.querySelectorAll("img, .photo-change").forEach((el) => el.remove());
    picker.insertAdjacentHTML("beforeend", `<img src="${previewUrl}" alt="Prévia da nova foto"><span class="photo-change">Trocar foto</span>`);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const body = {
      name: data.get("name").trim(),
      category: data.get("category").trim(),
      description: data.get("description").trim(),
      price: parsePrice(data.get("price"))
    };

    if (!body.name || !body.category) return setMessage(msg, "Preencha o nome e a categoria.");
    if (Number.isNaN(body.price)) return setMessage(msg, "Digite um preço válido, como 32,90.");

    const buttons = form.querySelectorAll("button");
    buttons.forEach((b) => (b.disabled = true));
    setMessage(msg, "");

    let saved;
    try {
      saved = dish ? await api.updateDish(dish.id, body) : await api.createDish(restaurantId, body);
    } catch (error) {
      buttons.forEach((b) => (b.disabled = false));
      if (error.status === 401) return go(`#/entrar?volta=${encodeURIComponent(location.hash)}`);
      return setMessage(msg, error.message);
    }

    if (file) {
      try {
        await api.uploadDishImage(saved.id, file);
      } catch (error) {
        // O prato já existe; leva para a edição para tentar a foto de novo
        toast("Prato salvo, mas a foto não foi enviada");
        if (!dish) return go(`#/prato/${saved.id}/editar`);
        buttons.forEach((b) => (b.disabled = false));
        return setMessage(msg, `A foto não foi enviada: ${error.message}`);
      }
    }

    toast(dish ? "Prato atualizado" : "Prato cadastrado");
    go(`#/restaurante/${restaurantId}`);
  });

  view.querySelector("#delete")?.addEventListener("click", async () => {
    if (!confirm(`Remover "${dish.name}" do cardápio? Isso não pode ser desfeito.`)) return;
    try {
      await api.deleteDish(dish.id);
      toast("Prato removido");
      go(`#/restaurante/${restaurantId}`);
    } catch (error) {
      setMessage(msg, error.message);
    }
  });
}
