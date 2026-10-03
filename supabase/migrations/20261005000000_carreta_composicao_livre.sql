-- Composição da carreta em texto livre (pedido de 2026-10-03): a variação é grande
-- (carreta, vanderléia, bitrem, rodotrem, 2 a 9 eixos...), então nada de lista fixa.
-- Os eixos de cada cadastro são digitados à mão.

alter table public.carretas drop constraint if exists carretas_composicao_check;
alter table public.carretas alter column composicao drop not null;
alter table public.carretas alter column composicao drop default;
