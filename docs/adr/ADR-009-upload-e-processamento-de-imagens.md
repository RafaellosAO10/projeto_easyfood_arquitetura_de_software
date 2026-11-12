# ADR-009 - Upload e processamento de imagens

## Status
Aceita

## Data
12/11/2026

## Responsável
Equipe EasyFood

## Contexto
Usuários precisam de foto de perfil e os pratos precisam de foto no cardápio. Fotos de celular
chegam com vários MB, orientação EXIF e metadados (inclusive GPS). Dois módulos (`auth` e `dishes`)
precisam do mesmo tratamento, e em aula discutimos processar imagens na própria API ou em
Serverless/FaaS.

## Alternativas consideradas
1. Gravar o arquivo original como chegou (simples, mas pesado e com metadados).
2. **Processar na própria API (Multer + Sharp) e gravar em disco**, servindo por `/uploads`.
3. Enviar para um storage de objetos (S3, Supabase Storage) e processar com uma função
   Serverless/FaaS disparada pelo upload.

## Decisão
Opção 2, com o processamento concentrado em serviços compartilhados (`src/modules/shared/`):

- `upload.middleware.js`: Multer em memória, um arquivo no campo `image`, só JPEG/PNG/WebP, até
  5 MB. Traduz erros em 400 (sem arquivo), 413 (grande demais) e 415 (formato não permitido).
- `image.service.js`: Sharp corrige a orientação, remove metadados, redimensiona (perfil 400×400
  com recorte; prato até 800×600 sem recorte) e converte para WebP. Conteúdo que não é imagem de
  verdade gera 422. Grava em `uploads/<users|dishes>/` com nome aleatório e devolve o caminho público.
- O PostgreSQL guarda só o caminho (`User.imageUrl`, `Dish.imageUrl`), nunca o arquivo.
- Ordem segura: processar → gravar arquivo → atualizar o banco. Se o banco falhar, o arquivo novo
  é apagado; a imagem antiga só é removida depois do sucesso. Remover um prato remove a imagem.
- Rotas: `POST /auth/me/image` (usuário do token) e `POST /dishes/:dishId/image` (dono do
  restaurante, [ADR-007](ADR-007-dono-do-restaurante-e-autorizacao-de-pratos.md)), ambas com JWT.

## Justificativa
- Um único serviço de imagens para todos os módulos (sem duplicar lógica), coerente com o monólito
  modular da [ADR-003](ADR-003-monolito-modular-em-camadas.md).
- O arquivo só vai para o disco depois de otimizado: nenhum original sem tratamento é gravado.
- Para o volume atual, processar na hora (poucos milissegundos por foto) é mais simples que uma
  infraestrutura Serverless.

## Consequências

### Positivas
- Imagens leves (WebP), sem dados de localização, com URL estável para o front.
- Novos módulos (ex.: logo do restaurante) só precisam de um novo preset no `image.service`.

### Negativas / trade-offs
- As imagens ficam no disco do servidor: não escala para várias instâncias e precisa de backup próprio.
- O processamento roda no mesmo processo da API; muitos uploads simultâneos competem com as requisições.

## Critérios de revisão
1. A API rodar em mais de uma instância ou em ambiente sem disco persistente → storage de objetos.
2. O volume de uploads afetar o tempo de resposta → processamento assíncrono (fila ou FaaS).
