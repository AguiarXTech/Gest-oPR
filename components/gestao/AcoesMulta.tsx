'use client';

import { useMutation } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ViagemMulta } from '@/lib/domain/multas';
import { hojeIso } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import { FormMulta } from './FormMulta';

type PropsNova = {
  caminhoes: { id: string; placa: string }[];
  motoristas: { id: string; nome: string }[];
  viagens: ViagemMulta[];
  prazoDias: number;
};

export function NovaMulta(props: PropsNova) {
  const [aberto, setAberto] = useState(false);
  if (!aberto) {
    return (
      <Button size="xl" onClick={() => setAberto(true)} className="self-start">
        <Plus aria-hidden /> Lançar multa
      </Button>
    );
  }
  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Lançar multa</h2>
        <Button variant="ghost" onClick={() => setAberto(false)}>
          Fechar
        </Button>
      </div>
      <FormMulta {...props} aoSalvar={() => setAberto(false)} />
    </section>
  );
}

/** Marca a multa como indicada (condutor informado ao órgão) ou paga, com a data de hoje. */
export function MarcarMulta({ id, campo, rotulo }: { id: string; campo: 'indicado_em' | 'pago_em'; rotulo: string }) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const marcar = useMutation({
    mutationFn: async () => {
      const alteracao = campo === 'indicado_em' ? { indicado_em: hojeIso() } : { pago_em: hojeIso() };
      const { error } = await supabase.from('multas').update(alteracao).eq('id', id).select('id').single();
      if (error) throw error;
    },
    onSuccess: () => router.refresh(),
  });
  if (marcar.isError) return <span className="text-sm text-destructive">{traduzirErroBanco(marcar.error)}</span>;
  return (
    <Button type="button" variant="outline" disabled={marcar.isPending} onClick={() => marcar.mutate()}>
      {rotulo}
    </Button>
  );
}
