// Multas (RF-35): quem dirigia (pela viagem) e prazo para indicar o condutor.
import type { Metadata } from 'next';
import { MarcarMulta, NovaMulta } from '@/components/gestao/AcoesMulta';
import { ApagarRegistro } from '@/components/gestao/ApagarRegistro';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { diasAte, situacaoMulta, type SituacaoMulta } from '@/lib/domain/multas';
import { formatarPlaca } from '@/lib/domain/placa';
import { formatarData, formatarDataHoraCompleta, hojeIso } from '@/lib/formatar';
import { obterConfiguracoes } from '@/lib/supabase/configuracoes';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Multas · Gestão RPortugues' };

const ORDEM: Record<SituacaoMulta, number> = { indicar_atrasado: 0, indicar: 1, pagar: 2, resolvida: 3 };

function seisMesesAtras() {
  return new Date(Date.now() - 183 * 86_400_000).toISOString();
}

export default async function Multas() {
  const supabase = await createClient();
  const [config, { data: multas }, { data: caminhoes }, { data: motoristas }, { data: viagens }] = await Promise.all([
    obterConfiguracoes(),
    supabase.from('multas').select('*, caminhoes(placa), funcionarios(nome)').order('data_infracao', { ascending: false }).limit(100),
    supabase.from('caminhoes').select('id, placa').order('placa'),
    supabase.from('funcionarios').select('id, nome').order('nome'),
    supabase.from('viagens').select('motorista_id, caminhao_id, data_saida, data_chegada').neq('status', 'cancelada').gte('data_saida', seisMesesAtras()),
  ]);

  const hoje = hojeIso();
  const lista = (multas ?? [])
    .map((m) => ({ ...m, situacao: situacaoMulta({ prazoIndicacao: m.prazo_indicacao, indicadoEm: m.indicado_em, pagoEm: m.pago_em }, hoje) }))
    .sort((a, b) => ORDEM[a.situacao] - ORDEM[b.situacao]);

  return (
    <>
      <h1 className="text-3xl">Multas</h1>
      <NovaMulta
        caminhoes={caminhoes ?? []}
        motoristas={motoristas ?? []}
        viagens={(viagens ?? []).map((v) => ({ motoristaId: v.motorista_id, caminhaoId: v.caminhao_id, dataSaida: v.data_saida, dataChegada: v.data_chegada }))}
        prazoDias={config.multaPrazoIndicacaoDias}
      />
      <p className="text-sm text-muted-foreground">
        Sem indicar o condutor no prazo, vem outra multa do mesmo valor (NIC) e os pontos ficam com a empresa.
      </p>

      <ul className="flex flex-col gap-3">
        {lista.map((m) => {
          const dias = m.prazo_indicacao ? diasAte(m.prazo_indicacao, hoje) : null;
          return (
            <li key={m.id} className={cn('flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs', m.situacao === 'indicar_atrasado' && 'border-destructive')}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="flex flex-col">
                  <span className="text-lg font-semibold">
                    <span className="font-mono">{m.caminhoes ? formatarPlaca(m.caminhoes.placa) : ''}</span> · {m.funcionarios?.nome ?? 'Condutor não identificado'}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {formatarDataHoraCompleta(m.data_infracao)}
                    {m.descricao && ` · ${m.descricao}`}
                    {m.local && ` · ${m.local}`}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{formatarBRL(m.valor_centavos)}</span>
              </div>
              <p
                className={cn(
                  'font-medium',
                  m.situacao === 'indicar_atrasado' ? 'text-destructive' : m.situacao === 'indicar' ? 'text-alerta' : m.situacao === 'resolvida' ? 'text-sucesso' : '',
                )}
              >
                {m.situacao === 'indicar_atrasado' && `Prazo para indicar o condutor venceu em ${formatarData(m.prazo_indicacao!)}`}
                {m.situacao === 'indicar' && `Indicar o condutor até ${formatarData(m.prazo_indicacao!)} (faltam ${dias} dias)`}
                {m.situacao === 'pagar' && (m.indicado_em ? `Condutor indicado em ${formatarData(m.indicado_em)} · falta pagar` : 'Falta pagar')}
                {m.situacao === 'resolvida' && `✓ Paga em ${formatarData(m.pago_em!)}`}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {(m.situacao === 'indicar' || m.situacao === 'indicar_atrasado') && <MarcarMulta id={m.id} campo="indicado_em" rotulo="Condutor indicado hoje" />}
                {!m.pago_em && <MarcarMulta id={m.id} campo="pago_em" rotulo="Paga hoje" />}
                <span className="ml-auto">
                  <ApagarRegistro tabela="multas" id={m.id} rotulo="multa" />
                </span>
              </div>
            </li>
          );
        })}
        {lista.length === 0 && <li className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">Nenhuma multa lançada.</li>}
      </ul>
    </>
  );
}
