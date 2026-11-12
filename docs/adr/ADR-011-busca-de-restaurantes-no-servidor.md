# ADR-011 - Busca de restaurantes no servidor, sem diferenciar acentos

## Status
Aceita

## Data
12/11/2026

## Responsável
Equipe EasyFood

## Contexto
A tela Buscar do front (ADR-010) baixava todos os restaurantes e filtrava no navegador. Isso
não escala: com muitos restaurantes, cada busca transferiria a tabela inteira, e a regra de
busca ficaria só no front (outro cliente da API teria de reimplementá-la). A busca precisa
ser uma funcionalidade da API.

Requisito de usabilidade: em português, o usuário costuma digitar sem acento ("acai",
"japonesa") e às vezes com acento onde não há. Um filtro só sem maiúsculas (`ILIKE`, ou o
`mode: "insensitive"` do Prisma) não encontraria "Açaí" a partir de "acai". Esse
comportamento já existia no filtro local e não deveria se perder.

## Alternativas consideradas
1. `contains` com `mode: "insensitive"` do Prisma: simples, mas diferencia acentos.
2. **Extensão `unaccent` do PostgreSQL** + `ILIKE`, em uma consulta SQL parametrizada.
3. Busca textual completa (`tsvector`, Elasticsearch): poderosa demais para nome e categoria.
4. Coluna extra com o texto normalizado, mantida pela aplicação: duplica dado e exige migração
   dos registros existentes.

## Decisão
Opção 2. `GET /restaurants?search=termo`:

- procura o termo como trecho do **nome ou da categoria**, sem diferenciar maiúsculas nem
  acentos, e devolve os resultados em ordem alfabética, no mesmo formato da listagem;
- sem `search`, ou com ele vazio/só espaços, devolve a lista completa (comportamento antigo);
- `search` repetido (`?search=a&search=b`) ou com mais de 150 caracteres: `400`;
- `%` e `_` digitados são escapados (procurados literalmente, não como curingas do `LIKE`);
- a consulta usa `prisma.$queryRaw` com template, que envia o termo como parâmetro (`$1`):
  não há concatenação de SQL nem risco de SQL injection.

A extensão é criada pela migration `20261112180000_busca_sem_acentos`
(`CREATE EXTENSION IF NOT EXISTS unaccent`); ela faz parte do contrib do PostgreSQL e já vem
na imagem oficial `postgres:17` do Docker Compose (ADR-008).

No front, `views/buscar.js` chama a API 300 ms depois que o usuário para de digitar (ou na hora,
com Enter), descarta respostas de buscas antigas que cheguem fora de ordem e guarda o termo na
URL (`#/buscar?q=...`), para que voltar e recarregar mantenham a busca.

## Consequências
- Positivas: a regra de busca fica em um só lugar (a API), testada automaticamente; o front
  transfere só os resultados; "acai" encontra "Açaí".
- Negativas: a consulta é SQL escrito à mão (o Prisma não tem filtro sem acento), então mudanças
  no nome das colunas exigem ajustar `restaurant.service.js`; o banco precisa da extensão
  `unaccent` (qualquer PostgreSQL com contrib); `ILIKE '%termo%'` não usa índice, o que é
  aceitável no volume do projeto e pode ser revisto com um índice trigram (`pg_trgm`) se crescer.
