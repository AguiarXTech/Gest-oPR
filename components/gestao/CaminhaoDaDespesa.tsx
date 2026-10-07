'use client';

// Caminhão da despesa (pedido de 2026-10-07): despesa lançada sem viagem ficava sem
// caminhão e sumia do resumo do mês. Aqui a gestão diz de qual caminhão ela é.
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatarPlaca } from '@/lib/domain/placa';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import { cn } from '@/lib/utils';

type Props = {
  despesaId: string;
  caminhaoId: string | null;
  caminhoes: { id: string; placa: string; apelido: string | null }[];
  bloqueado: boolean;
};

export function CaminhaoDaDespesa({ despesaId, caminhaoId, caminhoes, bloqueado }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);

  const salvar = useMutation({
    mutationFn: async (caminhao_id: string) => {
      const { error } = await supabase
        .from('despesas_viagem')
        .update({ caminhao_id })
        .eq('id', despesaId)
        .select('id')
        .single();
      if (error) throw error;
    },
    onSuccess: () => router.refresh(),
  });

  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-xl border p-3',
        !caminhaoId ? 'border-destructive bg-destructive/5' : 'bg-card',
      )}
    >
      <label htmlFor="caminhao-despesa" className="font-medium">
        Caminhão
      </label>
      {!caminhaoId && (
        <p className="text-sm text-destructive">
          Lançada sem caminhão: escolha para entrar no resumo do mês do caminhão.
        </p>
      )}
      <select
        id="caminhao-despesa"
        value={caminhaoId ?? ''}
        disabled={bloqueado || salvar.isPending}
        onChange={(e) => e.target.value && salvar.mutate(e.target.value)}
        className="h-11 rounded-lg border border-input bg-card px-2 text-base disabled:opacity-60"
      >
        <option value="" disabled>
          Escolha…
        </option>
        {caminhoes.map((c) => (
          <option key={c.id} value={c.id}>
            {formatarPlaca(c.placa)}
            {c.apelido ? ` · ${c.apelido}` : ''}
          </option>
        ))}
      </select>
      {salvar.isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {traduzirErroBanco(salvar.error)}
        </p>
      )}
    </div>
  );
}
