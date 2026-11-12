# projeto_easyfood_arquitetura_de_software

API da **EasyFood**, projeto desenvolvido ao longo da disciplina *Software Architecture & Design Patterns*.

Monólito modular organizado em camadas, com persistência em PostgreSQL e autenticação JWT:

```
Cliente -> Routes -> [Middleware JWT] -> Controller -> Service -> Database (Prisma) -> PostgreSQL
```

## Tecnologias

- Node.js (LTS) e Express 5
- PostgreSQL 17 (Docker Compose) + Prisma ORM
- Multer (upload) e Sharp (otimização de imagens)
- JWT (`jsonwebtoken`), `bcryptjs` e `dotenv`
- Testes com o runner nativo do Node (`node:test`)

## Como executar

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Configure o `.env`. Copie o `.env.example` para `.env` e troque os valores de exemplo:

   ```env
   # Senha do PostgreSQL do container (escolha uma; use a mesma nas duas URLs)
   POSTGRES_PASSWORD="troque-esta-senha"
   DATABASE_URL="postgresql://easyfood:troque-esta-senha@localhost:5432/easyfood?schema=public"
   DIRECT_URL="postgresql://easyfood:troque-esta-senha@localhost:5432/easyfood?schema=public"
   # Chave própria da API para assinar os tokens (não é a senha do banco)
   JWT_SECRET="troque-por-uma-chave-longa-e-aleatoria"
   ```

   Para gerar valores aleatórios:
   `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.

3. Suba o banco (PostgreSQL 17 em Docker, só acessível desta máquina —
   [ADR-008](docs/adr/ADR-008-postgresql-local-em-docker.md)). Requer o Docker Desktop aberto:

   ```bash
   docker compose up -d
   ```

   Para parar: `docker compose down` (os dados ficam no volume `easyfood-pgdata`;
   `docker compose down -v` apaga tudo).

4. Crie as tabelas e insira os restaurantes iniciais:

   ```bash
   npx prisma migrate deploy
   npm run seed
   ```

5. Inicie o servidor:

   ```bash
   node server.js      # ou: npm start
   ```

   Saída esperada: `EasyFood rodando na porta 3000`.
   A página web fica disponível em http://localhost:3000.
   As imagens enviadas ficam em `uploads/` (fora do Git) e são servidas em `/uploads/...`.

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
| GET    | `/auth/me`       | **Token** | Retorna o usuário autenticado (com `imageUrl`) |
| POST   | `/auth/me/image` | **Token** | Envia a foto de perfil do usuário do token  |
| GET    | `/restaurants/:restaurantId/dishes` | Público | Cardápio do restaurante |
| POST   | `/restaurants/:restaurantId/dishes` | **Dono** | Cadastra um prato |
| GET    | `/dishes/:dishId` | Público  | Detalhes de um prato                        |
| PUT    | `/dishes/:dishId` | **Dono** | Atualiza um prato                           |
| DELETE | `/dishes/:dishId` | **Dono** | Remove um prato (e a imagem dele)           |
| POST   | `/dishes/:dishId/image` | **Dono** | Envia a foto do prato               |
| GET    | `/uploads/...`   | Público   | Imagens otimizadas (WebP)                   |

Rotas com **Token** exigem o header `Authorization: Bearer <token>`; sem ele, a resposta é `401`.
Rotas de **Dono** exigem o token de quem cadastrou o restaurante; para outros usuários, `403`
([ADR-007](docs/adr/ADR-007-dono-do-restaurante-e-autorizacao-de-pratos.md)).

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

```http
POST http://localhost:3000/restaurants/1/dishes
Content-Type: application/json
Authorization: Bearer <token do dono do restaurante>

