# Arquitetura da EasyFood — C4 Model

Cada nível é um *zoom* maior no sistema: Context → Container → Component → Code.

## Nível 1 — Context

Quem usa o sistema e com quem ele se relaciona?

```mermaid
flowchart LR
    cliente["👤 Cliente<br/>Consulta restaurantes"]
    restaurante["🏪 Restaurante<br/>Cadastra seu estabelecimento"]
    easyfood["EasyFood<br/>[Sistema de software]<br/>Plataforma de restaurantes"]

    cliente -- "Consulta restaurantes" --> easyfood
    restaurante -- "Cadastra-se" --> easyfood
```

## Nível 2 — Container

Quais aplicações e armazenamentos formam o sistema?

```mermaid
flowchart LR
    usuario["👤 Cliente / Restaurante"]

    subgraph easyfood["EasyFood"]
        api["EasyFood API<br/>[Node.js + Express]<br/>GET /restaurants<br/>POST /restaurants"]
        memoria[("Array em memória<br/>[processo Node.js]")]
    end

    usuario -- "HTTP / JSON" --> api
    api -- "push / leitura" --> memoria
```

## Nível 3 — Component

Como a API está organizada internamente?

```mermaid
flowchart TB
    subgraph api["EasyFood API — server.js"]
        express["Express<br/>express.json()"]
        get["Rota GET /restaurants<br/>Consulta"]
        post["Rota POST /restaurants<br/>Valida e cadastra"]
        array[("restaurants[]")]
    end

    express --> get
    express --> post
    get --> array
    post --> array
```

## Nível 4 — Code

```js
app.post("/restaurants", (req, res) => {
  const { name, category, rating } = req.body || {};
  // validações -> 400
  const novoRestaurante = { id: restaurants.length + 1, name, category, rating: rating || 0 };
  restaurants.push(novoRestaurante);
  res.status(201).json(novoRestaurante);
});
```
