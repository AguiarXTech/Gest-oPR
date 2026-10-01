-- S4-4: cria o acerto (rascunho) e vincula, numa única transação, os itens do
-- motorista no período que ainda não estão em acerto (docs/04 §7):
--   viagens concluídas (por data de saída), abastecimentos e despesas (por data),
--   adiantamentos (por data). Datas no horário de Brasília.
-- SECURITY INVOKER: roda com a RLS de quem chama; só gestor passa.

create or replace function public.criar_acerto(p_motorista_id uuid, p_inicio date, p_fim date)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
begin
  if not public.is_gestor() then
    raise exception 'Somente o gestor cria acertos.' using errcode = '42501';
  end if;
  if p_fim < p_inicio then
    raise exception 'O fim do período é antes do início.';
  end if;

  insert into public.acertos (motorista_id, periodo_inicio, periodo_fim)
  values (p_motorista_id, p_inicio, p_fim)
  returning id into v_id;

  update public.viagens set acerto_id = v_id
   where motorista_id = p_motorista_id and acerto_id is null and status = 'concluida'
     and (data_saida at time zone 'America/Sao_Paulo')::date between p_inicio and p_fim;

  update public.abastecimentos set acerto_id = v_id
   where motorista_id = p_motorista_id and acerto_id is null
     and (data_hora at time zone 'America/Sao_Paulo')::date between p_inicio and p_fim;

  update public.despesas_viagem set acerto_id = v_id
   where motorista_id = p_motorista_id and acerto_id is null and data between p_inicio and p_fim;

  update public.adiantamentos set acerto_id = v_id
   where motorista_id = p_motorista_id and acerto_id is null and data between p_inicio and p_fim;

  return v_id;
end $$;

revoke all on function public.criar_acerto(uuid, date, date) from public, anon;
grant execute on function public.criar_acerto(uuid, date, date) to authenticated;
