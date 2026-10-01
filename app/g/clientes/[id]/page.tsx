import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AlternarAtivo } from '@/components/gestao/AlternarAtivo';
import { FormCliente } from '@/components/gestao/FormCliente';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Cliente · Gestão Frota' };

export default async function EditarCliente({ params }: PageProps<'/g/clientes/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cliente } = await supabase.from('clientes').select('*').eq('id', id).maybeSingle();
  if (!cliente) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{cliente.razao_social}</h1>
        {!cliente.ativo && <p className="text-sm text-muted-foreground">Cliente desativado.</p>}
      </div>

      {/* key: remonta o formulário com os dados novos depois de salvar */}
      <FormCliente key={cliente.updated_at} cliente={cliente} />

      <section className="flex flex-col gap-3 border-t pt-6">
        <h2 className="font-medium">{cliente.ativo ? 'Desativar' : 'Reativar'}</h2>
        <AlternarAtivo
          tabela="clientes"
          id={cliente.id}
          ativo={cliente.ativo}
          nome="cliente"
          explicacao={{
            ativo: 'O cliente deixa de aparecer na hora de lançar fretes, mas as viagens antigas continuam ligadas a ele.',
            inativo: 'Cliente desativado: não aparece na hora de lançar fretes.',
          }}
        />
      </section>
    </div>
  );
}
