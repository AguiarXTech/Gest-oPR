import { describe, expect, it } from 'vitest';
import { centavosParaCsv, gerarCsv } from './csv';

describe('gerarCsv (Excel pt-BR)', () => {
  it('BOM, separador ";" e CRLF', () => {
    expect(gerarCsv(['Nome', 'Valor'], [['João', '10,50']])).toBe('﻿Nome;Valor\r\nJoão;10,50\r\n');
  });

  it('número com ponto vira vírgula', () => {
    expect(gerarCsv(['Litros'], [[185.32]])).toBe('﻿Litros\r\n185,32\r\n');
  });

  it('texto com ";", aspas ou quebra de linha vai entre aspas', () => {
    expect(gerarCsv(['Obs'], [['a;b'], ['diz "oi"'], ['linha1\nlinha2']])).toBe(
      '﻿Obs\r\n"a;b"\r\n"diz ""oi"""\r\n"linha1\nlinha2"\r\n',
    );
  });

  it('vazio para null/undefined', () => {
    expect(gerarCsv(['A', 'B'], [[null, undefined]])).toBe('﻿A;B\r\n;\r\n');
  });
});

describe('centavosParaCsv', () => {
  it.each([
    [123456, '1234,56'],
    [5, '0,05'],
    [0, '0,00'],
    [-8540, '-85,40'],
  ])('%i → %s', (c, esperado) => expect(centavosParaCsv(c)).toBe(esperado));
});
