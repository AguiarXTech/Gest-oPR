// Demonstrativo do resultado do mês (total da frota ou de um caminhão), em linhas — cabe no celular.
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

type Props = { titulo: string; subtitulo?: string; r: Resultado; href?: string; destaque?: boolean };

export function DemonstrativoResultado({ titulo, subtitulo, r, href, destaque }: Props) {
  const conteudo = (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex flex-col">
          <span className={cn('font-semibold', destaque ? 'text-lg' : 'font-mono text-lg')}>{titulo}</span>
          {subtitulo && <span className="text-xs text-muted-foreground">{subtitulo}</span>}
        </span>
        <span className={cn('text-xl font-bold tabular-nums', r.resultadoCentavos < 0 && 'text-destructive')}>{formatarBRL(r.resultadoCentavos)}</span>
      </div>
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
  const classe = cn('flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs', destaque && 'border-2 border-primary/40');
  return href ? (
    <Link href={href} className={cn(classe, 'hover:border-primary/40')}>
      {conteudo}
    </Link>
  ) : (
    <section className={classe}>{conteudo}</section>
  );
}
