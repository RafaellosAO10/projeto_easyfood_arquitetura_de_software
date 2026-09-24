# projeto_easyfood_arquitetura_de_software

API da **EasyFood**, projeto desenvolvido ao longo da disciplina *Software Architecture & Design Patterns*.

## Tecnologias

- Node.js (LTS)
- Express

## Como executar

```bash
npm install
node server.js
```

Saída esperada:

```
EasyFood rodando na porta 3000
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

`name` e `category` são obrigatórios; `rating` é opcional (número entre 0 e 5). Resposta: `201 Created`.

> Os restaurantes ficam em memória: os cadastros são perdidos ao reiniciar o servidor
> (ver [ADR-001](docs/adr/ADR-001-armazenar-restaurantes-em-memoria.md)).

## Documentação

- [Arquitetura — C4 Model](docs/arquitetura/c4-model.md)
- ADRs: [ADR-001 — Armazenar restaurantes em memória](docs/adr/ADR-001-armazenar-restaurantes-em-memoria.md)
- [Missão 1 — Cadastro de restaurantes](docs/missoes/missao-1.md)
- [Missão 2 — Teste da arquitetura e registro de decisões](docs/missoes/missao-2.md)
