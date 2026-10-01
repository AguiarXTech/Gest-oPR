import type { Metadata } from 'next';
import { obterPerfilAtual } from '@/lib/supabase/perfil';
import { createClient } from '@/lib/supabase/server';
import { FormDespesa } from './FormDespesa';

export const metadata: Metadata = { title: 'Despesa · Gestão Frota' };

export default async function Despesa() {
  const supabase = await createClient();
  const [perfil, { data: viagem }] = await Promise.all([
    obterPerfilAtual(),
    supabase.from('viagens').select('id, caminhao_id').eq('status', 'em_andamento').maybeSingle(),
  ]);

  return (
    <>
      <h1 className="text-3xl">Despesa</h1>
      <FormDespesa funcionarioId={perfil?.funcionario_id ?? ''} viagem={viagem} />
    </>
  );
}
