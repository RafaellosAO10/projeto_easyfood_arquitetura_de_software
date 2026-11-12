# ADR-008 - PostgreSQL local em Docker

## Status
Aceita — substitui a [ADR-006](ADR-006-postgresql-gerenciado-no-supabase.md)

## Data
12/11/2026

## Responsável
Equipe EasyFood

## Contexto
O projeto do Supabase usado pela EasyFood ([ADR-006](ADR-006-postgresql-gerenciado-no-supabase.md))
foi excluído para liberar espaço no plano gratuito. A disciplina continua exigindo PostgreSQL com
Prisma ([ADR-002](ADR-002-persistencia-com-postgresql.md)), e o banco precisa subir de forma
igual em qualquer máquina, sem passos manuais de instalação.

## Alternativas consideradas
1. Criar um novo projeto no Supabase (mesmo limite do plano gratuito; dependência de internet).
2. PostgreSQL instalado no Windows de cada pessoa (exige administrador, versões diferentes em cada
   máquina, serviço rodando o tempo todo).
3. **PostgreSQL em container Docker, descrito em `docker-compose.yml`.**

## Decisão
Rodar o PostgreSQL 17 com Docker Compose (`docker compose up -d` na pasta `easy-food`):

- Container `easyfood-db`, usuário e banco `easyfood`, dados em volume (`easyfood-pgdata`).
- Porta publicada só em `127.0.0.1:5432`: o banco não fica acessível pela rede.
- A senha vem de `POSTGRES_PASSWORD` no `.env` (fora do Git), a mesma usada em `DATABASE_URL` e
  `DIRECT_URL`. O Compose lê o `.env` automaticamente.
- O schema continua versionado só pelas migrations do Prisma (`npx prisma migrate deploy`).

## Justificativa
- Um único comando sobe o mesmo banco, na mesma versão, para toda a equipe e para o professor.
- Sem depender de internet nem de limites de um provedor externo.
- Continua sendo PostgreSQL: nenhuma mudança no código da API, só na configuração.

## Consequências

### Positivas
- Ambiente reproduzível e descartável (`docker compose down -v` apaga tudo).
- Testes mais rápidos que com o banco remoto.

### Negativas / trade-offs
- Exige Docker instalado e em execução.
- Cada máquina tem os próprios dados (não há mais um banco compartilhado).
- A migration `habilitar_rls` (feita para a Data API do Supabase) continua no histórico. É inofensiva
  no PostgreSQL local, mas impede o banco "sombra" do `prisma migrate dev`; por isso as novas
  migrations são geradas com `prisma migrate diff` e aplicadas com `prisma migrate deploy`.

## Critérios de revisão
1. A aplicação for publicada em um servidor: será preciso um PostgreSQL gerenciado (nova ADR).
2. A equipe precisar compartilhar os mesmos dados de desenvolvimento.
