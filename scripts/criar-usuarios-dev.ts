// S0-7 — Cria os usuários de desenvolvimento no projeto Supabase de DESENVOLVIMENTO.
// Uso: npm run dev:users  (depois de npm run db:reset)
// Lê NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_DEV_PROJECT_REF de .env.local.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

type Papel = Database['public']['Enums']['papel_usuario'];

const SENHA_DEV = 'senha-dev-123';

const usuarios: { email: string; nome: string; papel: Papel; funcionarioId: string | null }[] = [
  { email: 'dono@frota.local', nome: 'Dono', papel: 'dono', funcionarioId: null },
  { email: 'admin@frota.local', nome: 'Admin', papel: 'admin', funcionarioId: null },
  // CPFs do seed → login por CPF (ADR 0001, Q8)
  { email: '00000000191@frota.local', nome: 'Motorista Teste 1', papel: 'motorista', funcionarioId: '00000000-0000-0000-0000-0000000000f1' },
  { email: '00000000272@frota.local', nome: 'Motorista Teste 2', papel: 'motorista', funcionarioId: '00000000-0000-0000-0000-0000000000f2' },
  { email: '00000000353@frota.local', nome: 'Motorista Teste 3', papel: 'motorista', funcionarioId: '00000000-0000-0000-0000-0000000000f3' },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local');
  }
  const refDev = process.env.SUPABASE_DEV_PROJECT_REF;
  if (!refDev || new URL(url).hostname !== `${refDev}.supabase.co`) {
    throw new Error(`Recusado: este script só roda contra o projeto de desenvolvimento (URL: ${url})`);
  }

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const u of usuarios) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: SENHA_DEV,
      email_confirm: true,
    });
    if (error) {
      console.warn(`- ${u.email}: ${error.message}`);
      continue;
    }
    const { error: erroPerfil } = await supabase.from('profiles').upsert({
      id: data.user.id,
      nome: u.nome,
      papel: u.papel,
      funcionario_id: u.funcionarioId,
    });
    if (erroPerfil) throw erroPerfil;
    console.log(`+ ${u.email} (${u.papel})`);
  }
  console.log(`\nSenha de todos: ${SENHA_DEV}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
