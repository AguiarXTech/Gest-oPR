# ADR-0003: Sem banco local — desenvolvimento no Supabase Cloud

**Status:** Aceito · **Data:** 2026-10-01 · **Decisores:** dev (filho)

## Contexto

O fluxo original previa Postgres local via `supabase start`, que exige Docker Desktop (com WSL2 no Windows). O dev optou por não rodar banco na própria máquina.

## Decisão

- Dois projetos no Supabase Cloud:
  - **`gestao-frota-dev`** (plano Free): desenvolvimento, seed fictício, pgTAP e usuários de teste.
  - **produção** (plano gratuito no piloto, ver [ADR-0004](0004-producao-supabase-gratuito.md)): só recebe migrations via `db push`. Nunca seed nem `db reset`.
- Os scripts `db:*` usam `--linked`. `db:reset`, `db:test` e `dev:users` passam por `scripts/garantir-projeto-dev.ts`, que recusa rodar se o projeto vinculado não for o `SUPABASE_DEV_PROJECT_REF`.
- `supabase test db` exige Docker mesmo com `--linked` (roda `pg_prove` num container). Por isso `db:test` usa `scripts/testar-db.ts`, que executa cada arquivo de `supabase/tests` via `supabase db query --linked` (Management API) e lê o resumo do pgTAP antes do `rollback`. Cada asserção grava sua saída TAP numa tabela temporária, então a falha mostra o teste e o "esperado × obtido".
- As configurações padrão (`configuracoes`) saíram do seed e foram para uma migration, para chegarem à produção pelo `db push`.
- O CI continua rodando pgTAP com `supabase start` no runner do GitHub (banco descartável, fora da máquina do dev).

## Consequências

- **Positivas:** sem Docker local; o ambiente de dev é idêntico ao de produção (mesma versão do Supabase, Auth e Storage reais).
- **Negativas:**
  - precisa de internet para desenvolver;
  - `db:reset` apaga os dados do DEV (aceitável: só há dados fictícios);
  - o plano Free pausa após cerca de 1 semana sem uso (basta reativar no painel);
  - configurações de Auth do `supabase/config.toml` não valem na nuvem: ajustar no painel (signup desligado, senha mínima de 8).
- **Risco principal:** rodar um comando destrutivo na produção por engano. Mitigado pela trava `db:guard` e por manter o `supabase link` apontando para o DEV no dia a dia.
