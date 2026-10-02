# 01 — PRD: Gestão Frota

**Status:** rascunho v0.1 · **Dono do produto:** (filho) · **Validadores:** dono e administrativo

## 1. Problema

A operação hoje depende de papel, WhatsApp e memória. Isso gera cinco problemas:

- **Consumo e fraude:** não há como saber o consumo real por caminhão/motorista nem detectar abastecimento suspeito.
- **Acerto demorado:** o acerto com o motorista (adiantamento, despesas, comissão) é lento e sujeito a erro e discussão.
- **Resultado invisível:** o lucro por viagem e por caminhão não aparece, e isso atrapalha negociar o frete com o único cliente.
- **Vencimentos perdidos:** documentos como CRLV, RNTRC, cronotacógrafo, CNH, toxicológico e certificado digital vencem sem aviso, com risco de multa e de parar a operação.
- **Pneus sem rastreio:** pneus, o segundo maior custo variável depois do diesel, não têm rastreabilidade.

## 2. Objetivos e métricas de sucesso

| Objetivo | Métrica | Meta (90 dias após o piloto) |
|---|---|---|
| Registro disciplinado | % de abastecimentos com foto + chave NFC-e | ≥ 95% |
| Acerto rápido | Tempo para fechar o acerto mensal de um motorista | < 15 min |
| Visibilidade | Resultado por caminhão/mês disponível sem planilha | 100% dos meses |
| Zero vencimento surpresa | Documentos vencidos sem alerta prévio | 0 |
| Adoção | Motoristas registrando pelo app sem ajuda | 3/3 |

## 3. Personas

- **Dono (pai):** usa pelo celular. Quer saber "quanto cada caminhão deu no mês" e "tem algo errado?". Pouca paciência para telas complexas.
- **Administrativo (mãe):** faz a conferência de comprovantes, os acertos e os lançamentos. Usa celular e às vezes computador.
- **Motorista:** registra na estrada, no posto ou no pátio, com pressa. Precisa de botões grandes, poucos campos e confiança de que o acerto está certo (vê o próprio extrato).

## 4. Escopo

### 4.1 MVP (Fase 1)

| ID | Requisito | Perfil |
|---|---|---|
| RF-01 | Login com e-mail e senha; usuários criados pelo gestor (sem autocadastro) | todos |
| RF-02 | Cadastro de caminhões (placa, modelo, eixos, capacidade do tanque, km atual) | gestor |
| RF-03 | Cadastro de funcionários (dados pessoais, CNH, chave PIX, salário-base) e vínculo com usuário | gestor |
| RF-04 | Cadastro de clientes e fornecedores (postos, oficinas, recapadoras) | gestor |
| RF-05 | Motorista inicia a viagem (ciclo ida + volta) ao sair: caminhão, origem/destino (padrões da rota pré-preenchidos) e km de saída | motorista |
| RF-06 | Motorista finaliza a viagem na volta, depois de descarregar: km de chegada (validado ≥ km de saída) | motorista |
| RF-07 | Gestor lança os fretes da viagem: o da volta (sempre) e o da ida (quando houver carga), cada um com cliente, valor, chaves de CT-e/MDF-e e peso | gestor |
| RF-08 | Motorista registra abastecimento: foto do cupom, leitura do QR da NFC-e, km, litros, valor total, tanque cheio (sim/não), forma de pagamento | motorista |
| RF-09 | O sistema extrai a chave de 44 dígitos do QR, valida o DV e impede chave duplicada | sistema |
| RF-10 | O sistema calcula km/L (método tanque cheio) e marca anomalias (ver regras) | sistema |
| RF-11 | Motorista registra despesa de viagem com foto (pedágio, alimentação, pernoite, chapa, borracharia etc.) | motorista |
| RF-12 | Gestor registra adiantamentos ao motorista | gestor |
| RF-13 | Gestor confere abastecimentos/despesas (marca "conferido" ou comenta) | gestor |
| RF-14 | Regra de comissão configurável por motorista, com vigência | gestor |
| RF-15 | Acerto por período: consolida viagens, comissão, despesas reembolsáveis e adiantamentos, e gera o saldo | gestor |
| RF-16 | Acerto fechado bloqueia a edição dos registros vinculados; só o dono reabre | sistema/dono |
| RF-17 | Motorista vê o próprio extrato: viagens, km, abastecimentos e acertos fechados | motorista |
| RF-18 | Documentos com vencimento e alertas (30/15/7 dias e vencido) no painel | gestor |
| RF-19 | Painel: resultado por viagem e por caminhão/mês, km/L por caminhão e motorista, alertas | gestor |
| RF-20 | Exportação CSV de acertos e abastecimentos (para o contador) | gestor |
| RF-21 | Auditoria: toda alteração em tabela financeira/operacional é registrada (quem, quando, antes/depois) | sistema |
| RF-22 | App instalável (PWA) em Android e iPhone | todos |

