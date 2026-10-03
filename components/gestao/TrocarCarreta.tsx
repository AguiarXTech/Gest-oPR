'use client';

// Carreta da viagem (pedido de 2026-10-03): o motorista escolhe ao iniciar; aqui a gestão
// corrige se ele marcou errado. Entra no pedágio previsto (eixos do cavalo + da carreta).
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatarPlaca } from '@/lib/domain/placa';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';

type Props = {
  viagemId: string;
  carretaId: string | null;
  carretas: { id: string; placa: string; apelido: string | null }[];
  bloqueado: boolean;
};

export function TrocarCarreta({ viagemId, carretaId, carretas, bloqueado }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);

  const salvar = useMutation({
    mutationFn: async (carreta_id: string | null) => {
      const { error } = await supabase
        .from('viagens')
        .update({ carreta_id })
        .eq('id', viagemId)
        .select('id')
        .single();
      if (error) throw error;
    },
    onSuccess: () => router.refresh(),
  });

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="carreta_viagem" className="text-sm font-medium">
        Carreta
      </label>
      <select
        id="carreta_viagem"
        value={carretaId ?? ''}
        disabled={bloqueado || salvar.isPending}
        onChange={(e) => salvar.mutate(e.target.value || null)}
        className="h-11 rounded-lg border border-input bg-card px-2 text-base disabled:opacity-60"
      >
        <option value="">Sem carreta</option>
        {carretas.map((c) => (
          <option key={c.id} value={c.id}>
            {formatarPlaca(c.placa)}
            {c.apelido ? ` · ${c.apelido}` : ''}
          </option>
        ))}
      </select>
      {bloqueado && (
        <p className="text-sm text-muted-foreground">
          Viagem num acerto fechado: não dá para trocar.
        </p>
      )}
      {salvar.isError && (
        <p aria-live="polite" className="text-sm font-medium text-destructive">
          {traduzirErroBanco(salvar.error, {
            '23505': 'Esta carreta já está em outra viagem em andamento.',
          })}
        </p>
      )}
    </div>
  );
}
