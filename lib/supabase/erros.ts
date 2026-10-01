/** Traduz erros do Postgres/Supabase para mensagens que o usuário entende. */
export function traduzirErroBanco(erroDesconhecido: unknown, mensagens: Partial<Record<string, string>> = {}): string {
  const erro = erroDesconhecido as { code?: string; message?: string } | null | undefined;
  const codigo = erro?.code ?? '';
  if (mensagens[codigo]) return mensagens[codigo];

  switch (codigo) {
    case '23505':
      return 'Já existe um registro com esses dados.';
    case '23514':
      return 'Algum valor está fora do permitido. Confira os campos.';
    case '42501':
      return 'Você não tem permissão para fazer isso.';
    case 'PGRST116': // update/select com .single() que não encontrou linha (inexistente ou barrada pela RLS)
      return 'Registro não encontrado ou sem permissão para alterar.';
    case 'P0001':
      // Mensagens dos triggers já são escritas em português para o usuário.
      return erro?.message ?? 'Operação não permitida.';
    default:
      return 'Não foi possível salvar. Verifique a internet e tente de novo.';
  }
}

/**
 * Falha de rede (sinal fraco na estrada): o supabase-js devolve erro sem código do Postgres.
 * Erros com código (constraint, RLS, trigger) não adiantam repetir.
 */
export function ehErroDeRede(erro: unknown): boolean {
  const e = erro as { code?: string; message?: string } | null;
  return !e?.code && /fetch|network|rede|timeout|load failed/i.test(e?.message ?? '');
}

/** Opções do TanStack Query para salvar com até 2 novas tentativas só em falha de rede. */
export const repetirSeFalharRede = {
  retry: (tentativas: number, erro: unknown) => tentativas < 2 && ehErroDeRede(erro),
  retryDelay: (tentativa: number) => 1500 * (tentativa + 1),
} as const;
