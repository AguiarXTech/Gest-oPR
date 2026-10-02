import type { Metadata } from 'next';
import { FormConfiguracoes } from '@/components/gestao/FormConfiguracoes';
import { obterConfiguracoes } from '@/lib/supabase/configuracoes';

export const metadata: Metadata = { title: 'Configurações · Gestão RPortugues' };

export default async function Configuracoes() {
  const config = await obterConfiguracoes();
  return (
    <>
      <div>
        <h1 className="text-3xl">Configurações</h1>
        <p className="text-muted-foreground">Limites usados nos avisos. Toda mudança fica registrada na auditoria.</p>
      </div>
      <FormConfiguracoes config={config} />
    </>
  );
}
