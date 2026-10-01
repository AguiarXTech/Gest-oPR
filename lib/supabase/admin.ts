// Cliente com a chave de serviço: IGNORA a RLS. Só para operações que o
// usuário logado não pode fazer sozinho (criar usuário, redefinir senha, banir).
// `server-only` faz o build falhar se este arquivo for importado no navegador.
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

export function criarClienteAdmin() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.');

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
