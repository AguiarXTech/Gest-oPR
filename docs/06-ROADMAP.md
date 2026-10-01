# 06 — Roadmap e backlog

Sprints de ~1 semana, com dedicação parcial. Cada tarefa tem ID (`S{sprint}-{n}`) para o agente referenciar em commits e PRs.

## Definição de pronto (vale para toda tarefa)

- `lint`, `typecheck`, `test` e `db:test` passando.
- Regras de domínio com teste usando os exemplos de `04-REGRAS-DE-NEGOCIO.md`.
- Tela testada em viewport de 360 px (área do motorista).
- Docs atualizados se a regra, o fluxo ou o modelo mudaram.
- Nenhum segredo commitado.

---

## Sprint 0 — Fundação

| ID | Tarefa | Critério de aceite |
|---|---|---|
| S0-1 | Criar projeto Next.js (App Router, TS strict) + Tailwind + shadcn/ui + ESLint/Prettier | `npm run dev` abre a tela inicial |
| S0-2 | Supabase CLI: `supabase init`, colocar a migration inicial e o seed, criar scripts `db:*` do AGENTS.md | `db:reset` aplica sem erro |
| S0-3 | **Validar a migration inicial** (não foi executada ainda): rodar `db:reset` e `db:test`, corrigir o que falhar em uma **nova** migration ou na própria inicial, **se ainda não foi aplicada em produção** | Teste `rls_motorista.test.sql` passa (9/9) |
| S0-4 | `lib/supabase/{client,server,middleware}.ts` com `@supabase/ssr`; `db:types` | Tipos gerados e importados |
| S0-5 | Vitest configurado; `lib/domain/dinheiro.ts` com testes | Exemplos da seção 1 das regras passam |
| S0-6 | GitHub Actions: lint, typecheck, test, db:test | PR mostra checks verdes |
| S0-7 | Script `scripts/criar-usuarios-dev.ts` (dono, admin, 3 motoristas ligados aos funcionários do seed) + `npm run dev:users` | Login local com os 5 usuários |

## Sprint 1 — Autenticação e cadastros (RF-01..04)

| ID | Tarefa | Critério de aceite |
|---|---|---|
| S1-1 | Tela de login + `proxy.ts` redirecionando por papel (`/m` ou `/g`) | Motorista não acessa `/g` (redireciona) |
| S1-2 | Layout `/g` (navegação) e `/m` (home com botões grandes) | Visual aprovado pelo pai/mãe em conversa rápida |
| S1-3 | CRUD de caminhões | Placa validada no formato Mercosul/antigo |
| S1-4 | CRUD de funcionários + server action "criar acesso" (service role, `auth.admin.createUser` + `profiles`) | Motorista criado consegue logar; service role não aparece no bundle do cliente |
| S1-5 | Desativar funcionário/usuário (ativo=false + ban) | Usuário desativado não lê nada |
| S1-6 | CRUD de clientes e fornecedores | — |

## Sprint 2 — Viagem e abastecimento do motorista (RF-05..10, RF-22)

| ID | Tarefa | Critério de aceite |
|---|---|---|
| S2-1 | `lib/domain/nfce.ts`: `extrairChave`, `validarChave` (DV), `decomporChave` + testes | Testes com chaves geradas e com URL de QR |
| S2-2 | **Spike iPhone:** leitura de QR com ZXing no iOS Safari e no Android Chrome, com cupons reais | Decisão registrada (lib escolhida) no `02-ARQUITETURA.md` |
| S2-3 | Componente `FotoComprovante` (captura, compressão ≤ ~300 KB, upload no caminho padrão) | Foto aparece para o gestor via URL assinada |
| S2-4 | Iniciar/finalizar viagem (`/m/viagem/nova`, `/m/viagem/[id]`) com rota padrão pré-preenchida e sugestão do último caminhão | 1 viagem em andamento por motorista (erro amigável) |
| S2-5 | Tela Abastecer (fluxo 5.1 do PRD) com rascunho local e retry | Registro em < 60 s; sem perda ao falhar a rede |
| S2-6 | `lib/domain/consumo.ts` + `anomalias.ts` + testes (seções 4 e 5 das regras) | Todos os exemplos passam |
| S2-7 | PWA (Serwist): manifest, ícones, instruções de instalação no iPhone | Instalável em Android e iPhone |

**Checkpoint:** colocar 1 motorista para testar por 1 semana a partir daqui (paralelo ao papel).

