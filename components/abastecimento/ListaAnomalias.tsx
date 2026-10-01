import { AlertTriangle, Info, OctagonAlert } from 'lucide-react';
import type { Anomalia } from '@/lib/domain/anomalias';
import { cn } from '@/lib/utils';

const estilo = {
  alta: { icone: OctagonAlert, classe: 'border-destructive/50 bg-destructive/10 text-destructive', rotulo: 'Grave' },
  media: { icone: AlertTriangle, classe: 'border-alerta/50 bg-alerta/10', rotulo: 'Atenção' },
  baixa: { icone: Info, classe: 'border-border bg-muted', rotulo: 'Aviso' },
} as const;

/** Alertas de um abastecimento, do mais grave para o mais leve. */
export function ListaAnomalias({ anomalias, compacta }: { anomalias: readonly Anomalia[]; compacta?: boolean }) {
  if (anomalias.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {anomalias.map((a) => {
        const { icone: Icone, classe, rotulo } = estilo[a.severidade];
        return (
          <li key={a.codigo} className={cn('flex gap-3 rounded-xl border p-3', classe, compacta && 'p-2 text-sm')}>
            <Icone className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span>
              <span className="font-semibold">{rotulo}: </span>
              <span className="text-foreground">{a.mensagem}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
