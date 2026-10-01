-- Teste S2-1: formato da chave de acesso no banco (numérica e com CNPJ alfanumérico).
-- As chaves abaixo têm DV correto, calculado por lib/domain/nfce.ts (calcularDvChave).

begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into public.funcionarios (id, nome, cpf) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'M1', '11111111111');
insert into public.caminhoes (id, placa, capacidade_tanque_l) values
  ('cccccccc-0000-0000-0000-000000000001', 'TST1A11', 300);
insert into public.viagens (id, caminhao_id, motorista_id, origem, destino, km_saida)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000001', 'SJE', 'BH', 1000);

select lives_ok(
  $$insert into public.abastecimentos (caminhao_id, motorista_id, km, litros, valor_total_centavos, nfce_chave)
    values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1100, 100, 60000,
            '31260911222333000181650010000012341000012345')$$,
  'NFC-e com chave numérica');
select lives_ok(
  $$insert into public.abastecimentos (caminhao_id, motorista_id, km, litros, valor_total_centavos, nfce_chave)
    values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1200, 100, 60000,
            '312609' || '12ABC34501DE35' || '650010000056781000056780')$$,
  'NFC-e com CNPJ alfanumérico no emitente');
select throws_ok(
  $$insert into public.abastecimentos (caminhao_id, motorista_id, km, litros, valor_total_centavos, nfce_chave)
    values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1300, 100, 60000,
            'A1260911222333000181650010000012341000012345')$$,
  '23514', null, 'letra fora da posição do CNPJ é recusada');
select throws_ok(
  $$insert into public.abastecimentos (caminhao_id, motorista_id, km, litros, valor_total_centavos, nfce_chave)
    values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1400, 100, 60000,
            '312609' || '12abc34501de35' || '650010000056781000056780')$$,
  '23514', null, 'minúsculas são recusadas (o app normaliza antes)');
select lives_ok(
  $$insert into public.fretes (viagem_id, sentido, valor_frete_centavos, cte_chave, mdfe_chave)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 'volta', 450000,
            '312609' || '12ABC34501DE35' || '570010000056781000056784',
            '312609' || '12ABC34501DE35' || '580010000056781000056788')$$,
  'CT-e e MDF-e com CNPJ alfanumérico');
select throws_ok(
  $$insert into public.fretes (viagem_id, sentido, valor_frete_centavos, cte_chave)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 'ida', 1, '123')$$,
  '23514', null, 'chave de CT-e com tamanho errado é recusada');

select * from finish();
rollback;
