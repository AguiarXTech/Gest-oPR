import type { Metadata } from 'next';
import { FormCarreta } from '@/components/gestao/FormCarreta';

export const metadata: Metadata = { title: 'Nova carreta · Gestão RPortugues' };

export default function NovaCarreta() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-3xl">Nova carreta</h1>
      <FormCarreta />
    </div>
  );
}
