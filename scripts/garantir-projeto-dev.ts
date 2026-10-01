// Trava de segurança: comandos destrutivos (db:reset, db:test, dev:users) só
// rodam se o projeto Supabase vinculado (`supabase link`) for o de DESENVOLVIMENTO.
// Compara supabase/.temp/project-ref com SUPABASE_DEV_PROJECT_REF do .env.local.
import { readFileSync } from 'node:fs';

const esperado = process.env.SUPABASE_DEV_PROJECT_REF?.trim();
if (!esperado) {
  console.error('Defina SUPABASE_DEV_PROJECT_REF no .env.local (ref do projeto gestao-frota-dev).');
  process.exit(1);
}

let vinculado: string;
try {
  vinculado = readFileSync('supabase/.temp/project-ref', 'utf8').trim();
} catch {
  console.error('Nenhum projeto vinculado. Rode: npx supabase link --project-ref ' + esperado);
  process.exit(1);
}

if (vinculado !== esperado) {
  console.error(
    `Recusado: o projeto vinculado (${vinculado}) não é o de desenvolvimento (${esperado}).\n` +
      `Rode: npx supabase link --project-ref ${esperado}`,
  );
  process.exit(1);
}
