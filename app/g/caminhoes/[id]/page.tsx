import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AlternarAtivo } from '@/components/gestao/AlternarAtivo';
import { FormCaminhao } from '@/components/gestao/FormCaminhao';
import { FotoCaminhao } from '@/components/gestao/FotoCaminhao';
import { urlsFotosCaminhoes } from '@/lib/supabase/fotosCaminhoes';
import { ResultadoCaminhao } from '@/components/gestao/ResultadoCaminhao';
import { competencia } from '@/lib/domain/resultado';
import { carregarMes } from '@/lib/supabase/painel';
import { formatarPlaca } from '@/lib/domain/placa';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Caminhão · Gestão RPortugues' };

function mesAtual() {
  return competencia(new Date().toISOString());
}
const nomeMes = (mes: string) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${mes}-15T12:00:00Z`));

export default async function EditarCaminhao({ params, searchParams }: PageProps<'/g/caminhoes/[id]'>) {
  const [{ id }, { mes: bruto }] = await Promise.all([params, searchParams]);
  const mes = typeof bruto === 'string' && /^\d{4}-\d{2}$/.test(bruto) ? bruto : mesAtual();
  const supabase = await createClient();
  const [{ data: caminhao }, doMes] = await Promise.all([
    supabase.from('caminhoes').select('*').eq('id', id).maybeSingle(),
    carregarMes(supabase, mes),
  ]);
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

      <FotoCaminhao caminhaoId={caminhao.id} url={(await urlsFotosCaminhoes(supabase, [caminhao])).get(caminhao.id) ?? null} />

      <ResultadoCaminhao dados={doMes.caminhoes.find((c) => c.id === caminhao.id)} nomeMes={nomeMes(mes)} />

      <h2 className="text-lg font-semibold">Dados do caminhão</h2>
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
