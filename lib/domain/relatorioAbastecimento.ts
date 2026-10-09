// Relatório de abastecimento a partir de uma planilha (case de 2026-10-09): a página da
// gestão lê a planilha do Google (CSV) e mostra cards e gráficos. Funções puras: ler o CSV,
// converter as linhas e resumir. O km/L usa a regra da plataforma (tanque cheio, §4).
import { calcularMedicoes, mediaPonderada, type Medicao } from './consumo';
import { lerDecimal } from './numeros';

export type LinhaAbastecimento = {
  /** ISO com fuso de Brasília (-03:00). */
  dataHora: string;
  placa: string;
  motorista: string;
  posto: string;
  cidade: string;
  km: number;
  litros: number;
  valorTotalCentavos: number;
  tanqueCheio: boolean;
  trecho: 'ida' | 'volta' | null;
};

/** CSV simples: aspas, aspas duplicadas e separador vírgula ou ponto e vírgula (detectado). */
export function lerCsv(texto: string): string[][] {
  const primeira = texto.slice(0, texto.search(/\r?\n/) === -1 ? undefined : texto.search(/\r?\n/));
  const sep = (primeira.match(/;/g) ?? []).length > (primeira.match(/,/g) ?? []).length ? ';' : ',';
  const linhas: string[][] = [];
  let campo = '';
  let linha: string[] = [];
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) {
      linha.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = '';
    } else campo += c;
  }
  if (campo !== '' || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((c) => c.trim() !== ''));
}

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

const COLUNAS: Record<string, keyof LinhaAbastecimento | 'preco_litro'> = {
  data_hora: 'dataHora',
  data: 'dataHora',
  placa: 'placa',
  motorista: 'motorista',
  posto: 'posto',
  cidade: 'cidade',
  km: 'km',
  litros: 'litros',
  preco_litro: 'preco_litro',
  valor_total: 'valorTotalCentavos',
  valor: 'valorTotalCentavos',
  tanque_cheio: 'tanqueCheio',
  trecho: 'trecho',
};

