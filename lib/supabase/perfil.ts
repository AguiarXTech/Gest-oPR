import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

/**
 * Perfil do usuário logado (nome e papel). O proxy.ts já garantiu a sessão.
 * `cache` evita consultar duas vezes quando layout e página pedem o perfil.
 */
export const obterPerfilAtual = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('profiles').select('nome, papel').eq('id', user.id).single();
  return data;
});
