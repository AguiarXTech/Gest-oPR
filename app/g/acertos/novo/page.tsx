import type { Metadata } from 'next';
import { periodoSugerido } from '@/lib/domain/acerto';
import { hojeIso } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/server';
import { FormNovoAcerto } from './FormNovoAcerto';

export const metadata: Metadata = { title: 'Novo acerto · Gestão RPortugues' };

export default async function NovoAcerto() {
  const supabase = await createClient();
  const { data: motoristas } = await supabase.from('funcionarios').select('id, nome').eq('ativo', true).order('nome');
  const { inicio, fim } = periodoSugerido('mensal', hojeIso());

  return (
    <>
      <h1 className="text-3xl">Novo acerto</h1>
      <FormNovoAcerto motoristas={motoristas ?? []} inicioPadrao={inicio} fimPadrao={fim} />
    </>
  );
}
