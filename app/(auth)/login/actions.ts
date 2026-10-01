'use server';

import { redirect } from 'next/navigation';
import { paraEmailDeLogin } from '@/lib/domain/login';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validations/login';

export type EstadoLogin = { erro?: string; usuario?: string };

export async function entrar(_anterior: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const usuario = String(formData.get('usuario') ?? '');
  const dados = loginSchema.safeParse({ usuario, senha: formData.get('senha') ?? '' });
  if (!dados.success) return { erro: dados.error.issues[0].message, usuario };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: paraEmailDeLogin(dados.data.usuario)!,
    password: dados.data.senha,
  });
  if (error) return { erro: traduzirErro(error.code), usuario };

  // Login válido, mas sem perfil ativo (funcionário desativado): não deixa entrar.
  const { data: papel } = await supabase.rpc('papel_atual');
  if (!papel) {
    await supabase.auth.signOut();
    return { erro: 'Seu acesso está desativado. Fale com o escritório.', usuario };
  }

  redirect(papel === 'motorista' ? '/m' : '/g');
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

function traduzirErro(codigo: string | undefined): string {
  switch (codigo) {
    case 'invalid_credentials':
      return 'CPF/e-mail ou senha incorretos.';
    case 'user_banned':
      return 'Seu acesso está desativado. Fale com o escritório.';
    case 'over_request_rate_limit':
      return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.';
    default:
      return 'Não foi possível entrar. Verifique a internet e tente de novo.';
  }
}
