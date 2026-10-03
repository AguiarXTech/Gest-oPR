'use client';

// Preço do frete combinado com o cliente (pedido de 2026-10-03). Reajuste = novo preço com a
// data de início; a viagem usa o preço do dia em que saiu. Com "lançar sozinho" marcado, o
// frete entra quando o motorista conclui a viagem (trigger lancar_frete_automatico).
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatarBRL, reaisParaCentavos } from '@/lib/domain/dinheiro';
import { precoVigente, type Sentido } from '@/lib/domain/precoFrete';
import { formatarData, hojeIso } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import { ApagarRegistro } from './ApagarRegistro';
import { Campo } from './Campo';

type Preco = { id: string; sentido: Sentido; vigencia_inicio: string; valor_centavos: number };
type Props = { clienteId: string; freteAutomatico: boolean; precos: Preco[] };

const NOME_SENTIDO: Record<Sentido, string> = { ida: 'Ida (SJE → BH)', volta: 'Volta (BH → SJE)' };
const classeSelect = 'h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base';

export function PrecoFreteCliente({ clienteId, freteAutomatico, precos }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [f, setF] = useState({ sentido: 'volta' as Sentido, valor: '', inicio: hojeIso() });
  const [erro, setErro] = useState<string | null>(null);

  const lista = precos.map((p) => ({
    sentido: p.sentido,
    vigenciaInicio: p.vigencia_inicio,
    valorCentavos: p.valor_centavos,
  }));
  const hoje = hojeIso();
  const vigentes = (['ida', 'volta'] as const).flatMap((s) => {
    const v = precoVigente(lista, s, hoje);
    return v === null ? [] : [{ sentido: s, valor: v }];
  });
  const historico = [...precos].sort(
    (a, b) =>
      b.vigencia_inicio.localeCompare(a.vigencia_inicio) || a.sentido.localeCompare(b.sentido),
  );

  const salvar = useMutation({
    mutationFn: async () => {
      let valor: number;
      try {
        valor = reaisParaCentavos(f.valor);
      } catch {
        throw new Error('Valor inválido. Ex.: 5.080,00');
      }
      if (valor <= 0) throw new Error('Digite o valor do frete.');
      if (!f.inicio) throw new Error('Informe a data de início.');
      const { error } = await supabase.from('precos_frete').insert({
        cliente_id: clienteId,
        sentido: f.sentido,
        vigencia_inicio: f.inicio,
        valor_centavos: valor,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setF({ sentido: f.sentido, valor: '', inicio: hojeIso() });
      router.refresh();
    },
    onError: (e) =>
      setErro(
        e instanceof Error && !('code' in e)
          ? e.message
          : traduzirErroBanco(e, {
              '23505':
                'Já existe preço desse sentido começando nesse dia. Apague o errado e lance de novo.',
            }),
      ),
  });

  const alternar = useMutation({
    mutationFn: async (ligar: boolean) => {
      const { error } = await supabase
        .from('clientes')
        .update({ frete_automatico: ligar })
        .eq('id', clienteId)
        .select('id')
        .single();
      if (error) throw error;
    },
    onSuccess: () => router.refresh(),
  });

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs">
      <div>
        <h2 className="text-lg font-semibold">Preço do frete combinado</h2>
        <p className="text-sm text-muted-foreground">
          Reajuste: lance o novo preço com a data em que começa a valer. As viagens antigas ficam
          com o preço antigo.
        </p>
      </div>

      {vigentes.length === 0 ? (
        <p className="text-muted-foreground">Nenhum preço valendo hoje.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {vigentes.map((v) => (
            <li key={v.sentido} className="flex justify-between gap-2 text-lg">
              <span>{NOME_SENTIDO[v.sentido]}</span>
              <span className="font-bold tabular-nums">{formatarBRL(v.valor)}</span>
            </li>
          ))}
        </ul>
      )}

      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3">
        <input
          type="checkbox"
          checked={freteAutomatico}
          disabled={alternar.isPending}
          onChange={(e) => alternar.mutate(e.target.checked)}
          className="mt-1 size-5 shrink-0"
        />
        <span>
          <span className="block font-medium">Lançar o frete sozinho</span>
          <span className="text-sm text-muted-foreground">
            Quando o motorista concluir a viagem, o frete entra com o preço do dia da saída. O
            motorista não vê o valor. Dá para corrigir na tela da viagem.
          </span>
        </span>
      </label>
      {alternar.isError && (
        <p role="alert" className="font-medium text-destructive">
          {traduzirErroBanco(alternar.error, {
            '23505': 'Outro cliente já está com o frete automático. Desmarque nele primeiro.',
          })}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setErro(null);
          salvar.mutate();
        }}
        className="flex flex-col gap-3 border-t pt-4"
      >
        <h3 className="font-medium">
          {precos.length === 0 ? 'Cadastrar preço' : 'Novo preço (reajuste)'}
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo id="preco-sentido" rotulo="Sentido carregado">
            <select
              id="preco-sentido"
              value={f.sentido}
              onChange={(e) => setF({ ...f, sentido: e.target.value as Sentido })}
              className={classeSelect}
            >
              <option value="ida">{NOME_SENTIDO.ida}</option>
              <option value="volta">{NOME_SENTIDO.volta}</option>
            </select>
          </Campo>
          <Campo id="preco-valor" rotulo="Valor do frete (R$)">
            <Input
              id="preco-valor"
              value={f.valor}
              onChange={(e) => setF({ ...f, valor: e.target.value })}
              inputMode="decimal"
              placeholder="5.080,00"
              className="h-11 text-base"
            />
          </Campo>
          <Campo id="preco-inicio" rotulo="Vale a partir de">
            <Input
              id="preco-inicio"
              type="date"
              value={f.inicio}
              onChange={(e) => setF({ ...f, inicio: e.target.value })}
              className="h-11 text-base"
            />
          </Campo>
        </div>
        {erro && (
          <p role="alert" className="font-medium text-destructive">
            {erro}
          </p>
        )}
        <Button type="submit" size="lg" disabled={salvar.isPending} className="self-start">
          {salvar.isPending ? 'Salvando…' : 'Salvar preço'}
        </Button>
      </form>

      {historico.length > 0 && (
        <details className="border-t pt-3">
          <summary className="flex min-h-11 cursor-pointer items-center font-medium">
            Histórico de preços ({historico.length})
          </summary>
          <ul className="flex flex-col divide-y">
            {historico.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-1 tabular-nums">
                <span>
                  {NOME_SENTIDO[p.sentido]} · desde {formatarData(p.vigencia_inicio)}
                </span>
                <span className="flex items-center gap-1">
                  <span className="font-semibold">{formatarBRL(p.valor_centavos)}</span>
                  <ApagarRegistro tabela="precos_frete" id={p.id} rotulo="preço" />
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
