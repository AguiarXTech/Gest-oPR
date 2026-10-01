import { LogOut } from 'lucide-react';
import { sair } from '@/app/(auth)/login/actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Botão de sair. `naMoldura`: versão clara para o fundo grafite do menu. */
export function BotaoSair({ naMoldura, className }: { naMoldura?: boolean; className?: string }) {
  return (
    <form action={sair} className={className}>
      <Button
        type="submit"
        variant="outline"
        className={cn(
          'w-full',
          naMoldura && 'border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
        )}
      >
        <LogOut className="size-5" aria-hidden />
        Sair
      </Button>
    </form>
  );
}
