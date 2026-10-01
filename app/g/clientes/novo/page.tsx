import type { Metadata } from 'next';
import { FormCliente } from '@/components/gestao/FormCliente';

export const metadata: Metadata = { title: 'Novo cliente · Gestão Frota' };

export default function NovoCliente() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Novo cliente</h1>
      <FormCliente />
    </div>
  );
}
