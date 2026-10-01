# AGENTS.md — Instruções para o agente de programação

Leia este arquivo inteiro antes de qualquer tarefa. Ele é a fonte de verdade sobre **como** trabalhar neste repositório. O **quê** construir está em `docs/`.

## 1. Contexto em 30 segundos

App interno de gestão para uma transportadora familiar em Minas Gerais:

- 5 caminhões (3 rodando);
- motoristas comissionados;
- 1 cliente;
- rota fixa São João Evangelista ↔ Belo Horizonte (~290 km por trecho).

O app tem três perfis de usuário:

| Perfil | Quem | Dispositivo principal | Uso |
|---|---|---|---|
| `dono` | Pai | Celular | Visão total, fecha e reabre acertos |
| `admin` | Mãe | Celular/PC | Financeiro, cadastros, conferência, acertos |
| `motorista` | Motoristas | Celular (Android e iPhone) | Registra viagens, abastecimentos (foto + QR da NFC-e), despesas e vê o próprio extrato |

Usuários **não técnicos**. Simplicidade vence completude.

## 2. Leitura obrigatória por tipo de tarefa

| Tarefa | Leia antes |
|---|---|
| Qualquer tarefa | `docs/01-PRD.md` (escopo e IDs de requisitos) |
| Banco, migrations, RLS | `docs/03-MODELO-DE-DADOS.md` e `docs/05-PERMISSOES-E-LGPD.md` |
| Comissão, acerto, consumo, anomalias, resultado | `docs/04-REGRAS-DE-NEGOCIO.md` |
| Estrutura, libs, deploy | `docs/02-ARQUITETURA.md` e `docs/adr/` |
| Escolher a próxima tarefa | `docs/06-ROADMAP.md` |

## 3. Stack (não trocar sem ADR novo)

| Camada | Escolha |
|---|---|
| Framework | Next.js (App Router) + TypeScript `strict` |
| UI | Tailwind CSS + shadcn/ui |
| Instalação no celular | PWA (via Serwist) |
| Backend | Supabase: Postgres, Auth, Storage, RLS |
| Dados no cliente | `@supabase/ssr` + TanStack Query |
| Formulários | React Hook Form + Zod |
| Testes | Vitest (domínio), pgTAP via `supabase test db` (RLS), Playwright (fluxos críticos, fase posterior) |
| Deploy | Vercel (front) + Supabase Cloud (plano Pro em produção) |

## 4. Regras invioláveis

1. **Dinheiro em centavos inteiros** (`bigint` no banco, `number` inteiro no TS). Nunca `float` para valores monetários. Formatação só na borda (UI) com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
2. **Quilometragem em inteiro (km)**; litros em `numeric(10,3)`.
3. **Datas**: `timestamptz` no banco; exibição em `America/Sao_Paulo`. Semana começa na segunda-feira.
4. **Regra de negócio fica em `lib/domain/`** como funções puras, sem Supabase nem React, **com teste Vitest**. Componentes e server actions só orquestram.
5. **RLS ligada em todas as tabelas** do schema `public`. Toda tabela nova precisa de policy e de teste pgTAP cobrindo motorista × gestor.
6. **`SUPABASE_SERVICE_ROLE_KEY` nunca vai para o cliente.** Uso restrito a server actions/route handlers de administração (ex.: criar usuário). Nunca prefixe com `NEXT_PUBLIC_`.
7. **Migrations são imutáveis depois de aplicadas.** Mudança de schema = novo arquivo em `supabase/migrations/`. Depois, regenere os tipos (`npm run db:types`).
8. **Fotos de comprovantes** vão para o bucket privado `comprovantes` no caminho `{funcionario_id}/{yyyy}/{mm}/{uuid}.jpg`, comprimidas no cliente (máx. ~1600 px no maior lado, ~300 KB). Exibição via URL assinada.
9. **Registro vinculado a acerto fechado não pode ser editado nem apagado.** Isso é garantido por trigger no banco, não só pela UI.
10. **Não invente regra de negócio.** Se algo não estiver em `docs/04-REGRAS-DE-NEGOCIO.md` ou estiver em "Perguntas em aberto" no PRD, pare e pergunte. Use valor configurável (tabela `configuracoes`) em vez de constante mágica.
11. **Nada de CT-e/MDF-e no código.** A emissão é terceirizada (ver `docs/adr/0002-fiscal-terceirizado.md`). O app só guarda a chave de 44 dígitos.
12. **Dado sensível**: não armazenar resultado de exame toxicológico, só data de realização e validade (ver `docs/05-PERMISSOES-E-LGPD.md`).

