'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Campo } from '@/components/gestao/Campo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { hojeIso } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import { fecharAcerto } from '../actions';

type Props = {
  id: string;
  status: 'rascunho' | 'fechado' | 'pago';
  podeFechar: boolean;
  souDono: boolean;
};

type Confirmacao = 'fechar' | 'excluir' | 'reabrir' | null;

export function AcoesAcerto({ id, status, podeFechar, souDono }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [confirmando, setConfirmando] = useState<Confirmacao>(null);
  const [pagoEm, setPagoEm] = useState(hojeIso());
  const [forma, setForma] = useState('PIX');

  const acao = useMutation({
    mutationFn: async (tipo: 'fechar' | 'excluir' | 'reabrir' | 'pagar') => {
      if (tipo === 'fechar') {
        const r = await fecharAcerto(id);
        if (r.erro) throw new Error(r.erro);
        return;
      }
      const { error } =
        tipo === 'excluir'
          ? await supabase.from('acertos').delete().eq('id', id)
          : tipo === 'reabrir'
            ? await supabase.from('acertos').update({ status: 'rascunho' }).eq('id', id).select('id').single()
            : await supabase.from('acertos').update({ status: 'pago', pago_em: pagoEm, forma_pagamento: forma }).eq('id', id).select('id').single();
      if (error) throw error;
    },
    onSuccess: (_, tipo) => {
      setConfirmando(null);
      if (tipo === 'excluir') router.push('/g/acertos');
      router.refresh();
    },
  });

  const erro = acao.isError ? (acao.error instanceof Error && !('code' in acao.error) ? acao.error.message : traduzirErroBanco(acao.error)) : null;

  const confirmar = (pergunta: string, rotulo: string, tipo: 'fechar' | 'excluir' | 'reabrir', destrutivo = false) => (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/40 p-4">
      <p className="font-medium">{pergunta}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" size="lg" onClick={() => setConfirmando(null)}>
          Cancelar
        </Button>
        <Button type="button" size="lg" variant={destrutivo ? 'destructive' : 'default'} disabled={acao.isPending} onClick={() => acao.mutate(tipo)}>
          {acao.isPending ? 'Aguarde…' : rotulo}
        </Button>
      </div>
    </div>
  );

  return (
    <section className="flex flex-col gap-3">
      {erro && (
        <p role="alert" className="font-medium text-destructive">
          {erro}
        </p>
      )}

      {status === 'rascunho' &&
        (confirmando === 'fechar' ? (
          confirmar('Fechar o acerto? Os itens ficam travados e o motorista passa a ver o demonstrativo.', 'Sim, fechar', 'fechar')
        ) : confirmando === 'excluir' ? (
          confirmar('Excluir este rascunho? Os itens voltam a ficar livres para outro acerto.', 'Sim, excluir', 'excluir', true)
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" size="xl" disabled={!podeFechar} onClick={() => setConfirmando('fechar')} className="sm:flex-1">
              Fechar acerto
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={() => setConfirmando('excluir')} className="text-destructive">
              Excluir rascunho
            </Button>
          </div>
        ))}

      {status === 'fechado' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            acao.mutate('pagar');
          }}
          className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs"
        >
          <h2 className="text-lg font-semibold">Registrar pagamento</h2>
          <div className="grid grid-cols-2 gap-3">
            <Campo id="pago_em" rotulo="Pago em">
              <Input id="pago_em" type="date" required value={pagoEm} onChange={(e) => setPagoEm(e.target.value)} />
            </Campo>
            <Campo id="forma_pagamento" rotulo="Forma">
              <select id="forma_pagamento" value={forma} onChange={(e) => setForma(e.target.value)} className="h-11 rounded-lg border border-input bg-transparent px-2.5 text-base">
                {['PIX', 'Dinheiro', 'Transferência', 'Desconto no salário', 'Outro'].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </Campo>
          </div>
          <Button type="submit" size="lg" disabled={acao.isPending}>
            Marcar como pago
          </Button>
        </form>
      )}

      {status !== 'rascunho' &&
        souDono &&
        (confirmando === 'reabrir' ? (
          confirmar('Reabrir o acerto? Ele volta a rascunho e os itens podem ser alterados. Fica registrado na auditoria.', 'Sim, reabrir', 'reabrir', true)
        ) : (
          <Button type="button" variant="outline" size="lg" onClick={() => setConfirmando('reabrir')} className="self-start">
            Reabrir acerto (só o dono)
          </Button>
        ))}
    </section>
  );
}
