const restaurantList = document.getElementById("restaurant-list");
const restaurantForm = document.getElementById("restaurant-form");
const formMessage = document.getElementById("form-message");
const restaurantLoginHint = document.getElementById("restaurant-login-hint");

const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const authNameField = document.getElementById("auth-name-field");
const authSubmit = document.getElementById("auth-submit");
const authToggle = document.getElementById("auth-toggle");
const authMessage = document.getElementById("auth-message");
const authLoggedOut = document.getElementById("auth-logged-out");
const authLoggedIn = document.getElementById("auth-logged-in");
const authUser = document.getElementById("auth-user");
const logoutButton = document.getElementById("logout-button");

const SESSION_KEY = "easyfood-session";

let session = loadSession();
let isRegisterMode = false;

// ---------- Sessão (token JWT) ----------

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch (error) {
    return null;
  }
}

function saveSession(newSession) {
  session = newSession;

  try {
    if (newSession) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (error) {
    // Sem acesso ao localStorage a sessão vale apenas enquanto a página estiver aberta
  }

  renderSession();
}

function renderSession() {
  const loggedIn = Boolean(session);

  authLoggedOut.hidden = loggedIn;
  authLoggedIn.hidden = !loggedIn;
  restaurantForm.hidden = !loggedIn;
  restaurantLoginHint.hidden = loggedIn;

  if (loggedIn) {
    authUser.textContent = `${session.user.name} (${session.user.email})`;
  }
}

// Confere se o token salvo ainda é válido (ele expira em 1 dia)
async function checkSession() {
  if (!session) {
    return;
  }

  try {
    const response = await fetch("/auth/me", {
      headers: { Authorization: `Bearer ${session.token}` }
    });

    if (response.status === 401) {
      saveSession(null);
    }
  } catch (error) {
    // Falha de rede: mantém a sessão e deixa a próxima requisição decidir
  }
}

// ---------- Mensagens ----------

function showMessage(element, text, type) {
  element.textContent = text;
  element.className = `message ${type}`;
}

// ---------- Autenticação ----------

function setRegisterMode(enabled) {
  isRegisterMode = enabled;

  authTitle.textContent = enabled ? "Criar conta" : "Entrar";
  authSubmit.textContent = enabled ? "Cadastrar" : "Entrar";
  authToggle.textContent = enabled ? "Já tem conta? Entre" : "Não tem conta? Cadastre-se";
  authNameField.hidden = !enabled;
  authNameField.querySelector("input").required = enabled;
  showMessage(authMessage, "", "");
}

async function postJson(url, body, token) {
  const headers = { "Content-Type": "application/json" };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  return { response, data: await response.json() };
}

async function login(email, password) {
  const { response, data } = await postJson("/auth/login", { email, password });

  if (!response.ok) {
    showMessage(authMessage, data.error, "error");
    return;
  }

  authForm.reset();
  saveSession(data);
}

authToggle.addEventListener("click", () => setRegisterMode(!isRegisterMode));

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(authForm);
  const email = formData.get("email").trim();
  const password = formData.get("password");

  try {
    if (isRegisterMode) {
      const { response, data } = await postJson("/auth/register", {
        name: formData.get("name").trim(),
        email,
        password
      });

      if (!response.ok) {
        showMessage(authMessage, data.error, "error");
        return;
      }

      setRegisterMode(false);
    }

    await login(email, password);
  } catch (error) {
    showMessage(authMessage, "Não foi possível conectar à EasyFood.", "error");
  }
});

logoutButton.addEventListener("click", () => saveSession(null));

// ---------- Restaurantes ----------

function renderRestaurants(restaurants) {
  restaurantList.innerHTML = "";

  if (restaurants.length === 0) {
    restaurantList.innerHTML = "<li>Nenhum restaurante cadastrado.</li>";
    return;
  }

  for (const restaurant of restaurants) {
    const item = document.createElement("li");

    const info = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = restaurant.name;
    const category = document.createElement("div");
    category.className = "restaurant-category";
    category.textContent = restaurant.category;
    info.append(name, category);

    const rating = document.createElement("span");
    rating.textContent = `★ ${Number(restaurant.rating ?? 0).toFixed(1)}`;

    item.append(info, rating);
    restaurantList.appendChild(item);
  }
}

async function loadRestaurants() {
  try {
    const response = await fetch("/restaurants");
    renderRestaurants(await response.json());
  } catch (error) {
    restaurantList.innerHTML = "<li>Não foi possível carregar os restaurantes.</li>";
  }
}

restaurantForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(restaurantForm);
  const body = {
    name: formData.get("name").trim(),
    category: formData.get("category").trim()
  };

  if (formData.get("rating") !== "") {
    body.rating = Number(formData.get("rating"));
  }

  try {
    const { response, data } = await postJson("/restaurants", body, session?.token);

    if (response.status === 401) {
      saveSession(null);
      showMessage(authMessage, "Sua sessão expirou. Entre novamente.", "error");
      return;
    }

    if (!response.ok) {
      showMessage(formMessage, data.error, "error");
      return;
    }

    showMessage(formMessage, `${data.name} cadastrado com sucesso!`, "success");
    restaurantForm.reset();
    loadRestaurants();
  } catch (error) {
    showMessage(formMessage, "Não foi possível cadastrar o restaurante.", "error");
  }
});

renderSession();
checkSession();
loadRestaurants();