{ "name": "Lasanha", "category": "Massas", "description": "Bolonhesa", "price": 42.5 }
```

Upload de imagem (multipart, campo `image`):

```bash
curl -H "Authorization: Bearer $TOKEN" -F "image=@foto.jpg" http://localhost:3000/auth/me/image
curl -H "Authorization: Bearer $TOKEN" -F "image=@foto.jpg" http://localhost:3000/dishes/1/image
```

### Validações

| Rota | Regras | Erro |
|------|--------|------|
| `POST /restaurants` | `name` (até 150) e `category` (até 100) obrigatórios; `rating` opcional, número de 0 a 5 | `400` |
| `POST /auth/register` | `name` (até 150), `email` válido (até 150) e `password` (6 a 72 caracteres) obrigatórios | `400`; e-mail já cadastrado: `409` |
| `POST /auth/login` | `email` e `password` obrigatórios | `400`; credenciais inválidas: `401` |
| `POST`/`PUT` de pratos | `name` (até 150) e `category` (até 100) obrigatórios; `price` número ≥ 0; `description` opcional (até 1000) | `400`; restaurante/prato inexistente: `404`; não é dono: `403` |
| Upload de imagem | Um arquivo no campo `image`, JPEG/PNG/WebP, até 5 MB | sem arquivo: `400`; grande: `413`; formato: `415`; arquivo corrompido: `422` |

## Estrutura

```
easy-food/
├── docs/                    # ADRs, C4 Model e respostas das missões
├── prisma/
│   ├── migrations/
│   ├── schema.prisma        # models Restaurant, User e Dish
│   └── seed.js
├── public/                  # página web (HTML, CSS e JS)
├── src/
│   ├── database/
│   │   └── prisma.js        # conexão com o banco
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.js        # /register, /login, /me, /me/image
│   │   │   ├── auth.controller.js    # req/res e validação
│   │   │   ├── auth.service.js       # bcrypt e geração do JWT
│   │   │   └── auth.middleware.js    # valida o Bearer token
│   │   ├── dishes/
│   │   │   ├── dish.routes.js        # cardápio e /dishes/:id/image
│   │   │   ├── dish.controller.js    # req/res e validação
│   │   │   └── dish.service.js       # regras, posse do restaurante e imagem
│   │   ├── restaurants/
│   │   │   ├── restaurant.routes.js      # caminhos
│   │   │   ├── restaurant.controller.js  # req/res e validação
│   │   │   └── restaurant.service.js     # regras e operações (grava o dono)
│   │   └── shared/                   # reutilizado pelos módulos
│   │       ├── http-error.js         # erros com status HTTP
│   │       ├── image.service.js      # Sharp: otimiza e grava imagens
│   │       └── upload.middleware.js  # Multer: recebe e valida o arquivo
│   └── app.js               # configura a aplicação
├── tests/                   # testes de integração
├── uploads/                 # imagens enviadas (gerada em execução, fora do Git)
├── docker-compose.yml       # PostgreSQL local
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
| 8 | Pratos com autorização por dono (ADR-007), PostgreSQL local em Docker (ADR-008) e upload de imagens com Multer + Sharp (ADR-009) |

## Documentação

- [Arquitetura — C4 Model](docs/arquitetura/c4-model.md)
- ADRs
  - [ADR-001 — Armazenar restaurantes em memória](docs/adr/ADR-001-armazenar-restaurantes-em-memoria.md) *(substituída)*
  - [ADR-002 — Persistência com PostgreSQL](docs/adr/ADR-002-persistencia-com-postgresql.md)
  - [ADR-003 — Monólito modular em camadas](docs/adr/ADR-003-monolito-modular-em-camadas.md)
  - [ADR-004 — Autenticação com JWT](docs/adr/ADR-004-autenticacao-com-jwt.md)
  - [ADR-005 — Não adotar eventos neste momento](docs/adr/ADR-005-nao-adotar-eventos.md)
  - [ADR-006 — PostgreSQL gerenciado no Supabase](docs/adr/ADR-006-postgresql-gerenciado-no-supabase.md) *(substituída)*
  - [ADR-007 — Dono do restaurante e autorização de pratos](docs/adr/ADR-007-dono-do-restaurante-e-autorizacao-de-pratos.md)
  - [ADR-008 — PostgreSQL local em Docker](docs/adr/ADR-008-postgresql-local-em-docker.md)
  - [ADR-009 — Upload e processamento de imagens](docs/adr/ADR-009-upload-e-processamento-de-imagens.md)
- Missões
  - [Missão 1 — Cadastro de restaurantes](docs/missoes/missao-1.md)
  - [Missão 2 — Teste da arquitetura e registro de decisões](docs/missoes/missao-2.md)
  - [Missão 3 — Persistência com PostgreSQL e Prisma](docs/missoes/missao-3.md)
  - [Missão 4 — Arquitetura em camadas](docs/missoes/missao-4.md)
  - [Atividade 5 — Autenticação com JWT](docs/missoes/missao-5.md)
  - [Atividade 8 — Correção do cadastro de pratos e upload de imagens](docs/missoes/missao-8.md)
