// Rascunho de formulário do motorista (RNF-02, AGENTS.md §8: rascunho local é permitido).
// Guarda no próprio celular a cada alteração, para não perder nada se o app fechar ou
// a internet cair. Usa localStorage (sobrevive ao fechamento do app instalado) e
// some ao salvar com sucesso. Nunca é usado como fonte de dado de negócio.

const PREFIXO = 'gestao-frota:rascunho:';

export function lerRascunho<T>(chave: string): Partial<T> | null {
  try {
    const bruto = localStorage.getItem(PREFIXO + chave);
    return bruto ? (JSON.parse(bruto) as Partial<T>) : null;
  } catch {
    return null; // modo privado ou armazenamento bloqueado
  }
}

export function salvarRascunho<T>(chave: string, valores: T): void {
  try {
    localStorage.setItem(PREFIXO + chave, JSON.stringify(valores));
  } catch {
    // sem espaço ou bloqueado: o formulário continua funcionando sem rascunho
  }
}

export function apagarRascunho(chave: string): void {
  try {
    localStorage.removeItem(PREFIXO + chave);
  } catch {
    // ignorado
  }
}
