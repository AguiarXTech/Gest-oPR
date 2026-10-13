// Manutenção preventiva (RF-32): plano por caminhão com aviso pelo km e pelo tempo.
import type { Metadata } from 'next';
import { AcoesManutencao } from '@/components/gestao/AcoesManutencao';
import { ApagarRegistro } from '@/components/gestao/ApagarRegistro';
import { PagoPeloMotorista } from '@/components/gestao/PagoPeloMotorista';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { competencia } from '@/lib/domain/resultado';
import type { SituacaoItem } from '@/lib/domain/manutencao';
import { formatarPlaca } from '@/lib/domain/placa';
import { formatarData, formatarKm } from '@/lib/formatar';
import { carregarDespesasMotorista } from '@/lib/supabase/despesasMotorista';
import { carregarSituacaoManutencao } from '@/lib/supabase/manutencao';
import { limitesDoMes } from '@/lib/supabase/painel';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Manutenção · Gestão RPortugues' };

const ESTILO = {
  vencido: 'bg-destructive text-white',
  sem_registro: 'bg-alerta/20',
  proximo: 'bg-alerta/20',
  ok: 'bg-sucesso/15 text-sucesso',
} as const;

function texto(s: SituacaoItem) {
  if (s.status === 'sem_registro') return 'falta informar a última vez';
  const partes: string[] = [];
  if (s.faltaKm !== null)
    partes.push(
      s.faltaKm < 0 ? `passou ${formatarKm(-s.faltaKm)}` : `faltam ${formatarKm(s.faltaKm)}`,
    );
  if (s.faltaDias !== null)
    partes.push(s.faltaDias < 0 ? `venceu há ${-s.faltaDias} dias` : `faltam ${s.faltaDias} dias`);
  return partes.join(' · ');
}

function mesAtual() {
  return competencia(new Date().toISOString());
}

