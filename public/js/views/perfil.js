// Perfil: foto (upload), meus restaurantes, aparência e sair.
import { api } from "../api.js";
import { getSession, setSession, clearSession, getTheme, setTheme } from "../store.js";
import { esc, icon, cover, rating, setMessage, toast, checkImage, initials, skeletons } from "../ui.js";

function avatar(user) {
  return user.imageUrl ? `<img src="${esc(user.imageUrl)}" alt="Sua foto de perfil">` : esc(initials(user.name));
}

export async function renderPerfil({ view, go, stale }) {
  view.innerHTML = skeletons(2);
  const [user, restaurants] = await Promise.all([api.me(), api.listRestaurants()]);
  if (stale()) return;

  const mine = restaurants.filter((r) => r.ownerId === user.id);
  const theme = getTheme();

  view.innerHTML = `<div class="profile-head">
      <div class="avatar" id="avatar">${avatar(user)}
        <label class="avatar-btn" aria-label="Trocar foto de perfil">${icon("camera")}
          <input type="file" accept="image/jpeg,image/png,image/webp" id="avatar-input"></label></div>
      <div style="min-width:0"><strong>${esc(user.name)}</strong><span class="muted small">${esc(user.email)}</span></div>
    </div>
    <p class="message" id="msg" role="alert"></p>

    <div class="section-head"><h2>Meus restaurantes</h2>
      ${mine.length ? `<a href="#/perfil/novo-restaurante">${icon("plus")} Cadastrar</a>` : ""}</div>
    ${
      mine.length
        ? `<div class="list">${mine
            .map(
              (r) => `<a class="list-row" href="#/restaurante/${r.id}">${cover(null, r.category)}
                <span class="list-row-main"><strong>${esc(r.name)}</strong><span class="meta">${esc(r.category || "Restaurante")} · ${icon("star")} ${rating(r.rating)}</span></span>
                ${icon("chevron-right")}</a>`
            )
            .join("")}</div>`
        : `<div class="list"><div class="list-row"><span class="list-row-main"><strong>Tem um restaurante?</strong>
            <span class="muted small">Cadastre e monte o cardápio com fotos.</span></span>
            <a class="btn small" href="#/perfil/novo-restaurante">Cadastrar</a></div></div>`
    }

    <div class="section-head"><h2>Aparência</h2></div>
    <div class="segmented" role="group" aria-label="Tema" id="theme">
      ${[["system", "Automático"], ["light", "Claro"], ["dark", "Escuro"]]
        .map(([value, label]) => `<button type="button" data-theme="${value}" aria-pressed="${theme === value}">${label}</button>`)
        .join("")}
    </div>

    <button class="btn secondary" type="button" id="logout" style="margin-top:24px">${icon("logout")}Sair da conta</button>`;

  const msg = view.querySelector("#msg");

  view.querySelector("#avatar-input").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    const problem = checkImage(file);
    if (problem) return setMessage(msg, problem);

    const box = view.querySelector("#avatar");
    box.style.opacity = "0.6";
    setMessage(msg, "");
    try {
      const updated = await api.uploadProfileImage(file);
      // ?v= evita que o navegador mostre a foto antiga do cache
      box.firstChild.replaceWith(Object.assign(document.createElement("img"), { src: `${updated.imageUrl}?v=${Date.now()}`, alt: "Sua foto de perfil" }));
      const session = getSession();
      if (session) setSession({ ...session, user: { ...session.user, imageUrl: updated.imageUrl } });
      toast("Foto atualizada");
    } catch (error) {
      if (error.status === 401) return go("#/entrar?volta=%23%2Fperfil");
      setMessage(msg, error.message);
    } finally {
      box.style.opacity = "";
    }
  });

  view.querySelector("#theme").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    setTheme(button.dataset.theme);
    view.querySelectorAll("#theme button").forEach((b) => b.setAttribute("aria-pressed", b === button));
  });

  view.querySelector("#logout").addEventListener("click", () => {
    clearSession();
    toast("Você saiu da sua conta");
    go("#/");
  });
}