## 5. Convenções

- **Idioma**: UI, nomes de tabela e coluna, e mensagens de erro em **português** (`viagens`, `valor_frete_centavos`). Código TS pode misturar: nomes de domínio em português (`calcularComissao`), termos técnicos em inglês (`useQuery`, `schema`).
- **Nomes**:
  - tabelas no plural `snake_case`;
  - enums `snake_case`;
  - componentes `PascalCase.tsx`;
  - funções de domínio em verbo no infinitivo (`calcularSaldoAcerto`).
- **Rotas**: `/m/*` para motorista (mobile-first, botões grandes, no máximo 3 toques para registrar um abastecimento); `/g/*` para gestão (dono/admin).
- **Validação**: todo input passa por schema Zod em `lib/validations/`, reaproveitado no form e na server action.
- **Commits**: Conventional Commits em português (`feat(abastecimento): leitura de QR da NFC-e`).
- **Acessibilidade mínima**: alvos de toque ≥ 44 px, contraste AA, labels em todos os campos.

## 6. Comandos

```bash
npm run dev            # Next.js local
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run test           # Vitest (lib/domain)
npm run db:reset       # recria o banco do projeto DEV na nuvem (migrations + seed)
npm run db:push        # aplica migrations novas no projeto vinculado, sem apagar dados
npm run db:test        # pgTAP no projeto DEV via `supabase db query` (scripts/testar-db.ts, sem Docker)
npm run db:types       # supabase gen types typescript --linked > lib/database.types.ts
```

> **Não há banco local** (sem Docker; ver `docs/adr/0003-banco-somente-nuvem.md`). O desenvolvimento usa o projeto Supabase Cloud `gestao-frota-dev`. `db:reset`, `db:test` e `dev:users` passam por `db:guard`, que recusa rodar se o projeto vinculado não for o de DEV. **Nunca** rode `db:reset` nem seed em produção.

## 7. Fluxo de trabalho por tarefa

1. Identifique o ID da tarefa no `docs/06-ROADMAP.md` e os requisitos (`RF-xx`) relacionados no PRD.
2. Se tocar em regra de negócio: escreva ou atualize o teste em `lib/domain/*.test.ts` **antes** da implementação.
3. Se tocar no schema: crie a migration, rode `db:reset`, `db:test` e `db:types`.
4. Implemente a UI.
5. Antes de concluir, rode `lint`, `typecheck`, `test` e `db:test`. Todos precisam passar.
6. Se mudou regra, fluxo ou modelo, **atualize o doc correspondente no mesmo commit**.
7. Ao terminar, resuma o que fez, o que ficou pendente e qualquer suposição que você fez.

## 8. O que NÃO fazer

- Não adicionar dependência pesada sem justificar (ex.: não usar Redux, ORM ou biblioteca de gráficos grande no MVP; use Recharts se precisar).
- Não criar backend separado (Express, Nest etc.). Use Supabase + server actions.
- Não usar `localStorage` para dado de negócio. Rascunho de formulário é aceitável.
- Não desabilitar RLS "temporariamente".
- Não fazer scraping da SEFAZ (a consulta tem reCAPTCHA). Só extrair a chave do QR.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
