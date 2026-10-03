import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AcoesPneu } from '@/components/gestao/AcoesPneu';
import { FormPneu } from '@/components/gestao/FormPneu';
import { ESTILO_SITUACAO, linhasKmPneu, ROTULO_SITUACAO } from '@/components/gestao/pneuTexto';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { formatarPlaca } from '@/lib/domain/placa';
import { formatarData, formatarDataHora, formatarKm } from '@/lib/formatar';
import { carregarPneus } from '@/lib/supabase/pneus';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Pneu · Gestão RPortugues' };

const STATUS = {
  estoque: 'No estoque',
  montado: 'Montado',
  em_recapagem: 'Na recapagem',
  descartado: 'Descartado',
} as const;

export default async function DetalhePneu({ params }: PageProps<'/g/pneus/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ pneus, caminhoes, carretas }, { data: fornecedores }, { data: abertas }] =
    await Promise.all([
      carregarPneus(supabase, id),
      supabase.from('fornecedores').select('id, nome, tipo').eq('ativo', true).order('nome'),
      supabase
        .from('montagens_pneu')
        .select('caminhao_id, carreta_id, posicao')
        .is('retirado_em', null),
    ]);
  const p = pneus[0];
  if (!p) notFound();

  const ocupadas = (veiculoId: string) =>
    (abertas ?? [])
      .filter((m) => m.caminhao_id === veiculoId || m.carreta_id === veiculoId)
      .map((m) => m.posicao);
  const veiculos = [
    ...caminhoes
      .filter((c) => c.ativo)
      .map((c) => ({
        tipo: 'caminhao' as const,
        id: c.id,
        placa: c.placa,
        apelido: c.apelido,
        eixos: c.eixos,
        kmAtual: c.km_atual,
        ocupadas: ocupadas(c.id),
      })),
    ...carretas
      .filter((c) => c.ativo)
      .map((c) => ({
        tipo: 'carreta' as const,
        id: c.id,
        placa: c.placa,
        apelido: c.apelido,
        eixos: c.eixos,
        kmAtual: null,
        ocupadas: ocupadas(c.id),
      })),
  ];
  const custoRecapagens = p.recapagens_pneu.reduce((t, r) => t + (r.custo_centavos ?? 0), 0);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/g/pneus" className="text-sm text-muted-foreground hover:underline">
          ← Pneus
        </Link>
        <h1 className="flex flex-wrap items-center gap-3 text-3xl">
          <span className="font-mono">{p.marca_fogo}</span>
          <span
            className={cn(
              'rounded-full px-3 py-0.5 text-base font-semibold',
              ESTILO_SITUACAO[p.situacao],
            )}
          >
            {ROTULO_SITUACAO[p.situacao]}
            {p.situacao === 'recapado' && ` ${p.vida}×`}
          </span>
        </h1>
        <p className="text-muted-foreground">
          {[p.marca, p.modelo, p.medida, p.dot && `DOT ${p.dot}`].filter(Boolean).join(' · ')}
        </p>
      </div>

      <section className="flex flex-col gap-1 rounded-2xl border bg-card p-4 shadow-xs">
        <p className="text-lg font-semibold">
          {STATUS[p.status]}
          {p.montagemAtual && (
            <>
              {' '}
              em <span className="font-mono">{formatarPlaca(p.montagemAtual.veiculo.placa)}</span>,
              posição {p.montagemAtual.posicao}
            </>
          )}
          {p.recapagemAtual &&
            ` · ${p.recapagemAtual.fornecedores?.nome ?? 'recapadora'} desde ${formatarData(p.recapagemAtual.enviado_em)}`}
        </p>
        {p.status === 'descartado' && <p>Motivo: {p.motivo_descarte}</p>}
        {linhasKmPneu(p).map((l) => (
          <p key={l} className="tabular-nums">
            {l}
          </p>
        ))}
        {p.montagemAtual && (
          <p className="tabular-nums">{formatarKm(p.montagemAtual.km)} nesta montagem</p>
        )}
        <p className="text-sm text-muted-foreground tabular-nums">
          {p.valor_compra_centavos != null &&
            `Comprado por ${formatarBRL(p.valor_compra_centavos)}`}
          {p.data_compra && ` em ${formatarData(p.data_compra)}`}
          {p.fornecedores?.nome && ` · ${p.fornecedores.nome}`}
          {custoRecapagens > 0 && ` · recapagens ${formatarBRL(custoRecapagens)}`}
        </p>
      </section>

      <AcoesPneu
        pneuId={p.id}
        status={p.status}
        montagemAtual={
          p.montagemAtual
            ? {
                veiculo: p.montagemAtual.veiculo,
                posicao: p.montagemAtual.posicao,
                kmMontagem: p.montagemAtual.km_montagem,
                km: p.montagemAtual.km,
              }
            : null
        }
        veiculos={veiculos}
        fornecedores={fornecedores ?? []}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Histórico</h2>
        {p.montagens.length === 0 && p.recapagens_pneu.length === 0 ? (
          <p className="text-muted-foreground">Ainda não foi montado.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border bg-card">
            {[
              ...p.montagens.map((m) => ({
                quando: m.montado_em,
                texto: `${m.veiculo.tipo === 'carreta' ? 'Carreta' : 'Caminhão'} ${formatarPlaca(m.veiculo.placa)}, posição ${m.posicao}`,
                detalhe: `${formatarDataHora(m.montado_em)} → ${m.retirado_em ? formatarDataHora(m.retirado_em) : 'montado agora'} · ${formatarKm(m.km)}${m.vida > 0 ? ` · ${m.vida}ª recapagem` : ''}`,
              })),
              ...p.recapagens_pneu.map((r) => ({
                quando: `${r.enviado_em}T12:00:00`,
                texto: `Recapagem${r.fornecedores?.nome ? ` · ${r.fornecedores.nome}` : ''}`,
                detalhe: `${formatarData(r.enviado_em)} → ${r.retornou_em ? formatarData(r.retornou_em) : 'na recapadora'}${r.custo_centavos != null ? ` · ${formatarBRL(r.custo_centavos)}` : ''}${r.observacoes ? ` · ${r.observacoes}` : ''}`,
              })),
            ]
              .sort((a, b) => b.quando.localeCompare(a.quando))
              .map((h) => (
                <li key={`${h.quando}-${h.texto}`} className="flex flex-col p-3">
                  <span className="font-medium">{h.texto}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">{h.detalhe}</span>
                </li>
              ))}
          </ul>
        )}
      </section>

      <details className="rounded-xl border bg-card p-3">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium">
          Editar dados do pneu
        </summary>
        <div className="pt-3">
          <FormPneu key={p.updated_at} pneu={p} fornecedores={fornecedores ?? []} />
        </div>
      </details>
    </div>
  );
}
