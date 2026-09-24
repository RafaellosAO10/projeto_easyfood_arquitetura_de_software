# ADR-006 - PostgreSQL gerenciado no Supabase

## Status
Aceita

## Data
24/09/2026

## Responsável
Equipe EasyFood

## Contexto
A [ADR-002](ADR-002-persistencia-com-postgresql.md) definiu o PostgreSQL como banco da EasyFood, até
então executado localmente em cada máquina de desenvolvimento. Precisamos de um banco acessível de
qualquer ambiente, sem que cada pessoa instale e mantenha um servidor PostgreSQL.

## Alternativas consideradas
1. PostgreSQL instalado localmente em cada máquina.
2. **Supabase** (PostgreSQL gerenciado, com plano gratuito e CLI).
3. Outros PostgreSQL gerenciados (Neon, AWS RDS, Render).

## Decisão
Hospedar o PostgreSQL da EasyFood no **Supabase**, mantendo o Prisma como camada de acesso:

- `DATABASE_URL`: pooler em modo transação (porta 6543, `pgbouncer=true`), usado pela API.
- `DIRECT_URL`: pooler em modo sessão (porta 5432), usado pelo Prisma nas *migrations*.
- Projeto vinculado com o Supabase CLI (`supabase link`); o schema continua versionado apenas
  pelas *migrations* do Prisma.

Usamos somente o banco do Supabase. A autenticação continua sendo a da própria API (JWT —
[ADR-004](ADR-004-autenticacao-com-jwt.md)); o Supabase Auth e a Data API não são utilizados.

## Justificativa
- Continua sendo PostgreSQL: nenhuma mudança no código da API, apenas na configuração.
- Banco disponível sem instalação local, com backups e painel de administração.
- Plano gratuito suficiente para a fase atual.
- O pooler evita esgotar conexões e funciona em redes IPv4 (a conexão direta do Supabase é IPv6).

## Consequências

### Positivas
- Mesmo banco para toda a equipe e ambientes; menos configuração para quem entra no projeto.
- Infraestrutura de banco mantida pelo provedor.

### Negativas / trade-offs
- Dependência de um fornecedor externo e de conexão com a internet para desenvolver.
- Latência maior que a de um banco local (os testes ficam mais lentos).
- **O Supabase expõe o schema `public` pela Data API (REST)** com a chave pública `anon`. Sem
  proteção, a tabela `User` (com os hashes de senha) poderia ser lida e restaurantes gravados sem
  passar pelo JWT. Mitigação: a migration `habilitar_rls` ativa o Row Level Security, sem policies,
  em todas as tabelas — a Data API fica sem acesso e o Prisma, dono das tabelas, não é afetado.
  Toda tabela nova precisa ter o RLS habilitado na sua migration.

## Critérios de revisão
1. Limites do plano gratuito (armazenamento, conexões, projeto pausado por inatividade) forem atingidos.
2. Houver necessidade de usar outros recursos do Supabase (Auth, Storage, Realtime) — exigiria novas decisões.
3. Requisitos de latência ou de região exigirem outro provedor.
