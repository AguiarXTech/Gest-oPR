import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AlternarAtivo } from '@/components/gestao/AlternarAtivo';
import { FormFornecedor } from '@/components/gestao/FormFornecedor';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Fornecedor · Gestão RPortugues' };

export default async function EditarFornecedor({ params }: PageProps<'/g/fornecedores/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: fornecedor } = await supabase.from('fornecedores').select('*').eq('id', id).maybeSingle();
  if (!fornecedor) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-3xl">{fornecedor.nome}</h1>
        {!fornecedor.ativo && <p className="text-sm text-muted-foreground">Fornecedor desativado.</p>}
      </div>

      {/* key: remonta o formulário com os dados novos depois de salvar */}
      <FormFornecedor key={fornecedor.updated_at} fornecedor={fornecedor} />

      <section className="flex flex-col gap-3 border-t pt-6">
        <h2 className="font-medium">{fornecedor.ativo ? 'Desativar' : 'Reativar'}</h2>
        <AlternarAtivo
          tabela="fornecedores"
          id={fornecedor.id}
          ativo={fornecedor.ativo}
          nome="fornecedor"
          explicacao={{
            ativo: 'O fornecedor deixa de aparecer nas escolhas, mas os registros antigos continuam ligados a ele.',
            inativo: 'Fornecedor desativado: não aparece nas escolhas.',
          }}
        />
      </section>
    </div>
  );
}
