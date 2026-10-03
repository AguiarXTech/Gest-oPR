import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlternarAtivo } from '@/components/gestao/AlternarAtivo';
import { FormCarreta } from '@/components/gestao/FormCarreta';
import { FotoCaminhao } from '@/components/gestao/FotoCaminhao';
import { formatarPlaca } from '@/lib/domain/placa';
import { formatarDataHora } from '@/lib/formatar';
import { urlsFotosCaminhoes } from '@/lib/supabase/fotosCaminhoes';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Carreta · Gestão RPortugues' };

export default async function EditarCarreta({ params }: PageProps<'/g/carretas/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: carreta }, { data: viagens }] = await Promise.all([
    supabase.from('carretas').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('viagens')
      .select('id, data_saida, status, caminhoes(placa), funcionarios(nome)')
      .eq('carreta_id', id)
      .neq('status', 'cancelada')
      .order('data_saida', { ascending: false })
      .limit(10),
  ]);
  if (!carreta) notFound();
  const foto = (await urlsFotosCaminhoes(supabase, [carreta])).get(carreta.id) ?? null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-3xl">
          {formatarPlaca(carreta.placa)}
          {carreta.apelido && (
            <span className="font-normal text-muted-foreground"> · {carreta.apelido}</span>
          )}
        </h1>
        {!carreta.ativo && <p className="text-sm text-muted-foreground">Carreta desativada.</p>}
      </div>

      <FotoCaminhao caminhaoId={carreta.id} url={foto} cadastro="carretas" />

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Últimas viagens</h2>
        {(viagens ?? []).length === 0 ? (
          <p className="text-muted-foreground">Ainda não saiu em nenhuma viagem.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border bg-card">
            {viagens?.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/g/viagens/${v.id}`}
                  className="flex min-h-11 flex-wrap justify-between gap-x-2 px-3 py-2 hover:bg-muted"
                >
                  <span>
                    com{' '}
                    <span className="font-mono">
                      {v.caminhoes ? formatarPlaca(v.caminhoes.placa) : '—'}
                    </span>{' '}
                    · {v.funcionarios?.nome}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {v.status === 'em_andamento'
                      ? 'em viagem agora'
                      : formatarDataHora(v.data_saida)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <h2 className="text-lg font-semibold">Dados da carreta</h2>
      {/* key: remonta o formulário com os dados novos depois de salvar */}
      <FormCarreta key={carreta.updated_at} carreta={carreta} />

      <section className="flex flex-col gap-3 border-t pt-6">
        <h2 className="font-medium">{carreta.ativo ? 'Desativar' : 'Reativar'}</h2>
        <AlternarAtivo
          tabela="carretas"
          id={carreta.id}
          ativo={carreta.ativo}
          nome="carreta"
          explicacao={{
            ativo: 'A carreta deixa de aparecer para os motoristas, mas o histórico continua.',
            inativo: 'Carreta desativada: não aparece para os motoristas.',
          }}
        />
      </section>
    </div>
  );
}
