-- Teste: viagem = ciclo com fretes (Q1/Q3). Gestor lança fretes de ida/volta;
-- motorista não vê nem lança; frete de viagem em acerto fechado fica bloqueado.

begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'm1@teste.local'),
  ('33333333-3333-3333-3333-333333333333', 'dono@teste.local');

insert into public.funcionarios (id, nome, cpf) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'M1', '11111111111');

insert into public.profiles (id, nome, papel, funcionario_id) values
  ('11111111-1111-1111-1111-111111111111', 'M1', 'motorista', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('33333333-3333-3333-3333-333333333333', 'Dono', 'dono', null);

insert into public.caminhoes (id, placa, capacidade_tanque_l) values
  ('cccccccc-0000-0000-0000-000000000001', 'TST1A11', 300);

-- Ciclo concluído do M1
insert into public.viagens (id, caminhao_id, motorista_id, origem, destino, km_saida, km_chegada, data_chegada, status)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000001', 'SJE', 'BH', 1000, 1580, now(), 'concluida');

-- ===== Como dono =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select lives_ok(
  $$insert into public.fretes (viagem_id, sentido, valor_frete_centavos)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 'volta', 450000)$$,
  'gestor lança frete da volta');
select throws_ok(
  $$insert into public.fretes (viagem_id, sentido, valor_frete_centavos)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 'volta', 100)$$,
  '23505', null, 'só um frete de volta por viagem');
select lives_ok(
  $$insert into public.fretes (viagem_id, sentido, valor_frete_centavos)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 'ida', 120000)$$,
  'gestor lança frete da ida (quando houver carga)');
select is(
  (select frete_total_centavos from public.vw_viagens_resumo where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  570000::numeric, 'receita da viagem = ida + volta');
select is(
  (select quantidade_fretes from public.vw_viagens_resumo where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  2::bigint, 'viagem com 2 fretes');

-- ===== Como motorista dono da viagem =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is((select count(*) from public.viagens)::int, 1, 'motorista vê a própria viagem');
select is((select count(*) from public.fretes)::int, 0, 'motorista não vê os fretes da própria viagem');
select throws_ok(
  $$insert into public.fretes (viagem_id, sentido, valor_frete_centavos)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 'ida', 1)$$,
  '42501', null, 'motorista não lança frete');

-- ===== Acerto fechado bloqueia os fretes da viagem =====
reset role;
insert into public.acertos (id, motorista_id, periodo_inicio, periodo_fim)
values ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', current_date - 30, current_date);
update public.viagens set acerto_id = 'dddddddd-0000-0000-0000-000000000001'
 where id = 'bbbbbbbb-0000-0000-0000-000000000001';
update public.acertos set status = 'fechado', regra_snapshot = '{}'::jsonb
 where id = 'dddddddd-0000-0000-0000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select throws_ok(
  $$update public.fretes set valor_frete_centavos = 1 where sentido = 'volta'$$,
  'P0001', null, 'frete de viagem acertada não pode ser alterado');
select throws_ok(
  $$delete from public.fretes where sentido = 'ida'$$,
  'P0001', null, 'frete de viagem acertada não pode ser apagado');

reset role;
select is((select sum(valor_frete_centavos) from public.fretes where viagem_id = 'bbbbbbbb-0000-0000-0000-000000000001')::bigint,
          570000::bigint, 'fretes continuam intactos');

select * from finish();
rollback;
