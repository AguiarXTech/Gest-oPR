import { Paperclip } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ApagarRegistro } from '@/components/gestao/ApagarRegistro';
import { NovoDocumento } from '@/components/gestao/NovoDocumento';
import { ESTILO_STATUS } from '@/components/gestao/estiloDocumento';
import { TIPOS_DOCUMENTO } from '@/lib/domain/documentos';
import { formatarPlaca } from '@/lib/domain/placa';
import { formatarData } from '@/lib/formatar';
import { carregarSituacaoDocumentos } from '@/lib/supabase/documentos';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Documentos · Gestão RPortugues' };

const dono = (d: {
  entidade: string;
  caminhoes: { placa: string } | null;
  carretas: { placa: string } | null;
  funcionarios: { nome: string } | null;
}) =>
  d.entidade === 'empresa'
    ? 'Empresa'
    : d.entidade === 'caminhao'
      ? formatarPlaca(d.caminhoes?.placa ?? '')
      : d.entidade === 'carreta'
        ? `Carreta ${formatarPlaca(d.carretas?.placa ?? '')}`
        : (d.funcionarios?.nome ?? '');

export default async function Documentos({ searchParams }: PageProps<'/g/documentos'>) {
  const { renovar } = await searchParams;
  const supabase = await createClient();
  const [{ situacao, historico }, { data: caminhoes }, { data: carretas }, { data: funcionarios }] =
    await Promise.all([
      carregarSituacaoDocumentos(supabase),
      supabase.from('caminhoes').select('id, placa').eq('ativo', true).order('placa'),
      supabase.from('carretas').select('id, placa').eq('ativo', true).order('placa'),
      supabase.from('funcionarios').select('id, nome').eq('ativo', true).order('nome'),
    ]);

  const base = situacao.find((d) => d.id === renovar);
  const renovacao = base
    ? {
        tipo: base.tipo,
        entidade: base.entidade,
        caminhao_id: base.caminhao_id ?? '',
        carreta_id: base.carreta_id ?? '',
        funcionario_id: base.funcionario_id ?? '',
      }
    : undefined;

  return (
    <>
      <h1 className="text-3xl">Documentos</h1>
      <NovoDocumento
        key={renovar ? String(renovar) : 'novo'}
        caminhoes={caminhoes ?? []}
        carretas={carretas ?? []}
        funcionarios={funcionarios ?? []}
        renovacao={renovacao}
      />

      {situacao.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
          Nenhum documento cadastrado. Comece pelo CRLV e o cronotacógrafo dos caminhões e a CNH dos
          motoristas.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {situacao.map((d) => (
            <li
              key={d.id}
              className={cn(
                'flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs',
                d.status === 'vencido' && 'border-destructive',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="flex flex-col">
                  <span className="text-lg font-semibold">{TIPOS_DOCUMENTO[d.tipo].rotulo}</span>
                  <span className="text-muted-foreground">{dono(d)}</span>
                </span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-sm font-semibold',
                    ESTILO_STATUS[d.status].classe,
                  )}
                >
                  {ESTILO_STATUS[d.status].rotulo}
                </span>
              </div>
              <p className="tabular-nums">
                Vence em <span className="font-semibold">{formatarData(d.vencimento)}</span>
                {d.dias >= 0
                  ? ` (faltam ${d.dias} dia${d.dias === 1 ? '' : 's'})`
                  : ` (venceu há ${-d.dias} dia${d.dias === -1 ? '' : 's'})`}
                {d.numero && ` · nº ${d.numero}`}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/g/documentos?renovar=${d.id}`}
                  className="inline-flex h-11 items-center rounded-lg border px-4 font-medium hover:bg-muted"
                >
                  Renovar
                </Link>
                {d.arquivo_path && (
                  <a
                    href={`/g/documentos/anexo?id=${d.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center gap-1 rounded-lg px-3 text-primary hover:underline"
                  >
                    <Paperclip className="size-4" aria-hidden /> Anexo
                  </a>
                )}
                <span className="ml-auto">
                  <ApagarRegistro tabela="documentos" id={d.id} rotulo="documento" />
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {historico.length > 0 && (
        <details className="rounded-xl border bg-card p-3">
          <summary className="flex min-h-11 cursor-pointer items-center font-medium">
            Histórico ({historico.length} renovados)
          </summary>
          <ul className="mt-2 flex flex-col divide-y">
            {historico.map((d) => (
              <li key={d.id} className="flex justify-between gap-2 py-2 text-sm">
                <span>
                  {TIPOS_DOCUMENTO[d.tipo].rotulo} · {dono(d)}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  venceu {formatarData(d.vencimento)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
