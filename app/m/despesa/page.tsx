import type { Metadata } from 'next';
import { obterPerfilAtual } from '@/lib/supabase/perfil';
import { createClient } from '@/lib/supabase/server';
import { FormDespesa } from './FormDespesa';

export const metadata: Metadata = { title: 'Despesa · Gestão Frota' };

export default async function Despesa() {
  const supabase = await createClient();
  const perfil = await obterPerfilAtual();
  const fid = perfil?.funcionario_id ?? '';
  const [{ data: viagem }, { data: caminhoes }, { data: ultima }] = await Promise.all([
    supabase
      .from('viagens')
      .select('id, caminhao_id')
      .eq('status', 'em_andamento')
      .eq('motorista_id', fid)
      .maybeSingle(),
    // sem viagem em andamento o motorista diz de qual caminhão é a despesa
    supabase.from('caminhoes').select('id, placa, apelido').eq('ativo', true).order('placa'),
    supabase
      .from('viagens')
      .select('caminhao_id')
      .eq('motorista_id', fid)
      .order('data_saida', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <>
      <h1 className="text-3xl">Despesa</h1>
      <FormDespesa
        funcionarioId={fid}
        viagem={viagem}
        caminhoes={caminhoes ?? []}
        caminhaoSugerido={ultima?.caminhao_id ?? null}
      />
    </>
  );
}
