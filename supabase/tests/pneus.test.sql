-- Teste: ciclo do pneu (estoque → montado → recapagem → estoque → carreta → descarte),
-- posição ocupada, e motorista sem acesso.

begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'm1@teste.local'),
  ('33333333-3333-3333-3333-333333333333', 'dono@teste.local');
insert into public.funcionarios (id, nome, cpf) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'M1', '11111111111');
insert into public.profiles (id, nome, papel, funcionario_id) values
  ('11111111-1111-1111-1111-111111111111', 'M1', 'motorista', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('33333333-3333-3333-3333-333333333333', 'Dono', 'dono', null);
insert into public.caminhoes (id, placa, capacidade_tanque_l, tipo, eixos) values
  ('cccccccc-0000-0000-0000-000000000001', 'CAV1A11', 500, 'cavalo', 3);
insert into public.carretas (id, placa, eixos) values ('dddddddd-0000-0000-0000-000000000001', 'CAR1C11', 3);

-- ===== Dono =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select lives_ok(
  $$insert into public.pneus (id, marca_fogo, marca, medida, condicao_entrada, valor_compra_centavos) values
    ('eeeeeeee-0000-0000-0000-000000000001', 'F001', 'Michelin', '295/80 R22.5', 'novo', 250000),
    ('eeeeeeee-0000-0000-0000-000000000002', 'F002', 'Pirelli', '295/80 R22.5', 'usado', 80000)$$,
  'cadastra pneu novo e usado no estoque');
select throws_ok($$insert into public.pneus (marca_fogo) values ('F001')$$, '23505', null, 'marca de fogo é única');

select lives_ok($$select public.montar_pneu('eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', null, '2EE', 500000)$$,
  'monta no cavalo');
select is((select status::text from public.pneus where id = 'eeeeeeee-0000-0000-0000-000000000001'), 'montado', 'status montado');
select throws_ok($$select public.montar_pneu('eeeeeeee-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001', null, '2EE', 500000)$$,
  '23505', null, 'posição já ocupada');
select throws_ok($$select public.montar_pneu('eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', null, '2DE', 500000)$$,
  'P0001', 'Só dá para montar pneu que está no estoque.', 'pneu montado não monta de novo');
select throws_ok($$select public.descartar_pneu('eeeeeeee-0000-0000-0000-000000000001', 'furou')$$,
  'P0001', 'Retire o pneu do veículo antes de descartar.', 'montado não descarta direto');

select lives_ok($$select public.retirar_pneu('eeeeeeee-0000-0000-0000-000000000001', 80000, 580000, 'recapagem')$$,
  'retira com 80.000 km e manda para recapagem');
select results_eq(
  $$select km_rodado, km_retirada from public.montagens_pneu where pneu_id = 'eeeeeeee-0000-0000-0000-000000000001'$$,
  $$values (80000, 580000)$$, 'km da montagem gravado');
select lives_ok($$select public.retorno_recapagem('eeeeeeee-0000-0000-0000-000000000001', 90000)$$, 'volta da recapagem');
select results_eq(
  $$select status::text, vida from public.pneus where id = 'eeeeeeee-0000-0000-0000-000000000001'$$,
  $$values ('estoque', 1::smallint)$$, 'volta para o estoque com vida 1');

select lives_ok($$select public.montar_pneu('eeeeeeee-0000-0000-0000-000000000001', null, 'dddddddd-0000-0000-0000-000000000001', '1EE')$$,
  'monta na carreta (sem hodômetro)');
select is((select vida from public.montagens_pneu where pneu_id = 'eeeeeeee-0000-0000-0000-000000000001' and retirado_em is null),
  1::smallint, 'montagem guarda a vida do pneu');
select lives_ok($$select public.retirar_pneu('eeeeeeee-0000-0000-0000-000000000001', 1160, null, 'descarte', null, 'Estourou na estrada')$$,
  'retira da carreta e descarta com motivo');
select is((select motivo_descarte from public.pneus where id = 'eeeeeeee-0000-0000-0000-000000000001'), 'Estourou na estrada', 'motivo do descarte');

-- ===== Motorista não vê pneus =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is((select count(*) from public.pneus)::int, 0, 'motorista não vê pneus');

select * from finish();
rollback;
