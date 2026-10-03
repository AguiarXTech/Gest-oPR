'use client';

// O que o cliente manda carregar (pedido de 2026-10-03): produto + local, o trecho pelo lugar
// do produto (região de BH = volta) e o preço do frete com reajustes. O motorista escolhe o
// produto ao iniciar a viagem; com "lançar sozinho", o frete entra quando ele conclui.
import { useMutation } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatarBRL, reaisParaCentavos } from '@/lib/domain/dinheiro';
import { precoVigente, REGIAO_DO_TRECHO, type Sentido } from '@/lib/domain/precoFrete';
import { formatarData, hojeIso } from '@/lib/formatar';
import { linkMapa } from '@/lib/mapa';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import { cn } from '@/lib/utils';
import { ApagarRegistro } from './ApagarRegistro';
import { Campo } from './Campo';

type Preco = { id: string; vigencia_inicio: string; valor_centavos: number };
type Produto = {
  id: string;
  nome: string;
  endereco: string | null;
  sentido: Sentido;
  ativo: boolean;
  precos_frete: Preco[];
};
type Props = { clienteId: string; freteAutomatico: boolean; produtos: Produto[] };

const classeSelect = 'h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base';

function lerValor(texto: string): number {
  let valor: number;
  try {
    valor = reaisParaCentavos(texto);
  } catch {
    throw new Error('Valor inválido. Ex.: 5.080,00');
  }
  if (valor <= 0) throw new Error('Digite o valor do frete.');
  return valor;
}

/** Mensagem de erro: as nossas (Error sem código) ou a tradução do erro do banco. */
const mensagem = (e: unknown, codigos: Partial<Record<string, string>> = {}) =>
  e instanceof Error && !('code' in e) ? e.message : traduzirErroBanco(e, codigos);

