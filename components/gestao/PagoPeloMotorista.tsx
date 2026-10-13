// Lista do que o motorista pagou do bolso (pedágio ou manutenção), com a situação da
// devolução. Em manutenção, o dono dá baixa quando paga direto ao motorista (2026-10-13).
import Link from 'next/link';
import type { SituacaoReembolso } from '@/lib/domain/despesas';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { formatarPlaca } from '@/lib/domain/placa';
import { formatarData } from '@/lib/formatar';
import type { ItemPagoMotorista } from '@/lib/supabase/despesasMotorista';
import { cn } from '@/lib/utils';
import { BaixaReembolso } from './BaixaReembolso';

const SITUACAO: Record<SituacaoReembolso, { rotulo: string; classe: string }> = {
  a_devolver: { rotulo: 'A devolver ao motorista', classe: 'bg-alerta/20' },
  no_acerto: { rotulo: 'No acerto', classe: 'bg-primary/15 text-primary' },
  devolvido: { rotulo: 'Devolvido', classe: 'bg-sucesso/15 text-sucesso' },
  nao_reembolsavel: { rotulo: 'Não reembolsa', classe: 'bg-muted text-muted-foreground' },
  pago_pela_empresa: { rotulo: 'Pago pela empresa', classe: 'bg-muted text-muted-foreground' },
};

type Props = {
  itens: ItemPagoMotorista[];
  vazio: string;
  /** Mostra o botão de baixa (pagamento direto ao motorista). */
  permitirBaixa?: boolean;
};

export function PagoPeloMotorista({ itens, vazio, permitirBaixa = false }: Props) {
  if (itens.length === 0) return <p className="text-muted-foreground">{vazio}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {itens.map((d) => {
        const cabecalho = (
          <>
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">
                {d.motorista}
                {d.placa && (
                  <span className="font-mono font-normal text-muted-foreground">
                    {' '}
                    · {formatarPlaca(d.placa)}
                  </span>
                )}
              </span>
              <span className="text-lg font-bold tabular-nums">{formatarBRL(d.valorCentavos)}</span>
            </span>
            <span className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              {formatarData(d.data)}
              {d.descricao && ` · ${d.descricao}`}
              <span
                className={cn('rounded-full px-2 py-0.5 font-medium', SITUACAO[d.situacao].classe)}
              >
                {SITUACAO[d.situacao].rotulo}
              </span>
              {d.origem === 'despesa' &&
                (d.conferido ? (
                  <span className="rounded-full bg-sucesso/15 px-2 py-0.5 font-medium text-sucesso">
                    ✓ conferido
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 font-medium">conferir</span>
                ))}
              {d.origem === 'manutencao' && (
                <span className="rounded-full bg-muted px-2 py-0.5">lançada pela gestão</span>
              )}
              {!d.placa && (
                <span className="rounded-full bg-destructive/15 px-2 py-0.5 font-medium text-destructive">
                  sem caminhão
                </span>
              )}
              {d.semFoto && (
                <span className="rounded-full bg-destructive/15 px-2 py-0.5 font-medium text-destructive">
                  sem comprovante
                </span>
              )}
            </span>
          </>
        );
        const podeBaixa =
          permitirBaixa &&
          (d.situacao === 'a_devolver' || (d.situacao === 'devolvido' && d.reembolsadoEm));
        return (
          <li
            key={`${d.origem}-${d.id}`}
            className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-xs"
          >
            {d.href ? (
              <Link href={d.href} className="flex flex-col gap-1 hover:underline">
                {cabecalho}
              </Link>
            ) : (
              <div className="flex flex-col gap-1">{cabecalho}</div>
            )}
            {podeBaixa && (
              <BaixaReembolso
                origem={d.origem}
                id={d.id}
                motorista={d.motorista}
                valorCentavos={d.valorCentavos}
                reembolsadoEm={d.reembolsadoEm}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
