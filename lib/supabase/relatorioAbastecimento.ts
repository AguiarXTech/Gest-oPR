// Abastecimentos do período para o relatório (RF-50), já no formato do domínio.
import { linhaDoBanco, type LinhaAbastecimento } from '@/lib/domain/relatorioAbastecimento';
import type { createClient } from '@/lib/supabase/server';

type Cliente = Awaited<ReturnType<typeof createClient>>;

export async function carregarAbastecimentosRelatorio(
  supabase: Cliente,
  inicio: string,
): Promise<LinhaAbastecimento[]> {
  const { data, error } = await supabase
    .from('abastecimentos')
    .select(
      'data_hora, km, litros, valor_total_centavos, tanque_cheio, posto_nome, caminhoes(placa), funcionarios(nome), fornecedores(nome, cidade)',
    )
    .gte('data_hora', inicio)
    .order('data_hora');
  if (error) throw new Error('Não foi possível carregar os abastecimentos.');
  return (data ?? []).map(linhaDoBanco);
}
