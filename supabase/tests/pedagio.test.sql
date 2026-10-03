-- Teste: controle de pedágio (praças, tarifas, cobranças) só da gestão; eixos protegidos.

begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'm1@teste.local'),
  ('33333333-3333-3333-3333-333333333333', 'dono@teste.local');
insert into public.funcionarios (id, nome, cpf) values ('aaaaaaaa-0000-0000-0000-000000000001', 'M1', '11111111111');
insert into public.profiles (id, nome, papel, funcionario_id) values
  ('11111111-1111-1111-1111-111111111111', 'M1', 'motorista', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('33333333-3333-3333-3333-333333333333', 'Dono', 'dono', null);
insert into public.caminhoes (id, placa, capacidade_tanque_l, eixos, eixos_suspensos) values
  ('cccccccc-0000-0000-0000-000000000001', 'TST1A11', 300, 3, 1);
insert into public.viagens (id, caminhao_id, motorista_id, origem, destino, km_saida)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'SJE', 'BH', 1000);

-- ===== Dono =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select throws_ok($$update public.caminhoes set eixos_suspensos = 3 where id = 'cccccccc-0000-0000-0000-000000000001'$$,
  '23514', null, 'eixos suspensos não podem ser todos os eixos');
select lives_ok(
  $$insert into public.pracas_pedagio (id, nome, rodovia) values ('eeeeeeee-0000-0000-0000-000000000001', 'Roças Novas', 'BR-381');
    insert into public.tarifas_pedagio (praca_id, vigencia_inicio, tarifa_eixo_centavos) values ('eeeeeeee-0000-0000-0000-000000000001', '2026-08-06', 1620)$$,
  'gestor cadastra praça e tarifa');
select lives_ok(
  $$insert into public.cobrancas_pedagio (viagem_id, praca_id, sentido, valor_cobrado_centavos, situacao)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001', 'ida', 4860, 'contestar')$$,
  'gestor lança o valor cobrado pelo app');
select throws_ok(
  $$insert into public.cobrancas_pedagio (viagem_id, praca_id, sentido, valor_cobrado_centavos)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001', 'ida', 1)$$,
  '23505', null, 'uma cobrança por passagem');
select lives_ok($$update public.viagens set eixos_ida = 4 where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'gestor ajusta os eixos da viagem (ex.: reboque)');

-- ===== Motorista =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is((select count(*) from public.cobrancas_pedagio)::int, 0, 'motorista não vê cobranças (custo, Q6)');
select is((select count(*) from public.tarifas_pedagio)::int, 0, 'motorista não vê tarifas');
select throws_ok($$update public.viagens set eixos_ida = 2 where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'P0001', null, 'motorista não altera os eixos da viagem');

select * from finish();
rollback;
