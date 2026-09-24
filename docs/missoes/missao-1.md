# Missão 1 — Cadastro de restaurantes

> **Novo requisito do Product Owner:** os restaurantes também precisam conseguir se cadastrar na EasyFood.
>
> **História de usuário:** como restaurante, quero me cadastrar na EasyFood para disponibilizar meu
> estabelecimento na plataforma.

## Estado atual

A API possui apenas uma rota:

```
Cliente ──HTTP──> Express (server.js) ──> array `restaurants` em memória
                  GET /restaurants
```

## Análise do sistema

**O que precisaria mudar na aplicação para permitir o cadastro de restaurantes?**
O `server.js` precisa receber os dados de um novo restaurante, gerar um identificador para ele e
guardá-lo junto com os demais. Também é preciso validar os dados recebidos antes de salvar.

**Precisaremos criar uma nova rota?**
Sim. Uma nova rota para o mesmo recurso (`/restaurants`), mas com outro método HTTP.

**Que tipo de requisição poderia ser utilizada para cadastrar um restaurante?**
`POST /restaurants`. O método POST é o utilizado para criar um novo recurso em uma coleção. A
resposta de sucesso deve ser `201 Created`, devolvendo o restaurante criado.

**Quais informações um restaurante precisaria enviar?**
No mínimo `name` (nome) e `category` (categoria). A `rating` (avaliação) pode ser opcional. O `id`
não deve ser enviado pelo cliente: quem gera o identificador é a API. No futuro, outras informações
como endereço, telefone e descrição podem ser adicionadas.

**Como essas informações chegariam até nossa API?**
No corpo (*body*) da requisição HTTP, em formato JSON. O middleware `express.json()`, que já está
configurado, converte esse JSON em um objeto disponível em `req.body`.

**Onde o novo restaurante seria armazenado?**
Neste momento, no mesmo array em memória, utilizando `restaurants.push(novoRestaurante)`.

**O desenho da arquitetura que criamos precisa mudar?**
Os componentes continuam os mesmos (Cliente → API → armazenamento em memória). O que muda é que o
conector entre cliente e API passa a ter duas operações: consulta (GET) e cadastro (POST).

**Algum componente novo seria necessário?**
Não para esta primeira versão. O armazenamento em memória atende ao protótipo.

**Algum conector novo seria necessário?**
Não. Continuamos utilizando HTTP/JSON entre o cliente e a API. Apenas uma nova operação (POST) passa
a trafegar por esse conector.

**Alguma nova decisão arquitetural precisa ser tomada?**
Sim: onde e como os restaurantes cadastrados serão armazenados. Com a chegada do cadastro, os dados
deixam de ser apenas "de exemplo" e passam a ser criados pelos usuários.

## Pensando como arquiteto — decisão escolhida

**Qual problema estamos tentando resolver?**
Precisamos guardar os restaurantes cadastrados para que eles apareçam no `GET /restaurants`.

**Qual decisão você tomaria?**
Manter, nesta primeira versão, o armazenamento em um array em memória.

**Por que você tomaria essa decisão?**
O produto está em fase de protótipo e validação. A prioridade é validar o fluxo de consulta e
cadastro rapidamente, sem configurar infraestrutura.

**Existe outra alternativa?**
Sim: um arquivo JSON, SQLite, PostgreSQL, MongoDB ou Firebase.

**Qual vantagem sua escolha traz?**
Desenvolvimento e testes muito rápidos, zero infraestrutura e zero custo.

**Qual desvantagem ou trade-off ela pode gerar?**
Os dados são perdidos quando o servidor reinicia, não há persistência e a solução não funciona com
várias instâncias da aplicação. Essa decisão precisará ser revista antes de ir para produção.

## Como eu faria

```js
app.post("/restaurants", (req, res) => {
  const { name, category, rating } = req.body;

  // validar name e category -> 400 Bad Request
  // gerar o próximo id
  // restaurants.push(novoRestaurante)
  // responder 201 Created com o restaurante criado
});
```
