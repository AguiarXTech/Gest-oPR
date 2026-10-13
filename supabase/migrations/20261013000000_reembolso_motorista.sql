-- Quem pagou e baixa do reembolso ao motorista (pedido de 2026-10-13).
-- Manutenção (e qualquer despesa) diz quem pagou: o motorista (recebe de volta) ou a empresa.
-- O dono dá baixa quando paga direto ao motorista; o acerto não devolve de novo o que já teve
-- baixa (lib/domain/acerto.ts), e o que entrou em acerto fechado não aceita baixa (bloqueio
-- de item acertado). Uma devolução só, a que vier primeiro.

-- ---------------------------------------------------------------------
-- Despesas lançadas pelo motorista
-- ---------------------------------------------------------------------
alter table public.despesas_viagem
  add column pago_pelo_motorista boolean not null default true,
  add column reembolsado_em      timestamptz,
  add column reembolsado_por     uuid references auth.users(id);
alter table public.despesas_viagem
  add constraint baixa_so_se_motorista_pagou check (reembolsado_em is null or pago_pelo_motorista);

-- motorista não dá baixa nem tira baixa (só a gestão); separado de proteger_lancamento_motorista,
-- que também roda em abastecimentos (sem essas colunas)
create function public.proteger_baixa_reembolso()
returns trigger language plpgsql as $$
begin
  if public.contexto_privilegiado() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.reembolsado_em  := null;
    new.reembolsado_por := null;
    return new;
  end if;
  if new.reembolsado_em is distinct from old.reembolsado_em
  or new.reembolsado_por is distinct from old.reembolsado_por then
    raise exception 'Só a gestão dá baixa no reembolso.';
  end if;
  return new;
end $$;

create trigger trg_despesas_baixa_reembolso
before insert or update on public.despesas_viagem
for each row execute function public.proteger_baixa_reembolso();

-- ---------------------------------------------------------------------
-- Manutenção lançada pela gestão: pode ter sido paga por um motorista
-- ---------------------------------------------------------------------
alter table public.manutencoes
  add column pago_por_funcionario_id uuid references public.funcionarios(id),
  add column reembolsado_em          timestamptz,
  add column reembolsado_por         uuid references auth.users(id);
alter table public.manutencoes
  add constraint baixa_so_se_motorista_pagou check (reembolsado_em is null or pago_por_funcionario_id is not null);

-- ---------------------------------------------------------------------
-- Baixa (e desfazer baixa, se marcou errado): só gestão; fica na auditoria (trigger da tabela)
-- ---------------------------------------------------------------------
create function public.dar_baixa_reembolso(p_origem text, p_id uuid, p_desfazer boolean default false)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if not public.is_gestor() then
    raise exception 'Só dono ou administração dá baixa no reembolso.' using errcode = '42501';
  end if;

  if p_origem = 'despesa' then
    update public.despesas_viagem
       set reembolsado_em  = case when p_desfazer then null else now() end,
           reembolsado_por = case when p_desfazer then null else auth.uid() end
     where id = p_id and pago_pelo_motorista and reembolsavel
       and (case when p_desfazer then reembolsado_em is not null else reembolsado_em is null end);
  elsif p_origem = 'manutencao' then
    update public.manutencoes
       set reembolsado_em  = case when p_desfazer then null else now() end,
           reembolsado_por = case when p_desfazer then null else auth.uid() end
     where id = p_id and pago_por_funcionario_id is not null
       and (case when p_desfazer then reembolsado_em is not null else reembolsado_em is null end);
  else
    raise exception 'Origem inválida.';
  end if;

  if not found then
    raise exception 'Nada para dar baixa: já teve baixa, foi pago pela empresa ou não existe.';
  end if;
end $$;

revoke all on function public.dar_baixa_reembolso(text, uuid, boolean) from public, anon;
grant execute on function public.dar_baixa_reembolso(text, uuid, boolean) to authenticated;
