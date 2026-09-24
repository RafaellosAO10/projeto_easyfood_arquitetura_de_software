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
        web["Página web<br/>[HTML + JavaScript]<br/>public/"]
        api["EasyFood API<br/>[Node.js + Express + Prisma]<br/>GET /restaurants<br/>POST /restaurants"]
        db[("Banco de dados<br/>[PostgreSQL]<br/>tabela Restaurant")]
    end

    usuario -- "Navegador" --> web
    usuario -- "HTTP / JSON (Postman)" --> api
    web -- "fetch HTTP / JSON" --> api
    api -- "Prisma Client (SQL/TCP)" --> db
```

> Mudança em relação à versão anterior: o container "array em memória" foi substituído pelo
> PostgreSQL ([ADR-002](../adr/ADR-002-persistencia-com-postgresql.md)).

## Nível 3 — Component

Como a API está organizada internamente? Monólito modular em camadas
([ADR-003](../adr/ADR-003-monolito-modular-em-camadas.md)).

```mermaid
flowchart TB
    server["server.js<br/>Liga o servidor"]
    app["src/app.js<br/>cors · express.json() · express.static · rotas"]

    subgraph restaurants["Módulo restaurants"]
        routes["restaurant.routes.js<br/>GET / · POST /"]
        controller["restaurant.controller.js<br/>req/res · validação · status HTTP"]
        service["restaurant.service.js<br/>Operações e regras"]
    end

    database["src/database/prisma.js<br/>PrismaClient"]
    db[("PostgreSQL")]

    server --> app
    app -- "/restaurants" --> routes
    routes --> controller
    controller --> service
    service --> database
    database --> db
```

## Nível 4 — Code

```js
// restaurant.routes.js
router.get("/", controller.list);
router.post("/", controller.create);

// restaurant.controller.js
async function create(req, res) {
  const { name, category, rating } = req.body || {};
  const validationError = validateRestaurant({ name, category, rating });
  if (validationError) return res.status(400).json({ error: validationError });
  const restaurant = await restaurantService.createRestaurant({ name, category, rating });
  res.status(201).json(restaurant);
}

// restaurant.service.js
async function createRestaurant(data) {
  const restaurant = await prisma.restaurant.create({
    data: { name: data.name, category: data.category, rating: data.rating || 0 }
  });
  return formatRestaurant(restaurant);
}
```
