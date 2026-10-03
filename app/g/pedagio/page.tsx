// Controle de pedágio (pedido de 2026-10-03): previsto (tarifa × eixos) × cobrado pelo app,
// para achar e contestar cobranças erradas. Só gestão (custo do caminhão, Q6).
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CobrancaPedagio, EixosViagem } from '@/components/gestao/CobrancaPedagio';
import { PracasPedagio } from '@/components/gestao/PracasPedagio';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { formatarPlaca } from '@/lib/domain/placa';
import { competencia } from '@/lib/domain/resultado';
import { carregarPedagioMes } from '@/lib/supabase/pedagio';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Pedágio · Gestão RPortugues' };

function mesAtual() {
  return competencia(new Date().toISOString());
}
function deslocar(mes: string, delta: number) {
  const [a, m] = mes.split('-').map(Number);
  const total = a * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}
const nomeMes = (mes: string) => {
  const t = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${mes}-15T12:00:00Z`));
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export default async function Pedagio({ searchParams }: PageProps<'/g/pedagio'>) {
  const { mes: bruto } = await searchParams;
  const atual = mesAtual();
  const mes =
    typeof bruto === 'string' && /^\d{4}-\d{2}$/.test(bruto) && bruto <= atual ? bruto : atual;
  const supabase = await createClient();
  const { viagens, pracas, totais } = await carregarPedagioMes(supabase, mes);

  return (
    <>
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl">Pedágio</h1>
        <nav
          aria-label="Mês"
          className="flex items-center justify-between gap-2 rounded-xl border bg-card p-1 shadow-xs"
        >
          <Link
            href={`/g/pedagio?mes=${deslocar(mes, -1)}`}
            aria-label="Mês anterior"
            className="flex size-11 items-center justify-center rounded-lg hover:bg-muted"
          >
            <ChevronLeft className="size-6" aria-hidden />
          </Link>
          <span className="font-semibold">{nomeMes(mes)}</span>
          {mes < atual ? (
            <Link
              href={`/g/pedagio?mes=${deslocar(mes, 1)}`}
              aria-label="Próximo mês"
              className="flex size-11 items-center justify-center rounded-lg hover:bg-muted"
            >
              <ChevronRight className="size-6" aria-hidden />
            </Link>
          ) : (
            <span className="size-11" />
          )}
        </nav>
      </div>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <p className="text-sm text-muted-foreground">Previsto</p>
          <p className="text-2xl font-bold tabular-nums">{formatarBRL(totais.previstoCentavos)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <p className="text-sm text-muted-foreground">Cobrado</p>
          <p className="text-2xl font-bold tabular-nums">{formatarBRL(totais.cobradoCentavos)}</p>
        </div>
        <div
          className={cn(
            'col-span-2 rounded-xl border p-4 shadow-xs',
            totais.aMaisEmAbertoCentavos > 0 ? 'border-destructive bg-destructive/10' : 'bg-card',
          )}
        >
          <p className="text-sm text-muted-foreground">Cobrado a mais, ainda não ressarcido</p>
          <p
            className={cn(
              'text-3xl font-bold tabular-nums',
              totais.aMaisEmAbertoCentavos > 0 && 'text-destructive',
            )}
          >
            {formatarBRL(totais.aMaisEmAbertoCentavos)}
          </p>
          <p className="text-sm text-muted-foreground">
            {totais.paraContestar > 0 && `${totais.paraContestar} cobrança(s) para contestar · `}
            {totais.semLancamento > 0
              ? `${totais.semLancamento} passagem(ns) sem o valor cobrado lançado`
              : 'Todas as passagens lançadas'}
          </p>
        </div>
      </section>

      <PracasPedagio pracas={pracas} />

      {pracas.length > 0 && (
        <ul className="flex flex-col gap-3">
          {viagens.map((v) => (
            <li key={v.id} className="flex flex-col gap-1 rounded-2xl border bg-card p-4 shadow-xs">
              <Link href={`/g/viagens/${v.id}`} className="text-lg font-semibold hover:underline">
                <span className="font-mono">
                  {formatarPlaca(v.placa)}
                  {v.placaCarreta && ` + ${formatarPlaca(v.placaCarreta)}`}
                </span>{' '}
                · {v.motorista}
              </Link>
              <EixosViagem viagemId={v.id} ida={v.eixosIda} volta={v.eixosVolta} />
              <div className="flex flex-col divide-y">
                {v.passagens.map((p) => (
                  <CobrancaPedagio key={`${p.pracaId}-${p.sentido}`} p={p} />
                ))}
              </div>
            </li>
          ))}
          {viagens.length === 0 && (
            <li className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
              Nenhuma viagem neste mês.
            </li>
          )}
        </ul>
      )}
      <p className="text-sm text-muted-foreground">
        Previsto = tarifa por eixo × eixos (cavalo + carreta da viagem). Ida vazia conta só os eixos
        no chão (eixo suspenso vazio não paga, Lei 13.103); ida com carga e volta contam todos.
        Atenção: com MDF-e aberto, o app cobra o eixo suspenso como carregado.
      </p>
    </>
  );
}
