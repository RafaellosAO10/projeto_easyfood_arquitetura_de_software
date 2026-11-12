# Atividade 8 — Correção do cadastro de pratos e upload de imagens

A EasyFood ganha o módulo de pratos com autorização por dono do restaurante e o upload de imagens
para o perfil do usuário e para os pratos, com processamento compartilhado.

```
GET    /restaurants/:restaurantId/dishes   -> público (cardápio)
POST   /restaurants/:restaurantId/dishes   -> JWT + dono do restaurante
GET    /dishes/:dishId                     -> público
PUT    /dishes/:dishId                     -> JWT + dono
DELETE /dishes/:dishId                     -> JWT + dono
POST   /dishes/:dishId/image               -> JWT + dono      (multipart, campo "image")
POST   /auth/me/image                      -> JWT              (multipart, campo "image")
GET    /auth/me                            -> JWT (agora retorna imageUrl)
GET    /uploads/...                        -> público (imagens otimizadas)
```

Decisões registradas: [ADR-007](../adr/ADR-007-dono-do-restaurante-e-autorizacao-de-pratos.md)
(dono do restaurante), [ADR-008](../adr/ADR-008-postgresql-local-em-docker.md) (PostgreSQL local
em Docker, que substitui o Supabase) e [ADR-009](../adr/ADR-009-upload-e-processamento-de-imagens.md)
(upload e processamento de imagens).

## Parte 1 — Corrigindo o cadastro de pratos

### Como o projeto foi atualizado
O repositório do professor (`FelipeDiasR/easy-food`) foi usado como referência e **integrado** à
nossa estrutura, em vez de copiado por cima: mantivemos `src/modules/restaurants/` (plural), as
validações e os testes já existentes. Os arquivos trazidos/adaptados foram:

| Arquivo no repositório do professor | No nosso projeto |
| --- | --- |
| `prisma/schema.prisma` (`Dish`, `Restaurant.ownerId`) | `prisma/schema.prisma` + migration `20261112170000_pratos_dono_e_imagens` |
| `src/modules/dishes/dish.service.js` | `src/modules/dishes/dish.service.js` |
| `src/modules/dishes/dish.controller.js` | `src/modules/dishes/dish.controller.js` |
| `src/modules/dishes/dish.routes.js` | `src/modules/dishes/dish.routes.js` |
| `src/modules/restaurant/restaurant.service.js` | `src/modules/restaurants/restaurant.service.js` (grava `ownerId`) |
| `src/modules/restaurant/restaurant.controller.js` | `src/modules/restaurants/restaurant.controller.js` (repassa `req.user.id`) |

### Arquivos alterados pela correção (commit `70e459e`)
`prisma/schema.prisma`, a migration `add_restaurant_owner`, `dish.controller.js`, `dish.service.js`,
`restaurant.controller.js` e `restaurant.service.js`.

### O que causava o erro
Na versão anterior (`e9bc82c`) havia dois problemas:

1. **O cadastro exigia `imageUrl` no corpo.** O `createDish` recusava o prato sem `imageUrl` (400),
   mas a imagem só existe depois, quando é enviada por upload. Na prática, não dava para cadastrar
   um prato "normal" sem inventar uma URL.
2. **Não havia autorização.** As rotas de escrita só checavam se o JWT era válido. O restaurante não
   tinha dono, então **qualquer usuário autenticado** podia criar, editar ou excluir pratos de
   qualquer restaurante.

### Como a correção foi implementada
- `Restaurant` ganhou `ownerId` (relação com `User`), preenchido com o usuário do token ao cadastrar
  o restaurante.
- O controller passa `req.user.id` (vindo do `auth.middleware`) para o service.
- O service carrega o restaurante (ou o prato com o restaurante) e chama `ensureOwnership`, que
  lança **403** quando o usuário não é o dono.
- O prato passa a ser criado sem imagem (o professor grava `""`; nós usamos `null`, que deixa claro
  que ainda não há foto) e os dados passam por validação (`validateDish`).

