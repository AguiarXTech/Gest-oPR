// Resultado do caminhão no mês (S5-4): totais e cada viagem com o diesel rateado por km.
import Link from 'next/link';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { formatarDataHora, formatarKm } from '@/lib/formatar';
import type { CaminhaoDoMes } from '@/lib/supabase/painel';
import { cn } from '@/lib/utils';

const kmL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Linha({ rotulo, valor, menos }: { rotulo: string; valor: number; menos?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="tabular-nums">
        {menos && valor > 0 ? '− ' : ''}
        {formatarBRL(valor)}
      </span>
    </div>
  );
}

export function ResultadoCaminhao({ dados, nomeMes }: { dados: CaminhaoDoMes | undefined; nomeMes: string }) {
  if (!dados) return null;
  const r = dados.resultado;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Resultado de {nomeMes}</h2>
        <p className={cn('text-2xl font-bold tabular-nums', r.resultadoCentavos < 0 && 'text-destructive')}>{formatarBRL(r.resultadoCentavos)}</p>
      </div>
      <div>
        <Linha rotulo="Fretes" valor={r.receitaCentavos} />
        <Linha rotulo="Diesel" valor={r.dieselCentavos} menos />
        <Linha rotulo="Pedágio" valor={r.pedagioCentavos} menos />
        <Linha rotulo="Outras despesas" valor={r.despesasCentavos} menos />
        <Linha rotulo="Manutenção" valor={r.manutencaoCentavos} menos />
        <Linha rotulo="Comissão" valor={r.comissaoCentavos} menos />
      </div>
      <p className="text-sm text-muted-foreground tabular-nums">
        {formatarKm(r.km)}
        {r.kmPorLitro !== null && ` · ${kmL.format(r.kmPorLitro)} km/L`}
        {r.custoPorKmCentavos !== null && ` · custo ${formatarBRL(r.custoPorKmCentavos)}/km`}
      </p>

      <ul className="flex flex-col divide-y rounded-xl border">
        {dados.viagens.map((v) => (
          <li key={v.id}>
            <Link href={`/g/viagens/${v.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-muted">
              <span className="flex flex-col">
                <span className="font-medium tabular-nums">
                  {formatarDataHora(v.dataSaida)} · {v.motorista}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatarKm(v.km)} · frete {formatarBRL(v.freteCentavos)} · diesel ≈ {formatarBRL(v.dieselRateadoCentavos)}
                  {v.quantidadeFretes === 0 && <span className="font-semibold text-destructive"> · sem frete</span>}
                </span>
              </span>
              <span className={cn('font-semibold tabular-nums', v.resultadoCentavos < 0 && 'text-destructive')}>{formatarBRL(v.resultadoCentavos)}</span>
            </Link>
          </li>
        ))}
        {dados.viagens.length === 0 && <li className="p-3 text-muted-foreground">Nenhuma viagem concluída no mês.</li>}
      </ul>
      <p className="text-xs text-muted-foreground">Diesel de cada viagem dividido pelo km rodado; valores estimados até o mês fechar.</p>
    </section>
  );
}