### 4.1.1 Adições do piloto (pedido de 2026-10-01, após pesquisa de mercado)

| ID | Requisito | Perfil |
|---|---|---|
| RF-32 | Manutenção preventiva por km e/ou tempo: plano por caminhão, aviso de "chegando" e "vencida" pelo km que chega dos abastecimentos; registro da manutenção com oficina e custo, que entra no resultado | gestor |
| RF-35 | Multas: o app sugere quem dirigia pela viagem daquele momento e controla o prazo para indicar o condutor (padrão 30 dias, configurável) | gestor |
| RF-36 | Foto do painel (km) no abastecimento, opcional, para conferência | motorista |
| RF-37 | Mandar o demonstrativo do acerto fechado pelo WhatsApp do motorista (sem frete nem custos, Q6) | gestor |
| RF-38 | Despesas pessoais do motorista (opcional): alimentação, pernoite etc., só para o controle dele. **Só ele vê** (nem a gestão); não entram no acerto | motorista |
| RF-39 | Dono/admin que também dirige usa a área do motorista: o cadastro de funcionário com o CPF dele é ligado ao login existente ("Criar acesso" liga, mantendo o papel) | dono/admin |
| RF-40 | Foto de cada caminhão (lista, ficha e escolha do caminhão pelo motorista) | gestor |
| RF-41 | Botão "voltar ao início" em todas as telas; no painel, resumo do mês do total da frota e de cada caminhão (fretes, diesel, pedágio, despesas, manutenção, comissão, resultado) | todos |

### 4.2 Fase 2

| ID | Requisito |
|---|---|
| RF-30 | Pneus com ciclo de vida: estoque → montagem (caminhão + posição) → rodízio → retirada → recapagem → descarte, com CPK |
| RF-31 | Estoque de peças/itens com entradas, saídas por caminhão e estoque mínimo |
| RF-33 | Checklist pré-viagem com fotos |
| RF-34 | Contas a pagar/receber e fluxo de caixa |

### 4.3 Fase 3 (opcional)

Importação de XML de CT-e do emissor, GPS/rastreador, OCR com IA para notas de oficina, relatórios avançados.

### 4.4 Fora de escopo (explicitamente)

- Emissão de CT-e, MDF-e ou NF-e.
- Folha de pagamento oficial (eSocial, INSS, FGTS): é do contador. O app **exporta** os dados de comissão.
- Controle de jornada com validade jurídica (ponto eletrônico). O app pode registrar horários de saída e chegada, mas **não é** o controle oficial de jornada.
- Multiempresa/SaaS.

## 5. Fluxos principais

### 5.1 Motorista registra abastecimento (meta: < 60 s)

1. Home do motorista → botão grande **"Abastecer"**.
2. A câmera abre para ler o QR do cupom. Se ler, a chave é extraída; se falhar, o motorista toca em "Sem QR / digitar depois".
3. Tira a foto do cupom (obrigatória).
4. Preenche três campos numéricos: **km do painel**, **litros**, **valor total**, mais o toggle **tanque cheio** (padrão: sim).
5. Salva. O app mostra km/L estimado e um aviso se houver anomalia ("confira o km digitado").

Caminhão e viagem vêm pré-selecionados da viagem em andamento.

### 5.2 Acerto (administrativo)

1. `/g/acertos/novo` → escolhe o motorista e o período.
2. O sistema lista viagens concluídas, abastecimentos, despesas e adiantamentos ainda sem acerto no período, destacando os itens não conferidos e as anomalias.
3. Mostra o cálculo: comissão (com a regra vigente), despesas reembolsáveis, adiantamentos e saldo.
4. **Fechar acerto** registra um snapshot da regra, vincula os itens e bloqueia a edição.
5. **Marcar como pago** (data e forma).
6. O motorista passa a ver o demonstrativo.

### 5.3 Dono consulta o mês

`/g` mostra quatro cards: receita do mês, custo de diesel, resultado por caminhão, alertas (anomalias e vencimentos). Um toque em um caminhão abre a lista de viagens com o resultado de cada uma.

