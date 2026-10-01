import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AcessoFuncionario } from '@/components/gestao/AcessoFuncionario';
import { FormFuncionario } from '@/components/gestao/FormFuncionario';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Funcionário · Gestão Frota' };

export default async function FichaFuncionario({ params }: PageProps<'/g/funcionarios/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: funcionario } = await supabase
    .from('funcionarios')
    .select('*, profiles(papel)')
    .eq('id', id)
    .maybeSingle();
  if (!funcionario) notFound();

  const { profiles, ...dados } = funcionario;

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">{funcionario.nome}</h1>
        {!funcionario.ativo && <p className="text-sm text-muted-foreground">Funcionário desativado.</p>}
      </div>

      <section className="flex flex-col gap-4 rounded-xl border p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Acesso ao app</h2>
        <AcessoFuncionario
          funcionarioId={funcionario.id}
          cpf={funcionario.cpf}
          papel={profiles?.papel ?? null}
          funcionarioAtivo={funcionario.ativo}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Dados do funcionário</h2>
        {/* key: remonta o formulário com os dados novos depois de salvar */}
        <FormFuncionario key={funcionario.updated_at} funcionario={dados} />
      </section>
    </div>
  );
}
