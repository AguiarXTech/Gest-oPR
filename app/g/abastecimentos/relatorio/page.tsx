// Relatório de abastecimento (RF-50): cards e gráficos dos abastecimentos que os motoristas
// lançam. Sempre o dado do banco na hora de abrir a página; contas em
// lib/domain/relatorioAbastecimento.ts.
import { AlertTriangle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { GraficosAbastecimento } from '@/components/relatorio/GraficosAbastecimento';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { formatarPlaca } from '@/lib/domain/placa';
import {
  inicioDoPeriodoRelatorio,
  lerPeriodoRelatorio,
  PERIODOS_RELATORIO,
  resumirAbastecimentos,
} from '@/lib/domain/relatorioAbastecimento';
import { formatarData, formatarDataHora, formatarKm, formatarLitros } from '@/lib/formatar';
import { cn } from '@/lib/utils';
import { obterConfiguracoes } from '@/lib/supabase/configuracoes';
import { carregarAbastecimentosRelatorio } from '@/lib/supabase/relatorioAbastecimento';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Relatório de abastecimento · Gestão RPortugues' };

const dec2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

function Card({
  titulo,
  valor,
  detalhe,
  destaque,
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={
        destaque
          ? 'rounded-2xl bg-grafite p-4 text-white shadow-xs'
          : 'rounded-2xl border bg-card p-4 shadow-xs'
      }
    >
      <p className={destaque ? 'text-sm text-white/70' : 'text-sm text-muted-foreground'}>
        {titulo}
      </p>
      <p className="text-2xl font-bold tabular-nums sm:text-3xl">{valor}</p>
      {detalhe && (
        <p className={destaque ? 'text-sm text-white/70' : 'text-sm text-muted-foreground'}>
          {detalhe}
        </p>
      )}
    </div>
  );
}

export default async function RelatorioAbastecimento({
  searchParams,
}: PageProps<'/g/abastecimentos/relatorio'>) {
  const periodo = lerPeriodoRelatorio((await searchParams).periodo);
  const supabase = await createClient();
  const [linhas, config] = await Promise.all([
    carregarAbastecimentosRelatorio(supabase, inicioDoPeriodoRelatorio(periodo, new Date())),
    obterConfiguracoes(),
  ]);

  const cabecalho = (
    <div className="flex flex-col gap-2">
      <Link href="/g/abastecimentos" className="text-sm text-muted-foreground hover:underline">
        ← Abastecimentos
      </Link>
      <h1 className="text-3xl">Relatório de abastecimento</h1>
      <nav aria-label="Período" className="flex flex-wrap gap-2">
        {Object.entries(PERIODOS_RELATORIO).map(([valor, rotulo]) => (
          <Link
            key={valor}
            href={`/g/abastecimentos/relatorio?periodo=${valor}`}
            aria-current={periodo === valor ? 'page' : undefined}
            className={cn(
              'inline-flex h-11 items-center rounded-lg px-4 font-medium',
              periodo === valor ? 'bg-grafite text-white' : 'border bg-card hover:bg-muted',
            )}
          >
            {rotulo}
          </Link>
        ))}
      </nav>
    </div>
  );

  if (linhas.length === 0) {
    return (
      <>
        {cabecalho}
        <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
          Nenhum abastecimento lançado nos últimos {PERIODOS_RELATORIO[periodo]}.
        </p>
      </>
    );
  }

  const r = resumirAbastecimentos(linhas, config);
  const c = r.cards;

  return (
    <>
      {cabecalho}

      <section
        aria-label="Principais números"
        className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6"
      >
        <Card
          titulo="Gasto com diesel"
          valor={formatarBRL(c.gastoCentavos)}
          detalhe={
            r.periodo
              ? `${formatarData(r.periodo.inicio.slice(0, 10))} a ${formatarData(r.periodo.fim.slice(0, 10))}`
              : undefined
          }
          destaque
        />
        <Card
          titulo="Litros"
          valor={inteiro.format(c.litros)}
          detalhe={`${c.abastecimentos} abastecimentos`}
        />
        <Card
          titulo="Preço médio"
          valor={c.precoMedioCentavos !== null ? `${formatarBRL(c.precoMedioCentavos)}/L` : '—'}
          detalhe="pesado pelos litros"
        />
        <Card
          titulo="Consumo médio"
          valor={c.kmPorLitro !== null ? `${dec2.format(c.kmPorLitro)} km/L` : '—'}
          detalhe="tanque cheio a tanque cheio"
        />
        <Card
          titulo="Diesel por km"
          valor={c.custoKmCentavos !== null ? formatarBRL(c.custoKmCentavos) : '—'}
          detalhe="preço médio ÷ km/L"
        />
        <Card
          titulo="Km medidos"
          valor={formatarKm(c.kmRodados)}
          detalhe={`${r.foraDoPadrao.length} fora do padrão`}
        />
      </section>

      {r.foraDoPadrao.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <AlertTriangle className="size-5 text-alerta" aria-hidden /> Fora do padrão
          </h2>
          <ul className="grid gap-2 lg:grid-cols-3">
            {r.foraDoPadrao.map((f) => (
              <li
                key={`${f.linha.placa}-${f.linha.dataHora}-${f.linha.km}`}
                className="flex flex-col gap-1 rounded-xl border border-alerta/60 bg-alerta/10 p-3"
              >
                <span className="font-semibold">
                  <span className="font-mono">{formatarPlaca(f.linha.placa)}</span> ·{' '}
                  {f.linha.motorista}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatarDataHora(f.linha.dataHora)} · {f.linha.posto}
                </span>
                {f.motivos.map((m) => (
                  <span key={m} className="font-medium">
                    {m}
                  </span>
                ))}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Limites das Configurações: preço acima de {config.precoToleranciaPct}% da mediana;
            consumo a mais de {config.consumoToleranciaPct}% das outras medições.
          </p>
        </section>
      )}

      <GraficosAbastecimento resumo={r} />

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Últimos abastecimentos</h2>
        <ul className="flex flex-col divide-y rounded-2xl border bg-card shadow-xs">
          {r.ultimos.map((l) => (
            <li
              key={`${l.placa}-${l.dataHora}-${l.km}`}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 p-3"
            >
              <span className="flex flex-col">
                <span className="font-medium">
                  <span className="font-mono">{formatarPlaca(l.placa)}</span> · {l.posto}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {formatarDataHora(l.dataHora)} · {l.cidade} · {formatarKm(l.km)} ·{' '}
                  {l.tanqueCheio ? 'tanque cheio' : 'parcial'}
                </span>
              </span>
              <span className="text-right tabular-nums">
                <span className="block font-semibold">{formatarBRL(l.valorTotalCentavos)}</span>
                <span className="text-sm text-muted-foreground">{formatarLitros(l.litros)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
