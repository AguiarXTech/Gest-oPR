import type { Metadata } from 'next';
import Link from 'next/link';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { formatarPlaca } from '@/lib/domain/placa';
import { formatarDataHora, formatarKm } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Viagens · Gestão RPortugues' };

const filtros = {
  todas: 'Todas',
  sem_frete: 'Sem frete',
  em_andamento: 'Em andamento',
  concluida: 'Concluídas',
} as const;
type Filtro = keyof typeof filtros;

export default async function ListaViagens({ searchParams }: PageProps<'/g/viagens'>) {
  const { filtro: bruto } = await searchParams;
  const filtro: Filtro =
    typeof bruto === 'string' && bruto in filtros ? (bruto as Filtro) : 'todas';

  const supabase = await createClient();
  let consulta = supabase
    .from('viagens')
    .select(
      'id, status, data_saida, data_chegada, km_saida, km_chegada, caminhoes(placa), carretas(placa), funcionarios(nome), fretes(sentido, valor_frete_centavos)',
    )
    .neq('status', 'cancelada')
    .order('data_saida', { ascending: false })
    .limit(100);
  if (filtro === 'em_andamento') consulta = consulta.eq('status', 'em_andamento');
  if (filtro === 'concluida' || filtro === 'sem_frete')
    consulta = consulta.eq('status', 'concluida');
  const { data, error } = await consulta;

  const viagens = (data ?? []).filter((v) => filtro !== 'sem_frete' || v.fretes.length === 0);

  return (
    <>
      <h1 className="text-3xl">Viagens</h1>

      <nav aria-label="Filtrar viagens" className="flex flex-wrap gap-2">
        {Object.entries(filtros).map(([valor, rotulo]) => (
          <Link
            key={valor}
            href={valor === 'todas' ? '/g/viagens' : `/g/viagens?filtro=${valor}`}
            aria-current={filtro === valor ? 'page' : undefined}
            className={cn(
              'inline-flex h-11 items-center rounded-full border px-4 font-medium',
              filtro === valor
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card hover:bg-muted',
            )}
          >
            {rotulo}
          </Link>
        ))}
      </nav>

      {error && (
        <p className="text-destructive">
          Não foi possível carregar as viagens. Recarregue a página.
        </p>
      )}
      {!error && viagens.length === 0 && (
        <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
          Nenhuma viagem aqui.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {viagens.map((v) => {
          const total = v.fretes.reduce((t, f) => t + f.valor_frete_centavos, 0);
          const semFrete = v.status === 'concluida' && v.fretes.length === 0;
          return (
            <li key={v.id}>
              <Link
                href={`/g/viagens/${v.id}`}
                className={cn(
                  'flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-xs hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between',
                  semFrete && 'border-alerta',
                )}
              >
                <span className="flex flex-col">
                  <span className="text-lg font-semibold">
                    <span className="font-mono">
                      {v.caminhoes ? formatarPlaca(v.caminhoes.placa) : '—'}
                      {v.carretas && ` + ${formatarPlaca(v.carretas.placa)}`}
                    </span>{' '}
                    · {v.funcionarios?.nome}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    saiu {formatarDataHora(v.data_saida)}
                    {v.data_chegada && ` · voltou ${formatarDataHora(v.data_chegada)}`}
                    {v.km_chegada !== null && ` · ${formatarKm(v.km_chegada - v.km_saida)}`}
                  </span>
                </span>
                <span className="flex items-center gap-2 sm:flex-col sm:items-end">
                  {v.status === 'em_andamento' ? (
                    <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
                      Em andamento
                    </span>
                  ) : semFrete ? (
                    <span className="rounded-full bg-alerta/15 px-3 py-1 text-sm font-semibold">
                      Sem frete lançado
                    </span>
                  ) : (
                    <span className="font-semibold tabular-nums">{formatarBRL(total)}</span>
                  )}
                  {v.fretes.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {v.fretes.length === 2
                        ? 'ida + volta'
                        : v.fretes[0].sentido === 'volta'
                          ? 'só volta'
                          : 'só ida'}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
