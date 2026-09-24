# Missão 3 — Persistência com PostgreSQL e Prisma

## Passo a passo executado

```bash
# 1. Banco
psql -U postgres
CREATE DATABASE easyfood;

# 2. Prisma
npm install prisma --save-dev
npm install @prisma/client
npx prisma init

# 3. Conexão (.env)
DATABASE_URL="postgresql://postgres:SUA_SENHA_AQUI@localhost:5432/easyfood"

# 4. Tabela
npx prisma migrate dev --name criar-tabela-restaurants

# 5. Dados iniciais
node prisma/seed.js        # ou: npm run seed
```

Observações:

- Utilizamos o Prisma 6 com o gerador `prisma-client-js` e `url = env("DATABASE_URL")` no
  `schema.prisma`, exatamente como no material. As versões mais novas do `prisma init` geram um
  `prisma.config.ts` e outro gerador; esse arquivo foi removido para manter o padrão da aula.
- O `.env` contém a senha do banco e **não é versionado**; o `.env.example` serve de modelo.
- O `seed.js` segue os dados do material, mas só insere quando a tabela está vazia, evitando
  duplicar os restaurantes ao ser executado mais de uma vez.

## Testes

| Teste | Resultado |
|-------|-----------|
| `GET /restaurants` | ✅ 200 — restaurantes do seed vindos do PostgreSQL |
| `POST /restaurants` com *Taco Loco* | ✅ 201 Created |
| Reiniciar o servidor e fazer `GET /restaurants` | ✅ *Taco Loco* continua na lista — **a EasyFood agora tem persistência** |
| `npx prisma studio` | ✅ disponível em `http://localhost:5555`, model `Restaurant` com os registros |
| Banco indisponível | `GET` e `POST` respondem `500 Erro interno do servidor`; o servidor continua no ar |

Problemas encontrados e corrigidos durante os testes:

1. **`rating` passou a ser string** (`"rating": "4.5"`): o Prisma devolve colunas `DECIMAL` como
   objetos `Decimal`, que são serializados como texto no JSON. Isso mudaria o contrato da API em
   relação à versão em memória, então a resposta converte `rating` para número.
2. **Nome com mais de 150 caracteres retornava 500**: o banco rejeitava o valor
   (`VARCHAR(150)`). Agora a API valida os limites antes e responde 400.

## Pense como arquiteto

**Qual problema arquitetural resolvemos ao adicionar persistência?**
A perda de dados a cada reinicialização. Os restaurantes deixaram de depender da memória do
processo Node.js e passaram a viver em um armazenamento durável, compartilhável entre instâncias.

**Por que PostgreSQL faz sentido para a EasyFood neste momento?**
O domínio é relacional (restaurantes, usuários, pedidos, pagamentos), precisamos de integridade e
transações, e o PostgreSQL é gratuito, maduro e muito utilizado. Detalhes na
[ADR-002](../adr/ADR-002-persistencia-com-postgresql.md).

**Qual é a responsabilidade do Prisma?**
É a camada de acesso a dados (ORM): traduz chamadas JavaScript (`findMany`, `create`) em SQL,
gerencia a conexão com o banco, descreve o modelo no `schema.prisma` e versiona a estrutura do
banco com *migrations*.

**O que acontece com a API se o banco ficar indisponível?**
Testamos: o servidor continua no ar e a página estática é servida, mas `GET` e `POST /restaurants`
respondem `500 Erro interno do servidor` (o erro detalhado fica apenas no log). O banco passou a ser
um ponto único de falha para os dados.

**Que vantagens ganhamos em relação ao array em memória?**
Persistência, integridade (tipos, `NOT NULL`, chave primária gerada pelo banco), suporte a várias
instâncias, consultas mais ricas e uma ferramenta visual (Prisma Studio).

**Que nova complexidade foi adicionada?**
Instalar e manter um servidor de banco, configurar `DATABASE_URL`, proteger credenciais, gerenciar
*migrations*, lidar com operações assíncronas e com falhas de conexão.

**Quais trade-offs surgiram com essa decisão?**
Trocamos simplicidade e zero infraestrutura por confiabilidade dos dados e capacidade de crescer.

**Nosso desenho arquitetural precisa ser atualizado?**
Sim. O C4 de Container agora tem o PostgreSQL como container de dados no lugar do array em memória:
[C4 Model](../arquitetura/c4-model.md).

```
ANTES: Cliente -> Express -> Array em memória -> dados desaparecem ao reiniciar
AGORA: Cliente -> Express -> Prisma -> PostgreSQL -> dados persistem
```

## Checklist

- [x] PostgreSQL instalado
- [x] Banco easyfood criado
- [x] Prisma instalado e inicializado
- [x] DATABASE_URL configurada
- [x] Model Restaurant criado
- [x] Migration executada
- [x] GET /restaurants consultando o PostgreSQL
- [x] POST /restaurants salvando no PostgreSQL
- [x] Teste de reinicialização realizado
- [x] Prisma Studio testado
- [x] ADR-002 criado
