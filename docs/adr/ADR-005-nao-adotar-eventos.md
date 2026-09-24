# ADR-005 - Não adotar arquitetura orientada a eventos neste momento

## Status
Aceita

## Data
17/09/2026

## Responsável
Equipe EasyFood

## Contexto
Na aula sobre arquitetura orientada a eventos discutimos um cenário futuro: quando um restaurante
for cadastrado, outras partes do sistema (e-mail de boas-vindas, registro de atividade, time
comercial) podem precisar reagir.

Há duas formas de fazer isso:

- **Comunicação direta (síncrona):** o módulo de restaurantes chama diretamente cada interessado.
- **Eventos (assíncrona):** o módulo publica um evento (`restaurant.created`) em um *message
  broker* e cada consumidor decide como reagir.

Hoje a EasyFood é um monólito modular ([ADR-003](ADR-003-monolito-modular-em-camadas.md)) com poucos
componentes, fluxo simples, dependências conhecidas e nenhum consumidor real para esse evento.

## Alternativas consideradas
1. **Manter comunicação direta** entre os módulos, dentro do mesmo processo.
2. **Eventos com um broker** (RabbitMQ, Apache Kafka ou serviços de nuvem como AWS SQS/SNS,
   Google Pub/Sub e Azure Service Bus).

## Decisão
**Não adotar eventos agora.** A comunicação entre os componentes da EasyFood continua direta, dentro
do monólito modular.

## Justificativa
- Não existe hoje nenhum consumidor que justifique publicar eventos.
- Um broker adicionaria infraestrutura, observabilidade, tratamento de falhas (mensagens perdidas ou
  duplicadas, *retries*) e consistência eventual — custos que não se pagam no contexto atual.
- Tecnologia vem depois da necessidade.

## Consequências

### Positivas
- Fluxo explícito, fácil de seguir e depurar.
- Menos infraestrutura e menor custo operacional.

### Negativas / trade-offs
- Quem publica precisa conhecer quem consome: maior acoplamento quando os interessados surgirem.
- Todas as ações acontecem na mesma requisição, sem processamento posterior.

## Critérios de revisão
Reavaliar quando:
1. Surgirem vários consumidores interessados no mesmo fato (ex.: e-mail, analytics, notificações).
2. Alguma ação puder (ou precisar) ser processada depois, sem bloquear a resposta ao usuário.
3. Módulos forem extraídos para serviços independentes que precisem se comunicar.
