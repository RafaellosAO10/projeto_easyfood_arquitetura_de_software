const restaurantList = document.getElementById("restaurant-list");
const restaurantForm = document.getElementById("restaurant-form");
const formMessage = document.getElementById("form-message");

function showMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = `message ${type}`;
}

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
    const response = await fetch("/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();

    if (!response.ok) {
      showMessage(data.error, "error");
      return;
    }

    showMessage(`${data.name} cadastrado com sucesso!`, "success");
    restaurantForm.reset();
    loadRestaurants();
  } catch (error) {
    showMessage("Não foi possível cadastrar o restaurante.", "error");
  }
});

loadRestaurants();
