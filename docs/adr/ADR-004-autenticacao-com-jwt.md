# ADR-004 - Autenticação com JWT

## Status
Proposta

## Data
03/09/2026

## Responsável
Equipe EasyFood

## Contexto
Hoje qualquer pessoa pode cadastrar restaurantes pelo `POST /restaurants`. A EasyFood precisa
identificar seus usuários e proteger operações de escrita, mantendo a consulta de restaurantes
pública.

A autenticação será um novo domínio (`src/modules/auth`) dentro do monólito modular
([ADR-003](ADR-003-monolito-modular-em-camadas.md)). O contexto atual é: uma única API, equipe
pequena, usuários já armazenados no nosso PostgreSQL e nenhum requisito de login social ou de
atender vários produtos.

## Alternativas consideradas
1. **JWT próprio** (`jsonwebtoken` + `bcryptjs`): a API cadastra usuários, guarda a senha em hash e
   emite um token assinado que o cliente envia em `Authorization: Bearer <token>`.
2. **AWS Cognito:** serviço gerenciado de identidade (cadastro, login, MFA, recuperação de senha).
3. **Login com Google (OAuth 2.0 / OpenID Connect):** o usuário se autentica com a conta Google.
4. **Sessão no servidor com cookie** (ex.: `express-session`).

## Decisão
Implementar autenticação própria com **JWT**: senhas armazenadas com hash **bcrypt**, token assinado
com uma chave secreta (`JWT_SECRET`, definida no `.env`) e validade de 1 dia, verificado por um
middleware que protege as rotas de escrita.

## Justificativa
- **Stateless:** a API não guarda sessão; qualquer instância valida o token apenas com a chave, o que
  combina com a possibilidade de rodar várias instâncias sobre o mesmo PostgreSQL.
- **Simplicidade e custo:** duas bibliotecas pequenas, sem infraestrutura nem serviço externo pago.
- **Controle e aprendizado:** o fluxo inteiro (hash, login, token, middleware) fica visível no código.
- **Encaixa na arquitetura:** vira um módulo `auth` com service/controller/routes, e o middleware é
  reutilizável por outros módulos.
- **Por que não as outras agora:** Cognito traz dependência de fornecedor (AWS), configuração e
  custo que não se pagam com um único produto; Login com Google depende de terceiros e exige que o
  usuário tenha conta Google (pode ser adicionado depois como opção complementar); sessão com cookie
  exige armazenamento de sessão compartilhado entre instâncias.

## Consequências

### Positivas
- Cadastro e login de usuários sem serviços externos.
- `GET /restaurants` continua público; `POST /restaurants` passa a exigir usuário autenticado.
- Senhas nunca armazenadas em texto puro.

### Negativas / trade-offs
- A segurança passa a ser nossa responsabilidade: guardar o `JWT_SECRET`, escolher expiração, usar
  HTTPS em produção.
- Um token emitido não pode ser revogado antes de expirar sem mecanismos extras (lista de bloqueio,
  *refresh tokens*).
- Recursos como recuperação de senha, confirmação de e-mail e MFA teriam de ser implementados por nós.

## Critérios de revisão
Reavaliar quando:
1. A autenticação precisar atender vários produtos (considerar um Auth Service ou um provedor como Cognito).
2. Surgir requisito de login social, MFA ou recuperação de senha.
3. For necessário revogar sessões imediatamente.
