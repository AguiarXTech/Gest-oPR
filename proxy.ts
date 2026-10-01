// Next.js 16: "middleware.ts" passou a se chamar "proxy.ts".
import type { NextRequest } from 'next/server';
import { atualizarSessao } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  matcher: [
    // Ignora assets estáticos, imagens e arquivos do PWA
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
