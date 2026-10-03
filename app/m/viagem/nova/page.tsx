import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { obterConfiguracoes } from '@/lib/supabase/configuracoes';
import { obterPerfilAtual } from '@/lib/supabase/perfil';
import { urlsFotosCaminhoes } from '@/lib/supabase/fotosCaminhoes';
import { createClient } from '@/lib/supabase/server';
import { FormIniciarViagem } from './FormIniciarViagem';

export const metadata: Metadata = { title: 'Iniciar viagem · Gestão Frota' };

export default async function IniciarViagem() {
  const supabase = await createClient();
  const perfil = await obterPerfilAtual();
  const fid = perfil?.funcionario_id ?? '';
  const [
    config,
    { data: emAndamento },
    { data: caminhoes },
    { data: carretas },
    { data: locais },
    { data: ultima },
  ] = await Promise.all([
    obterConfiguracoes(),
    supabase
      .from('viagens')
      .select('id')
      .eq('status', 'em_andamento')
      .eq('motorista_id', fid)
      .maybeSingle(),
    supabase
      .from('caminhoes')
      .select('id, placa, apelido, tipo, km_atual, foto_path')
      .eq('ativo', true)
      .order('placa'),
    supabase
      .from('carretas')
      .select('id, placa, apelido, composicao, carroceria, foto_path')
      .eq('ativo', true)
      .order('placa'),
    supabase.from('locais_carga').select('id, nome, endereco').eq('ativo', true).order('nome'),
    // RLS: só as viagens do próprio motorista → sugere o último caminhão que ele usou (Q7)
    supabase
      .from('viagens')
      .select('caminhao_id, carreta_id, local_carga_id')
      .eq('motorista_id', fid)
      .order('data_saida', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (emAndamento) redirect(`/m/viagem/${emAndamento.id}`);
  const fotos = await urlsFotosCaminhoes(supabase, [...(caminhoes ?? []), ...(carretas ?? [])]);

  return (
    <>
      <h1 className="text-3xl">Iniciar viagem</h1>
      <FormIniciarViagem
        funcionarioId={perfil?.funcionario_id ?? ''}
        caminhoes={(caminhoes ?? []).map((c) => ({ ...c, fotoUrl: fotos.get(c.id) ?? null }))}
        carretas={(carretas ?? []).map((c) => ({ ...c, fotoUrl: fotos.get(c.id) ?? null }))}
        caminhaoSugerido={ultima?.caminhao_id ?? null}
        carretaSugerida={ultima?.carreta_id ?? null}
        locais={locais ?? []}
        localSugerido={ultima?.local_carga_id ?? null}
        rotaPadrao={config.rotaPadrao}
      />
    </>
  );
}
