import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { obterConfiguracoes } from '@/lib/supabase/configuracoes';
import { obterPerfilAtual } from '@/lib/supabase/perfil';
import { createClient } from '@/lib/supabase/server';
import { FormIniciarViagem } from './FormIniciarViagem';

export const metadata: Metadata = { title: 'Iniciar viagem · Gestão Frota' };

export default async function IniciarViagem() {
  const supabase = await createClient();
  const [perfil, config, { data: emAndamento }, { data: caminhoes }, { data: ultima }] = await Promise.all([
    obterPerfilAtual(),
    obterConfiguracoes(),
    supabase.from('viagens').select('id').eq('status', 'em_andamento').maybeSingle(),
    supabase.from('caminhoes').select('id, placa, apelido, km_atual').eq('ativo', true).order('placa'),
    // RLS: só as viagens do próprio motorista → sugere o último caminhão que ele usou (Q7)
    supabase.from('viagens').select('caminhao_id').order('data_saida', { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (emAndamento) redirect(`/m/viagem/${emAndamento.id}`);

  return (
    <>
      <h1 className="text-3xl">Iniciar viagem</h1>
      <FormIniciarViagem
        funcionarioId={perfil?.funcionario_id ?? ''}
        caminhoes={caminhoes ?? []}
        caminhaoSugerido={ultima?.caminhao_id ?? null}
        rotaPadrao={config.rotaPadrao}
      />
    </>
  );
}
