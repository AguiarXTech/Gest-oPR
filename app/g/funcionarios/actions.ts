'use server';

// Ações que exigem a chave de serviço (AGENTS.md §4.6). Toda ação confere,
// no servidor, que quem chamou é gestor: a tela escondida não é proteção.

import { revalidatePath } from 'next/cache';
import { DOMINIO_EMAIL_INTERNO } from '@/lib/domain/login';
import { criarClienteAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { alterarAtivoSchema, criarAcessoSchema, redefinirSenhaSchema } from '@/lib/validations/acesso';

export type EstadoAcao = { erro?: string; ok?: string };

/** Cliente com a sessão do usuário, se ele for dono/admin ativo; senão null. */
async function clienteDoGestor() {
  const supabase = await createClient();
  const { data: gestor } = await supabase.rpc('is_gestor');
  return gestor ? supabase : null;
}

export async function criarAcesso(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const supabase = await clienteDoGestor();
  if (!supabase) return { erro: 'Você não tem permissão para criar acessos.' };

  const dados = criarAcessoSchema.safeParse(Object.fromEntries(formData));
  if (!dados.success) return { erro: dados.error.issues[0].message };
  const { funcionarioId, papel, senha } = dados.data;

  // Leituras com a sessão do gestor (RLS); a chave de serviço só para o Auth.
  const { data: funcionario } = await supabase
    .from('funcionarios')
    .select('id, nome, cpf, ativo')
    .eq('id', funcionarioId)
    .maybeSingle();
  if (!funcionario) return { erro: 'Funcionário não encontrado.' };
  if (!funcionario.ativo) return { erro: 'Funcionário desativado não pode receber acesso.' };

  const { data: perfilExistente } = await supabase
    .from('profiles')
    .select('id')
    .eq('funcionario_id', funcionarioId)
    .maybeSingle();
  if (perfilExistente) return { erro: 'Este funcionário já tem acesso.' };

  const admin = criarClienteAdmin();
  const { data: criado, error: erroAuth } = await admin.auth.admin.createUser({
    email: `${funcionario.cpf}@${DOMINIO_EMAIL_INTERNO}`,
    password: senha,
    email_confirm: true,
  });
  if (erroAuth) {
    if (erroAuth.code === 'email_exists') return vincularAcessoExistente(admin, funcionario);
    if (erroAuth.code === 'weak_password') return { erro: 'Senha fraca. Use pelo menos 8 caracteres.' };
    return { erro: 'Não foi possível criar o acesso. Tente de novo.' };
  }

  const { error: erroPerfil } = await admin.from('profiles').insert({
    id: criado.user.id,
    nome: funcionario.nome,
    papel,
    funcionario_id: funcionario.id,
  });
  if (erroPerfil) {
    // Desfaz o usuário do Auth para não deixar login sem perfil.
    await admin.auth.admin.deleteUser(criado.user.id);
    return { erro: 'Não foi possível criar o acesso. Tente de novo.' };
  }

  revalidatePath('/g/funcionarios');
  revalidatePath(`/g/funcionarios/${funcionarioId}`);
  return { ok: 'Acesso criado. Passe o CPF e a senha para o funcionário.' };
}

export async function redefinirSenha(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const supabase = await clienteDoGestor();
  if (!supabase) return { erro: 'Você não tem permissão para redefinir senhas.' };

  const dados = redefinirSenhaSchema.safeParse(Object.fromEntries(formData));
  if (!dados.success) return { erro: dados.error.issues[0].message };

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id')
    .eq('funcionario_id', dados.data.funcionarioId)
    .maybeSingle();
  if (!perfil) return { erro: 'Este funcionário ainda não tem acesso.' };

  const { error } = await criarClienteAdmin().auth.admin.updateUserById(perfil.id, {
    password: dados.data.senha,
  });
  if (error) {
    if (error.code === 'weak_password') return { erro: 'Senha fraca. Use pelo menos 8 caracteres.' };
    return { erro: 'Não foi possível redefinir a senha. Tente de novo.' };
  }

  return { ok: 'Senha redefinida. Passe a nova senha para o funcionário.' };
}

// Bloqueio "permanente" no Auth (~100 anos); "none" remove o bloqueio.
const BAN_DESATIVADO = '876000h';

/**
 * Desativa ou reativa o funcionário (S1-5). O trigger do banco leva o `ativo`
 * para o perfil, e a RLS passa a negar todas as leituras. Aqui também se
 * bloqueia o login no Auth, para a sessão não ser renovada.
 */
export async function alterarAtivoFuncionario(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const supabase = await clienteDoGestor();
  if (!supabase) return { erro: 'Você não tem permissão para alterar funcionários.' };

  const dados = alterarAtivoSchema.safeParse(Object.fromEntries(formData));
  if (!dados.success) return { erro: 'Dados inválidos. Recarregue a página.' };
  const { funcionarioId, ativo } = dados.data;

  const [{ data: perfil }, { data: sessao }] = await Promise.all([
    supabase.from('profiles').select('id').eq('funcionario_id', funcionarioId).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (!ativo && perfil && perfil.id === sessao.user?.id) {
    return { erro: 'Você não pode desativar o seu próprio acesso.' };
  }

  // Auth primeiro e banco depois; se o banco falhar, desfaz o Auth. Assim nada
  // fica pela metade e o gestor pode simplesmente tentar de novo.
  const admin = criarClienteAdmin();
  const banir = (bloquear: boolean) =>
    perfil
      ? admin.auth.admin.updateUserById(perfil.id, { ban_duration: bloquear ? BAN_DESATIVADO : 'none' })
      : Promise.resolve({ error: null });

  const { error: erroAuth } = await banir(!ativo);
  if (erroAuth) return { erro: 'Não foi possível alterar o login. Tente de novo.' };

  const { error } = await supabase
    .from('funcionarios')
    .update({ ativo })
    .eq('id', funcionarioId)
    .select('id')
    .single();
  if (error) {
    await banir(ativo);
    return { erro: 'Não foi possível salvar. Tente de novo.' };
  }

  revalidatePath('/g/funcionarios');
  revalidatePath(`/g/funcionarios/${funcionarioId}`);
  return { ok: ativo ? 'Funcionário reativado.' : 'Funcionário desativado. Ele não consegue mais entrar no app.' };
}

/**
 * Dono/admin que também dirige (pedido de 2026-10-02): o login dele (CPF) já existe, sem
 * funcionário ligado. Liga o cadastro de funcionário a esse login, mantendo o papel, para
 * ele ter também a área do motorista. Login de motorista ou já ligado: recusa.
 */
async function vincularAcessoExistente(
  admin: ReturnType<typeof criarClienteAdmin>,
  funcionario: { id: string; cpf: string; nome: string },
): Promise<EstadoAcao> {
  const email = `${funcionario.cpf}@${DOMINIO_EMAIL_INTERNO}`;
  // poucos usuários (família + motoristas): uma página basta
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const usuario = data?.users.find((u) => u.email === email);
  if (!usuario) return { erro: 'Já existe um acesso com este CPF.' };

  const { data: perfil } = await admin.from('profiles').select('papel, funcionario_id').eq('id', usuario.id).maybeSingle();
  if (!perfil || perfil.papel === 'motorista' || perfil.funcionario_id) {
    return { erro: 'Já existe um acesso com este CPF.' };
  }

  const { error } = await admin.from('profiles').update({ funcionario_id: funcionario.id }).eq('id', usuario.id);
  if (error) return { erro: 'Não foi possível ligar ao acesso existente. Tente de novo.' };

  revalidatePath('/g/funcionarios');
  revalidatePath(`/g/funcionarios/${funcionario.id}`);
  const papel = perfil.papel === 'dono' ? 'dono' : 'administração';
  return { ok: `Ligado ao acesso de ${papel} que já existia (mesma senha). Agora ele também tem a área do motorista.` };
}
