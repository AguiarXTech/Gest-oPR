'use client';

// Ações do pneu conforme o estado (§14): estoque → montar / recapagem / descarte;
// montado → retirar (para estoque, recapagem ou descarte); em recapagem → voltou / descarte.
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reaisParaCentavos } from '@/lib/domain/dinheiro';
import { formatarPlaca } from '@/lib/domain/placa';
import { kmMontagemCavalo, posicoesDoVeiculo, type StatusPneu } from '@/lib/domain/pneus';
import { lerInteiro } from '@/lib/domain/numeros';
import { formatarKm } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import { cn } from '@/lib/utils';
import { Campo } from './Campo';

type Veiculo = {
  tipo: 'caminhao' | 'carreta';
  id: string;
  placa: string;
  apelido: string | null;
  eixos: number | null;
  kmAtual: number | null;
  /** Posições já ocupadas por outros pneus. */
  ocupadas: string[];
};
type MontagemAtual = {
  veiculo: { tipo: 'caminhao' | 'carreta'; placa: string; kmAtual: number | null };
  posicao: string;
  kmMontagem: number | null;
  /** Km rodado até agora (carreta: pelas viagens). */
  km: number;
};
type Props = {
  pneuId: string;
  status: StatusPneu;
  montagemAtual: MontagemAtual | null;
  veiculos: Veiculo[];
  fornecedores: { id: string; nome: string; tipo: string }[];
};

const classeSelect = 'h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base';
type Acao = 'montar' | 'retirar' | 'recapagem' | 'retorno' | 'descartar';

function mensagem(e: unknown) {
  return e instanceof Error && !('code' in e)
    ? e.message
    : traduzirErroBanco(e, { '23505': 'Essa posição já tem um pneu montado.' });
}

