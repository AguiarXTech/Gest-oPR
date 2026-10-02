// Painel da gestão (PRD 5.3, RF-19): quatro cards do mês. Pensado primeiro para o celular
// (~390 px): cards empilhados, resultado por caminhão em lista e alertas com link para resolver.
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { TIPOS_DOCUMENTO } from '@/lib/domain/documentos';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { formatarPlaca } from '@/lib/domain/placa';
import { competencia } from '@/lib/domain/resultado';
import { formatarKm } from '@/lib/formatar';
import { analisarDesde } from '@/lib/supabase/conferencia';
import { obterConfiguracoes } from '@/lib/supabase/configuracoes';
import { carregarSituacaoDocumentos } from '@/lib/supabase/documentos';
import { carregarSituacaoManutencao } from '@/lib/supabase/manutencao';
import { situacaoMulta } from '@/lib/domain/multas';
import { hojeIso } from '@/lib/formatar';
import { carregarMes } from '@/lib/supabase/painel';
import { DemonstrativoResultado } from '@/components/gestao/DemonstrativoResultado';
import { obterPerfilAtual } from '@/lib/supabase/perfil';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

const kmL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function mesAtual() {
  return competencia(new Date().toISOString());
}
function trintaDiasAtras() {
  return new Date(Date.now() - 30 * 86_400_000);
}
function deslocar(mes: string, delta: number) {
  const [a, m] = mes.split('-').map(Number);
  const total = a * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}
