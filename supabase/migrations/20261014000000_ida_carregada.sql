-- Carregado ou vazio na ida (pedido de 2026-10-14): o motorista responde ao iniciar a viagem.
-- Vazio ergue os eixos e paga menos pedágio; carregado paga todos os eixos.
-- null = viagem antiga (antes da pergunta): o pedágio previsto usa o frete da ida.
alter table public.viagens
  add column ida_carregada boolean;

comment on column public.viagens.ida_carregada is
  'Resposta do motorista ao iniciar: true = carregado na ida (eixos no chão), false = vazio (eixos erguidos), null = não perguntado.';
