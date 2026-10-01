// Roda os testes pgTAP de supabase/tests no projeto vinculado SEM Docker.
// `supabase test db --linked` exige Docker (roda pg_prove num container), então
// usamos `supabase db query --linked`, que executa SQL pela Management API.
// Essa API só devolve o resultado do último SELECT, por isso cada teste é
// reescrito: remove o finish() (que apaga as tabelas temporárias do pgTAP) e,
// antes do rollback, lê o resumo de __tcache__ (planejados, executados, falhas).
// Limitação: em caso de falha, mostra quantos testes falharam, não quais.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type Resumo = { plano: number | null; executados: number; falhas: number };

const pasta = 'supabase/tests';
const arquivos = readdirSync(pasta).filter((f) => f.endsWith('.sql')).sort();
const temp = mkdtempSync(join(tmpdir(), 'pgtap-'));

function prepararSql(sql: string): string {
  const semFinish = sql.replace(/^\s*select\s+\*\s+from\s+finish\(\)\s*;\s*$/im, '');
  const ultimoRollback = semFinish.search(/rollback\s*;\s*$/i);
  if (ultimoRollback === -1) throw new Error('o teste precisa terminar com "rollback;"');
  return (
    semFinish.slice(0, ultimoRollback) +
    `reset role;
select
  (select value from __tcache__ where label = 'plan' limit 1)      as plano,
  (select value from __tcache__ where label = 'curr_test' limit 1) as executados,
  (select value from __tcache__ where label = 'failed' limit 1)    as falhas;
rollback;
`
  );
}

let ok = true;
for (const arquivo of arquivos) {
  const destino = join(temp, arquivo);
  writeFileSync(destino, prepararSql(readFileSync(join(pasta, arquivo), 'utf8')));

  let resumo: Resumo;
  try {
    const saida = execFileSync(
      'npx',
      ['supabase', 'db', 'query', '--linked', '--agent', 'no', '-o', 'json', '-f', destino],
      { encoding: 'utf8', shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    [resumo] = JSON.parse(saida.slice(saida.indexOf('['))) as Resumo[];
  } catch (erro) {
    const e = erro as { stderr?: string; message: string };
    console.error(`✗ ${arquivo}: erro ao executar\n${e.stderr?.trim() || e.message}`);
    ok = false;
    continue;
  }

  const { plano, executados, falhas } = resumo;
  const passou = falhas === 0 && plano !== null && executados === plano;
  console.log(
    `${passou ? '✓' : '✗'} ${arquivo}: ${executados - falhas}/${plano ?? '?'} ok` +
      (falhas ? `, ${falhas} falha(s)` : '') +
      (plano !== null && executados !== plano ? ` (planejados ${plano}, executados ${executados})` : ''),
  );
  ok &&= passou;
}

process.exit(ok ? 0 : 1);
