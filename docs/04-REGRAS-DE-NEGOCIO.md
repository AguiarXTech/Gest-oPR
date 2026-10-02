# 04 — Regras de negócio

Toda regra aqui vira uma função pura em `lib/domain/` com teste Vitest. Os exemplos numéricos de cada seção **são casos de teste**: copie-os para os testes.

Os limiares ficam na tabela `configuracoes` (chave → JSON). Os valores abaixo são os padrões do seed.

---

## 1. Dinheiro e arredondamento (`dinheiro.ts`)

- Valores em **centavos inteiros**.
- Percentual armazenado como `numeric(5,2)` (ex.: `12.50`) e convertido para **pontos-base inteiros** (`1250`) antes de calcular.
- `aplicarPercentual(centavos, pontosBase) = Math.round(centavos * pontosBase / 10000)`. Como os valores são sempre ≥ 0, `Math.round` arredonda metade para cima.
- **Arredondar por item (por viagem) e depois somar.** Nunca arredonde só o total. Assim o demonstrativo bate linha a linha.

| Entrada | Saída |
|---|---|
| 450000 centavos, 12,50% | 56250 |
| 333333 centavos, 10% | 33333 |
| 5 centavos, 10% | 1 (0,5 → 1) |

---

## 2. Viagem

- A viagem é o **ciclo completo** (Q3, respondida em 2026-10-01): o motorista **inicia** ao sair de São João Evangelista e **finaliza** na volta, depois de descarregar. A duração varia com a liberação da carga (ex.: sai sábado e só descarrega segunda).
- Os dados comerciais ficam em **`fretes`**, lançados pelo gestor: no máximo **um frete de ida e um de volta** por viagem. A volta (BH → SJE) é sempre carregada; a ida vai vazia na maioria das vezes. Receita da viagem = Σ fretes.
- Status: `em_andamento` → `concluida` (ou `cancelada`). O status `planejada` fica reservado para uso futuro.
- Um motorista tem **no máximo 1 viagem `em_andamento`** (garantido por índice único parcial).
- `km_chegada ≥ km_saida` (check no banco).
- `km_rodado = km_chegada − km_saida`.
- Ao concluir, atualiza `caminhoes.km_atual = max(km_atual, km_chegada)`.
- **Alerta** (não bloqueia): se `km_rodado` estiver fora de ±25% da distância esperada do ciclo = **2 × `rota_padrao_km`** (config por trecho, padrão 290 → ciclo de 580 km), mostrar "confira o km".

---

## 3. NFC-e (`nfce.ts`)

### 3.1 Extração da chave

O QR da NFC-e é uma URL da SEFAZ. Na versão 2, o parâmetro `p` tem o formato `CHAVE|versão|ambiente|…`.

```
extrairChave(texto):
  1. se for URL e tiver parâmetro p → pegar p.split('|')[0]  (QR v2/v3)
     se tiver chNFe → usar o valor                            (QR antigo)
  2. senão → remover espaços, passar para maiúsculas e pegar a primeira
     sequência no formato da chave (/\d{6}[0-9A-Z]{14}\d{24}/)
  3. remover espaços, maiúsculas; validar com validarChave (formato + DV)
```

**CNPJ alfanumérico (NT 2025.001):** desde 07/2026 o CNPJ do emitente (posições 7–20) pode ter letras; as demais posições continuam numéricas. Vale para NFC-e, NF-e, CT-e e MDF-e (checks do banco na migration `20261001000003`).

### 3.2 Estrutura da chave (44 dígitos)

| Posição | Campo | Uso no app |
|---|---|---|
| 1–2 | cUF (31 = MG) | exibir UF do posto |
| 3–6 | AAMM de emissão | alerta se diferente do mês do abastecimento |
| 7–20 | CNPJ do emitente | identificar/sugerir o posto (fornecedor) |
| 21–22 | modelo (65 = NFC-e, 55 = NF-e) | guardar; ambos aceitos |
| 23–25 | série | — |
| 26–34 | número | exibir |
| 35 | tpEmis | — |
| 36–43 | código numérico | — |
| 44 | DV | validação |

### 3.3 Dígito verificador (módulo 11)