## Sprint 3 — Despesas, adiantamentos e conferência (RF-11..13)

| ID | Tarefa | Critério de aceite |
|---|---|---|
| S3-1 | Tela Despesa (motorista) com foto | Pedágio, alimentação etc. |
| S3-2 | Adiantamentos (gestor) | Aparecem no extrato do motorista |
| S3-3 | Tela de conferência `/g/abastecimentos`: lista com anomalias, foto, marcar conferido, comentário | Filtros: não conferidos, com anomalia alta |
| S3-4 | Completar viagem pelo gestor (cliente, frete, CT-e/MDF-e) | Viagem sem frete aparece destacada |

## Sprint 4 — Comissão e acerto (RF-14..17, RF-20)

**Pré-requisito:** respostas às perguntas Q1, Q2, Q5 e Q11 do PRD.

| ID | Tarefa | Critério de aceite |
|---|---|---|
| S4-1 | `lib/domain/comissao.ts` + testes (4 tipos, arredondamento por viagem) | Exemplos da seção 6 passam |
| S4-2 | `lib/domain/acerto.ts` + teste do exemplo completo (saldo R$ 1.645,40) | Passa |
| S4-3 | CRUD de regras de comissão (vigência sem sobreposição com mensagem amigável) | — |
| S4-4 | Fluxo de acerto (seção 7): criar rascunho → revisar → fechar (snapshot) → pagar | Tentativa de editar item acertado mostra erro do banco traduzido |
| S4-5 | Reabrir acerto (só dono) | Admin recebe erro; auditoria registra |
| S4-6 | Extrato do motorista `/m/extrato` e demonstrativo do acerto | Motorista vê só os próprios |
| S4-7 | Exportação CSV (acertos por competência, abastecimentos) | Abre corretamente no Excel pt-BR (separador `;`, UTF-8 com BOM) |
| S4-8 | pgTAP: transições de acerto e bloqueio de itens | Testes cobrem reabrir (dono ok, admin falha) e excluir rascunho |

## Sprint 5 — Documentos e painel (RF-18, RF-19, RF-21)

| ID | Tarefa | Critério de aceite |
|---|---|---|
| S5-1 | CRUD de documentos com anexo + `lib/domain/documentos.ts` | Status correto nas faixas 30/15/7/vencido |
| S5-2 | `lib/domain/resultado.ts` (por caminhão/mês e por viagem com rateio) + testes | — |
| S5-3 | Painel `/g`: 4 cards (receita, diesel, resultado por caminhão, alertas) | Carrega em < 2 s com dados de 3 meses |
| S5-4 | Detalhe do caminhão: viagens do mês com resultado, km/L | — |
| S5-5 | Tela de auditoria simples (filtro por tabela/registro) | Mostra antes/depois |
| S5-6 | Configurações editáveis (limiares) | Mudança reflete nas anomalias |

## Piloto (4 semanas)

- Produção: Supabase Pro + Vercel + domínio.
- Treinamento presencial de 20 min por motorista (instalar o PWA e fazer um abastecimento de teste).
- Primeiro mês com acerto **em paralelo** (app × método atual) para validar os cálculos.
- Coletar feedback semanal com pai e mãe e ajustar.

---

## Fase 2 (após o piloto estável)

Ordem sugerida, justificada pelo impacto em custo:

1. **Manutenção preventiva** (RF-32): usa o km que já chega pelos abastecimentos. Baixo esforço, evita quebra na estrada.
2. **Pneus** (RF-30): segundo maior custo variável; modelo esboçado em `03-MODELO-DE-DADOS.md`.
3. **Contas a pagar/receber** (RF-34): completa o resultado com custos fixos.
4. **Estoque de peças** (RF-31), **checklist** (RF-33), **multas** (RF-35).

## Riscos e mitigação

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Motoristas não aderem | Média | Fluxo de abastecimento < 60 s; acerto só pelo app a partir do mês 2; extrato transparente |
| Leitura de QR falha no iPhone | Média | Spike S2-2 antes de construir o resto; fallback de foto |
| Regra de comissão diferente do suposto | Alta | Sprint 4 bloqueada até as respostas Q1/Q2 |
| Dependência de uma pessoa (dev) | Alta | Docs + exportação CSV mensal + backup Supabase |
| Erro de cálculo gerar passivo trabalhista | Baixa/alto impacto | Testes + acerto em paralelo no 1º mês + revisão do contador |
