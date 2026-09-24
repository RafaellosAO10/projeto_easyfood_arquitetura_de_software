# ADR-002 - Persistência com PostgreSQL

## Status
Aceita

## Data
27/08/2026

## Responsável
Equipe EasyFood

## Contexto
A [ADR-001](ADR-001-armazenar-restaurantes-em-memoria.md) definiu o armazenamento dos restaurantes em
um array em memória, como decisão temporária para a fase de protótipo.

O teste de reinicialização mostrou a consequência dessa decisão: todo restaurante cadastrado
desaparece quando o servidor é reiniciado. Um dos critérios de revisão da ADR-001 aconteceu —
**precisamos manter os dados entre reinicializações e deploys**.

Além disso, o domínio da EasyFood tende a crescer com entidades relacionadas entre si (usuários,
pedidos, pagamentos, avaliações), e o produto caminha para produção, onde integridade dos dados e
possibilidade de executar mais de uma instância da API passam a importar.

## Alternativas consideradas
1. **PostgreSQL** — banco relacional open source, ACID, SQL padrão e extensível.
2. **MySQL** — banco relacional popular, com boa performance em leituras simples.
3. **MongoDB** — banco orientado a documentos, com schema flexível.
4. **SQLite** — banco relacional embarcado em arquivo, sem servidor.
5. **Firebase** — banco gerenciado em nuvem (Firestore), orientado a documentos.
6. **Arquivo JSON** — salvar o array em um arquivo local.

## Decisão
Adotar o **PostgreSQL** como banco de dados da EasyFood, acessado pela API por meio do ORM **Prisma**,
com o schema versionado por *migrations* (`prisma migrate`).

## Justificativa
- **Persistência real:** os dados sobrevivem a reinicializações e deploys.
- **Modelo relacional:** restaurantes, usuários e pedidos se relacionam naturalmente; chaves
  estrangeiras e JOINs resolvem isso sem duplicar dados.
- **Integridade:** transações ACID, tipos (`VARCHAR(150)`, `DECIMAL(2,1)`), `NOT NULL` e chaves
  primárias garantidos pelo próprio banco.
- **Várias instâncias:** diferentes processos da API podem compartilhar o mesmo banco.
- **Custo:** open source, sem licença.
- **Mercado e ecossistema:** amplamente adotado e com ótimo suporte em Node.js.
- **Por que não as outras:** arquivo JSON e SQLite não atendem bem a múltiplas instâncias e
  concorrência; MongoDB e Firebase oferecem flexibilidade de schema que não precisamos e
  enfraquecem os relacionamentos; MySQL seria viável, mas o PostgreSQL oferece mais recursos
  (JSON, full-text, PostGIS para busca por localização no futuro).
- **Por que Prisma:** o schema declarativo documenta o modelo, as *migrations* versionam a evolução
  do banco junto com o código e o client tipado reduz SQL manual e erros de digitação.

## Consequências

### Positivas
- Dados persistidos entre reinicializações e deploys (teste de reinicialização aprovado).
- Suporte a múltiplas instâncias da API acessando o mesmo banco.
- Consultas mais ricas (filtros, ordenação, JOINs, agregações).
- Integridade garantida pelo banco.
- Histórico de alterações do schema em `prisma/migrations`.
- Prisma Studio para inspecionar os dados durante o desenvolvimento.

### Negativas / trade-offs
- A API passa a depender de infraestrutura externa: se o banco ficar indisponível, as rotas
  respondem `500 Erro interno do servidor`.
- Configuração extra no ambiente de desenvolvimento (instalar o PostgreSQL, criar o banco, `.env`).
- Credenciais de acesso precisam ser protegidas (`.env` fora do versionamento).
- É preciso gerenciar *migrations* a cada mudança de modelo.
- Nova dependência (Prisma) e mais conceitos para quem entra no projeto.
- Tipos como `DECIMAL` exigem conversão na resposta (o Prisma devolve `Decimal`, serializado como
  string no JSON).

## Critérios de revisão
Esta decisão deverá ser reavaliada quando:
1. O volume de dados ou de acessos exigir réplicas de leitura, particionamento ou *sharding*.
2. Surgir necessidade de modelagem predominantemente não relacional.
3. Requisitos de latência exigirem uma camada de cache dedicada (ex.: Redis).
4. O Prisma se tornar uma limitação para consultas específicas ou para a performance.

## Notas
- Esta decisão substitui a [ADR-001](ADR-001-armazenar-restaurantes-em-memoria.md).
- O material da Missão 2 sugeria o nome `ADR-002-escolha-do-banco-de-dados.md`, enquanto a Missão 3
  indica `ADR-002-persistencia-com-postgresql.md`. Foi adotado o nome da Missão 3, que é a etapa em
  que a persistência foi de fato implementada.
- A API continua oferecendo `GET /restaurants` e `POST /restaurants`; mudou apenas a implementação
  interna: `API -> PRISMA -> POSTGRESQL`.