Percorra os 43 primeiros caracteres **da direita para a esquerda**, multiplicando o valor de cada um pelos pesos 2, 3, …, 9, 2, 3, … e somando os produtos. O valor de um caractere é o **código ASCII − 48** (dígitos valem eles mesmos; `A` = 17, `B` = 18…).

```
resto = soma % 11
dv = (resto < 2) ? 0 : 11 − resto
```

A chave é válida se `dv === dígito 44`.

**Teste:** gere as chaves de teste com a própria função de DV. Não use chave real de terceiros no repositório.

### 3.4 Unicidade

`abastecimentos.nfce_chave` é **único**. A mesma nota enviada duas vezes é bloqueada pelo banco (principal barreira contra fraude).

> ⚠️ **Incerteza:** o formato exato do QR emitido pelos postos da rota não foi testado. Na Sprint 2, colete 3 a 5 cupons reais e ajuste o parser.

---

## 4. Consumo km/L (`consumo.ts`) — método tanque cheio

Só é possível medir consumo com precisão entre **dois abastecimentos de tanque cheio**.

```
Para cada caminhão, ordene os abastecimentos por (km, data_hora).
Para cada abastecimento A_i com tanque_cheio = true:
  P = o abastecimento anterior com tanque_cheio = true (se não existir → sem medição)
  distancia = A_i.km − P.km
  litros = soma dos litros de TODOS os abastecimentos depois de P até A_i (inclusive)
  kmL(A_i) = distancia / litros
```

Abastecimentos parciais (`tanque_cheio = false`) não geram medição própria: os litros deles entram na próxima medição de tanque cheio.

**Médias:**
- Por caminhão/mês = Σ distâncias ÷ Σ litros das medições do mês (média ponderada, **não** média das médias).
- Por motorista = mesma conta, filtrando as medições em que o motorista fez o abastecimento que fecha a medição.

| Sequência (caminhão X) | Resultado |
|---|---|
| A1: km 100000, cheio · A2: km 100580, 190 L, cheio | A2 = 580/190 = 3,05 km/L |
| A1: cheio km 100000 · A2: parcial km 100300, 80 L · A3: cheio km 100600, 110 L | A3 = 600/190 = 3,16 km/L; A2 sem medição |
| Primeiro abastecimento do caminhão | sem medição |

---

## 5. Anomalias de abastecimento (`anomalias.ts`)

As anomalias são **derivadas na leitura** e **não ficam gravadas**. Assim o motorista não tem como apagar a flag.

Mostre-as:
- na tela de conferência do gestor;
- como aviso ao motorista logo após salvar (a mesma função roda no cliente, só para UX).

| Código | Regra | Config (padrão) |
|---|---|---|
| `KM_REGRESSIVO` | km < maior km já registrado para o caminhão antes desta data | — |
| `LITROS_ACIMA_TANQUE` | litros > capacidade_tanque × fator | `fator_tanque` = 1,05 |
| `CONSUMO_FORA_FAIXA` | km/L fora de ±X% da média ponderada das últimas N medições do caminhão (mínimo 3 medições) | `consumo_tolerancia_pct` = 20, `consumo_janela` = 10 |
| `PRECO_FORA_FAIXA` | preço/litro fora de ±X% da mediana dos últimos 30 dias (todos os caminhões) | `preco_tolerancia_pct` = 15 |
| `INTERVALO_CURTO` | < K km desde o último abastecimento do mesmo caminhão | `intervalo_min_km` = 150 |
| `SEM_NFCE` | sem chave | — |
| `SEM_FOTO` | sem foto | — |
| `MES_DIVERGENTE` | AAMM da chave ≠ mês/ano de `data_hora` | — |

**Severidade:**
- `alta`: `KM_REGRESSIVO`, `LITROS_ACIMA_TANQUE`, `SEM_FOTO`;
- `media`: `CONSUMO_FORA_FAIXA`, `PRECO_FORA_FAIXA`, `MES_DIVERGENTE`;
- `baixa`: as demais.

Um item com severidade alta **não conferido** gera aviso ao fechar o acerto. O acerto não é bloqueado; o gestor decide.

---

## 6. Comissão (`comissao.ts`)

> **Q1 respondida em 2026-10-01:** a regra em uso é **`valor_por_viagem`**: um valor fixo em R$ por viagem (ciclo ida + volta), diferente para cada motorista. Os outros três tipos continuam implementados como configuração, caso a regra mude.

