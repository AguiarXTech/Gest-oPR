-- Teste: manutenção preventiva, multas e foto do painel (adições do piloto).

begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'm1@teste.local'),
  ('33333333-3333-3333-3333-333333333333', 'dono@teste.local');
insert into public.funcionarios (id, nome, cpf) values ('aaaaaaaa-0000-0000-0000-000000000001', 'M1', '11111111111');
insert into public.profiles (id, nome, papel, funcionario_id) values
  ('11111111-1111-1111-1111-111111111111', 'M1', 'motorista', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('33333333-3333-3333-3333-333333333333', 'Dono', 'dono', null);
insert into public.caminhoes (id, placa, capacidade_tanque_l, km_atual) values
  ('cccccccc-0000-0000-0000-000000000001', 'TST1A11', 300, 100000);

-- ===== Como dono =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select lives_ok(
  $$insert into public.planos_manutencao (id, caminhao_id, item, intervalo_km, ultimo_km, ultima_data)
    values ('dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'Troca de óleo', 20000, 90000, '2026-06-01')$$,
  'gestor cria item do plano');
select throws_ok(
  $$insert into public.planos_manutencao (caminhao_id, item) values ('cccccccc-0000-0000-0000-000000000001', 'Sem intervalo')$$,
  '23514', null, 'item sem intervalo de km nem de dias é recusado');

insert into public.manutencoes (id, caminhao_id, data, km, descricao, valor_centavos)
values ('eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', '2026-09-30', 110500, 'Troca de óleo e filtros', 120000);
insert into public.manutencao_itens (manutencao_id, plano_id)
values ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001');

select is((select ultimo_km from public.planos_manutencao where id = 'dddddddd-0000-0000-0000-000000000001'), 110500,
          'cumprir o item atualiza o último km do plano');
select is((select ultima_data from public.planos_manutencao where id = 'dddddddd-0000-0000-0000-000000000001'), '2026-09-30'::date,
          'e a última data');
select is((select km_atual from public.caminhoes where id = 'cccccccc-0000-0000-0000-000000000001'), 110500,
          'km da manutenção atualiza o km do caminhão');

select lives_ok(
  $$insert into public.multas (caminhao_id, funcionario_id, data_infracao, valor_centavos, notificada_em, prazo_indicacao)
    values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-09-20 14:00-03', 19523, '2026-09-28', '2026-10-28')$$,
  'gestor lança multa');
select is((select count(*) from public.configuracoes where chave in ('manutencao_aviso_km', 'manutencao_aviso_dias', 'multa_prazo_indicacao_dias'))::int,
          3, 'configurações novas criadas');

-- ===== Como motorista =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is((select count(*) from public.manutencoes)::int, 0, 'motorista não vê manutenções (custo do caminhão, Q6)');
select is((select count(*) from public.multas)::int, 0, 'motorista não vê multas');
select throws_ok(
  $$insert into public.planos_manutencao (caminhao_id, item, intervalo_km) values ('cccccccc-0000-0000-0000-000000000001', 'x', 1)$$,
  '42501', null, 'motorista não mexe no plano');
select lives_ok(
  $$insert into public.abastecimentos (caminhao_id, motorista_id, km, litros, valor_total_centavos, foto_painel_path)
    values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 111000, 100, 60000,
            'aaaaaaaa-0000-0000-0000-000000000001/2026/10/painel.jpg')$$,
  'motorista salva a foto do painel no abastecimento');

select * from finish();
rollback;
