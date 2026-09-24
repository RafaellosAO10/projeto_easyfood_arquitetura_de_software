# ADR-003 - Monólito modular organizado em camadas

## Status
Aceita

## Data
03/09/2026

## Responsável
Equipe EasyFood

## Contexto
Após a persistência com PostgreSQL ([ADR-002](ADR-002-persistencia-com-postgresql.md)), o `server.js`
concentrava todas as responsabilidades: iniciar o Express, configurar middlewares, definir rotas,
validar dados, acessar o Prisma e ligar o servidor.

Funciona, mas o arquivo tende a crescer a cada novo requisito, e novos domínios já estão no
horizonte (usuários/autenticação, pedidos, pagamentos). Ao mesmo tempo, o contexto atual é:
produto em evolução, poucos domínios, equipe pequena, baixa escala e um deploy simples, sem
necessidade real de independência entre partes do sistema.

## Alternativas consideradas
1. Manter tudo no `server.js`.
2. **Monólito modular em camadas** (routes → controller → service → database), organizado por domínio.
3. Separar em microsserviços (ex.: um Auth Service e um Restaurant Service independentes).

## Decisão
Manter a EasyFood como um **monólito modular**, organizado em camadas e por domínio:

```
server.js   -> liga o servidor
src/app.js  -> configura a aplicação (middlewares, estáticos, rotas)
src/modules/<domínio>/
  *.routes.js      -> define os caminhos
  *.controller.js  -> recebe req e devolve res
  *.service.js     -> regras e operações
src/database/prisma.js -> conexão com o banco
```

## Justificativa
- **Separação de responsabilidades:** cada camada tem um papel claro e pode ser alterada sem
  afetar as demais.
- **Service independente de HTTP:** não recebe `req`/`res`, podendo ser reutilizado e testado
  isoladamente.
- **Preparado para crescer:** novos domínios entram como novos módulos (`src/modules/auth`, ...).
- **Testabilidade:** o `app.js` separado do `server.js` permite testes de integração sem ocupar a
  porta 3000.
- **Simplicidade > independência:** microsserviços trariam rede, timeouts, deploys e logs
  distribuídos, monitoramento e mais infraestrutura, sem um benefício que pague esse custo hoje.
  Microsserviços não corrigem falta de organização: primeiro organizamos, depois distribuímos — se
  houver motivo.

## Consequências

### Positivas
- Código mais fácil de entender e manter; comportamento externo da API inalterado.
- Menor complexidade, deploy e debug simples, menor custo operacional, evolução rápida.
- Fronteiras entre domínios ficam explícitas, facilitando uma futura extração para serviços.

### Negativas / trade-offs
- Mais arquivos e mais "saltos" para seguir uma requisição.
- Deploy e escala continuam conjuntos: todos os módulos sobem juntos.
- Menor isolamento de falhas e menor autonomia entre módulos do que em serviços separados.

## Critérios de revisão
Reavaliar a decisão (e considerar microsserviços) quando:
1. A autenticação precisar atender vários produtos.
2. Pedidos exigirem escala independente.
3. Pagamentos exigirem maior isolamento.
4. Existirem equipes independentes por domínio.
5. O deploy conjunto virar um problema.
6. As fronteiras entre os módulos estiverem maduras.