**Regra vigente.** É o registro de `regras_comissao` do motorista cujo período `vigencia_inicio ≤ data_saida da viagem ≤ coalesce(vigencia_fim, ∞)`. Períodos de vigência do mesmo motorista **não podem se sobrepor** (constraint de exclusão no banco).

A comissão é calculada **por viagem concluída** e arredondada por viagem (ver seção 1):

| Tipo | Fórmula por viagem |
|---|---|
| `valor_por_viagem` (**em uso**) | `valor` (se `apenas_com_frete` e frete = 0 → 0) |
| `pct_frete_bruto` | `aplicarPercentual(frete, pct)` |
| `pct_frete_liquido` | `base = frete − (pedágios da viagem, se deduz_pedagio) − (diesel rateado da viagem, se deduz_combustivel)`; `base = max(base, 0)`; `aplicarPercentual(base, pct)` |
| `valor_por_km` | `km_rodado × valor` |

"Diesel rateado" segue a definição da seção 8.2.

Nas fórmulas, **frete = Σ `fretes.valor_frete_centavos` da viagem** (ida + volta).

Uma viagem concluída **sem nenhum frete lançado** **impede o fechamento do acerto** com a mensagem "Viagem X sem frete lançado". Frete com valor zero é diferente de "sem frete" e é permitido.

**Exemplos:**
- `valor_por_viagem` R$ 150,00: viagem com 1 frete (volta) ou com 2 (ida + volta) → R$ 150,00 nos dois casos.
- `pct_frete_bruto` 12%, frete R$ 4.500,00 → R$ 540,00.
- `pct_frete_liquido` 15%, deduz pedágio, frete R$ 4.500,00, pedágios R$ 97,20 → base 440.280 → R$ 660,42.
- `valor_por_km` R$ 0,35/km, 580 km → R$ 203,00.

### 6.1 Aspectos trabalhistas (orientação para o produto, não é parecer jurídico)

- A comissão é permitida (art. 235-G da CLT) e **integra o salário**. O app deve exportar os valores por competência para o contador lançar na folha.
- O app **não** calcula horas extras, DSR sobre comissão, férias nem 13º. Isso é da folha, com o contador.
- Descontar saldo negativo do acerto no salário tem restrições (art. 462 da CLT). O app só **registra** o saldo; a decisão de descontar é do gestor com o contador.

---

## 7. Acerto (`acerto.ts`)

**Entradas.** Motorista, período `[inicio, fim]` e todos os itens sem acerto (`acerto_id is null`) do motorista no período:
- viagens `concluida` (por `data_saida`);
- abastecimentos e despesas (por data);
- adiantamentos (por data).

**Totais:**

| Componente | Cálculo |
|---|---|
| `total_frete` | Σ fretes das viagens (só informativo na tela da gestão; **não** é gravado no acerto, que o motorista lê — Q6) |
| `total_comissao` | Σ comissão por viagem |
| `total_reembolsos` | Σ despesas com `reembolsavel = true` + Σ abastecimentos com `forma_pagamento = 'motorista'` (Q5: só despesas do caminhão são reembolsáveis por padrão; Q11: o diesel é faturado no posto, então normalmente não entra) |
| `total_adiantamentos` | Σ adiantamentos |
| `saldo` | `total_comissao + total_reembolsos − total_adiantamentos` |

`saldo > 0`: a empresa paga o motorista. `saldo < 0`: o motorista deve (vai para o próximo acerto como observação; não há transporte automático no MVP).

**Estados e ações:**

| Ação | Quem | Efeito |
|---|---|---|
| Criar | gestor | status `rascunho`; vincula os itens (`acerto_id`) |
| Fechar | gestor | grava totais + `regra_snapshot` (JSON da regra usada) + `fechado_em/por`; status `fechado`; itens ficam imutáveis (trigger) |
| Pagar | gestor | `pago_em`, `forma_pagamento`; status `pago` |
| Reabrir | **somente dono** | status volta a `rascunho`; registrado na auditoria |
| Excluir | gestor, só em `rascunho` | desvincula os itens |

