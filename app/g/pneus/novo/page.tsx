import type { Metadata } from 'next';
import { FormPneu } from '@/components/gestao/FormPneu';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Novo pneu · Gestão RPortugues' };

export default async function NovoPneu() {
  const supabase = await createClient();
  const { data: fornecedores } = await supabase
    .from('fornecedores')
    .select('id, nome, tipo')
    .eq('ativo', true)
    .order('nome');
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-3xl">Novo pneu</h1>
      <p className="-mt-4 text-muted-foreground">
        Entra no estoque. Depois é só montar no veículo.
      </p>
      <FormPneu fornecedores={fornecedores ?? []} />
    </div>
  );
}
