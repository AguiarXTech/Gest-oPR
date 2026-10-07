// Lista do que o motorista pagou do bolso (pedágio ou manutenção), com a situação da
// devolução e o link para conferir a despesa.
import Link from 'next/link';
import type { SituacaoReembolso } from '@/lib/domain/despesas';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { formatarPlaca } from '@/lib/domain/placa';
import { formatarData } from '@/lib/formatar';
import type { DespesaMotorista } from '@/lib/supabase/despesasMotorista';
import { cn } from '@/lib/utils';

const SITUACAO: Record<SituacaoReembolso, { rotulo: string; classe: string }> = {
  a_devolver: { rotulo: 'A devolver no acerto', classe: 'bg-alerta/20' },
  no_acerto: { rotulo: 'No acerto', classe: 'bg-primary/15 text-primary' },
  devolvido: { rotulo: 'Devolvido', classe: 'bg-sucesso/15 text-sucesso' },
  nao_reembolsavel: { rotulo: 'Não reembolsa', classe: 'bg-muted text-muted-foreground' },
};

export function PagoPeloMotorista({ itens, vazio }: { itens: DespesaMotorista[]; vazio: string }) {
  if (itens.length === 0) return <p className="text-muted-foreground">{vazio}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {itens.map((d) => (
        <li key={d.id}>
          <Link
            href={`/g/abastecimentos/despesas/${d.id}`}
            className="flex flex-col gap-1 rounded-xl border bg-card p-3 shadow-xs hover:border-primary/40"
          >
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">
                {d.funcionarios?.nome}
                {d.caminhoes && (
                  <span className="font-mono font-normal text-muted-foreground">
                    {' '}
                    · {formatarPlaca(d.caminhoes.placa)}
                  </span>
                )}
              </span>
              <span className="text-lg font-bold tabular-nums">
                {formatarBRL(d.valor_centavos)}
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              {formatarData(d.data)}
              {d.descricao && ` · ${d.descricao}`}
              <span
                className={cn('rounded-full px-2 py-0.5 font-medium', SITUACAO[d.situacao].classe)}
              >
                {SITUACAO[d.situacao].rotulo}
              </span>
              {d.conferido ? (
                <span className="rounded-full bg-sucesso/15 px-2 py-0.5 font-medium text-sucesso">
                  ✓ conferido
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 font-medium">conferir</span>
              )}
              {!d.caminhoes && (
                <span className="rounded-full bg-destructive/15 px-2 py-0.5 font-medium text-destructive">
                  sem caminhão
                </span>
              )}
              {!d.foto_path && (
                <span className="rounded-full bg-destructive/15 px-2 py-0.5 font-medium text-destructive">
                  sem foto
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
