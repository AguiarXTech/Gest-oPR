'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatarBRL, reaisParaCentavos } from '@/lib/domain/dinheiro';
import { formatarData } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import type { LinhaPassagem } from '@/lib/supabase/pedagio';
import { cn } from '@/lib/utils';

const SITUACOES = {
  conferido: 'Certo',
  contestar: 'Contestar',
  contestado: 'Contestado (aguardando)',
  ressarcido: 'Ressarcido',
} as const;
type Situacao = keyof typeof SITUACOES;

const reais = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Uma passagem: previsto × cobrado. Ao salvar, valor diferente do previsto vira "Contestar". */
export function CobrancaPedagio({ p }: { p: LinhaPassagem }) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [valor, setValor] = useState(p.cobranca ? reais.format(p.cobranca.valorCentavos / 100) : '');
  const [erro, setErro] = useState<string | null>(null);

  const salvar = useMutation({
    mutationFn: async (situacaoEscolhida?: Situacao) => {
      let cobrado: number;
      try {
        cobrado = reaisParaCentavos(valor);
      } catch {
        throw new Error('Valor inválido. Ex.: 48,60');
      }
      const situacao: Situacao =
        situacaoEscolhida ?? (p.previstoCentavos !== null && cobrado !== p.previstoCentavos ? 'contestar' : 'conferido');
      const { error } = await supabase
        .from('cobrancas_pedagio')
        .upsert(
          { viagem_id: p.viagemId, praca_id: p.pracaId, sentido: p.sentido, valor_cobrado_centavos: cobrado, situacao },
          { onConflict: 'viagem_id,praca_id,sentido' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      setErro(null);
      router.refresh();
    },
    onError: (e) => setErro(e instanceof Error && !('code' in e) ? e.message : traduzirErroBanco(e)),
  });

  const corDiferenca =
    p.conferencia === 'cobrou_mais' ? 'text-destructive' : p.conferencia === 'cobrou_menos' ? 'text-alerta' : p.conferencia === 'certo' ? 'text-sucesso' : '';

  return (
    <div className="flex flex-col gap-2 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-medium">
          {p.sentido === 'ida' ? 'Ida' : 'Volta'} · {p.praca} · {formatarData(p.data)}
        </span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {p.eixos !== null ? `${p.eixos} eixos` : 'sem eixos no cadastro'} · previsto{' '}
          <span className="font-semibold text-foreground">{p.previstoCentavos !== null ? formatarBRL(p.previstoCentavos) : '—'}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Input
          aria-label={`Valor cobrado na ${p.sentido}`}
          placeholder="Cobrado (R$)"
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="h-11 max-w-36 tabular-nums"
        />
        <Button type="button" variant="outline" disabled={salvar.isPending || !valor} onClick={() => salvar.mutate(undefined)}>
          Salvar
        </Button>
        {p.diferencaCentavos !== null && p.diferencaCentavos !== 0 && (
          <span className={cn('text-sm font-semibold tabular-nums', corDiferenca)}>
            {p.diferencaCentavos > 0 ? `cobrou ${formatarBRL(p.diferencaCentavos)} a mais` : `${formatarBRL(-p.diferencaCentavos)} a menos`}
          </span>
        )}
        {p.conferencia === 'certo' && <span className="text-sm font-semibold text-sucesso">✓ certo</span>}
      </div>
      {p.cobranca && p.conferencia !== 'certo' && (
        <div className="flex flex-wrap gap-1">
          {(Object.keys(SITUACOES) as Situacao[]).map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              variant={p.cobranca?.situacao === s ? 'default' : 'outline'}
              aria-pressed={p.cobranca?.situacao === s}
              disabled={salvar.isPending}
              onClick={() => salvar.mutate(s)}
            >
              {SITUACOES[s]}
            </Button>
          ))}
        </div>
      )}
      {erro && <p className="text-sm font-medium text-destructive">{erro}</p>}
    </div>
  );
}

/** Exceção de eixos da viagem (ex.: foi com reboque, ou não levantou o eixo). Vazio = automático. */
export function EixosViagem({ viagemId, ida, volta }: { viagemId: string; ida: number | null; volta: number | null }) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const salvar = useMutation({
    mutationFn: async (alteracao: { eixos_ida?: number | null; eixos_volta?: number | null }) => {
      const { error } = await supabase.from('viagens').update(alteracao).eq('id', viagemId).select('id').single();
      if (error) throw error;
    },
    onSuccess: () => router.refresh(),
  });
  const opcoes = ['', '2', '3', '4', '5', '6', '7', '8', '9'];
  const select = (rotulo: string, valor: number | null, campo: 'eixos_ida' | 'eixos_volta') => (
    <label className="flex items-center gap-1 text-sm">
      {rotulo}
      <select
        value={valor === null ? '' : String(valor)}
        disabled={salvar.isPending}
        onChange={(e) => salvar.mutate({ [campo]: e.target.value ? Number(e.target.value) : null } as { eixos_ida?: number | null; eixos_volta?: number | null })}
        className="h-9 rounded-md border border-input bg-transparent px-1"
      >
        {opcoes.map((o) => (
          <option key={o} value={o}>
            {o || 'auto'}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
      <span className="text-sm">Eixos no pedágio:</span>
      {select('ida', ida, 'eixos_ida')}
      {select('volta', volta, 'eixos_volta')}
    </div>
  );
}
