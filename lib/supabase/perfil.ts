import { createClient } from '@/lib/supabase/server';

/** Perfil do usuário logado (nome e papel). O proxy.ts já garantiu a sessão. */
export async function obterPerfilAtual() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('profiles').select('nome, papel').eq('id', user.id).single();
  return data;
}
