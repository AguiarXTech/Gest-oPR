import type { Metadata } from 'next';
import Link from 'next/link';
import { FormConfiguracoes } from '@/components/gestao/FormConfiguracoes';
import { obterConfiguracoes } from '@/lib/supabase/configuracoes';

export const metadata: Metadata = { title: 'Configurações · Gestão RPortugues' };

export default async function Configuracoes() {
  const config = await obterConfiguracoes();
  return (
    <>
      <div>
        <h1 className="text-3xl">Configurações</h1>
        <p className="text-muted-foreground">
          Limites usados nos avisos. Toda mudança fica registrada na{' '}
          <Link href="/g/auditoria" className="font-medium text-primary underline">
            auditoria
          </Link>
          .
        </p>
      </div>
      <FormConfiguracoes config={config} />
    </>
  );
}
