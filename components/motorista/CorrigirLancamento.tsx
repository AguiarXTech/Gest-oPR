'use client';

// Corrigir valor lançado errado (pedido de 2026-10-07): ex.: 115,50 que virou 11.550,00.
// O banco só deixa o motorista alterar o que o escritório ainda não conferiu e não está em
// acerto (RLS motorista_update); despesa pessoal é só dele.
import { useMutation } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reaisParaCentavos, valorPorDigitos } from '@/lib/domain/dinheiro';
import { lerDecimal } from '@/lib/domain/numeros';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import { CampoDinheiro } from './CampoDinheiro';

type Props = {
  tabela: 'abastecimentos' | 'despesas_viagem' | 'despesas_pessoais';
  id: string;
  valorCentavos: number;
  /** Só abastecimento: os litros também podem estar errados. */
  litros?: number | null;
  /** Escritório já conferiu ou está em acerto: não dá para mexer. */
  bloqueado?: string | null;
};

const litrosFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });

export function CorrigirLancamento({ tabela, id, valorCentavos, litros, bloqueado }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [aberto, setAberto] = useState<'corrigir' | 'apagar' | null>(null);
  const [valor, setValor] = useState(valorPorDigitos(String(valorCentavos)));
  const [litrosTexto, setLitrosTexto] = useState(litros != null ? litrosFmt.format(litros) : '');
  const litrosLidos = litrosTexto ? lerDecimal(litrosTexto) : null;

  const salvar = useMutation({
    mutationFn: async () => {
      if (!valor) throw new Error('Digite o valor.');
      const centavos = reaisParaCentavos(valor);
      if (centavos <= 0) throw new Error('Digite o valor.');
      let r;
      if (tabela === 'abastecimentos') {
        if (litrosLidos === null || litrosLidos <= 0) throw new Error('Litros inválidos.');
        r = await supabase
          .from('abastecimentos')
          .update({ valor_total_centavos: centavos, litros: litrosLidos })
          .eq('id', id)
          .select('id')
          .single();
      } else {
        r = await supabase
          .from(tabela)
          .update({ valor_centavos: centavos })
          .eq('id', id)
          .select('id')
          .single();
      }
      if (r.error) throw r.error;
    },
    onSuccess: () => {
      setAberto(null);
      router.refresh();
    },
  });

  const apagar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from(tabela).delete().eq('id', id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Não foi possível apagar: o escritório já conferiu.');
    },
    onSuccess: () => router.refresh(),
  });

  const erro = (e: unknown) =>
    e instanceof Error && !('code' in e)
      ? e.message
      : traduzirErroBanco(e, {
          PGRST116: 'Não dá para alterar: o escritório já conferiu. Fale com o escritório.',
        });

  if (bloqueado) return <p className="text-sm text-muted-foreground">{bloqueado}</p>;

  if (aberto === 'corrigir') {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          salvar.mutate();
        }}
        className="flex flex-col gap-3 border-t pt-3"
      >
        <CampoDinheiro
          id={`valor-${id}`}
          rotulo="Valor certo"
          valor={valor}
          aoMudar={setValor}
          autoFocus
        />
        {tabela === 'abastecimentos' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`litros-${id}`} className="text-base font-medium">
              Litros
            </label>
            <Input
              id={`litros-${id}`}
              value={litrosTexto}
              onChange={(e) => setLitrosTexto(e.target.value)}
              inputMode="decimal"
              className="h-14 text-2xl tabular-nums"
            />
            <p className="text-sm text-muted-foreground">
              {litrosLidos !== null
                ? `Entendido: ${litrosFmt.format(litrosLidos)} litros`
                : 'Como está na bomba ou no cupom'}
            </p>
          </div>
        )}
        {salvar.isError && (
          <p role="alert" className="font-medium text-destructive">
            {erro(salvar.error)}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" size="lg" onClick={() => setAberto(null)}>
            Cancelar
          </Button>
          <Button type="submit" size="lg" disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    );
  }

  if (aberto === 'apagar') {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-destructive/40 p-3">
        <p className="font-medium">Apagar este lançamento? Use se lançou em dobro ou por engano.</p>
        {apagar.isError && (
          <p role="alert" className="font-medium text-destructive">
            {erro(apagar.error)}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" size="lg" onClick={() => setAberto(null)}>
            Não
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            disabled={apagar.isPending}
            onClick={() => apagar.mutate()}
          >
            Sim, apagar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-11 flex-1 text-base"
        onClick={() => setAberto('corrigir')}
      >
        <Pencil aria-hidden /> Corrigir valor
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="h-11 text-base text-destructive"
        onClick={() => setAberto('apagar')}
        aria-label="Apagar lançamento"
      >
        <Trash2 aria-hidden />
      </Button>
    </div>
  );
}
