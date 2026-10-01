'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Props = {
  /** Mensagem de erro já traduzida, ou null. */
  erro: string | null;
  salvando: boolean;
  salvo: boolean;
  rotuloSalvar: string;
  voltarPara: string;
};

/** Mensagem de erro + Cancelar + Salvar, igual em todos os formulários de cadastro. */
export function RodapeFormulario({ erro, salvando, salvo, rotuloSalvar, voltarPara }: Props) {
  const router = useRouter();

  return (
    <>
      <p aria-live="polite" className="text-sm font-medium text-destructive empty:hidden">
        {erro}
      </p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="h-11 text-base" onClick={() => router.push(voltarPara)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando || salvo} className="h-11 text-base">
          {salvando ? 'Salvando…' : rotuloSalvar}
        </Button>
      </div>
    </>
  );
}
