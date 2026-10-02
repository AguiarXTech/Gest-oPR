'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { DocumentoForm } from '@/lib/validations/documento';
import { FormDocumento } from './FormDocumento';

type Props = {
  caminhoes: { id: string; placa: string }[];
  funcionarios: { id: string; nome: string }[];
  /** Vindo de "Renovar": abre já preenchido com o tipo e o dono. */
  renovacao?: Partial<Pick<DocumentoForm, 'tipo' | 'entidade' | 'caminhao_id' | 'funcionario_id'>>;
};

export function NovoDocumento({ caminhoes, funcionarios, renovacao }: Props) {
  const [aberto, setAberto] = useState(Boolean(renovacao));

  if (!aberto) {
    return (
      <Button type="button" size="lg" onClick={() => setAberto(true)} className="self-start">
        <Plus aria-hidden /> Novo documento
      </Button>
    );
  }
  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{renovacao ? 'Renovar documento' : 'Novo documento'}</h2>
        <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
          Fechar
        </Button>
      </div>
      {renovacao && <p className="text-sm text-muted-foreground">O documento antigo fica no histórico. Informe o novo vencimento.</p>}
      <FormDocumento caminhoes={caminhoes} funcionarios={funcionarios} inicial={renovacao} aoSalvar={() => setAberto(false)} />
    </section>
  );
}
