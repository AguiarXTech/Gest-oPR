// Regras de dinheiro — docs/04-REGRAS-DE-NEGOCIO.md, seção 1.
// Valores sempre em centavos inteiros; percentuais convertidos para pontos-base.

const formatadorBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function assegurarCentavos(valor: number, nome = 'valor'): void {
  if (!Number.isSafeInteger(valor)) {
    throw new RangeError(`${nome} deve ser inteiro em centavos: ${valor}`);
  }
}

/** Converte percentual (ex.: 12.5 → 12,50%) para pontos-base inteiros (1250). */
export function percentualParaPontosBase(percentual: number): number {
  if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) {
    throw new RangeError(`percentual inválido: ${percentual}`);
  }
  return Math.round(percentual * 100);
}

/** Aplica pontos-base a um valor em centavos, arredondando metade para cima. */
export function aplicarPercentual(centavos: number, pontosBase: number): number {
  assegurarCentavos(centavos, 'centavos');
  if (!Number.isSafeInteger(pontosBase) || pontosBase < 0) {
    throw new RangeError(`pontosBase inválido: ${pontosBase}`);
  }
  if (centavos < 0) {
    throw new RangeError(`centavos não pode ser negativo: ${centavos}`);
  }
  return Math.round((centavos * pontosBase) / 10000);
}

/** Soma valores em centavos (arredonde cada item antes de somar). */
export function somarCentavos(valores: readonly number[]): number {
  return valores.reduce((total, v) => {
    assegurarCentavos(v);
    return total + v;
  }, 0);
}

/** Formata centavos para exibição (somente na UI). */
export function formatarBRL(centavos: number): string {
  assegurarCentavos(centavos, 'centavos');
  return formatadorBRL.format(centavos / 100);
}

/** Converte texto digitado ("1.234,56", "1234,5", "R$ 10") para centavos. */
export function reaisParaCentavos(texto: string): number {
  const semSimbolo = texto.replace(/[R$\s]/g, '');
  // Teclado numérico do celular às vezes só tem ponto: "115.50" é 115 reais e 50 centavos.
  // Sem vírgula e com um único ponto seguido de 1 ou 2 dígitos, o ponto é decimal;
  // "1.500" (3 dígitos depois) continua sendo milhar.
  const pontoDecimal = !semSimbolo.includes(',') && /^\d+\.\d{1,2}$/.test(semSimbolo);
  const limpo = pontoDecimal ? semSimbolo : semSimbolo.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) {
    throw new RangeError(`valor monetário inválido: "${texto}"`);
  }
  const [inteiros, decimais = ''] = limpo.split('.');
  return Number(inteiros) * 100 + Number(decimais.padEnd(2, '0'));
}

/**
 * Campo de valor estilo maquininha/Pix (pedido de 2026-10-07): o motorista digita só os
 * números e o valor se forma da direita para a esquerda (11550 → "115,50"). Sem vírgula ou
 * ponto para errar. Devolve o texto formatado (sem "R$"), ou '' se não houver valor.
 */
export function valorPorDigitos(texto: string): string {
  const digitos = texto.replace(/\D/g, '').replace(/^0+/, '').slice(0, 9);
  if (!digitos) return '';
  const centavos = Number(digitos);
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}
