// Gera a planilha de DEMONSTRAÇÃO do relatório de abastecimento (case de 2026-10-09).
// Dados falsos, mas no padrão da operação real: rota São João Evangelista ↔ Belo Horizonte
// (~290 km por trecho), ida vazia e volta carregada, diesel subindo devagar, postos em SJE,
// na estrada e em BH, e alguns abastecimentos fora do padrão para os alertas aparecerem.
// Semente fixa: rodar de novo gera exatamente os mesmos números.
//
//   npx tsx scripts/gerar-planilha-demo.ts   →   dados-demo/abastecimentos-sje-bh.csv
import { mkdirSync, writeFileSync } from 'node:fs';

// gerador pseudoaleatório com semente (mulberry32)
let semente = 20261009;
function aleatorio() {
  semente |= 0;
  semente = (semente + 0x6d2b79f5) | 0;
  let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const entre = (min: number, max: number) => min + aleatorio() * (max - min);

const TRECHO_KM = 290; // config rota_padrao_km
const INICIO = Date.parse('2026-07-01T06:00:00-03:00');
const FIM = Date.parse('2026-10-08T23:59:00-03:00');

const caminhoes = [
  { placa: 'DEM1A01', motorista: 'Carlos (demo)', km: 480_000, fator: 1.0 },
  { placa: 'DEM2B02', motorista: 'Marcos (demo)', km: 350_000, fator: 0.95 }, // mais antigo, bebe mais
  { placa: 'DEM3C03', motorista: 'Paulo (demo)', km: 610_000, fator: 1.04 },
];
const POSTOS = {
  sje: { posto: 'Posto Serra Verde (demo)', cidade: 'São João Evangelista - MG', ajuste: 0.05 },
  estrada: { posto: 'Posto Rota 381 (demo)', cidade: 'Itabira - MG', ajuste: 0.0 },
  bh: { posto: 'Posto Anel (demo)', cidade: 'Belo Horizonte - MG', ajuste: -0.06 },
};

/** Diesel S10: de ~R$ 6,02 em julho a ~R$ 6,28 em outubro, mais o ajuste do posto. */
function preco(quando: number, ajuste: number) {
  const progresso = (quando - INICIO) / (FIM - INICIO);
  return Math.round((6.02 + 0.26 * progresso + ajuste + entre(-0.03, 0.03)) * 100) / 100;
}

type Linha = {
  quando: number;
  placa: string;
  motorista: string;
  posto: string;
  cidade: string;
  km: number;
  litros: number;
  preco: number;
  cheio: boolean;
  trecho: 'ida' | 'volta';
};
const linhas: Linha[] = [];

caminhoes.forEach((c, i) => {
  let quando = INICIO + i * 9 * 3600_000; // cada caminhão sai num horário
  let km = c.km;
  let ciclo = 0;
  // começa de tanque cheio em SJE (abre a 1ª medição de km/L)
  linhas.push({
    quando,
    placa: c.placa,
    motorista: c.motorista,
    ...POSTOS.sje,
    km,
    litros: Number(entre(60, 120).toFixed(3)),
    preco: preco(quando, POSTOS.sje.ajuste),
    cheio: true,
    trecho: 'ida',
  });

  while (quando < FIM) {
    ciclo++;
    const ida = Math.round(TRECHO_KM + entre(-8, 12));
    const volta = Math.round(TRECHO_KM + entre(-8, 12));
    // ida vazia rende mais; volta carregada rende menos
    let kmLIda = 2.9 * c.fator * entre(0.96, 1.04);
    const kmLVolta = 2.45 * c.fator * entre(0.96, 1.04);
    // fora do padrão de propósito: consumo baixo no caminhão 2 (vazamento ou desvio?)
    if (c.placa === 'DEM2B02' && ciclo === 18) kmLIda = 1.6;

    const litrosIda = ida / kmLIda;
    const litrosVolta = volta / kmLVolta;
    const chegadaBh = quando + 6 * 3600_000;
    const retornoSje = chegadaBh + entre(20, 30) * 3600_000;

    // em ~35% das viagens completa um pouco em BH (parcial, mais barato)
    let litrosRestantes = litrosIda + litrosVolta;
    if (aleatorio() < 0.35) {
      const parcial = Number(entre(60, 110).toFixed(3));
      const q = chegadaBh + 2 * 3600_000;
      const caro = c.placa === 'DEM3C03' && ciclo === 9; // fora do padrão: posto caro
      linhas.push({
        quando: q,
        placa: c.placa,
        motorista: c.motorista,
        ...(caro ? POSTOS.estrada : POSTOS.bh),
        km: km + ida + 15,
        litros: parcial,
        preco: caro ? 7.19 : preco(q, POSTOS.bh.ajuste),
        cheio: false,
        trecho: 'volta',
      });
      litrosRestantes -= parcial;
    }
    // às vezes enche na estrada (Itabira) em vez de SJE
    const naEstrada = aleatorio() < 0.15;
    km += ida + volta;
    linhas.push({
      quando: retornoSje,
      placa: c.placa,
      motorista: c.motorista,
      ...(naEstrada ? POSTOS.estrada : POSTOS.sje),
      km,
      litros: Number(Math.max(litrosRestantes, 40).toFixed(3)),
      preco: preco(retornoSje, naEstrada ? POSTOS.estrada.ajuste : POSTOS.sje.ajuste),
      cheio: true,
      trecho: 'volta',
    });
    // descanso de 1 a 2 dias até a próxima saída
    quando = retornoSje + entre(14, 40) * 3600_000;
  }
});

// fora do padrão: preço digitado alto num abastecimento comum
const errado = linhas.find(
  (l) => l.placa === 'DEM1A01' && l.quando > Date.parse('2026-09-15T00:00:00-03:00') && l.cheio,
);
if (errado) errado.preco = 7.35;

const dataHora = (t: number) => {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(t));
  const v = (tipo: string) => p.find((x) => x.type === tipo)?.value ?? '';
  return `${v('year')}-${v('month')}-${v('day')} ${v('hour')}:${v('minute')}`;
};
const br = (n: number, casas: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
const q = (s: string) => `"${s.replace(/"/g, '""')}"`;

const csv = [
  'data_hora,placa,motorista,posto,cidade,km,litros,preco_litro,valor_total,tanque_cheio,trecho',
  ...linhas
    .filter((l) => l.quando <= FIM)
    .sort((a, b) => a.quando - b.quando)
    .map((l) =>
      [
        dataHora(l.quando),
        l.placa,
        q(l.motorista),
        q(l.posto),
        q(l.cidade),
        l.km,
        q(br(l.litros, 3)),
        q(br(l.preco, 2)),
        q(br(Math.round(l.litros * l.preco * 100) / 100, 2)),
        l.cheio ? 'Sim' : 'Não',
        l.trecho,
      ].join(','),
    ),
].join('\n');

mkdirSync('dados-demo', { recursive: true });
writeFileSync('dados-demo/abastecimentos-sje-bh.csv', csv + '\n', 'utf8');
console.log(`${linhas.length} abastecimentos → dados-demo/abastecimentos-sje-bh.csv`);
