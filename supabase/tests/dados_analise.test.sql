-- Teste S2-5: dados_analise_abastecimento devolve os números do caminhão inteiro
-- (inclusive de outro motorista), sem dados pessoais, e só para usuário ativo.

begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'm1@teste.local'),
  ('22222222-2222-2222-2222-222222222222', 'm2@teste.local');
insert into public.funcionarios (id, nome, cpf, ativo) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'M1', '11111111111', true),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'M2', '22222222222', true);
insert into public.profiles (id, nome, papel, funcionario_id) values
  ('11111111-1111-1111-1111-111111111111', 'M1', 'motorista', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('22222222-2222-2222-2222-222222222222', 'M2', 'motorista', 'aaaaaaaa-0000-0000-0000-000000000002');
insert into public.caminhoes (id, placa, capacidade_tanque_l) values
  ('cccccccc-0000-0000-0000-000000000001', 'TST1A11', 300);

-- tanque cheio anterior feito pelo M2
insert into public.abastecimentos (caminhao_id, motorista_id, km, litros, valor_total_centavos, tanque_cheio, data_hora)
values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 900000, 250, 150000, true, now() - interval '2 days');

-- ===== Como M1 =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is((select count(*) from public.abastecimentos where km = 900000)::int, 0, 'M1 não lê o abastecimento do M2 direto');
select is(
  jsonb_array_length(public.dados_analise_abastecimento('cccccccc-0000-0000-0000-000000000001') -> 'abastecimentos'),
  1, 'mas a função traz o tanque cheio anterior do caminhão');
select is(
  (public.dados_analise_abastecimento('cccccccc-0000-0000-0000-000000000001') #>> '{capacidade_tanque_l}')::numeric,
  300::numeric, 'traz a capacidade do tanque');
select ok(
  not (public.dados_analise_abastecimento('cccccccc-0000-0000-0000-000000000001') -> 'abastecimentos' -> 0) ?| array['motorista_id', 'foto_path', 'nfce_chave'],
  'sem motorista, foto nem nota');
select is(
  public.dados_analise_abastecimento('cccccccc-0000-0000-0000-000000000001') -> 'precos_litro_centavos',
  '[]'::jsonb, 'motorista não recebe preços (custo do caminhão, Q6)');

-- ===== M1 desativado =====
reset role;
update public.funcionarios set ativo = false where id = 'aaaaaaaa-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok(
  $$select public.dados_analise_abastecimento('cccccccc-0000-0000-0000-000000000001')$$,
  '42501', null, 'usuário desativado não acessa');

select * from finish();
rollback;
