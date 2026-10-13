// Despesas lançadas pelos motoristas (pedágio ou manutenção), com o caminhão e o link para
// conferir. Sem "quem pagou" (pedido do dono, 2026-10-13).
import Link from 'next/link';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { formatarPlaca } from '@/lib/domain/placa';
import { formatarData } from '@/lib/formatar';
import type { DespesaDoMotorista } from '@/lib/supabase/despesasMotorista';

export function DespesasDoMotorista({
  itens,
  vazio,
}: {
  itens: DespesaDoMotorista[];
  vazio: string;
}) {
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
                {d.placa ? (
                  <span className="font-mono">{formatarPlaca(d.placa)}</span>
                ) : (
                  'Sem caminhão'
                )}
                <span className="font-normal text-muted-foreground"> · {d.motorista}</span>
              </span>
              <span className="text-lg font-bold tabular-nums">{formatarBRL(d.valorCentavos)}</span>
            </span>
            <span className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              {formatarData(d.data)}
              {d.descricao && ` · ${d.descricao}`}
              {d.conferido ? (
                <span className="rounded-full bg-sucesso/15 px-2 py-0.5 font-medium text-sucesso">
                  ✓ conferido
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 font-medium">conferir</span>
              )}
              {!d.placa && (
                <span className="rounded-full bg-destructive/15 px-2 py-0.5 font-medium text-destructive">
                  escolher caminhão
                </span>
              )}
              {d.semFoto && (
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