## 6. Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF-01 | Mobile-first na área do motorista; funcional em telas de 360 px de largura |
| RNF-02 | Tolerância a sinal fraco: formulário não perde dados se o envio falhar (rascunho local + reenvio). Offline completo **não** é requisito do MVP |
| RNF-03 | Upload de foto ≤ ~300 KB após compressão |
| RNF-04 | Custo de infraestrutura ≤ US$ 25/mês + domínio |
| RNF-05 | Backup diário (GitHub Actions, criptografado, 7 dias; ADR-0004) e exportação CSV mensal manual como segunda cópia |
| RNF-06 | Toda regra de cálculo coberta por teste automatizado |

## 7. Perguntas em aberto (bloqueiam parte do MVP)

Não implemente regra definitiva para os itens abaixo antes da resposta. Use configuração e valores de exemplo.

| # | Pergunta | Impacta | Suposição provisória |
|---|---|---|---|
| Q1 | ~~Qual é exatamente a regra de comissão? Há salário-base além da comissão?~~ **Respondida em 2026-10-01:** comissão é um **valor fixo em R$ por viagem**, e uma viagem = **ida e volta** (não por trecho). Cada motorista tem o próprio valor de comissão e o próprio salário-base. | RF-14/15 | Tipo `valor_por_viagem`, um valor por motorista |
| Q2 | ~~O acerto é por viagem, semanal ou mensal?~~ **Respondida em 2026-10-01:** período livre, com atalhos para **mensal, quinzenal (15 dias) e semanal (7 dias)** | RF-15 | Implementado: `periodoSugerido` (último período fechado; semana de segunda a domingo) |
| Q3 | ~~A volta (BH → SJE) é carregada (tem frete) ou vazia?~~ **Respondida em 2026-10-01:** a volta (BH → SJE) é **sempre carregada**; a ida (SJE → BH) vai **vazia na maioria das vezes**, mas às vezes leva carga. Cada trecho carregado tem o seu frete (≈ 3 a 6 fretes por semana). A duração varia com a liberação da carga (ex.: sai sábado e só descarrega segunda). O motorista dá **início** ao sair e **fim** na volta, depois de descarregar. | Receita, RF-05/06/07 | Implementado: viagem = ciclo; tabela `fretes` com 0 a 2 fretes por viagem (migration `20261001000002`) |
| Q4 | Quem registra o valor do frete: o gestor ou vem do CT-e? | RF-07 | Gestor digita |
| Q5 | ~~Existe diária/ajuda de custo fixa além do reembolso de despesas?~~ **Respondida em 2026-10-01:** não há diária, e a empresa **não paga alimentação, pernoite etc.**; só reembolsa **despesas do caminhão** pagas pelo motorista | RF-11/15 | Implementado: `despesaReembolsavel` (pedágio, borracharia, manutenção, estacionamento, lavagem, chapa); alimentação e pernoite saem da tela do motorista |
| Q6 | ~~O motorista pode ver o valor do frete das próprias viagens?~~ **Respondida em 2026-10-01:** **não**; o motorista não tem acesso ao frete **nem a nada relacionado às despesas do caminhão** | RF-17 | Implementado: sem policy em `fretes`; acerto sem total de fretes; sem preços de diesel na análise do motorista (migration `20261001000006`) |
| Q7 | Cada motorista tem caminhão fixo? | UX RF-05 | Não; escolhe na saída, sugerindo o último usado |
| Q8 | Os motoristas têm e-mail? | RF-01 | Se não tiverem, usar e-mail interno `cpf@frota.local` gerado pelo gestor (ver ADR 0001) |
| Q9 | Configuração de eixos de cada caminhão (toco, truck, carreta)? | Fase 2 pneus e pedágio | Cadastrar por caminhão |
| Q10 | A empresa usa TAG de pedágio? | Registro de pedágio | Pedágio lançado como despesa da viagem |
| Q11 | ~~Como o diesel é pago?~~ **Respondida em 2026-10-01:** **faturado direto no posto** | RF-08, RF-15 | Implementado: abastecimento do motorista grava `forma_pagamento = faturado` e não entra no acerto; o campo continua no banco para exceções |

## 8. Critérios de aceite do MVP (piloto)

- 3 motoristas usam o app por 30 dias corridos, registrando 100% dos abastecimentos.
- Um acerto mensal completo é fechado no app e bate com o cálculo manual feito em paralelo.
- O painel mostra o resultado por caminhão do mês do piloto.
- Nenhum motorista consegue ver dados de outro motorista (validado por teste pgTAP e por teste manual).
