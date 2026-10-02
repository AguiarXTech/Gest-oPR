import { describe, expect, it } from 'vitest';
import { camposAlterados, valorLegivel } from './auditoria';

describe('camposAlterados', () => {
  it('UPDATE: só o que mudou, sem updated_at', () => {
    expect(
      camposAlterados({ id: 1, valor: 100, conferido: false, updated_at: 'a' }, { id: 1, valor: 120, conferido: false, updated_at: 'b' }),
    ).toEqual([{ campo: 'valor', antes: 100, depois: 120 }]);
  });

  it('INSERT: todos os campos preenchidos aparecem como novos', () => {
    expect(camposAlterados(null, { valor: 5, obs: null })).toEqual([{ campo: 'valor', antes: null, depois: 5 }]);
  });

  it('DELETE: todos os campos aparecem como apagados', () => {
    expect(camposAlterados({ valor: 5 }, null)).toEqual([{ campo: 'valor', antes: 5, depois: null }]);
  });

  it('compara objetos pelo conteúdo', () => {
    expect(camposAlterados({ v: { a: 1 } }, { v: { a: 1 } })).toEqual([]);
  });
});

describe('valorLegivel', () => {
  it.each([
    [null, '—'],
    [true, 'sim'],
    [false, 'não'],
    [15000, '15000'],
    [{ a: 1 }, '{"a":1}'],
  ])('%j → %s', (v, esperado) => expect(valorLegivel(v)).toBe(esperado));
});
