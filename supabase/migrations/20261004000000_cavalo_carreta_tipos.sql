-- Cavalo × carreta (pedido de 2026-10-03), parte 1: só os tipos novos.
-- Fica separado porque um valor novo de enum não pode ser usado na mesma transação
-- em que é criado (a parte 2 usa 'carreta' na constraint de documentos).

alter type public.entidade_documento add value if not exists 'carreta';

-- truck = caminhão inteiro (toco, truck, bitruck); cavalo = cavalo mecânico que puxa carreta
create type public.tipo_veiculo as enum ('truck', 'cavalo');
