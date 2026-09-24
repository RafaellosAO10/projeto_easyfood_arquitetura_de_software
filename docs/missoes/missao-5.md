# Atividade 5 — Implementando autenticação com JWT

A EasyFood passa a permitir cadastro, login, identificação do usuário autenticado e proteção do
cadastro de restaurantes, conforme a decisão da [ADR-004](../adr/ADR-004-autenticacao-com-jwt.md).

```
POST /auth/register
POST /auth/login
GET  /auth/me          -> protegido
POST /restaurants      -> protegido
GET  /restaurants      -> público
```

## Passo a passo executado

1. Dependências: `npm install jsonwebtoken bcryptjs dotenv`.
2. `.env` com `JWT_SECRET` (a chave não fica no código) e `require("dotenv").config()` na primeira
   linha do `server.js`. O servidor não inicia se o `JWT_SECRET` não estiver definido.
3. Model `User` no `schema.prisma` e `npx prisma migrate dev --name criar-tabela-users`.
4. Módulo `src/modules/auth/` com `auth.service.js`, `auth.controller.js`, `auth.middleware.js` e
   `auth.routes.js`, registrado no `app.js` em `/auth`.
5. `POST /restaurants` protegido com o middleware `authenticate` em `restaurant.routes.js`.
6. A página em `public/` ganhou login/cadastro de usuário e envia o token no cadastro de restaurantes.

Pontos além do material, mantendo o mesmo comportamento esperado:

- Validação no cadastro: e-mail em formato válido, nome/e-mail até 150 caracteres (colunas do
  banco) e senha entre 6 e 72 caracteres (72 bytes é o limite do bcrypt).
- O e-mail é normalizado (minúsculas, sem espaços) para que `Aluno@EasyFood.com` e
  `aluno@easyfood.com` não virem duas contas.
- Requisições sem corpo JSON retornam 400 (no Express 5 o `req.body` fica `undefined`).
- Com a versão atual do dotenv, `config({ quiet: true })` evita uma mensagem extra no terminal e
  mantém a saída `EasyFood rodando na porta 3000`.

## Testes

### Parte 11 — Cadastro

```http
POST http://localhost:3000/auth/register
{ "name": "Aluno", "email": "aluno@easyfood.com", "password": "123456" }
```

✅ `201 Created` — `{"id":1,"name":"Aluno","email":"aluno@easyfood.com"}` (a senha não aparece).
No banco a senha está salva como hash bcrypt (`$2b$10$...`). Repetir o cadastro retorna `409 E-mail já cadastrado`.

### Parte 12 — Login

```http
POST http://localhost:3000/auth/login
{ "email": "aluno@easyfood.com", "password": "123456" }
```

✅ `200 OK` — `{ "token": "eyJhbGciOiJIUzI1NiIs...", "user": { "id": 1, "name": "Aluno", "email": "aluno@easyfood.com" } }`.
Senha errada ou usuário inexistente: `401 Credenciais inválidas`.

### Parte 13 — `/auth/me`

| Requisição | Resultado |
|------------|-----------|
| Sem token | ✅ `401 Token não fornecido` |
| `Authorization: Bearer <token>` | ✅ `200` — `{"message":"Você está autenticado!","user":{"id":1,"email":"aluno@easyfood.com"}}` |
| Token adulterado ou expirado | ✅ `401 Token inválido ou expirado` |

### Parte 15 — Teste final

| Requisição | Resultado |
|------------|-----------|
| `GET /restaurants` sem token | ✅ `200` — continua público |
| `POST /restaurants` sem token | ✅ `401 Unauthorized` |
| `POST /restaurants` com `Authorization: Bearer <token>` | ✅ `201 Created` |

### Testes automatizados

`npm test` executa 23 testes de integração (`node:test`) cobrindo cadastro, login, hash da senha,
`/auth/me`, rotas públicas e protegidas e as validações — todos passando.

A página web também foi testada no navegador: criar conta → login automático → cadastrar
restaurante → recarregar a página (sessão mantida) → sair → erro de credenciais.

## Fluxo final

```
CADASTRO
   ↓
senha -> bcrypt -> hash -> PostgreSQL
   ↓
LOGIN
   ↓
bcrypt.compare()
   ↓
JWT
   ↓
Authorization: Bearer <token>
   ↓
MIDDLEWARE
   ↓
ROTA PROTEGIDA
```

## Estrutura final

```
easy-food/
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.js
├── public/
├── src/
│   ├── database/
│   │   └── prisma.js
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.service.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.middleware.js
│   │   │   └── auth.routes.js
│   │   └── restaurants/
│   │       ├── restaurant.service.js
│   │       ├── restaurant.controller.js
│   │       └── restaurant.routes.js
│   └── app.js
├── tests/
├── .env
├── server.js
└── package.json
```

## Atividade concluída quando

- [x] O usuário consegue se cadastrar.
- [x] A senha é armazenada como hash.
- [x] O usuário consegue fazer login.
- [x] O login devolve um JWT.
- [x] /auth/me funciona apenas com token.
- [x] GET /restaurants continua público.
- [x] POST /restaurants retorna 401 sem token.
- [x] POST /restaurants funciona com token válido.
