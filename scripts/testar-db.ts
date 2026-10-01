// Roda os testes pgTAP de supabase/tests no projeto vinculado SEM Docker.
// `supabase test db --linked` exige Docker (roda pg_prove num container), então
// usamos `supabase db query --linked`, que executa SQL pela Management API.
// Essa API só devolve o resultado do último SELECT, por isso cada teste é reescrito:
// - cada `select <assert>(...)` de topo vira `insert into _saida_tap select <assert>(...)`,
//   guardando a saída TAP ("ok 1 - ...", "not ok 2 - ..." + diagnóstico);
// - o finish() é removido (ele apaga as tabelas temporárias do pgTAP);
// - antes do rollback, um SELECT final devolve o resumo de __tcache__ e as falhas.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type Resumo = { plano: number | null; executados: number; falhas: number; detalhes: string | null };

const pasta = 'supabase/tests';
const arquivos = readdirSync(pasta).filter((f) => f.endsWith('.sql')).sort();
const temp = mkdtempSync(join(tmpdir(), 'pgtap-'));

// Funções de asserção do pgTAP usadas nos testes (acrescente aqui se usar outra).
const ASSERCOES = 'ok|is|isnt|matches|throws_ok|lives_ok|results_eq|set_eq|bag_eq|has_table|has_column|policies_are';

function prepararSql(sql: string): string {
  const semFinish = sql.replace(/^\s*select\s+\*\s+from\s+finish\(\)\s*;\s*$/im, '');
  const ultimoRollback = semFinish.search(/rollback\s*;\s*$/i);
  if (ultimoRollback === -1) throw new Error('o teste precisa terminar com "rollback;"');

  const corpo = semFinish
    .slice(0, ultimoRollback)
    .replace(new RegExp(`^select\\s+((?:${ASSERCOES})\\s*\\()`, 'gim'), 'insert into _saida_tap (linha) select $1')
    // a tabela de saída é criada logo depois do plan(), ainda como postgres
    .replace(
      /^(select\s+plan\s*\(\s*\d+\s*\)\s*;)/im,
      `$1
create temp table _saida_tap (n serial, linha text);
grant all on _saida_tap to public;
grant all on sequence _saida_tap_n_seq to public;`,
    );

  return `${corpo}reset role;
select
  (select value from __tcache__ where label = 'plan' limit 1)      as plano,
  (select value from __tcache__ where label = 'curr_test' limit 1) as executados,
  (select value from __tcache__ where label = 'failed' limit 1)    as falhas,
  (select string_agg(linha, E'\\n' order by n) from _saida_tap where linha like 'not ok%') as detalhes;
rollback;
`;
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

  const { plano, executados, falhas, detalhes } = resumo;
  const passou = falhas === 0 && plano !== null && executados === plano;
  console.log(
    `${passou ? '✓' : '✗'} ${arquivo}: ${executados - falhas}/${plano ?? '?'} ok` +
      (falhas ? `, ${falhas} falha(s)` : '') +
      (plano !== null && executados !== plano ? ` (planejados ${plano}, executados ${executados})` : ''),
  );
  if (detalhes) console.log(detalhes.replace(/^/gm, '    '));
  ok &&= passou;
}

process.exit(ok ? 0 : 1);
