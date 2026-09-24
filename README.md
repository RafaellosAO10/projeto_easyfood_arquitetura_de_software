# projeto_easyfood_arquitetura_de_software

API da **EasyFood**, projeto desenvolvido ao longo da disciplina *Software Architecture & Design Patterns*.

Monólito modular organizado em camadas, com persistência em PostgreSQL e autenticação JWT:

```
Cliente -> Routes -> [Middleware JWT] -> Controller -> Service -> Database (Prisma) -> PostgreSQL
```

## Tecnologias

- Node.js (LTS) e Express 5
- PostgreSQL + Prisma ORM
- JWT (`jsonwebtoken`), `bcryptjs` e `dotenv`
- Testes com o runner nativo do Node (`node:test`)

## Como executar

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o banco no PostgreSQL:

   ```sql
   CREATE DATABASE easyfood;
   ```

3. Copie o `.env.example` para `.env` e configure:

   ```env
   DATABASE_URL="postgresql://postgres:SUA_SENHA_AQUI@localhost:5432/easyfood"
   JWT_SECRET="troque-por-uma-chave-longa-e-aleatoria"
   ```

4. Crie as tabelas e insira os restaurantes iniciais:

   ```bash
   npx prisma migrate dev
   npm run seed
   ```

5. Inicie o servidor:

   ```bash
   node server.js      # ou: npm start
   ```

   Saída esperada: `EasyFood rodando na porta 3000`.
   A página web fica disponível em http://localhost:3000.

Para visualizar os dados: `npx prisma studio` (http://localhost:5555).

## Testes

Testes de integração da API. Precisam do banco e do `JWT_SECRET` configurados no `.env`;
os dados criados pelos testes são removidos ao final.

```bash
npm test
```

## Rotas

| Método | Rota             | Acesso    | Descrição                                   |
|--------|------------------|-----------|---------------------------------------------|
| GET    | `/restaurants`   | Público   | Lista os restaurantes                       |
| POST   | `/restaurants`   | **Token** | Cadastra um restaurante                     |
| POST   | `/auth/register` | Público   | Cadastra um usuário                         |
| POST   | `/auth/login`    | Público   | Autentica e devolve um JWT (válido por 1 dia) |
| GET    | `/auth/me`       | **Token** | Retorna o usuário autenticado               |

Rotas com **Token** exigem o header `Authorization: Bearer <token>`; sem ele, a resposta é `401`.

### Exemplo de uso

```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{ "name": "Aluno", "email": "aluno@easyfood.com", "password": "123456" }
```

```http
POST http://localhost:3000/auth/login
Content-Type: application/json

{ "email": "aluno@easyfood.com", "password": "123456" }
```

```http
POST http://localhost:3000/restaurants
Content-Type: application/json
Authorization: Bearer <token recebido no login>

{ "name": "Taco Loco", "category": "Mexicana", "rating": 4.3 }
```

### Validações

| Rota | Regras | Erro |
|------|--------|------|
| `POST /restaurants` | `name` (até 150) e `category` (até 100) obrigatórios; `rating` opcional, número de 0 a 5 | `400` |
| `POST /auth/register` | `name` (até 150), `email` válido (até 150) e `password` (6 a 72 caracteres) obrigatórios | `400`; e-mail já cadastrado: `409` |
| `POST /auth/login` | `email` e `password` obrigatórios | `400`; credenciais inválidas: `401` |

## Estrutura

```
easy-food/
├── docs/                    # ADRs, C4 Model e respostas das missões
├── prisma/
│   ├── migrations/
│   ├── schema.prisma        # models Restaurant e User
│   └── seed.js
├── public/                  # página web (HTML, CSS e JS)
├── src/
│   ├── database/
│   │   └── prisma.js        # conexão com o banco
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.js        # /register, /login, /me
│   │   │   ├── auth.controller.js    # req/res e validação
│   │   │   ├── auth.service.js       # bcrypt e geração do JWT
│   │   │   └── auth.middleware.js    # valida o Bearer token
│   │   └── restaurants/
│   │       ├── restaurant.routes.js      # caminhos
│   │       ├── restaurant.controller.js  # req/res e validação
│   │       └── restaurant.service.js     # regras e operações
│   └── app.js               # configura a aplicação
├── tests/                   # testes de integração
├── .env.example
└── server.js                # carrega o .env e liga o servidor
```

## Evolução do projeto

| Atividade | Entrega |
|-----------|---------|
| 1 | API Express com `GET /restaurants` em memória; análise do requisito de cadastro |
| 2 | `POST /restaurants`, teste de reinicialização, C4 Model e ADR-001 |
| 3 | Persistência com PostgreSQL + Prisma, seed, migration e ADR-002 |
| 4 | Refatoração em camadas (routes, controller, service, database), testes, ADR-003 e ADR-004 (proposta) |
| 5 | Autenticação JWT: cadastro, login, `/auth/me` e `POST /restaurants` protegido |

## Documentação

- [Arquitetura — C4 Model](docs/arquitetura/c4-model.md)
- ADRs
  - [ADR-001 — Armazenar restaurantes em memória](docs/adr/ADR-001-armazenar-restaurantes-em-memoria.md) *(substituída)*
  - [ADR-002 — Persistência com PostgreSQL](docs/adr/ADR-002-persistencia-com-postgresql.md)
  - [ADR-003 — Monólito modular em camadas](docs/adr/ADR-003-monolito-modular-em-camadas.md)
  - [ADR-004 — Autenticação com JWT](docs/adr/ADR-004-autenticacao-com-jwt.md)
  - [ADR-005 — Não adotar eventos neste momento](docs/adr/ADR-005-nao-adotar-eventos.md)
- Missões
  - [Missão 1 — Cadastro de restaurantes](docs/missoes/missao-1.md)
  - [Missão 2 — Teste da arquitetura e registro de decisões](docs/missoes/missao-2.md)
  - [Missão 3 — Persistência com PostgreSQL e Prisma](docs/missoes/missao-3.md)
  - [Missão 4 — Arquitetura em camadas](docs/missoes/missao-4.md)
  - [Atividade 5 — Autenticação com JWT](docs/missoes/missao-5.md)
