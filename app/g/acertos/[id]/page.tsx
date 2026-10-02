import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { STATUS_ACERTO } from '@/components/acerto/status';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { formatarPlaca } from '@/lib/domain/placa';
import { formatarData, formatarDataHora, formatarKm } from '@/lib/formatar';
import { carregarAcerto } from '@/lib/supabase/acerto';
import { obterPerfilAtual } from '@/lib/supabase/perfil';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import { FORMAS_PAGAMENTO } from '@/lib/validations/abastecimento';
import { TIPOS_DESPESA } from '@/lib/validations/despesa';
import { linkWhatsApp, telefoneWhatsApp, textoDemonstrativo } from '@/lib/domain/whatsapp';
import { MessageCircle } from 'lucide-react';
import { AcoesAcerto } from './AcoesAcerto';

export const metadata: Metadata = { title: 'Acerto · Gestão RPortugues' };

function Linha({
  rotulo,
  valor,
  forte,
  negativo,
}: {
  rotulo: string;
  valor: number;
  forte?: boolean;
  negativo?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex justify-between gap-3 py-1.5',
        forte && 'border-t pt-3 text-lg font-bold',
      )}
    >
      <span>{rotulo}</span>
      <span className="tabular-nums">
        {negativo ? '− ' : ''}
        {formatarBRL(valor)}
      </span>
    </div>
  );
}