const nomeMes = (mes: string) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${mes}-15T12:00:00Z`),
  );

type Alerta = { texto: string; href: string; grave: boolean };

export default async function PainelGestao({ searchParams }: PageProps<'/g'>) {
  const { mes: bruto } = await searchParams;
  const atual = mesAtual();
  const mes =
    typeof bruto === 'string' && /^\d{4}-\d{2}$/.test(bruto) && bruto <= atual ? bruto : atual;

  const supabase = await createClient();
  const config = await obterConfiguracoes();
  const [
    perfil,
    { caminhoes, frota },
    documentos,
    analises,
    { data: semFrete },
    { data: pendentes },
    manutencao,
    { data: multas },
  ] = await Promise.all([
    obterPerfilAtual(),
    carregarMes(supabase, mes),
    carregarSituacaoDocumentos(supabase),
    analisarDesde(supabase, trintaDiasAtras(), config),
    supabase
      .from('viagens')
      .select('id, fretes(id)')
      .eq('status', 'concluida')
      .is('acerto_id', null),
    supabase
      .from('abastecimentos')
      .select('id')
      .eq('conferido', false)
      .gte('data_hora', trintaDiasAtras().toISOString()),
    carregarSituacaoManutencao(supabase),
    supabase
      .from('multas')
      .select('prazo_indicacao, indicado_em, pago_em')
      .is('indicado_em', null)
      .not('prazo_indicacao', 'is', null),
  ]);

  const graves = (pendentes ?? []).filter((a) =>
    analises.get(a.id)?.anomalias.some((x) => x.severidade === 'alta'),
  ).length;
  const viagensSemFrete = (semFrete ?? []).filter((v) => v.fretes.length === 0).length;
  const manutencaoAlertas = manutencao.flatMap((c) =>
    c.itens
      .filter((i) => i.situacao.status === 'vencido' || i.situacao.status === 'proximo')
      .map((i) => ({ placa: c.placa, item: i.item, vencido: i.situacao.status === 'vencido' })),
  );
  const multasIndicar = (multas ?? []).map((m) =>
    situacaoMulta(
      { prazoIndicacao: m.prazo_indicacao, indicadoEm: m.indicado_em, pagoEm: m.pago_em },
      hojeIso(),
    ),
  );
  const alertas: Alerta[] = [
    ...(graves > 0
      ? [
          {
            texto: `${graves} abastecimento(s) com alerta grave para conferir`,
            href: '/g/abastecimentos?filtro=graves',
            grave: true,
          },
        ]
      : []),
    ...(viagensSemFrete > 0
      ? [
          {
            texto: `${viagensSemFrete} viagem(ns) concluída(s) sem frete lançado`,
            href: '/g/viagens?filtro=sem_frete',
            grave: true,
          },
        ]
      : []),
    ...manutencaoAlertas.map((m) => ({
      texto: `${m.item} ${formatarPlaca(m.placa)}: ${m.vencido ? 'vencida' : 'chegando'}`,
      href: '/g/manutencao',
      grave: m.vencido,
    })),
    ...(multasIndicar.length > 0
      ? [
          {
            texto: `${multasIndicar.length} multa(s) para indicar o condutor${multasIndicar.includes('indicar_atrasado') ? ' (prazo vencido)' : ''}`,
            href: '/g/multas',
            grave: multasIndicar.includes('indicar_atrasado'),
          },
        ]
      : []),
    ...documentos.situacao
      .filter((d) => d.status !== 'ok' && d.status !== 'aviso')
      .map((d) => ({
        texto: `${TIPOS_DOCUMENTO[d.tipo].rotulo}${d.caminhoes ? ` ${formatarPlaca(d.caminhoes.placa)}` : d.funcionarios ? ` de ${d.funcionarios.nome}` : ''}: ${
          d.dias < 0 ? 'vencido' : `vence em ${d.dias} dia(s)`
        }`,
        href: '/g/documentos',
        grave: d.status === 'vencido' || d.status === 'critico',
      })),
  ];

  const primeiroNome = perfil?.nome.split(' ')[0];
  const temMovimento = frota.km > 0 || frota.dieselCentavos > 0;

  return (
    <>
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl">Olá, {primeiroNome}</h1>
        <nav
          aria-label="Mês"
          className="flex items-center justify-between gap-2 rounded-xl border bg-card p-1 shadow-xs"
        >
          <Link
            href={`/g?mes=${deslocar(mes, -1)}`}
            aria-label="Mês anterior"
            className="flex size-11 items-center justify-center rounded-lg hover:bg-muted"
          >
            <ChevronLeft className="size-6" aria-hidden />
          </Link>
          <span className="font-semibold capitalize">{nomeMes(mes)}</span>
          {mes < atual ? (
            <Link
              href={`/g?mes=${deslocar(mes, 1)}`}
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <section className="flex flex-col gap-1 rounded-xl border bg-card p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-muted-foreground">Receita do mês</h2>
          <p className="text-3xl font-bold tabular-nums">{formatarBRL(frota.receitaCentavos)}</p>
          <p className="text-sm text-muted-foreground tabular-nums">
            Fretes das viagens concluídas · {formatarKm(frota.km)}
          </p>
        </section>

        <section className="flex flex-col gap-1 rounded-xl border bg-card p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-muted-foreground">Custo de diesel</h2>
          <p className="text-3xl font-bold tabular-nums">{formatarBRL(frota.dieselCentavos)}</p>
          <p className="text-sm text-muted-foreground tabular-nums">
            {frota.kmPorLitro !== null
              ? `média ${kmL.format(frota.kmPorLitro)} km/L na frota`
              : 'Sem km/L ainda'}
          </p>
        </section>

        <section className="flex flex-col gap-2 rounded-xl border bg-card p-5 shadow-xs sm:col-span-2 xl:col-span-1">
          <h2 className="text-sm font-semibold text-muted-foreground">Resultado por caminhão</h2>
          <p
            className={cn(
              'text-3xl font-bold tabular-nums',
              frota.resultadoCentavos < 0 && 'text-destructive',
            )}
          >
            {formatarBRL(frota.resultadoCentavos)}
          </p>
          <ul className="flex flex-col divide-y">
            {caminhoes.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/g/caminhoes/${c.id}?mes=${mes}`}
                  className="flex min-h-11 items-center justify-between gap-3 py-2 hover:text-primary"
                >
                  <span className="flex flex-col">
                    <span className="font-mono font-semibold">{formatarPlaca(c.placa)}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {c.viagens.length} viage{c.viagens.length === 1 ? 'm' : 'ns'}
                      {c.resultado.kmPorLitro !== null &&
                        ` · ${kmL.format(c.resultado.kmPorLitro)} km/L`}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      c.resultado.resultadoCentavos < 0 && 'text-destructive',
                    )}
                  >
                    {formatarBRL(c.resultado.resultadoCentavos)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Receita − diesel − pedágio − despesas − manutenção − comissão. Toque na placa para ver
            as viagens.
          </p>
        </section>

        <section className="flex flex-col gap-2 rounded-xl border bg-card p-5 shadow-xs sm:col-span-2 xl:col-span-1">
          <h2 className="text-sm font-semibold text-muted-foreground">Alertas</h2>
          {alertas.length === 0 ? (
            <p className="font-semibold text-sucesso">✓ Nada pendente</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {alertas.map((a) => (
                <li key={a.texto}>
                  <Link
                    href={a.href}
                    className={cn(
                      'flex min-h-11 items-center py-1 font-medium underline-offset-2 hover:underline',
                      a.grave ? 'text-destructive' : 'text-alerta',
                    )}
                  >
                    {a.texto}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Resumo do mês</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <DemonstrativoResultado titulo="Total da frota" subtitulo={`${caminhoes.length} caminhões`} r={frota} destaque />
          {caminhoes.map((c) => (
            <DemonstrativoResultado
              key={c.id}
              titulo={formatarPlaca(c.placa)}
              subtitulo={[c.apelido, `${c.viagens.length} viage${c.viagens.length === 1 ? 'm' : 'ns'}`].filter(Boolean).join(' · ')}
              r={c.resultado}
              href={`/g/caminhoes/${c.id}?mes=${mes}`}
            />
          ))}
        </div>
      </section>

      {!temMovimento && (
        <p className="text-sm text-muted-foreground">
          Nenhuma viagem concluída nem abastecimento neste mês.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Valores estimados até o fechamento do mês: o diesel é dividido entre as viagens pelo km e a
        comissão segue a regra de cada motorista.
      </p>
    </>
  );
}
