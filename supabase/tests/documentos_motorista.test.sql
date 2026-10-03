-- Teste: motorista vê só a própria CNH e os documentos do cavalo e da carreta da viagem
-- em andamento; terminou a viagem, deixa de ver os do veículo.

begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'm1@teste.local'),
  ('22222222-2222-2222-2222-222222222222', 'm2@teste.local');
insert into public.funcionarios (id, nome, cpf) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'M1', '11111111111'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'M2', '22222222222');
insert into public.profiles (id, nome, papel, funcionario_id) values
  ('11111111-1111-1111-1111-111111111111', 'M1', 'motorista', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('22222222-2222-2222-2222-222222222222', 'M2', 'motorista', 'aaaaaaaa-0000-0000-0000-000000000002');
insert into public.caminhoes (id, placa, capacidade_tanque_l, tipo) values
  ('cccccccc-0000-0000-0000-000000000001', 'CAV1A11', 500, 'cavalo'),
  ('cccccccc-0000-0000-0000-000000000002', 'CAV2B22', 500, 'cavalo');
insert into public.carretas (id, placa) values ('dddddddd-0000-0000-0000-000000000001', 'CAR1C11');
insert into public.documentos (id, tipo, entidade, funcionario_id, caminhao_id, carreta_id, vencimento) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'cnh',          'funcionario', 'aaaaaaaa-0000-0000-0000-000000000001', null, null, '2028-01-01'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'toxicologico', 'funcionario', 'aaaaaaaa-0000-0000-0000-000000000001', null, null, '2027-01-01'),
  ('eeeeeeee-0000-0000-0000-000000000003', 'cnh',          'funcionario', 'aaaaaaaa-0000-0000-0000-000000000002', null, null, '2028-01-01'),
  ('eeeeeeee-0000-0000-0000-000000000004', 'crlv',         'caminhao', null, 'cccccccc-0000-0000-0000-000000000001', null, '2027-03-31'),
  ('eeeeeeee-0000-0000-0000-000000000005', 'crlv',         'carreta',  null, null, 'dddddddd-0000-0000-0000-000000000001', '2027-03-31'),
  ('eeeeeeee-0000-0000-0000-000000000006', 'crlv',         'caminhao', null, 'cccccccc-0000-0000-0000-000000000002', null, '2027-03-31');

-- ===== M1 sem viagem =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select results_eq($$select id from public.documentos$$, $$values ('eeeeeeee-0000-0000-0000-000000000001'::uuid)$$,
  'sem viagem: só a própria CNH');
select is((select count(*) from public.documentos where tipo = 'toxicologico')::int, 0, 'toxicológico não aparece');

-- inicia viagem com o cavalo 1 + carreta
insert into public.viagens (id, caminhao_id, carreta_id, motorista_id, origem, destino, km_saida)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000001', 'SJE', 'BH', 1000);
select set_eq($$select id from public.documentos$$,
  $$values ('eeeeeeee-0000-0000-0000-000000000001'::uuid), ('eeeeeeee-0000-0000-0000-000000000004'), ('eeeeeeee-0000-0000-0000-000000000005')$$,
  'em viagem: CNH + documentos do cavalo e da carreta');
select is((select count(*) from public.documentos where caminhao_id = 'cccccccc-0000-0000-0000-000000000002')::int, 0,
  'documento de outro cavalo não aparece');
select is((select count(*) from public.documentos where id = 'eeeeeeee-0000-0000-0000-000000000003')::int, 0,
  'CNH de outro motorista não aparece');
select is((select count(*) from public.vw_documentos_status)::int, 3, 'a visão de situação respeita o mesmo filtro');

-- termina a viagem
update public.viagens set status = 'concluida', km_chegada = 1580, data_chegada = now()
 where id = 'bbbbbbbb-0000-0000-0000-000000000001';
select results_eq($$select id from public.documentos$$, $$values ('eeeeeeee-0000-0000-0000-000000000001'::uuid)$$,
  'terminou a viagem: volta a ver só a CNH');

-- ===== M2 não vê os documentos da viagem do M1 =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select results_eq($$select id from public.documentos$$, $$values ('eeeeeeee-0000-0000-0000-000000000003'::uuid)$$,
  'outro motorista: só a CNH dele');

select * from finish();
rollback;
