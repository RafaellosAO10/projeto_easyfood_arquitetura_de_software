# projeto_easyfood_arquitetura_de_software

API da **EasyFood**, projeto desenvolvido ao longo da disciplina *Software Architecture & Design Patterns*.

Monólito modular organizado em camadas, com persistência em PostgreSQL e autenticação JWT:

```
Cliente -> Routes -> [Middleware JWT] -> Controller -> Service -> Database (Prisma) -> PostgreSQL
```

## Tecnologias

- Node.js (LTS) e Express 5
- PostgreSQL (Supabase) + Prisma ORM
- JWT (`jsonwebtoken`), `bcryptjs` e `dotenv`
- Testes com o runner nativo do Node (`node:test`)

## Como executar

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Configure o banco. O banco da EasyFood fica no **Supabase**
   ([ADR-006](docs/adr/ADR-006-postgresql-gerenciado-no-supabase.md)).
   Copie o `.env.example` para `.env` e preencha com os dados do projeto
   (Supabase > Project Settings > Database > Connection string):

   ```env
   # API: pooler em modo transação (porta 6543)
   DATABASE_URL="postgresql://postgres.SEU_PROJECT_REF:SUA_SENHA@aws-0-SUA_REGIAO.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
   # Migrations: pooler em modo sessão (porta 5432)
   DIRECT_URL="postgresql://postgres.SEU_PROJECT_REF:SUA_SENHA@aws-0-SUA_REGIAO.pooler.supabase.com:5432/postgres"
   # Chave própria da API para assinar os tokens (não é a senha do banco)
   JWT_SECRET="troque-por-uma-chave-longa-e-aleatoria"
   ```

   Para gerar o `JWT_SECRET`:
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

   Para usar um PostgreSQL local, crie o banco (`CREATE DATABASE easyfood;`) e use
   `postgresql://postgres:SUA_SENHA@localhost:5432/easyfood` em `DATABASE_URL` e `DIRECT_URL`.

3. (Opcional) Vincule o Supabase CLI ao projeto:

   ```bash
   npx supabase login
   npx supabase link --project-ref SEU_PROJECT_REF
   ```

4. Crie as tabelas e insira os restaurantes iniciais:

   ```bash
   npx prisma migrate deploy
   npm run seed
   ```

   As migrations também habilitam o Row Level Security, que impede o acesso às tabelas pela
   Data API pública do Supabase; a API da EasyFood continua com acesso normal.

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
| Pós-atividades | Banco hospedado no Supabase, com RLS bloqueando a Data API pública (ADR-006) |

## Documentação

- [Arquitetura — C4 Model](docs/arquitetura/c4-model.md)
- ADRs
  - [ADR-001 — Armazenar restaurantes em memória](docs/adr/ADR-001-armazenar-restaurantes-em-memoria.md) *(substituída)*
  - [ADR-002 — Persistência com PostgreSQL](docs/adr/ADR-002-persistencia-com-postgresql.md)
  - [ADR-003 — Monólito modular em camadas](docs/adr/ADR-003-monolito-modular-em-camadas.md)
  - [ADR-004 — Autenticação com JWT](docs/adr/ADR-004-autenticacao-com-jwt.md)
  - [ADR-005 — Não adotar eventos neste momento](docs/adr/ADR-005-nao-adotar-eventos.md)
  - [ADR-006 — PostgreSQL gerenciado no Supabase](docs/adr/ADR-006-postgresql-gerenciado-no-supabase.md)
- Missões
  - [Missão 1 — Cadastro de restaurantes](docs/missoes/missao-1.md)
  - [Missão 2 — Teste da arquitetura e registro de decisões](docs/missoes/missao-2.md)
  - [Missão 3 — Persistência com PostgreSQL e Prisma](docs/missoes/missao-3.md)
  - [Missão 4 — Arquitetura em camadas](docs/missoes/missao-4.md)
  - [Atividade 5 — Autenticação com JWT](docs/missoes/missao-5.md)