export function AcoesPneu({ pneuId, status, montagemAtual, veiculos, fornecedores }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [acao, setAcao] = useState<Acao | null>(null);

  // campos (um estado só; cada ação usa os seus)
  const [veiculoId, setVeiculoId] = useState('');
  const [posicao, setPosicao] = useState('');
  const [outraPosicao, setOutraPosicao] = useState('');
  const [km, setKm] = useState('');
  const [destino, setDestino] = useState<'estoque' | 'recapagem' | 'descarte'>('estoque');
  const [fornecedorId, setFornecedorId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [custo, setCusto] = useState('');

  const veiculo = veiculos.find((v) => v.id === veiculoId);
  const posicoes = veiculo ? posicoesDoVeiculo(veiculo.eixos, veiculo.tipo === 'caminhao') : [];
  const recapadoras = [...fornecedores].sort(
    (a, b) => Number(b.tipo === 'recapadora') - Number(a.tipo === 'recapadora'),
  );

  // km rodado na retirada: caminhão pelo hodômetro digitado; carreta pelas viagens
  const kmRetirada = lerInteiro(km);
  const kmRodadoRetirada =
    montagemAtual?.veiculo.tipo === 'caminhao'
      ? kmRetirada !== null && montagemAtual.kmMontagem !== null
        ? kmMontagemCavalo(montagemAtual.kmMontagem, kmRetirada)
        : null
      : (montagemAtual?.km ?? null);

  function abrir(a: Acao) {
    setAcao(a);
    executar.reset();
    if (a === 'retirar' && montagemAtual?.veiculo.kmAtual != null)
      setKm(String(montagemAtual.veiculo.kmAtual));
  }

  const executar = useMutation({
    mutationFn: async () => {
      let r;
      if (acao === 'montar') {
        if (!veiculo) throw new Error('Escolha o veículo.');
        const pos = posicao === 'outra' ? outraPosicao.trim().toUpperCase() : posicao;
        if (!pos) throw new Error('Escolha a posição.');
        const kmMontagem = veiculo.tipo === 'caminhao' ? lerInteiro(km) : null;
        if (veiculo.tipo === 'caminhao' && kmMontagem === null)
          throw new Error('Digite o km do caminhão agora.');
        // a função aceita null no veículo que não é o da montagem (o tipo gerado não sabe)
        r = await supabase.rpc('montar_pneu', {
          p_pneu: pneuId,
          p_caminhao: (veiculo.tipo === 'caminhao' ? veiculo.id : null) as string,
          p_carreta: (veiculo.tipo === 'carreta' ? veiculo.id : null) as string,
          p_posicao: pos,
          p_km_montagem: kmMontagem ?? undefined,
        });
      } else if (acao === 'retirar') {
        if (kmRodadoRetirada === null) throw new Error('Digite o km do caminhão agora.');
        r = await supabase.rpc('retirar_pneu', {
          p_pneu: pneuId,
          p_km_rodado: kmRodadoRetirada,
          // carreta não tem hodômetro: null
          p_km_retirada: (montagemAtual?.veiculo.tipo === 'caminhao' ? kmRetirada : null) as number,
          p_destino: destino,
          p_fornecedor: destino === 'recapagem' && fornecedorId ? fornecedorId : undefined,
          p_motivo: destino === 'descarte' ? motivo : undefined,
        });
      } else if (acao === 'recapagem') {
        r = await supabase.rpc('enviar_recapagem', {
          p_pneu: pneuId,
          p_fornecedor: fornecedorId || undefined,
        });
      } else if (acao === 'retorno') {
        let custoCentavos: number | undefined;
        if (custo.trim()) {
          try {
            custoCentavos = reaisParaCentavos(custo);
          } catch {
            throw new Error('Valor inválido. Ex.: 900,00');
          }
        }
        r = await supabase.rpc('retorno_recapagem', {
          p_pneu: pneuId,
          p_custo_centavos: custoCentavos,
        });
      } else if (acao === 'descartar') {
        r = await supabase.rpc('descartar_pneu', { p_pneu: pneuId, p_motivo: motivo });
      }
      if (r?.error) throw r.error;
    },
    onSuccess: () => {
      setAcao(null);
      setMotivo('');
      setCusto('');
      router.refresh();
    },
  });

  const botoes: { a: Acao; rotulo: string; perigo?: boolean }[] =
    status === 'estoque'
      ? [
          { a: 'montar', rotulo: 'Montar em um veículo' },
          { a: 'recapagem', rotulo: 'Mandar para recapagem' },
          { a: 'descartar', rotulo: 'Descartar', perigo: true },
        ]
      : status === 'montado'
        ? [{ a: 'retirar', rotulo: 'Retirar do veículo' }]
        : status === 'em_recapagem'
          ? [
              { a: 'retorno', rotulo: 'Voltou da recapagem' },
              { a: 'descartar', rotulo: 'Recapadora condenou (descartar)', perigo: true },
            ]
          : [];

  if (botoes.length === 0) return null;

  const campoMotivo = (
    <Campo id="motivo-pneu" rotulo="Motivo do descarte *">
      <Input
        id="motivo-pneu"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Ex.: estourou, carcaça condenada"
        className="h-11 text-base"
      />
    </Campo>
  );
  const campoRecapadora = (
    <Campo id="recapadora" rotulo="Recapadora">
      <select
        id="recapadora"
        value={fornecedorId}
        onChange={(e) => setFornecedorId(e.target.value)}
        className={classeSelect}
      >
        <option value="">—</option>
        {recapadoras.map((f) => (
          <option key={f.id} value={f.id}>
            {f.nome}
          </option>
        ))}
      </select>
    </Campo>
  );

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs">
      <h2 className="text-lg font-semibold">O que fazer com o pneu</h2>
      <div className="flex flex-wrap gap-2">
        {botoes.map((b) => (
          <Button
            key={b.a}
            type="button"
            variant={acao === b.a ? 'default' : 'outline'}
            className={cn('h-11 text-base', b.perigo && acao !== b.a && 'text-destructive')}
            onClick={() => abrir(b.a)}
          >
            {b.rotulo}
          </Button>
        ))}
      </div>

      {acao && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executar.mutate();
          }}
          className="flex flex-col gap-3 border-t pt-3"
        >
          {acao === 'montar' && (
            <>
              <Campo id="veiculo-pneu" rotulo="Veículo *">
                <select
                  id="veiculo-pneu"
                  value={veiculoId}
                  onChange={(e) => {
                    setVeiculoId(e.target.value);
                    setPosicao('');
                    const v = veiculos.find((x) => x.id === e.target.value);
                    setKm(v?.kmAtual != null ? String(v.kmAtual) : '');
                  }}
                  className={classeSelect}
                >
                  <option value="">Escolha…</option>
                  <optgroup label="Caminhões e cavalos">
                    {veiculos
                      .filter((v) => v.tipo === 'caminhao')
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {formatarPlaca(v.placa)}
                          {v.apelido ? ` · ${v.apelido}` : ''}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Carretas">
                    {veiculos
                      .filter((v) => v.tipo === 'carreta')
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {formatarPlaca(v.placa)}
                          {v.apelido ? ` · ${v.apelido}` : ''}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </Campo>
              {veiculo && (
                <Campo
                  id="posicao-pneu"
                  rotulo="Posição *"
                  ajuda="E = esquerdo, D = direito; I/E = interno/externo"
                >
                  <select
                    id="posicao-pneu"
                    value={posicao}
                    onChange={(e) => setPosicao(e.target.value)}
                    aria-describedby="posicao-pneu-ajuda"
                    className={classeSelect}
                  >
                    <option value="">Escolha…</option>
                    {posicoes.map((p) => (
                      <option key={p} value={p} disabled={veiculo.ocupadas.includes(p)}>
                        {p}
                        {veiculo.ocupadas.includes(p) ? ' (ocupada)' : ''}
                      </option>
                    ))}
                    <option value="outra">Outra posição…</option>
                  </select>
                </Campo>
              )}
              {posicao === 'outra' && (
                <Campo id="outra-posicao" rotulo="Qual posição?">
                  <Input
                    id="outra-posicao"
                    value={outraPosicao}
                    onChange={(e) => setOutraPosicao(e.target.value)}
                    className="h-11 text-base uppercase"
                  />
                </Campo>
              )}
              {veiculo?.tipo === 'caminhao' && (
                <Campo
                  id="km-montagem"
                  rotulo="Km do caminhão agora *"
                  ajuda="Para contar o km rodado deste pneu"
                >
                  <Input
                    id="km-montagem"
                    value={km}
                    onChange={(e) => setKm(e.target.value)}
                    inputMode="numeric"
                    aria-describedby="km-montagem-ajuda"
                    className="h-11 text-base tabular-nums"
                  />
                </Campo>
              )}
              {veiculo?.tipo === 'carreta' && (
                <p className="text-sm text-muted-foreground">
                  O km deste pneu vai ser contado pelas viagens em que a carreta for puxada.
                </p>
              )}
            </>
          )}

          {acao === 'retirar' && montagemAtual && (
            <>
              <p>
                Montado em{' '}
                <span className="font-mono font-semibold">
                  {formatarPlaca(montagemAtual.veiculo.placa)}
                </span>
                , posição <span className="font-semibold">{montagemAtual.posicao}</span>.
              </p>
              {montagemAtual.veiculo.tipo === 'caminhao' ? (
                <Campo id="km-retirada" rotulo="Km do caminhão agora *">
                  <Input
                    id="km-retirada"
                    value={km}
                    onChange={(e) => setKm(e.target.value)}
                    inputMode="numeric"
                    className="h-11 text-base tabular-nums"
                  />
                </Campo>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Carreta: o km sai das viagens em que ela foi puxada.
                </p>
              )}
              <p className="font-medium tabular-nums">
                Rodou nesta montagem:{' '}
                {kmRodadoRetirada !== null ? formatarKm(kmRodadoRetirada) : '—'}
              </p>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 font-medium">Para onde vai?</legend>
                {(
                  [
                    ['estoque', 'Estoque'],
                    ['recapagem', 'Recapagem'],
                    ['descarte', 'Descarte'],
                  ] as const
                ).map(([valor, rotulo]) => (
                  <label key={valor} className="flex min-h-11 cursor-pointer items-center gap-3">
                    <input
                      type="radio"
                      name="destino-pneu"
                      checked={destino === valor}
                      onChange={() => setDestino(valor)}
                      className="size-5"
                    />
                    {rotulo}
                  </label>
                ))}
              </fieldset>
              {destino === 'recapagem' && campoRecapadora}
              {destino === 'descarte' && campoMotivo}
            </>
          )}

          {acao === 'recapagem' && campoRecapadora}

          {acao === 'retorno' && (
            <Campo
              id="custo-recapagem"
              rotulo="Quanto custou a recapagem (R$)"
              ajuda="Pode deixar em branco e lançar depois"
            >
              <Input
                id="custo-recapagem"
                value={custo}
                onChange={(e) => setCusto(e.target.value)}
                inputMode="decimal"
                aria-describedby="custo-recapagem-ajuda"
                className="h-11 text-base"
              />
            </Campo>
          )}

          {acao === 'descartar' && campoMotivo}

          {executar.isError && (
            <p role="alert" className="font-medium text-destructive">
              {mensagem(executar.error)}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 text-base"
              onClick={() => setAcao(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={
                acao === 'descartar' || (acao === 'retirar' && destino === 'descarte')
                  ? 'destructive'
                  : 'default'
              }
              disabled={executar.isPending}
              className="h-11 text-base"
            >
              {executar.isPending ? 'Salvando…' : 'Confirmar'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
