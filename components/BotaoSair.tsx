import { sair } from '@/app/(auth)/login/actions';
import { Button } from '@/components/ui/button';

export function BotaoSair() {
  return (
    <form action={sair}>
      <Button type="submit" variant="outline" className="h-11 px-4 text-base">
        Sair
      </Button>
    </form>
  );
}
