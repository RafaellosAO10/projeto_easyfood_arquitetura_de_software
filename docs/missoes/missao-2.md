# Missão 2 — Persistência, teste da arquitetura e registro de decisões

## Parte 1 — Prepare

| Teste | Resultado |
|-------|-----------|
| `GET /restaurants` | ✅ 200 OK — lista os 3 restaurantes iniciais |
| `POST /restaurants` com *Taco Loco* | ✅ 201 Created — `{"id":4,"name":"Taco Loco","category":"Mexicana","rating":4.3}` |
| `GET /restaurants` após o cadastro | ✅ *Taco Loco* aparece na lista |

Durante os testes também verifiquei os casos de erro:

| Requisição | Resultado |
|------------|-----------|
| POST sem `category` | 400 — `Nome e categoria são obrigatórios` |
| POST sem corpo JSON | 400 (antes da correção retornava **500**, pois no Express 5 `req.body` fica `undefined`) |
| POST com `rating: "abc"` ou `rating: 7` | 400 — `A avaliação deve ser um número entre 0 e 5` |

## Parte 2 — Teste de reinicialização

1. Cadastrei a *Cantina Roma* (`POST /restaurants`) e confirmei no `GET /restaurants`.
2. Parei o servidor (`Ctrl + C`) e iniciei novamente com `node server.js`.
3. Fiz outra vez o `GET /restaurants`.

**O que aconteceu?** A *Cantina Roma* desapareceu. Só os 3 restaurantes definidos no código voltaram.

Os restaurantes ficam em um array na memória do processo Node.js. Quando o processo é encerrado, a
memória é liberada e os dados cadastrados se perdem:

```
Servidor encerra -> Memória é perdida -> Dados cadastrados desaparecem
```

Isso não é um bug: é a consequência de uma decisão arquitetural, agora registrada em
[ADR-001](../adr/ADR-001-armazenar-restaurantes-em-memoria.md).

## Parte 4 — Evolua: hipótese de banco de dados

**Qual banco de dados você escolheria para a EasyFood?**
PostgreSQL.

**Por que escolheria essa tecnologia?**
- É relacional e o domínio da EasyFood é naturalmente relacional (restaurantes, usuários, pedidos,
  pagamentos, avaliações).
- Garante transações ACID e integridade (chaves primárias, estrangeiras, `NOT NULL`, tipos).
- É open source, gratuito, maduro e muito utilizado no mercado.
- Possui ótimo suporte no ecossistema Node.js (`pg`, Knex, Prisma).

**O que precisaria mudar no `server.js`?**
O array seria substituído por um cliente de banco de dados. As rotas passariam a ser assíncronas
(`async/await`), porque cada consulta ao banco é uma operação de I/O, e precisariam tratar erros de
conexão (`try/catch` retornando 500).

**Onde o restaurante seria salvo?**
Em uma tabela `Restaurant` no PostgreSQL, com `id` gerado automaticamente pelo banco.

**Como o `GET /restaurants` buscaria esses dados?**
Com um `SELECT` na tabela — usando um ORM, algo como `prisma.restaurant.findMany()`.

**Como o `POST /restaurants` salvaria esses dados?**
Com um `INSERT` — usando um ORM, algo como `prisma.restaurant.create({ data })`, devolvendo o
registro criado.

**Precisaríamos instalar alguma nova dependência?**
Sim: o PostgreSQL (servidor de banco) e uma biblioteca de acesso ao banco. Minha escolha seria o
Prisma (`prisma` como dependência de desenvolvimento e `@prisma/client`), que também cuida das
*migrations*.

**Nossa arquitetura precisaria mudar?** / **O desenho arquitetural precisaria mudar?**
Sim. No C4 de Container, o "array em memória" dá lugar a um novo container: o banco PostgreSQL,
conectado à API via TCP/SQL. O fluxo passa de `API -> MEMÓRIA` para `API -> BANCO DE DADOS`.

**Quais vantagens essa decisão traria?**
Dados persistentes entre reinicializações e deploys, possibilidade de várias instâncias da API
compartilharem os mesmos dados, consultas mais ricas e integridade garantida pelo banco.

**Quais novos problemas ou trade-offs ela poderia criar?**
Dependência de infraestrutura externa (se o banco cair, a API não responde os dados), configuração
extra no ambiente de desenvolvimento, gerenciamento de *migrations* e credenciais, e um pouco mais de
complexidade para novos desenvolvedores.

## Checklist

- [x] GET /restaurants funcionando
- [x] POST /restaurants funcionando
- [x] ADR-001-armazenar-restaurantes-em-memoria.md criado
- [x] Teste de reinicialização realizado
- [x] Uma hipótese de banco de dados para a EasyFood
- [x] Uma justificativa para sua escolha
- [ ] Opcional: banco conectado e funcionando — será feito na Missão 3
