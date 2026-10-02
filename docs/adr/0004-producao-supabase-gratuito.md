# ADR-0004: Produção no Supabase gratuito, com backup noturno próprio

**Status:** Aceito · **Data:** 2026-10-01 · **Decisores:** dev (filho), com aval do dono · **Substitui em parte:** ADR-0003 (que previa produção no plano Pro)

## Contexto

O plano original (ADR-0003, `02-ARQUITETURA.md` §7, RNF-04/05) previa a produção no Supabase **Pro** (US$ 25/mês) por dois motivos: o plano gratuito pausa o projeto após cerca de 7 dias sem uso e não tem backup automático adequado. No começo, com o app em piloto e sem os acertos reais dependendo dele, o custo pesa mais que esses riscos.

## Decisão

- A produção roda num **segundo projeto do Supabase no plano gratuito**, separado do `gestao-frota-dev`.
- **Backup noturno gratuito** pelo GitHub Actions (`.github/workflows/backup.yml`):
  - todo dia às 03:00 (Brasília) faz `supabase db dump` do esquema e dos dados (`public` + usuários do `auth`);
  - **criptografa** o arquivo com senha (`gpg --symmetric`, AES-256) antes de guardar, porque o dump tem CPF, PIX, salários e valores (LGPD, `05-PERMISSOES-E-LGPD.md`);
  - guarda como *artifact* do GitHub com **retenção de 7 dias** (repositório privado; só quem tem acesso ao repositório baixa, e ainda precisa da senha).
  - Segredos no GitHub (Settings → Secrets → Actions): `SUPABASE_PROD_DB_URL` (string de conexão do pooler, modo sessão, com a senha) e `BACKUP_SENHA`.
- **Exportação CSV mensal** (acertos e abastecimentos, S4-7) continua como segunda cópia, guardada pelo escritório (RNF-05).
- **Subir para o Pro** quando os acertos reais passarem a depender só do app (fim do piloto, quando o acerto em paralelo for abandonado) ou se a pausa por inatividade incomodar.

## Riscos aceitos

| Risco | Efeito | Mitigação |
|---|---|---|
| Pausa após ~7 dias sem uso | App fora do ar até alguém reativar no painel | Uso diário pelos motoristas evita; se pausar, reativar em Project → Restore |
| Sem backup automático do Supabase nem restauração a um ponto no tempo | Perda do que foi lançado depois do último backup noturno | Backup noturno criptografado + CSV mensal |
| **Fotos dos comprovantes (Storage) não entram no dump** | Perda das fotos num desastre | Aceito no piloto; no Pro ou com backup de Storage na fase 2 |
| Limites do plano gratuito (500 MB de banco, 1 GB de Storage) | Uploads recusados ao lotar | Fotos comprimidas (~300 KB): ~3.000 fotos por GB; acompanhar no painel |

## Como restaurar (resumo)

1. Baixar o artifact do dia em Actions → Backup noturno.
2. `gpg --decrypt backup.tar.gz.gpg > backup.tar.gz` (pede a `BACKUP_SENHA`) e `tar xzf backup.tar.gz`.
3. Num projeto novo: `psql "<url>" -f esquema.sql` e depois `psql "<url>" -f dados.sql`.

## Consequências

- **Positivas:** custo zero de banco no piloto (RNF-04 fica só com domínio); mesmos recursos de Auth, RLS e Storage.
- **Negativas:** os riscos acima; manter os dois segredos do backup.
