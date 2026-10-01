-- Configurações padrão (docs/04-REGRAS-DE-NEGOCIO.md). Ficam em migration, e não no
-- seed, porque também são necessárias em produção (db push não roda o seed).
-- Os valores podem ser alterados depois pela tela de configurações (S5-6).
insert into public.configuracoes (chave, valor, descricao) values
  ('rota_padrao_km',          '290',            'Distância de referência SJE↔BH por trecho (km)'),
  ('rota_padrao',             '{"origem":"São João Evangelista - MG","destino":"Belo Horizonte - MG"}', 'Pré-preenchimento de viagem'),
  ('km_viagem_tolerancia_pct','25',             'Alerta se km da viagem fugir desta % da rota padrão'),
  ('fator_tanque',            '1.05',           'Litros acima de capacidade × fator = anomalia'),
  ('consumo_tolerancia_pct',  '20',             'Faixa aceitável de km/L em torno da média do caminhão'),
  ('consumo_janela',          '10',             'Nº de medições para média móvel de consumo'),
  ('preco_tolerancia_pct',    '15',             'Faixa aceitável de preço/litro em torno da mediana de 30 dias'),
  ('intervalo_min_km',        '150',            'Abaixo disso entre abastecimentos = anomalia'),
  ('alerta_documentos_dias',  '[30, 15, 7]',    'Faixas de alerta de vencimento')
on conflict (chave) do nothing;
