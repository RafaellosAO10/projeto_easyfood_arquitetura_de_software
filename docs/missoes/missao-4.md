# Missão 4 — Arquitetura em camadas: Database, Service, Controller e Routes

## O que foi feito

Reorganizamos a arquitetura interna **sem alterar o comportamento externo** da API
(`GET /restaurants` e `POST /restaurants` continuam iguais). Foi uma refatoração, feita em passos
pequenos e testando a API a cada passo:

1. `src/database/prisma.js` — isola a conexão com o Prisma.
2. `restaurant.service.js` — operações de restaurantes, sem `req`/`res`.
3. `restaurant.controller.js` + `restaurant.routes.js` — HTTP e caminhos.
4. `src/app.js` — configuração da aplicação; `server.js` apenas liga o servidor.

```
easy-food/
├── prisma/
├── public/
├── src/
│   ├── database/
│   │   └── prisma.js
│   ├── modules/
│   │   ├── auth/            (planejado)
│   │   └── restaurants/
│   │       ├── restaurant.service.js
│   │       ├── restaurant.controller.js
│   │       └── restaurant.routes.js
│   └── app.js
├── tests/
├── server.js
├── package.json
└── package-lock.json
```

Fluxo de uma requisição (a resposta volta pelo caminho contrário):

```
REQUISIÇÃO HTTP -> app.js -> restaurant.routes.js -> restaurant.controller.js
                -> restaurant.service.js -> database/prisma.js -> PostgreSQL
```

### Testes da refatoração

| Teste | Resultado |
|-------|-----------|
| `GET /restaurants` | ✅ 200 |
| `POST /restaurants` com *Cantina da Nona* | ✅ 201 Created |
| Validações (sem corpo, sem categoria, rating 9, nome > 150) | ✅ 400 |
| Página em `public/` | ✅ servida pelo `app.js` |
| `npm test` (testes de integração com `node:test`) | ✅ 8 testes passando |

Com o `app.js` separado do `server.js`, passou a ser possível testar a aplicação sem ocupar a porta
3000; por isso os testes automatizados foram adicionados nesta etapa.

## Pense como arquiteto

**Por que não deixamos tudo dentro do `server.js`?**
Porque ele acumulava responsabilidades demais. Cada requisito novo aumentaria o arquivo, misturando
HTTP, regras e banco, o que dificulta manutenção, testes e trabalho em equipe.

**Qual é a responsabilidade do `server.js`?** Ligar o servidor (`app.listen`).

**Qual é a responsabilidade do `app.js`?** Configurar a aplicação: middlewares (CORS, JSON),
arquivos estáticos e registro das rotas de cada módulo.

**Qual é a responsabilidade das Routes?** Definir os caminhos e métodos e apontar cada requisição
para a função correta do Controller.

**Qual é a responsabilidade do Controller?** Receber a requisição HTTP, validar a entrada, chamar o
Service e devolver a resposta com o status correto (200, 201, 400, 500).

**Qual é a responsabilidade do Service?** Concentrar as operações e regras de restaurantes (ex.:
avaliação padrão 0, formato numérico do `rating`), usando a camada de dados.

**Qual é a responsabilidade da camada Database?** Disponibilizar uma única conexão (`PrismaClient`)
com o banco para o restante da aplicação.

**Por que o Service não deveria depender de `req` e `res`?**
Para não ficar preso ao HTTP. O mesmo service pode ser usado por outra rota, por um script (como o
seed), por uma fila ou por testes, e fica mais simples de testar.

**Por que as Routes não acessam diretamente o Prisma?**
Porque isso misturaria camadas: a rota passaria a conhecer detalhes de persistência. Se o banco ou
o ORM mudarem, só a camada de service/database deve ser alterada.

**O comportamento externo da API mudou?** Não. Mesmas rotas, mesmos formatos e mesmos status HTTP —
confirmado pelos testes.

**Que vantagem essa organização traz quando o sistema crescer?**
Novos domínios entram como novos módulos (`auth`, `orders`, `payments`) sem inchar os existentes;
cada parte tem um lugar óbvio; é possível testar camadas isoladamente; e as fronteiras entre
domínios ficam claras caso um dia algum módulo precise virar um serviço separado.

**Que nova complexidade essa organização adiciona?**
Mais arquivos, mais indireção (seguir uma requisição passa por 5 arquivos) e a necessidade de a
equipe respeitar as fronteiras entre camadas.

Decisão registrada em [ADR-003 — Monólito modular em camadas](../adr/ADR-003-monolito-modular-em-camadas.md).

## Missão: evolua a EasyFood

### 1. Organize

O módulo `src/modules/auth/` foi **planejado** seguindo a mesma estrutura de `restaurants/`:
[src/modules/auth/README.md](../../src/modules/auth/README.md).

### 2. Pesquise

| Critério | JWT próprio | AWS Cognito | Login com Google | Sessão + cookie |
|----------|-------------|-------------|------------------|-----------------|
| Como funciona | API guarda usuários (senha em hash) e emite token assinado | Serviço gerenciado da AWS cuida de cadastro/login e emite tokens | Usuário autentica no Google (OAuth 2.0/OIDC) e a API recebe a identidade | Servidor guarda a sessão e envia um cookie |
| Infraestrutura | Nenhuma extra | Conta e configuração AWS | Projeto no Google Cloud (client ID/secret) | Armazenamento de sessão compartilhado |
| Custo | Zero | Gratuito até um limite, depois pago | Zero | Zero (+ Redis se houver várias instâncias) |
| Estado no servidor | Stateless | Stateless (tokens JWT) | Depende da implementação | Stateful |
| Recursos prontos (MFA, recuperar senha) | Não | Sim | Sim (do Google) | Não |
| Dependência externa | Não | Sim (AWS) | Sim (Google) | Não |
| Complexidade para o nosso contexto | Baixa | Média/alta | Média | Baixa/média |

### 3. Justifique

**Escolha: JWT próprio** (`jsonwebtoken` + `bcryptjs`), registrado em
[ADR-004](../adr/ADR-004-autenticacao-com-jwt.md) com status *Proposta*.

A EasyFood é hoje um monólito modular com um único produto, equipe pequena e usuários que podem ficar
no próprio PostgreSQL. JWT é simples, sem custo e *stateless* (qualquer instância valida o token só
com a chave secreta), e se encaixa como um novo módulo na organização em camadas. Cognito e Login
com Google trazem recursos prontos, mas também dependência de fornecedor e configuração que não se
pagam agora; o Login com Google pode ser acrescentado no futuro como opção complementar.

## Checklist

- [x] Estrutura em camadas criada
- [x] database/prisma.js criado
- [x] restaurant.service.js criado
- [x] restaurant.controller.js criado
- [x] restaurant.routes.js criado
- [x] app.js criado
- [x] server.js simplificado
- [x] GET /restaurants funcionando
- [x] POST /restaurants funcionando
- [x] Módulo auth/ criado ou planejado — planejado
- [x] Pesquisa sobre autenticação realizada
- [x] Solução escolhida e justificada
- [ ] Opcional: login implementado — será implementado na Atividade 5
