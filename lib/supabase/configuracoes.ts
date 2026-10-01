import { cache } from 'react';
import { lerConfiguracoes } from '@/lib/domain/configuracoes';
import { createClient } from '@/lib/supabase/server';

/** Configurações do banco já convertidas (com os padrões das regras se faltar alguma). */
export const obterConfiguracoes = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from('configuracoes').select('chave, valor');
  return lerConfiguracoes(data ?? []);
});
