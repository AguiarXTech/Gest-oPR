'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { entrar, type EstadoLogin } from './actions';

const estadoInicial: EstadoLogin = {};

export function FormLogin() {
  const [estado, acao, enviando] = useActionState(entrar, estadoInicial);

  return (
    <form action={acao} className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="usuario" className="text-base">
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
          className="h-12 text-base"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="senha" className="text-base">
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
          className="h-12 text-base"
        />
      </div>

      <p id="erro-login" aria-live="polite" className="min-h-6 text-sm font-medium text-destructive">
        {estado.erro}
      </p>

      <Button type="submit" disabled={enviando} className="h-12 w-full text-base">
        {enviando ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  );
}
