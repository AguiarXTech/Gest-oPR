import type { Metadata } from 'next';
import { FormCaminhao } from '@/components/gestao/FormCaminhao';

export const metadata: Metadata = { title: 'Novo caminhão · Gestão Frota' };

export default function NovoCaminhao() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Novo caminhão</h1>
      <FormCaminhao />
    </div>
  );
}
