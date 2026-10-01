'use client';

import { useActionState } from 'react';
import { criarAcesso, redefinirSenha, type EstadoAcao } from '@/app/g/funcionarios/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatarCpf } from '@/lib/domain/cpf';
import { Campo } from './Campo';

type Props = {
  funcionarioId: string;
  cpf: string;
  /** Papel do acesso existente, ou null se ainda não tem acesso. */
  papel: 'dono' | 'admin' | 'motorista' | null;
  funcionarioAtivo: boolean;
};

const nomesPapel = { dono: 'Dono', admin: 'Administração', motorista: 'Motorista' } as const;

function Mensagem({ estado }: { estado: EstadoAcao }) {
  return (
    <p
      aria-live="polite"
      className={`text-sm font-medium empty:hidden ${estado.erro ? 'text-destructive' : 'text-green-700 dark:text-green-400'}`}
    >
      {estado.erro ?? estado.ok}
    </p>
  );
}

export function AcessoFuncionario({ funcionarioId, cpf, papel, funcionarioAtivo }: Props) {
  const [estadoCriar, acaoCriar, criando] = useActionState(criarAcesso, {});
  const [estadoSenha, acaoSenha, redefinindo] = useActionState(redefinirSenha, {});

  if (!papel) {
    if (!funcionarioAtivo) return <p className="text-muted-foreground">Funcionário desativado: sem acesso ao app.</p>;

    return (
      <form action={acaoCriar} className="flex flex-col gap-4">
        <p className="text-muted-foreground">
          Este funcionário ainda não entra no app. O login será o CPF <strong>{formatarCpf(cpf)}</strong>.
        </p>
        <input type="hidden" name="funcionarioId" value={funcionarioId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="papel" rotulo="Tipo de acesso">
            <select
              id="papel"
              name="papel"
              defaultValue="motorista"
              className="h-11 rounded-lg border border-input bg-transparent px-2.5 text-base"
            >
              <option value="motorista">Motorista (área do motorista)</option>
              <option value="admin">Administração (área de gestão)</option>
            </select>
          </Campo>
          <Campo id="senha-inicial" rotulo="Senha inicial" ajuda="Mínimo de 8 caracteres">
            <Input
              id="senha-inicial"
              name="senha"
              type="text"
              autoComplete="new-password"
              minLength={8}
              required
              aria-describedby="senha-inicial-ajuda"
              className="h-11 text-base"
            />
          </Campo>
        </div>
        <Mensagem estado={estadoCriar} />
        <Button type="submit" disabled={criando} className="h-11 self-start text-base">
          {criando ? 'Criando…' : 'Criar acesso ao app'}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p>
        Tem acesso como <strong>{nomesPapel[papel]}</strong>. Login: CPF <strong>{formatarCpf(cpf)}</strong>.
      </p>
      <form action={acaoSenha} className="flex flex-col gap-4">
        <input type="hidden" name="funcionarioId" value={funcionarioId} />
        <Campo id="nova-senha" rotulo="Nova senha" ajuda="Use se o funcionário esqueceu a senha. Mínimo de 8 caracteres.">
          <Input
            id="nova-senha"
            name="senha"
            type="text"
            autoComplete="new-password"
            minLength={8}
            required
            aria-describedby="nova-senha-ajuda"
            className="h-11 text-base sm:max-w-xs"
          />
        </Campo>
        <Mensagem estado={estadoSenha} />
        <Button type="submit" variant="outline" disabled={redefinindo} className="h-11 self-start text-base">
          {redefinindo ? 'Salvando…' : 'Redefinir senha'}
        </Button>
      </form>
    </div>
  );
}
