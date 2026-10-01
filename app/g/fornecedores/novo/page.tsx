import type { Metadata } from 'next';
import { FormFornecedor } from '@/components/gestao/FormFornecedor';

export const metadata: Metadata = { title: 'Novo fornecedor · Gestão Frota' };

export default function NovoFornecedor() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-3xl">Novo fornecedor</h1>
      <FormFornecedor />
    </div>
  );
}
