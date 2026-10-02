// Demonstrativo do resultado do mês (total da frota ou de um caminhão), em linhas — cabe no celular.
// `recolhido`: mostra só a placa e o resultado; tocar abre as linhas (menos rolagem no painel).
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { formatarBRL } from '@/lib/domain/dinheiro';
import type { Resultado } from '@/lib/domain/resultado';
import { formatarKm } from '@/lib/formatar';
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

type Props = { titulo: string; subtitulo?: string; r: Resultado; href?: string; destaque?: boolean; recolhido?: boolean };

export function DemonstrativoResultado({ titulo, subtitulo, r, href, destaque, recolhido }: Props) {
  const cabecalho = (
    <span className="flex flex-1 items-baseline justify-between gap-2">
      <span className="flex flex-col">
        <span className={cn('text-lg font-semibold', !destaque && 'font-mono')}>{titulo}</span>
        {subtitulo && <span className="text-xs text-muted-foreground">{subtitulo}</span>}
      </span>
      <span className={cn('text-xl font-bold tabular-nums', r.resultadoCentavos < 0 && 'text-destructive')}>{formatarBRL(r.resultadoCentavos)}</span>
    </span>
  );
  const detalhe = (
    <>
      <div className="text-sm">
        <Linha rotulo="Fretes" valor={r.receitaCentavos} />
        <Linha rotulo="Diesel" valor={r.dieselCentavos} menos />
        <Linha rotulo="Pedágio" valor={r.pedagioCentavos} menos />
        <Linha rotulo="Outras despesas" valor={r.despesasCentavos} menos />
        <Linha rotulo="Manutenção" valor={r.manutencaoCentavos} menos />
        <Linha rotulo="Comissão" valor={r.comissaoCentavos} menos />
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {formatarKm(r.km)}
        {r.kmPorLitro !== null && ` · ${kmL.format(r.kmPorLitro)} km/L`}
        {r.custoPorKmCentavos !== null && ` · custo ${formatarBRL(r.custoPorKmCentavos)}/km`}
      </p>
    </>
  );

  if (recolhido) {
    return (
      <details className="group rounded-xl border bg-card shadow-xs">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 px-4 py-2 [&::-webkit-details-marker]:hidden">
          {cabecalho}
          <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="flex flex-col gap-2 border-t px-4 py-3">
          {detalhe}
          {href && (
            <Link href={href} className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">
              Ver viagens e detalhe do caminhão
            </Link>
          )}
        </div>
      </details>
    );
  }

  return (
    <section className={cn('flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs', destaque && 'border-2 border-primary/40')}>
      {cabecalho}
      {detalhe}
    </section>
  );
}
