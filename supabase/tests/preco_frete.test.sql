-- Teste: preço do frete por produto/local, com reajuste; o trecho vem do local do produto.
-- Ao concluir a viagem, o frete entra sozinho pelo produto escolhido; motorista não vê valor.

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

-- ===== Dono cadastra cliente, produto/local e preço com reajuste =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select lives_ok(
  $$insert into public.clientes (id, razao_social, frete_automatico) values ('dddddddd-0000-0000-0000-000000000001', 'Japa Cimentos', true)$$,
  'gestor marca o cliente para lançar o frete sozinho');
select lives_ok(
  $$insert into public.locais_carga (id, cliente_id, nome, endereco, sentido) values
    ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'Cimento Liz', 'Vespasiano - MG', 'volta'),
    ('eeeeeeee-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000001', 'Areia', 'Guanhães - MG', 'ida')$$,
  'produtos com o trecho pelo lugar');
select lives_ok(
  $$insert into public.precos_frete (local_carga_id, vigencia_inicio, valor_centavos) values
    ('eeeeeeee-0000-0000-0000-000000000001', '2026-01-01', 480000),
    ('eeeeeeee-0000-0000-0000-000000000001', '2026-10-01', 508000),
    ('eeeeeeee-0000-0000-0000-000000000002', '2026-01-01', 150000)$$,
  'preço por produto e reajuste');
select throws_ok(
  $$insert into public.precos_frete (local_carga_id, vigencia_inicio, valor_centavos) values ('eeeeeeee-0000-0000-0000-000000000001', '2026-10-01', 1)$$,
  '23505', null, 'um preço por produto em cada data');

-- ===== M1: viagem antes do reajuste com Cimento Liz =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is((select count(*) from public.precos_frete)::int, 0, 'motorista não vê os preços');
insert into public.viagens (id, caminhao_id, motorista_id, origem, destino, km_saida, data_saida, local_carga_id) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'SJE', 'BH', 1000, '2026-09-30 10:00-03', 'eeeeeeee-0000-0000-0000-000000000001');
select lives_ok(
  $$update public.viagens set status = 'concluida', km_chegada = 1580, data_chegada = '2026-10-01 18:00-03'
     where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'motorista conclui a viagem');
-- depois do reajuste com Cimento Liz; e uma com Areia
insert into public.viagens (id, caminhao_id, motorista_id, origem, destino, km_saida, data_saida, local_carga_id) values
  ('bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'SJE', 'BH', 1580, '2026-10-03 08:00-03', 'eeeeeeee-0000-0000-0000-000000000001');
update public.viagens set status = 'concluida', km_chegada = 2160, data_chegada = '2026-10-04 18:00-03' where id = 'bbbbbbbb-0000-0000-0000-000000000002';
insert into public.viagens (id, caminhao_id, motorista_id, origem, destino, km_saida, data_saida, local_carga_id) values
  ('bbbbbbbb-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'SJE', 'BH', 2160, '2026-10-05 08:00-03', 'eeeeeeee-0000-0000-0000-000000000002');
update public.viagens set status = 'concluida', km_chegada = 2740, data_chegada = '2026-10-06 18:00-03' where id = 'bbbbbbbb-0000-0000-0000-000000000003';
-- sem produto escolhido ("Outra carga")
insert into public.viagens (id, caminhao_id, motorista_id, origem, destino, km_saida, data_saida) values
  ('bbbbbbbb-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'SJE', 'BH', 2740, '2026-10-07 08:00-03');
update public.viagens set status = 'concluida', km_chegada = 3320, data_chegada = '2026-10-08 18:00-03' where id = 'bbbbbbbb-0000-0000-0000-000000000004';

-- ===== Dono confere =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select results_eq(
  $$select sentido::text, valor_frete_centavos from public.fretes where viagem_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  $$values ('volta', 480000::bigint)$$,
  'Cimento Liz antes do reajuste: volta, preço antigo');
select results_eq(
  $$select sentido::text, valor_frete_centavos from public.fretes where viagem_id = 'bbbbbbbb-0000-0000-0000-000000000002'$$,
  $$values ('volta', 508000::bigint)$$,
  'Cimento Liz depois do reajuste: volta, preço novo');
select results_eq(
  $$select sentido::text, valor_frete_centavos from public.fretes where viagem_id = 'bbbbbbbb-0000-0000-0000-000000000003'$$,
  $$values ('ida', 150000::bigint)$$,
  'produto da região de SJE: frete na ida');
select is((select count(*) from public.fretes where viagem_id = 'bbbbbbbb-0000-0000-0000-000000000004')::int, 0,
  'sem produto escolhido: a gestão lança o frete');
select is((select cliente_id from public.fretes where viagem_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  'dddddddd-0000-0000-0000-000000000001'::uuid, 'frete vai para o cliente do produto');

select * from finish();
rollback;
