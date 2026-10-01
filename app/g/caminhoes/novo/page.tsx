import type { Metadata } from 'next';
import { FormCaminhao } from '@/components/gestao/FormCaminhao';

export const metadata: Metadata = { title: 'Novo caminhão · Gestão RPortugues' };

export default function NovoCaminhao() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-3xl">Novo caminhão</h1>
      <FormCaminhao />
    </div>
  );
}
