// Relatório de abastecimento (RF-50): cards, gráficos e "fora do padrão" a partir dos
// abastecimentos lançados pelos motoristas. Funções puras: converter o registro do banco,
// escolher o período e resumir. O km/L usa a regra da plataforma (tanque cheio, §4).
import { calcularMedicoes, mediaPonderada, type Medicao } from './consumo';

export type LinhaAbastecimento = {
  /** ISO 8601. */
  dataHora: string;
  placa: string;
  motorista: string;
  posto: string;
  cidade: string;
  km: number;
  litros: number;
  valorTotalCentavos: number;
  tanqueCheio: boolean;
};

/** Registro de `abastecimentos` com caminhão, motorista e posto (fornecedor) juntos. */
export type AbastecimentoDoBanco = {
  data_hora: string;
  km: number;
  /** numeric chega como número ou texto, conforme o cliente. */
  litros: number | string;
  valor_total_centavos: number;
  tanque_cheio: boolean;
  posto_nome: string | null;
  caminhoes: { placa: string } | null;
  funcionarios: { nome: string } | null;
  fornecedores: { nome: string; cidade: string | null } | null;
};

/** Posto: o cadastrado (fornecedor) ou o nome lido do cupom; cidade vem do cadastro do posto. */
export function linhaDoBanco(a: AbastecimentoDoBanco): LinhaAbastecimento {
  return {
    dataHora: a.data_hora,
    placa: a.caminhoes?.placa ?? '—',
    motorista: a.funcionarios?.nome ?? '—',
    posto: a.fornecedores?.nome ?? a.posto_nome ?? 'Posto não informado',
    cidade: a.fornecedores?.cidade?.trim() || 'Sem cidade',
    km: a.km,
    litros: Number(a.litros),
    valorTotalCentavos: a.valor_total_centavos,
    tanqueCheio: a.tanque_cheio,
  };
}

export const PERIODOS_RELATORIO = {
  '30d': '30 dias',
  '90d': '3 meses',
  '12m': '12 meses',
} as const;
export type PeriodoRelatorio = keyof typeof PERIODOS_RELATORIO;

export function lerPeriodoRelatorio(valor: unknown): PeriodoRelatorio {
  return typeof valor === 'string' && valor in PERIODOS_RELATORIO
    ? (valor as PeriodoRelatorio)
    : '90d';
}

/** Início do período (ISO), contado a partir de `agora`. */
export function inicioDoPeriodoRelatorio(periodo: PeriodoRelatorio, agora: Date): string {
  const d = new Date(agora);
  if (periodo === '12m') d.setUTCFullYear(d.getUTCFullYear() - 1);
  else d.setUTCDate(d.getUTCDate() - (periodo === '30d' ? 30 : 90));
  return d.toISOString();
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
