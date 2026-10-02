// Como instalar o app no celular (S2-7). Página pública: o motorista abre antes de entrar.
import type { Metadata } from 'next';
import Link from 'next/link';
import { Instrucoes } from './Instrucoes';

export const metadata: Metadata = { title: 'Instalar o app · Gestão RPortugues' };

export default function Instalar() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div>
        <h1 className="text-3xl">Instalar no celular</h1>
        <p className="text-lg text-muted-foreground">Não precisa de loja de aplicativos. Leva menos de um minuto.</p>
      </div>
      <Instrucoes />
      <Link href="/login" className="inline-flex h-14 items-center justify-center rounded-lg border bg-card text-lg font-semibold shadow-xs">
        Ir para a entrada
      </Link>
    </main>
  );
}
