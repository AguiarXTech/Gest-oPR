import type { Metadata } from 'next';
import { Download } from 'lucide-react';
import Link from 'next/link';
import { TITULO_ANOMALIA, type Severidade } from '@/lib/domain/anomalias';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { formatarPlaca } from '@/lib/domain/placa';
import {
  formatarData,
  formatarDataHora,
  formatarKm,
  formatarLitros,
  hojeIso,
} from '@/lib/formatar';
import { analisarDesde } from '@/lib/supabase/conferencia';
import { obterConfiguracoes } from '@/lib/supabase/configuracoes';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import { TIPOS_DESPESA } from '@/lib/validations/despesa';

export const metadata: Metadata = { title: 'Conferência · Gestão RPortugues' };

const PERIODO_DIAS = 90;
const filtros = {
  pendentes: 'Não conferidos',
  graves: 'Com alerta grave',
  todos: 'Todos',
} as const;
type Filtro = keyof typeof filtros;

const corSeveridade: Record<Severidade, string> = {
  alta: 'bg-destructive/15 text-destructive',
  media: 'bg-alerta/15',
  baixa: 'bg-muted',
};
const rotuloSeveridade: Record<Severidade, string> = {
  alta: 'grave',
  media: 'atenção',
  baixa: 'aviso',
};

/** Início do período da conferência (agora − 90 dias). */
function inicioDoPeriodo() {
  return new Date(Date.now() - PERIODO_DIAS * 24 * 60 * 60 * 1000);
}

function Aba({
  href,
  ativa,
  children,
}: {
  href: string;
  ativa: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={ativa ? 'page' : undefined}
      className={cn(
        'inline-flex h-11 items-center rounded-full border px-4 font-medium',
        ativa ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
      )}
    >
      {children}
    </Link>
  );
}