### Diferenças na nossa adaptação
- `ownerId` é opcional: nosso banco já tinha restaurantes sem dono e uma coluna `NOT NULL` impediria
  a migration. Restaurantes sem dono não podem ser gerenciados (403) — ver ADR-007.
- Validação no controller, como no módulo de restaurantes (nome ≤ 150, categoria ≤ 100, descrição
  ≤ 1000, preço numérico ≥ 0); regras de negócio (404/403) no service, via `HttpError`
  (`src/modules/shared/http-error.js`).
- `GET /restaurants/:id/dishes` responde 404 se o restaurante não existe (antes devolvia `[]`).
- `price` volta como número no JSON (o Prisma devolve `Decimal` como texto).

### Teste do endpoint

```http
POST http://localhost:3000/restaurants/22/dishes
Authorization: Bearer <token do dono do restaurante>
Content-Type: application/json

{ "name": "Lasanha", "category": "Massas", "description": "Bolonhesa", "price": 42.5 }
```

Resposta `201 Created`:

```json
{ "id": 6, "name": "Lasanha", "category": "Massas", "description": "Bolonhesa",
  "price": 42.5, "imageUrl": null, "restaurantId": 22 }
```

O prato fica gravado na tabela `Dish` do PostgreSQL, associado ao restaurante pelo `restaurantId`.

## Partes 2, 3 e 4 — Upload de imagens com serviço compartilhado

```
src/modules/
├── auth/        auth.routes.js · auth.controller.js · auth.service.js · auth.middleware.js
├── dishes/      dish.routes.js · dish.controller.js · dish.service.js
├── restaurants/ restaurant.routes.js · restaurant.controller.js · restaurant.service.js
└── shared/
    ├── http-error.js         erros com status HTTP + parseId
    ├── image.service.js      Sharp: otimiza e grava; remove imagens antigas
    └── upload.middleware.js  Multer: recebe e valida o arquivo
```

- **Model:** `User.imageUrl` e `Dish.imageUrl` (`VARCHAR(255)`, opcionais) guardam o caminho público.
- **Multer** (`upload.middleware.js`): arquivo em memória, campo `image`, só `image/jpeg`,
  `image/png` e `image/webp`, até **5 MB**.
- **Sharp** (`image.service.js`): corrige a orientação, remove metadados (EXIF/GPS), redimensiona
  (perfil 400×400 com recorte; prato até 800×600 sem recorte) e converte para **WebP** (qualidade 80).
- **Armazenamento:** `uploads/users/` e `uploads/dishes/`, com nome aleatório
  (`<id>-<hex>.webp`), servidos em `/uploads/...`. A pasta fica fora do Git.
- **Perfil:** `POST /auth/me/image` usa o id do **token**; não existe parâmetro de usuário na rota.
- **Prato:** `POST /dishes/:dishId/image` confere se o prato existe (404) e se o usuário é o dono (403).
- **Reutilização:** `auth.service` e `dish.service` chamam o mesmo `imageService.saveImage(buffer,
  tipo, id)`; só muda o preset (`"users"` ou `"dishes"`).
- **Consulta:** `GET /auth/me` e o cardápio (`GET /restaurants/:id/dishes`, `GET /dishes/:id`)
  retornam o `imageUrl`.

Exemplo com `curl`:

```bash
curl -H "Authorization: Bearer $TOKEN" -F "image=@foto.jpg" http://localhost:3000/auth/me/image
curl -H "Authorization: Bearer $TOKEN" -F "image=@foto.jpg" http://localhost:3000/dishes/6/image
```

## Parte 5 — Testes

Automatizados em `tests/dishes.test.js` e `tests/uploads.test.js` (`npm test`: 58 testes, todos
passando) e conferidos manualmente com o servidor rodando (`node server.js` + `curl`):

