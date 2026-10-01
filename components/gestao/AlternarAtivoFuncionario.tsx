'use client';

import { useActionState, useState } from 'react';
import { alterarAtivoFuncionario } from '@/app/g/funcionarios/actions';
import { Button } from '@/components/ui/button';

export function AlternarAtivoFuncionario({ funcionarioId, ativo }: { funcionarioId: string; ativo: boolean }) {
  const [estado, acao, salvando] = useActionState(alterarAtivoFuncionario, {});
  // Confirmação na própria tela (window.confirm pode ser bloqueado pelo navegador).
  const [confirmando, setConfirmando] = useState(false);

  return (
    <form action={acao} onSubmit={() => setConfirmando(false)} className="flex flex-col gap-3">
      <input type="hidden" name="funcionarioId" value={funcionarioId} />
      <input type="hidden" name="ativo" value={String(!ativo)} />
      <p className="text-muted-foreground">
        {ativo
          ? 'Use quando o funcionário sair da empresa. O acesso ao app é bloqueado na hora; viagens e acertos antigos continuam guardados.'
          : 'Funcionário desativado: não entra no app e não aparece nas escolhas. Ao reativar, volta a entrar com a mesma senha.'}
      </p>
      <p
        aria-live="polite"
        className={`text-sm font-medium empty:hidden ${estado.erro ? 'text-destructive' : 'text-sucesso'}`}
      >
        {estado.erro ?? estado.ok}
      </p>

      {confirmando ? (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-3 sm:flex-row sm:items-center">
          <p className="font-medium sm:flex-1">
            {ativo ? 'Tem certeza que quer desativar?' : 'Tem certeza que quer reativar?'}
          </p>
          <Button type="button" variant="outline" onClick={() => setConfirmando(false)} className="h-11 text-base">
            Cancelar
          </Button>
          <Button type="submit" variant={ativo ? 'destructive' : 'default'} className="h-11 text-base">
            {ativo ? 'Sim, desativar' : 'Sim, reativar'}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant={ativo ? 'destructive' : 'outline'}
          disabled={salvando}
          onClick={() => setConfirmando(true)}
          className="h-11 self-start text-base"
        >
          {salvando ? 'Salvando…' : ativo ? 'Desativar funcionário' : 'Reativar funcionário'}
        </Button>
      )}
    </form>
  );
}
