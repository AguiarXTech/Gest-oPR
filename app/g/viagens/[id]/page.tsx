import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FormFrete } from '@/components/gestao/FormFrete';
import { RemoverViagem } from '@/components/gestao/RemoverViagem';
import { TrocarCarreta } from '@/components/gestao/TrocarCarreta';
import { dataBrasilia } from '@/lib/domain/comissao';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { freteAutomatico } from '@/lib/domain/precoFrete';
import { formatarPlaca } from '@/lib/domain/placa';
import { TIPOS_DESPESA } from '@/lib/validations/despesa';
import { formatarData, formatarDataHora, formatarKm, formatarLitros } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Viagem · Gestão RPortugues' };

const status = {
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  planejada: 'Planejada',
} as const;

export default async function DetalheViagem({ params }: PageProps<'/g/viagens/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: v }, { data: clientes }, { data: carretas }] = await Promise.all([
    supabase
      .from('viagens')
      .select(
        '*, caminhoes(placa, apelido, tipo), carretas(placa), locais_carga(nome, endereco, cliente_id, sentido, precos_frete(vigencia_inicio, valor_centavos)), funcionarios(nome), acertos(status), fretes(*), abastecimentos(id, data_hora, km, litros, valor_total_centavos, conferido), despesas_viagem(id, data, tipo, valor_centavos, conferido)',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase.from('clientes').select('id, razao_social').eq('ativo', true).order('razao_social'),
    supabase.from('carretas').select('id, placa, apelido, ativo').order('placa'),
  ]);
  if (!v) notFound();

  const bloqueado = v.acertos?.status === 'fechado' || v.acertos?.status === 'pago';
  const freteDe = (sentido: 'ida' | 'volta') => v.fretes.find((f) => f.sentido === sentido) ?? null;
  // frete ainda não lançado: sugere o preço do produto escolhido, no trecho do local dele
  const local = v.locais_carga;
  const previsto = local
    ? freteAutomatico(
        {
          sentido: local.sentido,
          precos: local.precos_frete.map((p) => ({
            vigenciaInicio: p.vigencia_inicio,
            valorCentavos: p.valor_centavos,
          })),
        },
        dataBrasilia(v.data_saida),
      )
    : null;
  const sugestaoDe = (sentido: 'ida' | 'volta') =>
    local && previsto?.sentido === sentido
      ? { clienteId: local.cliente_id, valorCentavos: previsto.valorCentavos }
      : null;
  const receita = v.fretes.reduce((t, f) => t + f.valor_frete_centavos, 0);
  const diesel = v.abastecimentos.reduce((t, a) => t + a.valor_total_centavos, 0);
  const despesas = v.despesas_viagem.reduce((t, d) => t + d.valor_centavos, 0);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/g/viagens" className="text-sm text-muted-foreground hover:underline">
          ← Viagens
        </Link>
        <h1 className="text-3xl">
          <span className="font-mono">
            {v.caminhoes ? formatarPlaca(v.caminhoes.placa) : ''}
            {v.carretas && ` + ${formatarPlaca(v.carretas.placa)}`}
          </span>{' '}
          · {v.funcionarios?.nome}
        </h1>
        <p className="text-muted-foreground tabular-nums">
          {status[v.status]} · {v.origem} → {v.destino} → volta · saiu{' '}
          {formatarDataHora(v.data_saida)} com {formatarKm(v.km_saida)}
          {v.km_chegada !== null &&
            v.data_chegada &&
            ` · voltou ${formatarDataHora(v.data_chegada)} · ${formatarKm(v.km_chegada - v.km_saida)} rodados`}
        </p>
        {v.locais_carga && (
          <p className="font-medium">
            Carregou: {v.locais_carga.nome}
            {v.locais_carga.endereco && (
              <span className="font-normal text-muted-foreground">
                {' '}
                · {v.locais_carga.endereco}
              </span>
            )}
          </p>
        )}
      </div>

      {(v.caminhoes?.tipo === 'cavalo' || v.carreta_id) && v.status !== 'cancelada' && (
        <TrocarCarreta
          viagemId={v.id}
          carretaId={v.carreta_id}
          carretas={(carretas ?? []).filter((c) => c.ativo || c.id === v.carreta_id)}
          bloqueado={bloqueado}
        />
      )}

      <section className="grid grid-cols-3 gap-3">
        {[
          ['Fretes', receita],
          ['Diesel lançado', diesel],
          ['Despesas', despesas],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-xl border bg-card p-3 shadow-xs">
            <p className="text-sm text-muted-foreground">{rotulo}</p>
            <p className="text-lg font-bold tabular-nums">{formatarBRL(valor as number)}</p>
          </div>
        ))}
      </section>
      <p className="-mt-3 text-sm text-muted-foreground">
        Diesel e despesas ligados a esta viagem. O resultado exato (com rateio do diesel) fica no
        painel do mês.
      </p>

      {v.status === 'cancelada' ? (
        <p className="rounded-xl border p-4">
          Viagem cancelada pelo motorista: não entra em acerto nem no resultado.
        </p>
      ) : (
        <>
          {v.status === 'concluida' && v.fretes.length === 0 && (
            <p
              role="alert"
              className="rounded-xl border border-alerta bg-alerta/10 p-4 font-medium"
            >
              Viagem concluída sem frete lançado. Ela impede o fechamento do acerto do motorista.
            </p>
          )}
          <FormFrete
            key={`volta-${freteDe('volta')?.updated_at}`}
            viagemId={v.id}
            sentido="volta"
            frete={freteDe('volta')}
            clientes={clientes ?? []}
            bloqueado={bloqueado}
            sugestao={sugestaoDe('volta')}
          />
          <FormFrete
            key={`ida-${freteDe('ida')?.updated_at}`}
            viagemId={v.id}
            sentido="ida"
            frete={freteDe('ida')}
            clientes={clientes ?? []}
            bloqueado={bloqueado}
            sugestao={sugestaoDe('ida')}
          />
        </>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Abastecimentos da viagem</h2>
        {v.abastecimentos.length === 0 ? (
          <p className="text-muted-foreground">Nenhum.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border bg-card">
            {v.abastecimentos.map((a) => (
              <li key={a.id} className="flex justify-between gap-2 p-3 tabular-nums">
                <span>
                  {formatarDataHora(a.data_hora)} · {formatarKm(a.km)} ·{' '}
                  {formatarLitros(Number(a.litros))}
                </span>
                <span className="font-semibold">
                  {formatarBRL(a.valor_total_centavos)} {a.conferido ? '✓' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Despesas da viagem</h2>
        {v.despesas_viagem.length === 0 ? (
          <p className="text-muted-foreground">Nenhuma.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border bg-card">
            {v.despesas_viagem.map((d) => (
              <li key={d.id} className="flex justify-between gap-2 p-3 tabular-nums">
                <span>
                  {formatarData(d.data)} · {TIPOS_DESPESA[d.tipo]}
                </span>
                <span className="font-semibold">
                  {formatarBRL(d.valor_centavos)} {d.conferido ? '✓' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <RemoverViagem
        viagemId={v.id}
        abastecimentos={v.abastecimentos.length}
        despesas={v.despesas_viagem.length}
        emAcerto={v.acerto_id !== null}
      />
    </div>
  );
}
