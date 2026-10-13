// Meus lançamentos (pedido de 2026-10-07): abastecimentos e despesas dos últimos 60 dias,
// com "Corrigir valor" enquanto o escritório não conferiu e não entrou em acerto.
import type { Metadata } from 'next';
import { CorrigirLancamento } from '@/components/motorista/CorrigirLancamento';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { formatarPlaca } from '@/lib/domain/placa';
import { formatarData, formatarDataHora, formatarLitros } from '@/lib/formatar';
import { obterPerfilAtual } from '@/lib/supabase/perfil';
import { createClient } from '@/lib/supabase/server';
import { TIPOS_DESPESA } from '@/lib/validations/despesa';

export const metadata: Metadata = { title: 'Meus lançamentos · Gestão Frota' };

function desde60Dias() {
  return new Date(Date.now() - 60 * 86_400_000).toISOString();
}

function motivoBloqueio(l: { conferido: boolean; acerto_id: string | null }) {
  if (l.acerto_id) return 'Já entrou no acerto. Para corrigir, fale com o escritório.';
  if (l.conferido) return 'Conferido pelo escritório. Para corrigir, fale com o escritório.';
  return null;
}

export default async function MeusLancamentos() {
  const supabase = await createClient();
  const fid = (await obterPerfilAtual())?.funcionario_id ?? '';
  const desde = desde60Dias();
  const [{ data: abastecimentos }, { data: despesas }] = await Promise.all([
    supabase
      .from('abastecimentos')
      .select(
        'id, data_hora, km, litros, valor_total_centavos, conferido, acerto_id, caminhoes(placa)',
      )
      .eq('motorista_id', fid)
      .gte('data_hora', desde)
      .order('data_hora', { ascending: false }),
    supabase
      .from('despesas_viagem')
      .select('id, data, tipo, valor_centavos, conferido, acerto_id')
      .eq('motorista_id', fid)
      .gte('data', desde.slice(0, 10))
      .order('data', { ascending: false }),
  ]);

  const itens = [
    ...(abastecimentos ?? []).map((a) => ({
      chave: `a-${a.id}`,
      quando: a.data_hora,
      titulo: 'Abastecimento',
      detalhe: `${formatarDataHora(a.data_hora)} · ${formatarLitros(a.litros)}${a.caminhoes ? ` · ${formatarPlaca(a.caminhoes.placa)}` : ''}`,
      valor: a.valor_total_centavos,
      acao: (
        <CorrigirLancamento
          tabela="abastecimentos"
          id={a.id}
          valorCentavos={a.valor_total_centavos}
          litros={a.litros}
          bloqueado={motivoBloqueio(a)}
        />
      ),
    })),
    ...(despesas ?? []).map((d) => ({
      chave: `d-${d.id}`,
      quando: `${d.data}T12:00:00`,
      titulo: TIPOS_DESPESA[d.tipo],
      detalhe: formatarData(d.data),
      valor: d.valor_centavos,
      acao: (
        <CorrigirLancamento
          tabela="despesas_viagem"
          id={d.id}
          valorCentavos={d.valor_centavos}
          bloqueado={motivoBloqueio(d)}
        />
      ),
    })),
  ].sort((a, b) => b.quando.localeCompare(a.quando));

  return (
    <>
      <h1 className="text-3xl">Meus lançamentos</h1>
      <p className="text-muted-foreground">
        Lançou um valor errado? Toque em Corrigir valor. Depois que o escritório confere, só ele
        pode alterar.
      </p>
      {itens.length === 0 ? (
        <p className="rounded-2xl border bg-card p-5 shadow-xs">
          Nenhum lançamento nos últimos 60 dias.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {itens.map((i) => (
            <li
              key={i.chave}
              className="flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex flex-col">
                  <span className="text-lg font-semibold">{i.titulo}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">{i.detalhe}</span>
                </span>
                <span className="text-xl font-bold tabular-nums">{formatarBRL(i.valor)}</span>
              </div>
              {i.acao}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