export default async function DetalheAcerto({ params }: PageProps<'/g/acertos/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();
  const [dados, perfil] = await Promise.all([carregarAcerto(supabase, id), obterPerfilAtual()]);
  if (!dados) notFound();
  const { acerto, viagens, abastecimentos, despesas, adiantamentos, resultado, verificacao } =
    dados;

  // Rascunho mostra o cálculo de agora; fechado/pago mostra o que foi gravado no fechamento.
  const t =
    acerto.status === 'rascunho'
      ? resultado
      : {
          totalFreteCentavos: resultado.totalFreteCentavos,
          totalComissaoCentavos: acerto.total_comissao_centavos,
          totalReembolsosCentavos: acerto.total_reembolsos_centavos,
          totalAdiantamentosCentavos: acerto.total_adiantamentos_centavos,
          saldoCentavos: acerto.saldo_centavos,
        };
  const comissaoDe = new Map(resultado.porViagem.map((v) => [v.id, v]));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/g/acertos" className="text-sm text-muted-foreground hover:underline">
          ← Acertos
        </Link>
        <h1 className="text-3xl">{acerto.funcionarios?.nome}</h1>
        <p className="flex flex-wrap items-center gap-2 text-muted-foreground">
          {formatarData(acerto.periodo_inicio)} a {formatarData(acerto.periodo_fim)}
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-sm font-medium text-foreground',
              STATUS_ACERTO[acerto.status].classe,
            )}
          >
            {STATUS_ACERTO[acerto.status].rotulo}
          </span>
          {acerto.pago_em && (
            <span>
              · pago em {formatarData(acerto.pago_em)} ({acerto.forma_pagamento})
            </span>
          )}
        </p>
      </div>

      {acerto.status === 'rascunho' && verificacao.erros.length > 0 && (
        <div role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-4">
          <p className="font-semibold text-destructive">Ainda não dá para fechar:</p>
          <ul className="list-disc pl-5">
            {verificacao.erros.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {acerto.status === 'rascunho' && verificacao.avisos.length > 0 && (
        <div className="rounded-xl border border-alerta/50 bg-alerta/10 p-4">
          {verificacao.avisos.map((a) => (
            <p key={a}>
              ⚠ {a}{' '}
              <Link
                href="/g/abastecimentos?filtro=graves"
                className="font-medium text-primary underline"
              >
                Conferir
              </Link>
            </p>
          ))}
        </div>
      )}

      <section className="rounded-2xl border bg-card p-4 shadow-xs sm:p-6">
        <h2 className="mb-2 text-lg font-semibold">Demonstrativo</h2>
        <Linha
          rotulo={`Comissão (${viagens.length} viagem${viagens.length === 1 ? '' : 'ns'})`}
          valor={t.totalComissaoCentavos}
        />
        <Linha
          rotulo="Reembolsos (despesas + diesel pago pelo motorista)"
          valor={t.totalReembolsosCentavos}
        />
        <Linha rotulo="Adiantamentos" valor={t.totalAdiantamentosCentavos} negativo />
        <Linha
          rotulo={t.saldoCentavos >= 0 ? 'Saldo a pagar ao motorista' : 'Saldo: o motorista deve'}
          valor={Math.abs(t.saldoCentavos)}
          forte
        />
        <p className="mt-2 text-sm text-muted-foreground">
          Fretes das viagens (informativo): {formatarBRL(t.totalFreteCentavos)}
        </p>
      </section>

      {acerto.status !== 'rascunho' && (
        <a
          href={linkWhatsApp(
            telefoneWhatsApp(acerto.funcionarios?.telefone ?? null),
            textoDemonstrativo({
              nome: acerto.funcionarios?.nome ?? '',
              inicio: formatarData(acerto.periodo_inicio),
              fim: formatarData(acerto.periodo_fim),
              viagens: viagens.length,
              comissaoCentavos: acerto.total_comissao_centavos,
              reembolsosCentavos: acerto.total_reembolsos_centavos,
              adiantamentosCentavos: acerto.total_adiantamentos_centavos,
              saldoCentavos: acerto.saldo_centavos,
              pagoEm: acerto.pago_em ? formatarData(acerto.pago_em) : null,
            }),
          )}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-14 items-center justify-center gap-2 rounded-lg border bg-card text-lg font-semibold shadow-xs hover:bg-muted"
        >
          <MessageCircle className="size-6 text-sucesso" aria-hidden /> Mandar demonstrativo no
          WhatsApp
        </a>
      )}
      {acerto.status !== 'rascunho' && !telefoneWhatsApp(acerto.funcionarios?.telefone ?? null) && (
        <p className="-mt-4 text-sm text-muted-foreground">
          Sem telefone no cadastro do motorista: o WhatsApp vai pedir o contato.
        </p>
      )}

      <AcoesAcerto
        id={acerto.id}
        status={acerto.status}
        podeFechar={verificacao.erros.length === 0}
        souDono={perfil?.papel === 'dono'}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Viagens ({viagens.length})</h2>
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {viagens.map((v) => {
            const c = comissaoDe.get(v.id);
            return (
              <li key={v.id}>
                <Link
                  href={`/g/viagens/${v.id}`}
                  className="flex justify-between gap-3 p-3 hover:bg-muted"
                >
                  <span className="flex flex-col">
                    <span className="font-medium tabular-nums">
                      {formatarDataHora(v.data_saida)} ·{' '}
                      <span className="font-mono">
                        {v.caminhoes ? formatarPlaca(v.caminhoes.placa) : ''}
                      </span>
                    </span>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {v.km_chegada !== null && formatarKm(v.km_chegada - v.km_saida)} · fretes{' '}
                      {formatarBRL(c?.freteCentavos ?? 0)}
                      {v.fretes.length === 0 && (
                        <span className="font-semibold text-destructive"> · sem frete</span>
                      )}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatarBRL(c?.comissaoCentavos ?? 0)}
                  </span>
                </Link>
              </li>
            );
          })}
          {viagens.length === 0 && (
            <li className="p-3 text-muted-foreground">Nenhuma viagem concluída no período.</li>
          )}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Abastecimentos ({abastecimentos.length})</h2>
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {abastecimentos.map((a) => (
            <li key={a.id}>
              <Link
                href={`/g/abastecimentos/${a.id}`}
                className="flex justify-between gap-3 p-3 hover:bg-muted"
              >
                <span className="tabular-nums">
                  {formatarDataHora(a.data_hora)} · {FORMAS_PAGAMENTO[a.forma_pagamento]}{' '}
                  {a.conferido ? '✓' : ''}
                </span>
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    a.forma_pagamento !== 'motorista' && 'text-muted-foreground line-through',
                  )}
                >
                  {formatarBRL(a.valor_total_centavos)}
                </span>
              </Link>
            </li>
          ))}
          {abastecimentos.length === 0 && <li className="p-3 text-muted-foreground">Nenhum.</li>}
        </ul>
        <p className="text-sm text-muted-foreground">
          Riscados: pagos pela empresa, não entram no reembolso.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Despesas ({despesas.length})</h2>
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {despesas.map((d) => (
            <li key={d.id}>
              <Link
                href={`/g/abastecimentos/despesas/${d.id}`}
                className="flex justify-between gap-3 p-3 hover:bg-muted"
              >
                <span>
                  {formatarData(d.data)} · {TIPOS_DESPESA[d.tipo]} {d.conferido ? '✓' : ''}
                </span>
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    !d.reembolsavel && 'text-muted-foreground line-through',
                  )}
                >
                  {formatarBRL(d.valor_centavos)}
                </span>
              </Link>
            </li>
          ))}
          {despesas.length === 0 && <li className="p-3 text-muted-foreground">Nenhuma.</li>}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Adiantamentos ({adiantamentos.length})</h2>
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {adiantamentos.map((a) => (
            <li key={a.id} className="flex justify-between gap-3 p-3">
              <span>
                {formatarData(a.data)} · {a.forma}
              </span>
              <span className="font-semibold tabular-nums">{formatarBRL(a.valor_centavos)}</span>
            </li>
          ))}
          {adiantamentos.length === 0 && <li className="p-3 text-muted-foreground">Nenhum.</li>}
        </ul>
      </section>
    </div>
  );
}
