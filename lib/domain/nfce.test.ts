import { describe, expect, it } from 'vitest';
import { calcularDvChave, decomporChave, extrairChave, validarChave } from './nfce';

// Chaves de teste geradas com a própria função de DV (docs/04 §3.3): nada de chave real.
// cUF 31 (MG) · AAMM 2609 · CNPJ · modelo 65 · série 001 · número 000001234 · tpEmis 1 · código 00001234
const montar = (base43: string) => base43 + calcularDvChave(base43);
const BASE_NUMERICA = '31' + '2609' + '11222333000181' + '65' + '001' + '000001234' + '1' + '00001234';
const CHAVE = montar(BASE_NUMERICA);
const BASE_ALFA = '31' + '2609' + '12ABC34501DE35' + '65' + '001' + '000005678' + '1' + '00005678';
const CHAVE_ALFA = montar(BASE_ALFA);

describe('calcularDvChave (módulo 11)', () => {
  it('exemplo calculado à mão: 43 zeros + 1 no fim', () => {
    // soma = 1 × 2 = 2 → resto 2 → dv = 11 − 2 = 9
    expect(calcularDvChave('0'.repeat(42) + '1')).toBe(9);
  });

  it('resto 0 ou 1 → dv 0', () => {
    expect(calcularDvChave('0'.repeat(43))).toBe(0);
  });

  it('letra vale ASCII − 48 (A = 17), como no CNPJ alfanumérico', () => {
    // posição mais à direita com peso 2: A → 17 × 2 = 34 → resto 1 → dv 0
    expect(calcularDvChave('0'.repeat(42) + 'A')).toBe(0);
  });
});

describe('validarChave', () => {
  it('chave numérica gerada é válida', () => expect(validarChave(CHAVE)).toBe(true));
  it('chave com CNPJ alfanumérico é válida', () => expect(validarChave(CHAVE_ALFA)).toBe(true));

  it('DV trocado é inválido', () => {
    const errado = CHAVE.slice(0, 43) + ((Number(CHAVE[43]) + 1) % 10);
    expect(validarChave(errado)).toBe(false);
  });

  it.each([
    ['43 caracteres', CHAVE.slice(0, 43)],
    ['45 caracteres', CHAVE + '0'],
    ['letra fora do CNPJ', 'A' + CHAVE.slice(1)],
    ['vazio', ''],
  ])('%s é inválido', (_, chave) => {
    expect(validarChave(chave)).toBe(false);
  });
});

describe('extrairChave', () => {
  it('URL do QR versão 2 (parâmetro p = CHAVE|versão|ambiente|…)', () => {
    const url = `https://portalsped.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml?p=${CHAVE}|2|1|1|ABCDEF0123456789`;
    expect(extrairChave(url)).toBe(CHAVE);
  });

  it('URL com o | codificado (%7C)', () => {
    const url = `https://exemplo.fazenda.gov.br/qrcode?p=${CHAVE}%7C2%7C1%7C1%7CHASH`;
    expect(extrairChave(url)).toBe(CHAVE);
  });

  it('URL antiga com chNFe=', () => {
    expect(extrairChave(`http://nfce.exemplo.gov.br/consulta?chNFe=${CHAVE}&nVersao=100&tpAmb=1`)).toBe(CHAVE);
  });

  it('chave digitada em grupos de 4, como impressa no cupom', () => {
    const impressa = CHAVE.match(/.{1,4}/g)!.join(' ');
    expect(extrairChave(impressa)).toBe(CHAVE);
  });

  it('chave com CNPJ alfanumérico, em minúsculas', () => {
    expect(extrairChave(`https://x.gov.br/qrcode?p=${CHAVE_ALFA.toLowerCase()}|2|1|1|h`)).toBe(CHAVE_ALFA);
  });

  it('chave com DV errado → null', () => {
    const errado = CHAVE.slice(0, 43) + ((Number(CHAVE[43]) + 1) % 10);
    expect(extrairChave(`https://x.gov.br/qrcode?p=${errado}|2|1|1|h`)).toBeNull();
  });

  it.each(['', 'https://www.google.com', 'qualquer texto', '1234 5678'])('%j sem chave → null', (texto) => {
    expect(extrairChave(texto)).toBeNull();
  });
});

describe('decomporChave', () => {
  it('separa os campos da chave', () => {
    expect(decomporChave(CHAVE)).toEqual({
      codigoUf: '31',
      uf: 'MG',
      ano: 2026,
      mes: 9,
      cnpjEmitente: '11222333000181',
      modelo: '65',
      serie: '001',
      numero: 1234,
      tipoEmissao: '1',
      codigoNumerico: '00001234',
      dv: CHAVE[43],
    });
  });

  it('CNPJ alfanumérico do emitente', () => {
    expect(decomporChave(CHAVE_ALFA)?.cnpjEmitente).toBe('12ABC34501DE35');
  });

  it('chave inválida → null', () => expect(decomporChave('123')).toBeNull());
});
