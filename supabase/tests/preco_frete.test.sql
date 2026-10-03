-- Teste: preço do frete no cliente, com reajuste. Ao concluir a viagem o frete entra
-- sozinho com o preço do dia da saída; motorista não vê preço nem frete.

begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

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
-- isola o teste de clientes que o DEV já tenha marcado
update public.clientes set frete_automatico = false;

-- duas viagens em andamento do M1 (caminhões diferentes não são necessários: uma por vez)
insert into public.viagens (id, caminhao_id, motorista_id, origem, destino, km_saida, data_saida) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001', 'SJE', 'BH', 1000, '2026-09-30 10:00-03');

-- ===== Dono cadastra o cliente com preço e reajuste =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select lives_ok(
  $$insert into public.clientes (id, razao_social, frete_automatico) values ('dddddddd-0000-0000-0000-000000000001', 'Japa Cimentos', true)$$,
  'gestor marca o cliente do frete automático');
select throws_ok(
  $$insert into public.clientes (razao_social, frete_automatico) values ('Outro', true)$$,
  '23505', null, 'só um cliente com frete automático');
select lives_ok(
  $$insert into public.precos_frete (cliente_id, sentido, vigencia_inicio, valor_centavos) values
    ('dddddddd-0000-0000-0000-000000000001', 'ida', '2026-01-01', 480000),
    ('dddddddd-0000-0000-0000-000000000001', 'ida', '2026-10-01', 508000)$$,
  'preço combinado e reajuste');

-- ===== M1 conclui a viagem que saiu antes do reajuste =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is((select count(*) from public.precos_frete)::int, 0, 'motorista não vê os preços');
select lives_ok(
  $$update public.viagens set status = 'concluida', km_chegada = 1580, data_chegada = '2026-10-01 18:00-03'
     where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'motorista conclui a viagem');
select is((select count(*) from public.fretes)::int, 0, 'motorista continua sem ver o frete');
-- nova viagem, depois do reajuste
select lives_ok(
  $$insert into public.viagens (id, caminhao_id, motorista_id, origem, destino, km_saida, data_saida)
    values ('bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001',
            'aaaaaaaa-0000-0000-0000-000000000001', 'SJE', 'BH', 1580, '2026-10-03 08:00-03')$$,
  'motorista inicia outra viagem');
update public.viagens set status = 'concluida', km_chegada = 2160, data_chegada = '2026-10-04 18:00-03'
 where id = 'bbbbbbbb-0000-0000-0000-000000000002';

-- ===== Dono confere =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select is(
  (select valor_frete_centavos from public.fretes where viagem_id = 'bbbbbbbb-0000-0000-0000-000000000001' and sentido = 'ida'),
  480000::bigint, 'viagem antes do reajuste usa o preço antigo');
select is(
  (select valor_frete_centavos from public.fretes where viagem_id = 'bbbbbbbb-0000-0000-0000-000000000002' and sentido = 'ida'),
  508000::bigint, 'viagem depois do reajuste usa o preço novo');
select is(
  (select count(*) from public.fretes where viagem_id = 'bbbbbbbb-0000-0000-0000-000000000002' and sentido = 'volta')::int,
  0, 'sentido sem preço combinado não lança nada');

select * from finish();
rollback;
