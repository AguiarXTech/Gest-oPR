# Gestão Frota — App interno da transportadora

App para controlar viagens, abastecimentos, despesas, comissões e acertos de motoristas, vencimentos de documentos e o resultado por caminhão. Em fases seguintes, entram pneus, estoque, manutenção e financeiro completo.

- **Usuários:** dono, administrativo/financeiro e motoristas.
- **Operação:** 5 caminhões, rota São João Evangelista ↔ Belo Horizonte (MG).

## Por que existe

As soluções prontas avaliadas no mercado não cobrem, a um custo viável para 3–5 caminhões:

- a comissão no formato da empresa;
- o acerto de viagem;
- o lucro por viagem/caminhão;
- o ciclo de vida dos pneus.

A emissão de CT-e/MDF-e continua em um emissor de mercado (ver `docs/adr/0002-fiscal-terceirizado.md`).

## Quick start

Pré-requisitos: Node LTS e um projeto **`gestao-frota-dev`** no [Supabase Cloud](https://supabase.com/dashboard) (plano Free). Não há banco local nem Docker (ver [ADR 0003](docs/adr/0003-banco-somente-nuvem.md)). O Supabase CLI vem como dependência do projeto.

```bash
git clone <repo> && cd gestao-frota
npm install
cp .env.example .env.local        # preencha com URL e chaves do projeto DEV (Settings → API)
npx supabase login                # abre o navegador (uma vez por máquina)
npx supabase link --project-ref <ref-do-projeto-dev>   # pede a senha do banco
npm run db:reset                  # recria o banco DEV: migrations + seed
npm run db:test                   # pgTAP no projeto DEV
npm run db:types
npm run dev:users                 # dono, admin e 3 motoristas de teste
npm run dev                       # http://localhost:3000
```

O seed cria só dados de negócio fictícios. No projeto DEV, desligue o signup público no painel (Authentication → Sign In / Providers): o `supabase/config.toml` só vale para banco local.

## Variáveis de ambiente

| Variável | Onde | Observação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente + servidor | URL do projeto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente + servidor | chave pública (protegida por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **somente servidor** | usada apenas para criar/desativar usuários |
| `SUPABASE_DEV_PROJECT_REF` | só `.env.local` | ref do projeto DEV; trava `db:reset`, `db:test` e `dev:users` |

## Documentação

| Documento | Conteúdo |
|---|---|
| [AGENTS.md](AGENTS.md) | Regras para o agente de programação (ler primeiro) |
| [docs/01-PRD.md](docs/01-PRD.md) | Escopo, personas, requisitos, critérios de aceite, perguntas em aberto |
| [docs/02-ARQUITETURA.md](docs/02-ARQUITETURA.md) | Stack, estrutura de pastas, auth, storage, deploy |
| [docs/03-MODELO-DE-DADOS.md](docs/03-MODELO-DE-DADOS.md) | Entidades, relacionamentos, fase 2 |
| [docs/04-REGRAS-DE-NEGOCIO.md](docs/04-REGRAS-DE-NEGOCIO.md) | Comissão, acerto, consumo, anomalias, NFC-e, pneus |
| [docs/05-PERMISSOES-E-LGPD.md](docs/05-PERMISSOES-E-LGPD.md) | Matriz de permissões, RLS, LGPD |
| [docs/06-ROADMAP.md](docs/06-ROADMAP.md) | Sprints, tarefas e definição de pronto |
| [docs/adr/](docs/adr/) | Decisões de arquitetura |
| [supabase/migrations/](supabase/migrations/) | Schema inicial do MVP com RLS |

## Status

MVP em construção — ver `docs/06-ROADMAP.md`.
