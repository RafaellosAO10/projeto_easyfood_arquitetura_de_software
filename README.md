# projeto_easyfood_arquitetura_de_software

API da **EasyFood**, projeto desenvolvido ao longo da disciplina *Software Architecture & Design Patterns*.

Monólito modular organizado em camadas:

```
Cliente -> Routes -> Controller -> Service -> Database (Prisma) -> PostgreSQL
```

## Tecnologias

- Node.js (LTS) e Express
- PostgreSQL
- Prisma ORM

## Como executar

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o banco no PostgreSQL:

   ```sql
   CREATE DATABASE easyfood;
   ```

3. Copie o `.env.example` para `.env` e ajuste a senha do usuário `postgres`:

   ```env
   DATABASE_URL="postgresql://postgres:SUA_SENHA_AQUI@localhost:5432/easyfood"
   ```

4. Crie as tabelas e insira os dados iniciais:

   ```bash
   npx prisma migrate dev
   npm run seed
   ```

5. Inicie o servidor:

   ```bash
   node server.js
   ```

   Saída esperada: `EasyFood rodando na porta 3000`.
   A página web fica disponível em http://localhost:3000.

Para visualizar os dados: `npx prisma studio` (http://localhost:5555).

## Testes

Testes de integração com o runner nativo do Node (`node:test`). Precisam do banco configurado no `.env`:

```bash
npm test
```

## Estrutura

```
easy-food/
├── docs/                    # ADRs, C4 Model e respostas das missões
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.js
├── public/                  # página web (HTML, CSS e JS)
├── src/
│   ├── database/
│   │   └── prisma.js        # conexão com o banco
│   ├── modules/
│   │   ├── auth/            # planejado (ver README do módulo)
│   │   └── restaurants/
│   │       ├── restaurant.routes.js      # caminhos
│   │       ├── restaurant.controller.js  # req/res e validação
│   │       └── restaurant.service.js     # regras e operações
│   └── app.js               # configura a aplicação
├── tests/
└── server.js                # liga o servidor
```

## Rotas

| Método | Rota           | Descrição                  |
|--------|----------------|----------------------------|
| GET    | `/restaurants` | Lista os restaurantes      |
| POST   | `/restaurants` | Cadastra um restaurante    |

Exemplo de cadastro:

```http
POST http://localhost:3000/restaurants
Content-Type: application/json

{ "name": "Taco Loco", "category": "Mexicana", "rating": 4.3 }
```

`name` (até 150 caracteres) e `category` (até 100) são obrigatórios; `rating` é opcional
(número entre 0 e 5). Resposta: `201 Created`.

## Documentação

- [Arquitetura — C4 Model](docs/arquitetura/c4-model.md)
- ADRs
  - [ADR-001 — Armazenar restaurantes em memória](docs/adr/ADR-001-armazenar-restaurantes-em-memoria.md) *(substituída)*
  - [ADR-002 — Persistência com PostgreSQL](docs/adr/ADR-002-persistencia-com-postgresql.md)
  - [ADR-003 — Monólito modular em camadas](docs/adr/ADR-003-monolito-modular-em-camadas.md)
  - [ADR-004 — Autenticação com JWT](docs/adr/ADR-004-autenticacao-com-jwt.md) *(proposta)*
- Missões
  - [Missão 1 — Cadastro de restaurantes](docs/missoes/missao-1.md)
  - [Missão 2 — Teste da arquitetura e registro de decisões](docs/missoes/missao-2.md)
  - [Missão 3 — Persistência com PostgreSQL e Prisma](docs/missoes/missao-3.md)
  - [Missão 4 — Arquitetura em camadas](docs/missoes/missao-4.md)
