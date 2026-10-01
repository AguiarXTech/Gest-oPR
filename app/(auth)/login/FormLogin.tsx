'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { entrar, type EstadoLogin } from './actions';

const estadoInicial: EstadoLogin = {};

// Campos claros sobre o fundo grafite da tela de login.
const classeCampo = 'h-12 border-white/20 bg-white/10 text-lg text-white focus-visible:border-primary';

export function FormLogin() {
  const [estado, acao, enviando] = useActionState(entrar, estadoInicial);

  return (
    <form action={acao} className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="usuario" className="text-base text-white/90">
          CPF ou e-mail
        </Label>
        <Input
          id="usuario"
          name="usuario"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          defaultValue={estado.usuario}
          aria-invalid={estado.erro ? true : undefined}
          aria-describedby={estado.erro ? 'erro-login' : undefined}
          className={classeCampo}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="senha" className="text-base text-white/90">
          Senha
        </Label>
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={estado.erro ? true : undefined}
          aria-describedby={estado.erro ? 'erro-login' : undefined}
          className={classeCampo}
        />
      </div>

      <p id="erro-login" aria-live="polite" className="min-h-6 font-medium text-red-300">
        {estado.erro}
      </p>

      <Button type="submit" size="xl" disabled={enviando} className="w-full">
        {enviando ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  );
}
