// Documentos do motorista (pedido de 2026-10-03): a CNH dele e os documentos do cavalo e da
// carreta da viagem em andamento, para mostrar na fiscalização. A RLS faz o filtro.
import { FileText } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ESTILO_STATUS } from '@/components/gestao/estiloDocumento';
import { statusDocumento, TIPOS_DOCUMENTO, type TipoDocumento } from '@/lib/domain/documentos';
import { formatarPlaca } from '@/lib/domain/placa';
import { formatarData, hojeIso } from '@/lib/formatar';
import { obterConfiguracoes } from '@/lib/supabase/configuracoes';
import { obterPerfilAtual } from '@/lib/supabase/perfil';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Documentos · Gestão Frota' };

type Doc = {
  id: string;
  tipo: TipoDocumento;
  entidade: string;
  caminhao_id: string | null;
  carreta_id: string | null;
  vencimento: string;
  numero: string | null;
  arquivo_path: string | null;
};

export default async function DocumentosMotorista() {
  const supabase = await createClient();
  const perfil = await obterPerfilAtual();
  const [config, { data: viagem }, { data: documentos }] = await Promise.all([
    obterConfiguracoes(),
    supabase
      .from('viagens')
      .select('id, caminhao_id, carreta_id, caminhoes(placa), carretas(placa)')
      .eq('status', 'em_andamento')
      .eq('motorista_id', perfil?.funcionario_id ?? '')
      .maybeSingle(),
    // documento mais recente de cada tipo (renovação = novo registro)
    supabase
      .from('vw_documentos_status')
      .select('id, tipo, entidade, caminhao_id, carreta_id, vencimento, numero, arquivo_path')
      .order('tipo'),
  ]);

  const hoje = hojeIso();
  const docs = (documentos ?? []) as Doc[];
  const grupos = [
    { titulo: 'Minha CNH', itens: docs.filter((d) => d.entidade === 'funcionario') },
    ...(viagem
      ? [
          {
            titulo: `Cavalo ${formatarPlaca(viagem.caminhoes?.placa ?? '')}`,
            itens: docs.filter((d) => d.caminhao_id === viagem.caminhao_id),
          },
          ...(viagem.carreta_id
            ? [
                {
                  titulo: `Carreta ${formatarPlaca(viagem.carretas?.placa ?? '')}`,
                  itens: docs.filter((d) => d.carreta_id === viagem.carreta_id),
                },
              ]
            : []),
        ]
      : []),
  ];

  return (
    <>
      <h1 className="text-3xl">Documentos</h1>
      {!viagem && (
        <p className="rounded-2xl border bg-card p-4 shadow-xs">
          Os documentos do cavalo e da carreta aparecem aqui quando você inicia a viagem.
        </p>
      )}

      {grupos.map((g) => (
        <section key={g.titulo} className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">{g.titulo}</h2>
          {g.itens.length === 0 ? (
            <p className="text-muted-foreground">
              Nenhum documento cadastrado. Fale com o escritório.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {g.itens.map((d) => {
                const status = statusDocumento(d.vencimento, hoje, config.alertaDocumentosDias);
                const conteudo = (
                  <>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-lg font-semibold">
                        {TIPOS_DOCUMENTO[d.tipo].rotulo}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-sm font-semibold',
                          ESTILO_STATUS[status].classe,
                        )}
                      >
                        {ESTILO_STATUS[status].rotulo}
                      </span>
                    </span>
                    <span className="tabular-nums">
                      Vence em {formatarData(d.vencimento)}
                      {d.numero && ` · nº ${d.numero}`}
                    </span>
                    {d.arquivo_path && (
                      <span className="flex items-center gap-1 font-semibold text-primary">
                        <FileText className="size-5" aria-hidden /> Abrir documento
                      </span>
                    )}
                  </>
                );
                return (
                  <li key={d.id}>
                    {d.arquivo_path ? (
                      <Link
                        href={`/m/documentos/anexo?id=${d.id}`}
                        target="_blank"
                        className="flex min-h-16 flex-col gap-1 rounded-2xl border bg-card p-4 shadow-xs hover:border-primary/40"
                      >
                        {conteudo}
                      </Link>
                    ) : (
                      <div className="flex min-h-16 flex-col gap-1 rounded-2xl border bg-card p-4 shadow-xs">
                        {conteudo}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </>
  );
}