**Exemplo completo (teste de integração do domínio):** regra `valor_por_viagem` R$ 150,00; 4 viagens (3 só com frete de volta, 1 com ida + volta) → comissão 4 × 15000 = R$ 600,00. Despesas reembolsáveis R$ 185,40; 1 abastecimento pago pelo motorista R$ 300,00; adiantamentos R$ 1.000,00. Saldo = 60000 + 18540 + 30000 − 100000 = **R$ 85,40**.

---

## 8. Resultado (`resultado.ts`)

### 8.1 Por caminhão/mês (exato)

```
receita  = Σ fretes (ida + volta) das viagens concluídas no mês
diesel   = Σ valor dos abastecimentos do caminhão no mês
pedagio  = Σ despesas tipo pedagio das viagens do caminhão no mês
despesas = Σ outras despesas das viagens do caminhão no mês
comissao = Σ comissão calculada das viagens (mesmo sem acerto fechado; marcar "estimada" se não fechado)
resultado = receita − diesel − pedagio − despesas − comissao
custo_por_km = (diesel + pedagio + despesas + comissao) / km rodados no mês
```

A fase 2 soma manutenção, pneus (via CPK × km) e custos fixos (seguro, parcelas, IPVA rateado).

### 8.2 Por viagem (diesel rateado)

Um tanque cobre mais de uma viagem, então o diesel é **rateado por km**:

```
diesel_viagem = diesel_do_caminhao_no_mes × (km_viagem / km_total_do_caminhao_no_mes)
resultado_viagem = Σ fretes da viagem − diesel_viagem − pedagios_viagem − despesas_viagem − comissao_viagem
```

Enquanto o mês não fecha, o rateio é provisório. A UI deve indicar "valores estimados até o fechamento do mês".

---

## 9. Documentos e vencimentos (`documentos.ts`)

```
dias = vencimento − hoje (fuso America/Sao_Paulo)
status = vencido (dias < 0) | critico (≤ 7) | atencao (≤ 15) | aviso (≤ 30) | ok
```

As faixas ficam em `configuracoes.alerta_documentos_dias` = `[30, 15, 7]`.

| Tipo | Entidade | Periodicidade de referência |
|---|---|---|
| `crlv` / `licenciamento` | caminhão | anual |
| `ipva` | caminhão | anual |
| `seguro` | caminhão | apólice |
| `rntrc` | empresa/caminhão | conforme ANTT |
| `cronotacografo` | caminhão | verificação Inmetro a cada 2 anos |
| `certificado_digital` | empresa | conforme certificado (A1 = 1 ano) |
| `cnh` | funcionário | validade da CNH |
| `toxicologico` | funcionário | periódico (máx. 2 anos e 6 meses) — **guardar só as datas** |
| `outro` | qualquer | — |

Quando um documento é renovado, cria-se um **novo registro**. O anterior fica como histórico, e o status considera o registro mais recente por (entidade, tipo).

---

## 10. Pneus (fase 2 — especificação antecipada)

**Identificação.** `marca_fogo` (número gravado no pneu, único) + DOT.

**Posições.** Código `{eixo}{lado}{I|E}`, onde lado é E = esquerdo, D = direito, e I/E = interno/externo em rodado duplo. Exemplos: `1E`, `1D` (dianteiro simples); `2EI`, `2EE`, `2DI`, `2DE` (tração dupla). O layout vem da configuração de eixos do caminhão.

**Estados do pneu:**
- `estoque`
- `montado`
- `em_recapagem`
- `descartado`

**Transições permitidas:**

| De | Para |
|---|---|
| `estoque` | `montado` |
| `montado` | `estoque` (retirada) |
| `montado` | `montado` (rodízio = retirada + montagem na mesma operação) |
| `estoque` | `em_recapagem` |
| `em_recapagem` | `estoque` (vida + 1) |
| qualquer (≠ `descartado`) | `descartado` (motivo obrigatório) |

**Regras:**
- Uma posição tem no máximo 1 pneu montado. Um pneu tem no máximo 1 montagem aberta.
- `km_rodado_montagem = km_caminhao_retirada − km_caminhao_montagem`.
- `CPK = (valor_compra + Σ recapagens + Σ consertos) / Σ km_rodado` (R$/km, exibir com 4 casas).
