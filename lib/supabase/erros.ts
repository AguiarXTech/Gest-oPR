/** Traduz erros do Postgres/Supabase para mensagens que o usuário entende. */
export function traduzirErroBanco(
  erro: { code?: string; message?: string } | null | undefined,
  mensagens: Partial<Record<string, string>> = {},
): string {
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
