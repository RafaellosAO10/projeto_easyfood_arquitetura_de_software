# Módulo `auth` (planejado)

Novo domínio da EasyFood: **autenticação de usuários**. Segue a mesma organização em camadas do
módulo `restaurants`. A solução escolhida é JWT — ver
[ADR-004](../../../docs/adr/ADR-004-autenticacao-com-jwt.md).

## Estrutura prevista

```
src/modules/auth/
├── auth.service.js      -> cadastro (hash da senha com bcrypt), login e geração do JWT
├── auth.controller.js   -> recebe req/res, valida e-mail/senha e devolve os status HTTP
├── auth.middleware.js   -> valida o header "Authorization: Bearer <token>"
└── auth.routes.js       -> POST /auth/register, POST /auth/login, GET /auth/me
```

## Encaixe na arquitetura

```
app.js
├── /restaurants -> restaurant.routes -> restaurant.controller -> restaurant.service -> database
└── /auth        -> auth.routes       -> auth.controller       -> auth.service       -> database
```

- Um novo model `User` (nome, e-mail único e senha em hash) no `schema.prisma`.
- O `auth.middleware.js` poderá ser reutilizado por outros módulos para proteger rotas,
  por exemplo o `POST /restaurants`.
- A chave de assinatura do token (`JWT_SECRET`) ficará no `.env`, nunca no código.