export default async function Manutencao() {
  const supabase = await createClient();
  const { inicioData, fimData } = limitesDoMes(mesAtual());
  const [
    caminhoes,
    { data: oficinas },
    { data: historico },
    doDono,
    doMotorista,
    { data: motoristas },
  ] = await Promise.all([
    carregarSituacaoManutencao(supabase),
    supabase
      .from('fornecedores')
      .select('id, nome')
      .eq('ativo', true)
      .in('tipo', ['oficina', 'loja', 'recapadora', 'outro'])
      .order('nome'),
    supabase
      .from('manutencoes')
      .select(
        'id, data, km, tipo, descricao, valor_centavos, reembolsado_em, caminhoes(placa), fornecedores(nome), funcionarios(nome)',
      )
      .order('data', { ascending: false })
      .limit(30),
    // pago pelo dono: manutenções que a gestão lançou como pagas pela empresa, no mês
    supabase
      .from('manutencoes')
      .select('valor_centavos')
      .is('pago_por_funcionario_id', null)
      .gte('data', inicioData)
      .lt('data', fimData),
    // pago pelo motorista: despesa que ele lançou + manutenção da gestão paga por ele
    carregarDespesasMotorista(supabase, 'manutencao', { inicio: inicioData, fim: fimData }),
    // "Quem pagou?" no formulário de manutenção
    supabase.from('funcionarios').select('id, nome').eq('ativo', true).order('nome'),
  ]);
  const pagoDonoCentavos =
    (doDono.data ?? []).reduce((t, m) => t + m.valor_centavos, 0) +
    doMotorista.pagoEmpresaPeriodoCentavos;

  return (
    <>
      <h1 className="text-3xl">Manutenção</h1>

      <section id="a-devolver" className="flex scroll-mt-20 flex-col gap-3">
        <h2 className="text-lg font-semibold">Quem pagou (este mês)</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card p-4 shadow-xs">
            <p className="text-sm text-muted-foreground">Pago pelo dono</p>
            <p className="text-2xl font-bold tabular-nums">{formatarBRL(pagoDonoCentavos)}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-xs">
            <p className="text-sm text-muted-foreground">Pago pelo motorista</p>
            <p className="text-2xl font-bold tabular-nums">
              {formatarBRL(doMotorista.totalPeriodoCentavos)}
            </p>
          </div>
          <div
            className={cn(
              'col-span-2 rounded-xl border p-4 shadow-xs',
              doMotorista.aDevolverCentavos > 0 ? 'border-alerta bg-alerta/10' : 'bg-card',
            )}
          >
            <p className="text-sm text-muted-foreground">
              A devolver aos motoristas (pague e dê baixa, ou entra no próximo acerto)
            </p>
            <p className="text-2xl font-bold tabular-nums">
              {formatarBRL(doMotorista.aDevolverCentavos)}
            </p>
          </div>
        </div>
        <h3 className="font-semibold">Manutenção paga pelo motorista</h3>
        <PagoPeloMotorista
          itens={doMotorista.itens}
          vazio="Nenhuma manutenção paga por motorista."
          permitirBaixa
        />
        <p className="text-sm text-muted-foreground">
          Pago pelo motorista = o que ele pagou do bolso (lançado por ele no app ou pela gestão).
          Quando você pagar a ele, toque em Dar baixa; se não der baixa, o valor volta para ele no
          próximo acerto. Nunca nos dois.
        </p>
      </section>
      <AcoesManutencao
        caminhoes={caminhoes.map((c) => ({ id: c.id, placa: c.placa, km_atual: c.km_atual }))}
        planos={caminhoes.flatMap((c) =>
          c.itens.map((i) => ({ id: i.id, caminhao_id: c.id, item: i.item })),
        )}
        oficinas={oficinas ?? []}
        motoristas={motoristas ?? []}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {caminhoes.map((c) => (
          <section
            key={c.id}
            className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-mono text-xl font-bold">{formatarPlaca(c.placa)}</h2>
              <span className="text-sm text-muted-foreground tabular-nums">
                {formatarKm(c.km_atual)}
              </span>
            </div>
            {c.itens.length === 0 ? (
              <p className="text-muted-foreground">
                Sem plano. Toque em &quot;Novo item do plano&quot;.
              </p>
            ) : (
              <ul className="flex flex-col divide-y">
                {c.itens.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="flex flex-col">
                      <span className="font-medium">{i.item}</span>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {[
                          i.intervalo_km && `a cada ${formatarKm(i.intervalo_km)}`,
                          i.intervalo_dias && `a cada ${i.intervalo_dias} dias`,
                        ]
                          .filter(Boolean)
                          .join(' ou ')}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-right text-xs font-semibold',
                          ESTILO[i.situacao.status],
                        )}
                      >
                        {texto(i.situacao)}
                      </span>
                      <ApagarRegistro tabela="planos_manutencao" id={i.id} rotulo="item do plano" />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Últimas manutenções lançadas pela gestão</h2>
        <ul className="flex flex-col divide-y rounded-xl border bg-card shadow-xs">
          {(historico ?? []).map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 p-3">
              <span className="flex flex-col">
                <span className="font-medium">
                  <span className="font-mono">
                    {m.caminhoes ? formatarPlaca(m.caminhoes.placa) : ''}
                  </span>{' '}
                  · {m.descricao}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {formatarData(m.data)} · {formatarKm(m.km)} ·{' '}
                  {m.tipo === 'corretiva' ? 'corretiva' : 'preventiva'}
                  {m.fornecedores && ` · ${m.fornecedores.nome}`}
                  {m.funcionarios
                    ? ` · pago por ${m.funcionarios.nome}${m.reembolsado_em ? ' (já devolvido)' : ' (a devolver)'}`
                    : ' · pago pela empresa'}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <span className="font-semibold tabular-nums">{formatarBRL(m.valor_centavos)}</span>
                <ApagarRegistro tabela="manutencoes" id={m.id} rotulo="manutenção" />
              </span>
            </li>
          ))}
          {(historico ?? []).length === 0 && (
            <li className="p-3 text-muted-foreground">Nenhuma manutenção registrada.</li>
          )}
        </ul>
      </section>
    </>
  );
}
