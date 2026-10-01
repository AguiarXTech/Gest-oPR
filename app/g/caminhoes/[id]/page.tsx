import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AlternarAtivo } from '@/components/gestao/AlternarAtivo';
import { FormCaminhao } from '@/components/gestao/FormCaminhao';
import { formatarPlaca } from '@/lib/domain/placa';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Caminhão · Gestão Frota' };

export default async function EditarCaminhao({ params }: PageProps<'/g/caminhoes/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: caminhao } = await supabase.from('caminhoes').select('*').eq('id', id).maybeSingle();
  if (!caminhao) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-3xl">
          {formatarPlaca(caminhao.placa)}
          {caminhao.apelido && <span className="font-normal text-muted-foreground"> · {caminhao.apelido}</span>}
        </h1>
        {!caminhao.ativo && <p className="text-sm text-muted-foreground">Caminhão desativado.</p>}
      </div>

      {/* key: remonta o formulário com os dados novos depois de salvar */}
      <FormCaminhao key={caminhao.updated_at} caminhao={caminhao} />

      <section className="flex flex-col gap-3 border-t pt-6">
        <h2 className="font-medium">{caminhao.ativo ? 'Desativar' : 'Reativar'}</h2>
        <AlternarAtivo
          tabela="caminhoes"
          id={caminhao.id}
          ativo={caminhao.ativo}
          nome="caminhão"
          explicacao={{
            ativo: 'O caminhão deixa de aparecer para os motoristas, mas o histórico continua.',
            inativo: 'Caminhão desativado: não aparece para os motoristas.',
          }}
        />
      </section>
    </div>
  );
}
