import { Label } from '@/components/ui/label';

type Props = {
  id: string;
  rotulo: string;
  erro?: string;
  ajuda?: string;
  children: React.ReactNode;
};

/** Rótulo + campo + mensagem de erro/ajuda, com os ids ligados para leitores de tela. */
export function Campo({ id, rotulo, erro, ajuda, children }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-base">
        {rotulo}
      </Label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} className="text-sm font-medium text-destructive">
          {erro}
        </p>
      ) : (
        ajuda && (
          <p id={`${id}-ajuda`} className="text-sm text-muted-foreground">
            {ajuda}
          </p>
        )
      )}
    </div>
  );
}

/** Props de acessibilidade para o input dentro de <Campo>. */
export function ariaCampo(id: string, erro?: string, ajuda?: string) {
  return {
    id,
    'aria-invalid': erro ? true : undefined,
    'aria-describedby': erro ? `${id}-erro` : ajuda ? `${id}-ajuda` : undefined,
  } as const;
}
