import type { Metadata } from 'next';
import { hojeIso } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/server';
import { FormNovoAcerto } from './FormNovoAcerto';

export const metadata: Metadata = { title: 'Novo acerto · Gestão RPortugues' };

/** Período sugerido: o mês passado inteiro (o período é livre, Q2). */
function mesPassado() {
  const [ano, mes] = hojeIso().split('-').map(Number);
  const a = mes === 1 ? ano - 1 : ano;
  const m = mes === 1 ? 12 : mes - 1;
  const ultimoDia = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, '0');
  return { inicio: `${a}-${mm}-01`, fim: `${a}-${mm}-${ultimoDia}` };
}

export default async function NovoAcerto() {
  const supabase = await createClient();
  const { data: motoristas } = await supabase.from('funcionarios').select('id, nome').eq('ativo', true).order('nome');
  const { inicio, fim } = mesPassado();

  return (
    <>
      <h1 className="text-3xl">Novo acerto</h1>
      <FormNovoAcerto motoristas={motoristas ?? []} inicioPadrao={inicio} fimPadrao={fim} />
    </>
  );
}
