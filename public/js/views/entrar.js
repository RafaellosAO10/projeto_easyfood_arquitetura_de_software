// Entrar / Criar conta. Depois do login volta para a tela que pediu (?volta=).
import { api } from "../api.js";
import { setSession } from "../store.js";
import { icon, field, setMessage, toast, firstName } from "../ui.js";

export function renderEntrar({ view, query, go }) {
  let register = query.get("modo") === "cadastro";
  const back = query.get("volta");
  const destination = back && back.startsWith("#/") && !back.startsWith("#/entrar") ? back : "#/";

  function draw() {
    view.innerHTML = `<div class="auth">
      <div class="auth-brand"><span class="brand-mark big">${icon("tools-kitchen-2")}</span>
        <h1>EasyFood</h1><p class="subtitle">${register ? "Crie sua conta para pedir" : "Entre para fazer seu pedido"}</p></div>
      <form id="auth-form" novalidate>
        ${register ? field({ label: "Nome", name: "name", iconName: "user", placeholder: "Seu nome", required: true, attrs: 'maxlength="150" autocomplete="name"' }) : ""}
        ${field({ label: "E-mail", name: "email", iconName: "mail", type: "email", placeholder: "voce@email.com", required: true, attrs: 'maxlength="150" autocomplete="email"' })}
        ${field({ label: "Senha", name: "password", iconName: "lock", type: "password", placeholder: register ? "Mínimo de 6 caracteres" : "Sua senha", required: true, attrs: `minlength="6" maxlength="72" autocomplete="${register ? "new-password" : "current-password"}"` })}
        <button class="btn" type="submit" style="margin-top:6px">${register ? "Criar conta" : "Entrar"}</button>
        <p class="message" id="msg" role="alert"></p>
      </form>
      <p class="auth-switch">${register ? "Já tem conta?" : "Não tem conta?"} <button class="link" type="button" id="toggle">${register ? "Entrar" : "Criar conta"}</button></p>
      <p class="auth-switch"><a class="link" href="#/">Ver restaurantes sem entrar</a></p>
    </div>`;

    view.querySelector("#toggle").addEventListener("click", () => {
      register = !register;
      draw();
    });

    const form = view.querySelector("#auth-form");
    const msg = view.querySelector("#msg");
    form.querySelector("input").focus();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const name = (data.get("name") || "").trim();
      const email = data.get("email").trim();
      const password = data.get("password");

      if ((register && !name) || !email || !password) return setMessage(msg, "Preencha todos os campos.");
      if (!form.querySelector('[name="email"]').checkValidity()) return setMessage(msg, "Digite um e-mail válido.");
      if (register && password.length < 6) return setMessage(msg, "A senha precisa ter pelo menos 6 caracteres.");

      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      setMessage(msg, "");

      try {
        if (register) await api.register(name, email, password);
        const session = await api.login(email, password);
        setSession(session);
        toast(`Bem-vindo, ${firstName(session.user.name)}`);
        go(destination);
      } catch (error) {
        setMessage(msg, error.status === 401 ? "E-mail ou senha incorretos." : error.message);
        button.disabled = false;
      }
    });
  }

  draw();
}