/** "2026-07-02 18:40" ou "02/07/2026 18:40" (horário de Brasília) → ISO com -03:00. */
function lerDataHora(texto: string): string | null {
  const t = texto.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4].padStart(2, '0')}:${m[5]}:00-03:00`;
  m = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(t);
  if (m)
    return `${m[3]}-${m[2]}-${m[1]}T${(m[4] ?? '12').padStart(2, '0')}:${m[5] ?? '00'}:00-03:00`;
  return null;
}

/** Linhas válidas da planilha; as incompletas são contadas em `ignoradas` (aparecem na tela). */
export function lerPlanilhaAbastecimentos(texto: string): {
  linhas: LinhaAbastecimento[];
  ignoradas: number;
} {
  const [cabecalho, ...dados] = lerCsv(texto);
  if (!cabecalho) return { linhas: [], ignoradas: 0 };
  const indice = new Map<string, number>();
  cabecalho.forEach((c, i) => {
    const chave = COLUNAS[normalizar(c)];
    if (chave && !indice.has(chave)) indice.set(chave, i);
  });
  const valor = (l: string[], chave: string) =>
    indice.has(chave) ? (l[indice.get(chave)!] ?? '').trim() : '';

  const linhas: LinhaAbastecimento[] = [];
  let ignoradas = 0;
  for (const l of dados) {
    const dataHora = lerDataHora(valor(l, 'dataHora'));
    const km = lerDecimal(valor(l, 'km').replace(/\./g, '')) ?? null;
    const litros = lerDecimal(valor(l, 'litros'));
    const total = lerDecimal(valor(l, 'valorTotalCentavos').replace(/^R\$\s*/, ''));
    const preco = lerDecimal(valor(l, 'preco_litro').replace(/^R\$\s*/, ''));
    const valorTotal = total ?? (preco !== null && litros !== null ? preco * litros : null);
    const placa = valor(l, 'placa').toUpperCase();
    if (
      !dataHora ||
      km === null ||
      !Number.isInteger(km) ||
      !litros ||
      litros <= 0 ||
      !valorTotal ||
      !placa
    ) {
      ignoradas++;
      continue;
    }
    const trecho = valor(l, 'trecho').toLowerCase();
    linhas.push({
      dataHora,
      placa,
      motorista: valor(l, 'motorista'),
      posto: valor(l, 'posto'),
      cidade: valor(l, 'cidade') || 'Sem cidade',
      km,
      litros,
      valorTotalCentavos: Math.round(valorTotal * 100),
      tanqueCheio: /^(s|sim|x|1|true|cheio)$/i.test(valor(l, 'tanqueCheio')),
      trecho: trecho === 'ida' || trecho === 'volta' ? trecho : null,
    });
  }
  return { linhas, ignoradas };
}

/** Segunda-feira (aaaa-mm-dd) da semana da data, no horário de Brasília (semana começa na segunda). */
function segundaDaSemana(iso: string): string {
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(iso),
  );
  const d = new Date(`${dia}T12:00:00Z`);
  const recuo = (d.getUTCDay() + 6) % 7; // segunda = 0
  d.setUTCDate(d.getUTCDate() - recuo);
  return d.toISOString().slice(0, 10);
}

const mediana = (v: number[]) => {
  if (v.length === 0) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export type Tolerancias = { precoToleranciaPct: number; consumoToleranciaPct: number };

/** Cards, séries dos gráficos e abastecimentos fora do padrão. */
export function resumirAbastecimentos(
  linhas: readonly LinhaAbastecimento[],
  tol: Tolerancias = { precoToleranciaPct: 15, consumoToleranciaPct: 20 },
) {
  const gastoCentavos = linhas.reduce((t, l) => t + l.valorTotalCentavos, 0);
  const litros = linhas.reduce((t, l) => t + l.litros, 0);
  const precoMedioCentavos = litros > 0 ? Math.round(gastoCentavos / litros) : null;

  // km/L por caminhão: medições de tanque cheio a tanque cheio (mesma regra da plataforma)
  const placas = [...new Set(linhas.map((l) => l.placa))].sort();
  const medicoesPorPlaca = new Map<string, Medicao[]>(
    placas.map((p) => [
      p,
      calcularMedicoes(
        linhas
          .filter((l) => l.placa === p)
          .map((l) => ({
            id: `${l.placa}|${l.dataHora}|${l.km}`,
            km: l.km,
            litros: l.litros,
            tanqueCheio: l.tanqueCheio,
            dataHora: l.dataHora,
          })),
      ),
    ]),
  );
  const todas = [...medicoesPorPlaca.values()].flat();
  const kmPorLitro = mediaPonderada(todas);
  const kmRodados = todas.reduce((t, m) => t + m.distancia, 0);

  const kmLPorCaminhao = placas.map((placa) => ({
    placa,
    kmL: mediaPonderada(medicoesPorPlaca.get(placa) ?? []),
    medicoes: medicoesPorPlaca.get(placa)?.length ?? 0,
  }));

  const semanas = new Map<string, { gasto: number; litros: number }>();
  for (const l of linhas) {
    const s = segundaDaSemana(l.dataHora);
    const atual = semanas.get(s) ?? { gasto: 0, litros: 0 };
    semanas.set(s, { gasto: atual.gasto + l.valorTotalCentavos, litros: atual.litros + l.litros });
  }
  const ordemSemanas = [...semanas.keys()].sort();
  const gastoPorSemana = ordemSemanas.map((semana) => ({
    semana,
    gastoCentavos: semanas.get(semana)!.gasto,
    litros: semanas.get(semana)!.litros,
  }));
  const precoPorSemana = ordemSemanas.map((semana) => ({
    semana,
    precoCentavos: Math.round(semanas.get(semana)!.gasto / semanas.get(semana)!.litros),
  }));

  const cidades = new Map<string, { gasto: number; litros: number; quantidade: number }>();
  for (const l of linhas) {
    const a = cidades.get(l.cidade) ?? { gasto: 0, litros: 0, quantidade: 0 };
    cidades.set(l.cidade, {
      gasto: a.gasto + l.valorTotalCentavos,
      litros: a.litros + l.litros,
      quantidade: a.quantidade + 1,
    });
  }
  const porCidade = [...cidades]
    .map(([cidade, v]) => ({
      cidade,
      gastoCentavos: v.gasto,
      litros: v.litros,
      quantidade: v.quantidade,
    }))
    .sort((a, b) => b.gastoCentavos - a.gastoCentavos);

  // fora do padrão: preço acima da mediana + tolerância; consumo fora da média do caminhão
  const precoMediano = mediana(linhas.map((l) => l.valorTotalCentavos / l.litros));
  const medicaoPorId = new Map(todas.map((m) => [m.abastecimentoId, m]));
  const foraDoPadrao = linhas
    .map((l) => {
      const motivos: string[] = [];
      const preco = l.valorTotalCentavos / l.litros;
      if (precoMediano !== null && preco > precoMediano * (1 + tol.precoToleranciaPct / 100)) {
        motivos.push(
          `Preço ${Math.round(((preco - precoMediano) / precoMediano) * 100)}% acima do normal`,
        );
      }
      const m = medicaoPorId.get(`${l.placa}|${l.dataHora}|${l.km}`);
      // compara com as OUTRAS medições do caminhão (ou da frota, se ele tem poucas)
      const outrasDoCaminhao = (medicoesPorPlaca.get(l.placa) ?? []).filter((x) => x !== m);
      const referencia = m
        ? mediaPonderada(
            outrasDoCaminhao.length >= 2 ? outrasDoCaminhao : todas.filter((x) => x !== m),
          )
        : null;
      if (
        m &&
        referencia !== null &&
        Math.abs(m.kmL - referencia) / referencia > tol.consumoToleranciaPct / 100
      ) {
        motivos.push(
          `Consumo ${m.kmL.toFixed(2).replace('.', ',')} km/L, ${m.kmL < referencia ? 'abaixo' : 'acima'} do normal`,
        );
      }
      return { linha: l, motivos };
    })
    .filter((f) => f.motivos.length > 0)
    .sort((a, b) => b.linha.dataHora.localeCompare(a.linha.dataHora));

  const ordenadas = [...linhas].sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  return {
    cards: {
      gastoCentavos,
      litros,
      precoMedioCentavos,
      kmPorLitro,
      kmRodados,
      custoKmCentavos:
        precoMedioCentavos !== null && kmPorLitro
          ? Math.round(precoMedioCentavos / kmPorLitro)
          : null,
      abastecimentos: linhas.length,
    },
    periodo: ordenadas.length
      ? { inicio: ordenadas[ordenadas.length - 1].dataHora, fim: ordenadas[0].dataHora }
      : null,
    gastoPorSemana,
    precoPorSemana,
    kmLPorCaminhao,
    porCidade,
    foraDoPadrao,
    ultimos: ordenadas.slice(0, 15),
  };
}

export type ResumoAbastecimentos = ReturnType<typeof resumirAbastecimentos>;