export function ProdutosCliente({ clienteId, freteAutomatico, produtos }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [novo, setNovo] = useState({
    nome: '',
    endereco: '',
    sentido: 'volta' as Sentido,
    valor: '',
    inicio: hojeIso(),
  });
  const [reajuste, setReajuste] = useState<{ id: string; valor: string; inicio: string } | null>(
    null,
  );
  const hoje = hojeIso();

  const adicionar = useMutation({
    mutationFn: async () => {
      if (novo.nome.trim().length < 2) throw new Error('Digite o produto. Ex.: Cimento Liz');
      const valor = novo.valor.trim() ? lerValor(novo.valor) : null;
      const { data, error } = await supabase
        .from('locais_carga')
        .insert({
          cliente_id: clienteId,
          nome: novo.nome.trim(),
          endereco: novo.endereco.trim() || null,
          sentido: novo.sentido,
        })
        .select('id')
        .single();
      if (error) throw error;
      if (valor !== null) {
        const { error: e2 } = await supabase
          .from('precos_frete')
          .insert({ local_carga_id: data.id, vigencia_inicio: novo.inicio, valor_centavos: valor });
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      setNovo({ nome: '', endereco: '', sentido: novo.sentido, valor: '', inicio: hojeIso() });
      router.refresh();
    },
  });

  const reajustar = useMutation({
    mutationFn: async () => {
      if (!reajuste) return;
      const { error } = await supabase
        .from('precos_frete')
        .insert({
          local_carga_id: reajuste.id,
          vigencia_inicio: reajuste.inicio,
          valor_centavos: lerValor(reajuste.valor),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setReajuste(null);
      router.refresh();
    },
  });

  const alterar = useMutation({
    mutationFn: async (mudanca: { id: string; ativo?: boolean; sentido?: Sentido }) => {
      const { id, ...campos } = mudanca;
      const { error } = await supabase
        .from('locais_carga')
        .update(campos)
        .eq('id', id)
        .select('id')
        .single();
      if (error) throw error;
    },
    onSuccess: () => router.refresh(),
  });

  const automatico = useMutation({
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

  const ordenados = [...produtos].sort(
    (a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome),
  );

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs">
      <div>
        <h2 className="text-lg font-semibold">O que carrega, onde e o frete</h2>
        <p className="text-sm text-muted-foreground">
          O trecho carregado vem do lugar do produto. O motorista escolhe o produto ao iniciar a
          viagem.
        </p>
      </div>

      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3">
        <input
          type="checkbox"
          checked={freteAutomatico}
          disabled={automatico.isPending}
          onChange={(e) => automatico.mutate(e.target.checked)}
          className="mt-1 size-5 shrink-0"
        />
        <span>
          <span className="block font-medium">Lançar o frete sozinho</span>
          <span className="text-sm text-muted-foreground">
            Quando o motorista concluir a viagem, entra o frete do produto que ele escolheu, com o
            preço do dia da saída. O motorista não vê o valor. Dá para corrigir na tela da viagem.
          </span>
        </span>
      </label>
      {automatico.isError && (
        <p className="font-medium text-destructive">{mensagem(automatico.error)}</p>
      )}

      {ordenados.length === 0 ? (
        <p className="text-muted-foreground">Nenhum produto cadastrado.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {ordenados.map((p) => {
            const precos = p.precos_frete.map((x) => ({
              vigenciaInicio: x.vigencia_inicio,
              valorCentavos: x.valor_centavos,
            }));
            const atual = precoVigente(precos, hoje);
            const historico = [...p.precos_frete].sort((a, b) =>
              b.vigencia_inicio.localeCompare(a.vigencia_inicio),
            );
            const reajustando = reajuste?.id === p.id;
            return (
              <li
                key={p.id}
                className={cn(
                  'flex flex-col gap-2 rounded-xl border p-3',
                  !p.ativo && 'opacity-60',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="flex flex-col">
                    <span className="text-lg font-semibold">{p.nome}</span>
                    {p.endereco && <span className="text-muted-foreground">{p.endereco}</span>}
                  </span>
                  <span className="text-right">
                    <span className="block text-xl font-bold tabular-nums">
                      {atual !== null ? formatarBRL(atual) : 'Sem preço'}
                    </span>
                    <span className="text-sm text-muted-foreground">por viagem</span>
                  </span>
                </div>
                <select
                  aria-label={`Onde fica ${p.nome}`}
                  value={p.sentido}
                  disabled={alterar.isPending}
                  onChange={(e) => alterar.mutate({ id: p.id, sentido: e.target.value as Sentido })}
                  className={classeSelect}
                >
                  <option value="volta">{REGIAO_DO_TRECHO.volta}</option>
                  <option value="ida">{REGIAO_DO_TRECHO.ida}</option>
                </select>

                {reajustando ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      reajustar.mutate();
                    }}
                    className="grid gap-3 sm:grid-cols-3 sm:items-end"
                  >
                    <Campo id={`reaj-valor-${p.id}`} rotulo="Novo valor (R$)">
                      <Input
                        id={`reaj-valor-${p.id}`}
                        value={reajuste.valor}
                        onChange={(e) => setReajuste({ ...reajuste, valor: e.target.value })}
                        inputMode="decimal"
                        className="h-11 text-base"
                      />
                    </Campo>
                    <Campo id={`reaj-inicio-${p.id}`} rotulo="Vale a partir de">
                      <Input
                        id={`reaj-inicio-${p.id}`}
                        type="date"
                        value={reajuste.inicio}
                        onChange={(e) => setReajuste({ ...reajuste, inicio: e.target.value })}
                        className="h-11 text-base"
                      />
                    </Campo>
                    <span className="flex gap-2">
                      <Button type="submit" disabled={reajustar.isPending} className="h-11">
                        {reajustar.isPending ? 'Salvando…' : 'Salvar'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        onClick={() => setReajuste(null)}
                      >
                        Cancelar
                      </Button>
                    </span>
                    {reajustar.isError && (
                      <p role="alert" className="font-medium text-destructive sm:col-span-3">
                        {mensagem(reajustar.error, {
                          '23505':
                            'Já existe preço começando nesse dia. Apague o errado no histórico.',
                        })}
                      </p>
                    )}
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11"
                      onClick={() => setReajuste({ id: p.id, valor: '', inicio: hojeIso() })}
                    >
                      {atual === null ? 'Lançar preço' : 'Reajustar preço'}
                    </Button>
                    <a
                      href={linkMapa(p)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center gap-1 rounded-lg px-3 text-primary hover:underline"
                    >
                      <MapPin className="size-4" aria-hidden /> Mapa
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      className="ml-auto h-11"
                      disabled={alterar.isPending}
                      onClick={() => alterar.mutate({ id: p.id, ativo: !p.ativo })}
                    >
                      {p.ativo ? 'Desativar' : 'Reativar'}
                    </Button>
                  </div>
                )}

                {historico.length > 0 && (
                  <details>
                    <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">
                      Histórico de preços ({historico.length})
                    </summary>
                    <ul className="flex flex-col divide-y">
                      {historico.map((x) => (
                        <li
                          key={x.id}
                          className="flex items-center justify-between gap-2 py-1 text-sm tabular-nums"
                        >
                          <span>desde {formatarData(x.vigencia_inicio)}</span>
                          <span className="flex items-center gap-1">
                            <span className="font-semibold">{formatarBRL(x.valor_centavos)}</span>
                            <ApagarRegistro tabela="precos_frete" id={x.id} rotulo="preço" />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {alterar.isError && <p className="font-medium text-destructive">{mensagem(alterar.error)}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          adicionar.mutate();
        }}
        className="flex flex-col gap-3 border-t pt-4"
      >
        <h3 className="font-medium">Adicionar produto</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo id="novo-produto" rotulo="Produto *" ajuda="Ex.: Cimento Liz">
            <Input
              id="novo-produto"
              value={novo.nome}
              onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
              aria-describedby="novo-produto-ajuda"
              className="h-11 text-base"
            />
          </Campo>
          <Campo id="novo-local" rotulo="Local (cidade)" ajuda="Ex.: Vespasiano - MG. Abre no mapa">
            <Input
              id="novo-local"
              value={novo.endereco}
              onChange={(e) => setNovo({ ...novo, endereco: e.target.value })}
              aria-describedby="novo-local-ajuda"
              className="h-11 text-base"
            />
          </Campo>
          <Campo id="novo-regiao" rotulo="Onde fica" ajuda="Define o trecho carregado">
            <select
              id="novo-regiao"
              value={novo.sentido}
              onChange={(e) => setNovo({ ...novo, sentido: e.target.value as Sentido })}
              aria-describedby="novo-regiao-ajuda"
              className={classeSelect}
            >
              <option value="volta">{REGIAO_DO_TRECHO.volta}</option>
              <option value="ida">{REGIAO_DO_TRECHO.ida}</option>
            </select>
          </Campo>
          <Campo id="novo-valor" rotulo="Frete por viagem (R$)" ajuda="Ex.: 5.080,00">
            <Input
              id="novo-valor"
              value={novo.valor}
              onChange={(e) => setNovo({ ...novo, valor: e.target.value })}
              inputMode="decimal"
              aria-describedby="novo-valor-ajuda"
              className="h-11 text-base"
            />
          </Campo>
          <Campo id="novo-inicio" rotulo="Valor vale a partir de">
            <Input
              id="novo-inicio"
              type="date"
              value={novo.inicio}
              onChange={(e) => setNovo({ ...novo, inicio: e.target.value })}
              className="h-11 text-base"
            />
          </Campo>
        </div>
        {adicionar.isError && (
          <p role="alert" className="font-medium text-destructive">
            {mensagem(adicionar.error)}
          </p>
        )}
        <Button type="submit" size="lg" disabled={adicionar.isPending} className="self-start">
          {adicionar.isPending ? 'Salvando…' : 'Adicionar produto'}
        </Button>
      </form>
    </section>
  );
}
