import type { Metadata } from 'next';
import { FormLogin } from './FormLogin';

export const metadata: Metadata = { title: 'Entrar · Gestão Frota' };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 p-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-semibold">Gestão Frota</h1>
        <p className="text-muted-foreground">Entre com seu CPF ou e-mail e a senha que o escritório passou.</p>
      </div>
      <FormLogin />
      <p className="text-center text-sm text-muted-foreground">Esqueceu a senha? Fale com o escritório.</p>
    </main>
  );
}
