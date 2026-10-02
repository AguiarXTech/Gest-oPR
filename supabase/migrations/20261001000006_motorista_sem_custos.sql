-- Q6 respondida em 2026-10-01: o motorista não tem acesso ao valor do frete nem a nada
-- relacionado às despesas do caminhão.
--
-- 1) acertos.total_frete_centavos: o motorista lê o próprio acerto fechado (RLS por linha
--    não esconde coluna). Era só informativo; a gestão calcula pelas viagens do acerto.
alter table public.acertos drop column total_frete_centavos;

-- 2) dados_analise_abastecimento: o preço por litro de todos os caminhões é custo da
--    empresa. Só o gestor recebe os preços; o motorista fica sem o aviso de preço.
create or replace function public.dados_analise_abastecimento(p_caminhao_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if public.papel_atual() is null then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'capacidade_tanque_l',
      (select capacidade_tanque_l from public.caminhoes where id = p_caminhao_id),
    'abastecimentos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'km', a.km, 'litros', a.litros,
               'tanque_cheio', a.tanque_cheio, 'data_hora', a.data_hora)
             order by a.km, a.data_hora)
        from (select id, km, litros, tanque_cheio, data_hora
                from public.abastecimentos
               where caminhao_id = p_caminhao_id
               order by km desc, data_hora desc
               limit 60) a), '[]'::jsonb),
    'precos_litro_centavos', case when public.is_gestor() then coalesce((
      select jsonb_agg(round(valor_total_centavos / litros))
        from public.abastecimentos
       where data_hora >= now() - interval '30 days'), '[]'::jsonb) else '[]'::jsonb end
  );
end $$;