| Teste | Resultado esperado | Resultado obtido |
| --- | --- | --- |
| Cadastrar um prato | `201 Created` | `201`, prato gravado com `restaurantId` |
| Enviar foto para o perfil autenticado | Imagem vinculada ao usuário | `200`, `imageUrl: /uploads/users/26-….webp` gravado no `User` |
| Enviar foto para um prato | Imagem vinculada ao prato | `200`, `imageUrl: /uploads/dishes/6-….webp` gravado no `Dish` |
| Consultar os dados atualizados | Caminho da imagem retornado | `GET /auth/me` e `GET /restaurants/:id/dishes` trazem o `imageUrl` |
| Acessar a URL da imagem | Imagem exibida | `200`, `Content-Type: image/webp` |
| Enviar imagem sem JWT | `401 Unauthorized` | `401` (perfil e prato) |
| Enviar arquivo inválido | Erro HTTP adequado | `415` (formato não permitido), `413` (> 5 MB), `422` (arquivo corrompido), `400` (sem arquivo) |
| Enviar imagem para prato inexistente | `404 Not Found` | `404` |

Testes extras: `403` para quem não é dono (cadastrar, editar, excluir e enviar imagem de prato), nova
foto substitui a anterior e apaga o arquivo antigo, excluir o prato apaga a imagem, e a imagem
gerada é WebP dentro do tamanho do preset (ex.: JPEG de 1600×1200 vira WebP de 800×600).

## Parte 6 — Pense como arquiteto

**Por que faz sentido reutilizar o mesmo serviço de imagens?**
Porque a regra é a mesma (validar, otimizar, gravar, apagar a antiga) e só muda o destino. Com um
único `image.service`, uma correção ou melhoria (ex.: trocar a qualidade do WebP ou passar a gravar
em um storage na nuvem) vale para todos os módulos de uma vez, sem cópias divergentes. Um módulo
novo, como logo do restaurante, só precisa de um preset.

**Qual é a responsabilidade do Controller e qual é a do Service?**
O controller fala HTTP: lê `req.params`, `req.body`, `req.file` e `req.user`, valida o formato da
entrada e transforma o resultado (ou o erro) em status e JSON. O service contém a regra de negócio:
o prato existe? o usuário é o dono? processa a imagem, grava o caminho no banco e cuida do que fazer
se algo falhar. O service não conhece `req`/`res`, então pode ser reutilizado e testado sem HTTP.

**Por que não devemos implementar o processamento diretamente nas rotas?**
A rota só deve dizer "qual URL chama qual sequência de middlewares e controller". Colocar Sharp e
Prisma ali misturaria transporte, regra de negócio e acesso a dados, duplicaria código entre
`/auth/me/image` e `/dishes/:id/image` e tornaria impossível trocar a forma de processar (por
exemplo, mover para uma função Serverless) sem reescrever as rotas.

**Como o middleware de autenticação protege a alteração da imagem de perfil?**
O `authenticate` roda **antes** do Multer: sem um JWT válido a requisição para com 401 e o arquivo
nem é processado. Quando o token é válido, ele coloca `req.user.id` (extraído do token assinado) na
requisição, e o service usa **só** esse id. Como a rota não recebe id de usuário, ninguém consegue
trocar a foto de outra pessoa.

**O que deve acontecer se o processamento de uma imagem falhar?**
A operação inteira falha sem deixar o sistema inconsistente: o usuário recebe um erro claro (422 se
o arquivo não é uma imagem válida, 500 se for falha interna), o banco não é alterado e a imagem
anterior continua valendo. Por isso a ordem é processar → gravar o arquivo → atualizar o banco; se o
banco falhar, o arquivo novo é apagado, e o antigo só é removido depois que tudo deu certo.

**Nossa arquitetura atual permite adicionar novas funcionalidades sem modificar toda a aplicação?**
Sim. O monólito modular ([ADR-003](../adr/ADR-003-monolito-modular-em-camadas.md)) permitiu criar o
módulo `dishes` e os serviços em `shared/` mexendo pouco no resto: no `app.js`, só o registro das
rotas e da pasta `/uploads`; no `auth`, a rota de imagem e o `/me` lendo do banco; no
`restaurants`, a gravação do dono. Os 23 testes anteriores continuaram passando sem alteração. O
limite atual é o armazenamento em disco local (ADR-009): para rodar em várias instâncias, bastaria
trocar a implementação do `image.service`, sem mudar controllers nem rotas.
