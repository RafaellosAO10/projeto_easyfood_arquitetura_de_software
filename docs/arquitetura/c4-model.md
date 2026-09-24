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

Como a API está organizada internamente?

```mermaid
flowchart TB
    subgraph api["EasyFood API — server.js"]
        express["Express<br/>cors · express.json() · express.static"]
        get["Rota GET /restaurants<br/>Consulta"]
        post["Rota POST /restaurants<br/>Valida e cadastra"]
        client["PrismaClient"]
    end
    db[("PostgreSQL")]

    express --> get
    express --> post
    get --> client
    post --> client
    client --> db
```

## Nível 4 — Code

```js
app.post("/restaurants", async (req, res) => {
  const { name, category, rating } = req.body || {};
  // validações -> 400
  try {
    const novoRestaurante = await prisma.restaurant.create({
      data: { name, category, rating: rating || 0 }
    });
    res.status(201).json(formatRestaurant(novoRestaurante));
  } catch (error) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});
```