export default async function Conferencia({ searchParams }: PageProps<'/g/abastecimentos'>) {
  const params = await searchParams;
  const tipo = params.tipo === 'despesas' ? 'despesas' : 'abastecimentos';
  const filtro: Filtro =
    typeof params.filtro === 'string' && params.filtro in filtros
      ? (params.filtro as Filtro)
      : 'pendentes';
  const desde = inicioDoPeriodo();
  const url = (t: string, f: string) => `/g/abastecimentos?tipo=${t}&filtro=${f}`;

  const supabase = await createClient();

  let conteudo: React.ReactNode;
  if (tipo === 'abastecimentos') {
    const config = await obterConfiguracoes();
    const [analises, { data }] = await Promise.all([
      analisarDesde(supabase, desde, config),
      supabase
        .from('abastecimentos')
        .select(
          'id, data_hora, km, litros, valor_total_centavos, conferido, caminhoes(placa), funcionarios(nome), fornecedores(nome)',
        )
        .gte('data_hora', desde.toISOString())
        .order('data_hora', { ascending: false }),
    ]);
    const itens = (data ?? [])
      .map((a) => ({ ...a, analise: analises.get(a.id) }))
      .filter((a) =>
        filtro === 'pendentes'
          ? !a.conferido
          : filtro === 'graves'
            ? a.analise?.anomalias.some((x) => x.severidade === 'alta')
            : true,
      );

    conteudo =
      itens.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
          Nada aqui. 👍
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {itens.map((a) => {
            const pior = a.analise?.anomalias[0]?.severidade;
            return (
              <li key={a.id}>
                <Link
                  href={`/g/abastecimentos/${a.id}`}
                  className={cn(
                    'flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs hover:border-primary/40',
                    pior === 'alta' && 'border-destructive/50',
                  )}
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-lg font-semibold">
                      <span className="font-mono">
                        {a.caminhoes ? formatarPlaca(a.caminhoes.placa) : ''}
                      </span>{' '}
                      · {a.funcionarios?.nome}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatarBRL(a.valor_total_centavos)}
                    </span>
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {formatarDataHora(a.data_hora)} · {formatarKm(a.km)} ·{' '}
                    {formatarLitros(Number(a.litros))}
                    {a.fornecedores && ` · ${a.fornecedores.nome}`}
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {a.conferido && (
                      <span className="rounded-full bg-sucesso/15 px-2 py-0.5 text-sm font-medium text-sucesso">
                        ✓ conferido
                      </span>
                    )}
                    {a.analise?.anomalias.map((x) => (
                      <span
                        key={x.codigo}
                        className={cn(
                          'rounded-full px-2 py-0.5 text-sm font-medium',
                          corSeveridade[x.severidade],
                        )}
                      >
                        {rotuloSeveridade[x.severidade]}: {TITULO_ANOMALIA[x.codigo]}
                      </span>
                    ))}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      );
  } else {
    let consulta = supabase
      .from('despesas_viagem')
      .select(
        'id, data, tipo, valor_centavos, conferido, reembolsavel, foto_path, funcionarios(nome)',
      )
      .gte('data', desde.toISOString().slice(0, 10))
      // pedágio e manutenção têm área própria (pedido de 2026-10-07)
      .not('tipo', 'in', '(pedagio,manutencao)')
      .order('data', { ascending: false });
    if (filtro === 'pendentes') consulta = consulta.eq('conferido', false);
    if (filtro === 'graves') consulta = consulta.is('foto_path', null); // sem foto é o alerta grave da despesa
    const { data } = await consulta;

    const outrasAreas = (
      <p className="text-sm text-muted-foreground">
        Pedágio fica em{' '}
        <Link href="/g/pedagio" className="font-medium text-primary underline">
          Pedágio
        </Link>{' '}
        e manutenção em{' '}
        <Link href="/g/manutencao" className="font-medium text-primary underline">
          Manutenção
        </Link>
        .
      </p>
    );
    conteudo =
      (data ?? []).length === 0 ? (
        <>
          <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
            Nada aqui. 👍
          </p>
          {outrasAreas}
        </>
      ) : (
        <ul className="flex flex-col gap-3">
          <li>{outrasAreas}</li>
          {(data ?? []).map((d) => (
            <li key={d.id}>
              <Link
                href={`/g/abastecimentos/despesas/${d.id}`}
                className="flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-xs hover:border-primary/40"
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-lg font-semibold">
                    {TIPOS_DESPESA[d.tipo]} · {d.funcionarios?.nome}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatarBRL(d.valor_centavos)}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                  {formatarData(d.data)}
                  {!d.reembolsavel && (
                    <span className="rounded-full bg-muted px-2 py-0.5">não reembolsa</span>
                  )}
                  {d.conferido && (
                    <span className="rounded-full bg-sucesso/15 px-2 py-0.5 font-medium text-sucesso">
                      ✓ conferido
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

  return (
    <>
      <h1 className="text-3xl">Conferência</h1>
      <nav aria-label="Tipo" className="flex flex-wrap gap-2">
        <Aba href={url('abastecimentos', filtro)} ativa={tipo === 'abastecimentos'}>
          Abastecimentos
        </Aba>
        <Aba href={url('despesas', filtro)} ativa={tipo === 'despesas'}>
          Despesas
        </Aba>
        <Aba href="/g/abastecimentos/relatorio" ativa={false}>
          Relatório
        </Aba>
      </nav>
      <nav aria-label="Filtro" className="flex flex-wrap gap-2">
        {Object.entries(filtros).map(([valor, rotulo]) => (
          <Link
            key={valor}
            href={url(tipo, valor)}
            aria-current={filtro === valor ? 'page' : undefined}
            className={cn(
              'inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium',
              filtro === valor ? 'bg-grafite text-white' : 'border bg-card hover:bg-muted',
            )}
          >
            {rotulo}
          </Link>
        ))}
      </nav>
      <p className="text-sm text-muted-foreground">Últimos {PERIODO_DIAS} dias.</p>
      {tipo === 'abastecimentos' && (
        <details className="rounded-xl border bg-card p-3 shadow-xs">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-medium">
            <Download className="size-5" aria-hidden /> Baixar planilha de abastecimentos (CSV)
          </summary>
          <form action="/g/exportar/abastecimentos" className="mt-3 flex flex-wrap items-end gap-2">
            {[
              ['de', 'De', desde.toISOString().slice(0, 10)],
              ['ate', 'Até', hojeIso()],
            ].map(([nome, rotulo, padrao]) => (
              <label key={nome} className="flex flex-col gap-1 text-sm font-medium">
                {rotulo}
                <input
                  type="date"
                  name={nome}
                  required
                  defaultValue={padrao}
                  className="h-11 rounded-lg border border-input bg-transparent px-2.5 text-base"
                />
              </label>
            ))}
            <button
              type="submit"
              className="inline-flex h-11 items-center rounded-lg border px-4 font-medium hover:bg-muted"
            >
              Baixar CSV
            </button>
          </form>
        </details>
      )}
      {conteudo}
    </>
  );
}
