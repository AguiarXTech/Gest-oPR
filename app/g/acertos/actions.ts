'use server';

// Fechar o acerto recalcula tudo NO SERVIDOR com os dados do momento (a tela pode
// estar desatualizada) e grava totais + snapshot da regra numa só atualização.
// Usa a sessão do gestor: a RLS e os triggers do banco continuam valendo.
import { revalidatePath } from 'next/cache';
import { carregarAcerto } from '@/lib/supabase/acerto';
import { createClient } from '@/lib/supabase/server';

export type EstadoFechamento = { erro?: string; ok?: string };

export async function fecharAcerto(acertoId: string): Promise<EstadoFechamento> {
  const supabase = await createClient();
  const { data: gestor } = await supabase.rpc('is_gestor');
  if (!gestor) return { erro: 'Você não tem permissão para fechar acertos.' };

  const dados = await carregarAcerto(supabase, acertoId);
  if (!dados) return { erro: 'Acerto não encontrado.' };
  if (dados.acerto.status !== 'rascunho') return { erro: 'Este acerto já está fechado.' };
  if (dados.verificacao.erros.length > 0) return { erro: dados.verificacao.erros.join(' ') };

  const { resultado, regras } = dados;
  const usadas = new Set(resultado.porViagem.map((v) => v.regraId));
  const { error } = await supabase
    .from('acertos')
    .update({
      status: 'fechado',
      total_frete_centavos: resultado.totalFreteCentavos,
      total_comissao_centavos: resultado.totalComissaoCentavos,
      total_reembolsos_centavos: resultado.totalReembolsosCentavos,
      total_adiantamentos_centavos: resultado.totalAdiantamentosCentavos,
      saldo_centavos: resultado.saldoCentavos,
      // histórico imutável: a regra usada fica gravada mesmo que mude depois
      regra_snapshot: {
        regras: regras.filter((r) => usadas.has(r.id)),
        // sem o frete: o motorista lê o próprio acerto fechado e não vê frete (Q6)
        por_viagem: resultado.porViagem.map(({ id, comissaoCentavos, regraId }) => ({ id, comissaoCentavos, regraId })),
        calculado_em: new Date().toISOString(),
      },
    })
    .eq('id', acertoId)
    .select('id')
    .single();
  if (error) return { erro: 'Não foi possível fechar o acerto. Tente de novo.' };

  revalidatePath('/g/acertos');
  revalidatePath(`/g/acertos/${acertoId}`);
  return { ok: 'Acerto fechado.' };
}
