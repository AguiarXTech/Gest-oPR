-- Carreta (pedido de 2026-10-03): composição (carreta, bitrem, rodotrem), que define os
-- eixos, separada da carroceria (vanderléia, tanque, caçamba...). O texto livre "tipo"
-- passa a ser a carroceria.

alter table public.carretas rename column tipo to carroceria;
alter table public.carretas
  add column composicao text not null default 'carreta'
  check (composicao in ('carreta', 'bitrem', 'rodotrem'));
