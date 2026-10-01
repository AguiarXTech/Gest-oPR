import type { Metadata } from 'next';
import { FormFuncionario } from '@/components/gestao/FormFuncionario';

export const metadata: Metadata = { title: 'Novo funcionário · Gestão Frota' };

export default function NovoFuncionario() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-3xl">Novo funcionário</h1>
        <p className="text-muted-foreground">Depois de salvar, você poderá criar o acesso ao app.</p>
      </div>
      <FormFuncionario />
    </div>
  );
}
