import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/database.types';

/**
 * Renova a sessão e redireciona por papel (motorista → /m, gestor → /g).
 * Isso é UX: a segurança real está na RLS.
 */
export async function atualizarSessao(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Não coloque código entre createServerClient e getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const rotaProtegida = pathname.startsWith('/m') || pathname.startsWith('/g');

  if (!user) {
    if (rotaProtegida) return redirecionar(request, '/login', response);
    return response;
  }

  if (rotaProtegida || pathname === '/' || pathname === '/login') {
    const { data: papel } = await supabase.rpc('papel_atual');
    const destino = papel === 'motorista' ? '/m' : papel ? '/g' : null;

    if (!destino) {
      // Usuário sem papel ativo (desativado): trata como deslogado.
      if (pathname !== '/login') return redirecionar(request, '/login', response);
      return response;
    }
    const naAreaCerta = pathname === destino || pathname.startsWith(`${destino}/`);
    if (!naAreaCerta) return redirecionar(request, destino, response);
  }

  return response;
}

function redirecionar(request: NextRequest, caminho: string, base: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = caminho;
  url.search = '';
  const redirect = NextResponse.redirect(url);
  base.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
