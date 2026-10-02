import type { Metadata } from 'next';
import { obterConfiguracoes } from '@/lib/supabase/configuracoes';
import { obterPerfilAtual } from '@/lib/supabase/perfil';
import { createClient } from '@/lib/supabase/server';
import { FormAbastecer } from './FormAbastecer';

export const metadata: Metadata = { title: 'Abastecer · Gestão Frota' };

export default async function Abastecer() {
  const supabase = await createClient();
  const perfil = await obterPerfilAtual();
  const fid = perfil?.funcionario_id ?? '';
  const [config, { data: viagem }, { data: caminhoes }, { data: postos }] = await Promise.all([
    obterConfiguracoes(),
    supabase.from('viagens').select('id, caminhao_id').eq('status', 'em_andamento').eq('motorista_id', fid).maybeSingle(),
    supabase.from('caminhoes').select('id, placa, apelido, km_atual').eq('ativo', true).order('placa'),
    // para reconhecer o posto pelo CNPJ que vem na chave da nota
    supabase.from('fornecedores').select('id, nome, cnpj').eq('ativo', true).not('cnpj', 'is', null),
  ]);

  return (
    <>
      <h1 className="text-3xl">Abastecer</h1>
      <FormAbastecer
        funcionarioId={perfil?.funcionario_id ?? ''}
        viagem={viagem}
        caminhoes={caminhoes ?? []}
        postos={postos ?? []}
        config={config}
      />
    </>
  );
}
