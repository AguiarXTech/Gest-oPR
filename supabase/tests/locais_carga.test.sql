-- Teste: locais de carga no cliente; gestor cadastra, motorista só lê e escolhe na viagem.

begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

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
insert into public.clientes (id, razao_social) values ('dddddddd-0000-0000-0000-000000000001', 'Japa Cimentos');

-- ===== Dono =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select lives_ok(
  $$insert into public.locais_carga (id, cliente_id, nome, endereco)
    values ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'Cimento Liz', 'Vespasiano - MG')$$,
  'gestor cadastra o local de carga do cliente');
select throws_ok(
  $$insert into public.locais_carga (cliente_id, nome) values ('dddddddd-0000-0000-0000-000000000001', ' ')$$,
  '23514', null, 'local precisa de nome');

-- ===== Motorista =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is((select nome from public.locais_carga where id = 'eeeeeeee-0000-0000-0000-000000000001'), 'Cimento Liz', 'motorista vê os locais de carga');
select is((select count(*) from public.clientes where id = 'dddddddd-0000-0000-0000-000000000001')::int, 0, 'motorista continua sem ver o cliente');
select throws_ok(
  $$insert into public.locais_carga (cliente_id, nome) values ('dddddddd-0000-0000-0000-000000000001', 'Outro')$$,
  '42501', null, 'motorista não cadastra local');
select lives_ok(
  $$insert into public.viagens (caminhao_id, motorista_id, origem, destino, km_saida, local_carga_id)
    values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'SJE', 'BH', 1000, 'eeeeeeee-0000-0000-0000-000000000001')$$,
  'motorista inicia a viagem escolhendo onde vai carregar');

select * from finish();
rollback;
