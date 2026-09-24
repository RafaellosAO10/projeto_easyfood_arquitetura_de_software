# Arquitetura da EasyFood — C4 Model

Cada nível é um *zoom* maior no sistema: Context → Container → Component → Code.

## Nível 1 — Context

Quem usa o sistema e com quem ele se relaciona?

```mermaid
flowchart LR
    cliente["👤 Cliente<br/>Consulta restaurantes"]
    restaurante["🏪 Usuário autenticado<br/>Cadastra restaurantes"]
    easyfood["EasyFood<br/>[Sistema de software]<br/>Plataforma de restaurantes"]

    cliente -- "Consulta restaurantes (público)" --> easyfood
    restaurante -- "Cria conta, faz login e cadastra restaurantes" --> easyfood
```

## Nível 2 — Container

Quais aplicações e armazenamentos formam o sistema?

```mermaid
flowchart LR
    usuario["👤 Cliente / Restaurante"]

    subgraph easyfood["EasyFood"]
        web["Página web<br/>[HTML + JavaScript]<br/>public/"]
        api["EasyFood API<br/>[Node.js + Express + Prisma + JWT]<br/>/restaurants · /auth"]
        db[("Banco de dados<br/>[PostgreSQL]<br/>tabelas Restaurant e User")]
    end

    usuario -- "Navegador" --> web
    usuario -- "HTTP / JSON (Postman)" --> api
    web -- "fetch HTTP / JSON<br/>Authorization: Bearer token" --> api
    api -- "Prisma Client (SQL/TCP)" --> db
```

> Mudança em relação à versão anterior: o container "array em memória" foi substituído pelo
> PostgreSQL ([ADR-002](../adr/ADR-002-persistencia-com-postgresql.md)).

## Nível 3 — Component

Como a API está organizada internamente? Monólito modular em camadas
([ADR-003](../adr/ADR-003-monolito-modular-em-camadas.md)), com autenticação JWT
([ADR-004](../adr/ADR-004-autenticacao-com-jwt.md)).

```mermaid
flowchart TB
    server["server.js<br/>Carrega o .env e liga o servidor"]
    app["src/app.js<br/>cors · express.json() · express.static · rotas"]

    subgraph auth["Módulo auth"]
        authRoutes["auth.routes.js<br/>POST /register · POST /login · GET /me"]
        authController["auth.controller.js<br/>req/res · validação · status HTTP"]
        authService["auth.service.js<br/>bcrypt · jwt.sign()"]
        middleware["auth.middleware.js<br/>jwt.verify() · req.user"]
    end

    subgraph restaurants["Módulo restaurants"]
        routes["restaurant.routes.js<br/>GET / (público) · POST / (protegido)"]
        controller["restaurant.controller.js<br/>req/res · validação · status HTTP"]
        service["restaurant.service.js<br/>Operações e regras"]
    end

    database["src/database/prisma.js<br/>PrismaClient"]
    db[("PostgreSQL")]

    server --> app
    app -- "/auth" --> authRoutes
    app -- "/restaurants" --> routes
    authRoutes --> authController --> authService
    authRoutes -- "GET /me" --> middleware
    routes -- "POST /" --> middleware
    routes --> controller --> service
    authService --> database
    service --> database
    database --> db
```

Fluxo de autenticação:

```
CADASTRO -> senha -> bcrypt -> hash -> PostgreSQL
LOGIN    -> bcrypt.compare() -> JWT
REQUISIÇÃO -> Authorization: Bearer <token> -> MIDDLEWARE -> ROTA PROTEGIDA
```

## Nível 4 — Code

```js
// restaurant.routes.js
router.get("/", controller.list);
router.post("/", authenticate, controller.create);

// auth.middleware.js
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token não fornecido" });
  }
  try {
    const payload = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
```
