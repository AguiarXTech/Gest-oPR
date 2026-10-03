'use client';

// Locais de carga do cliente (pedido de 2026-10-03): onde o caminhão busca a carga, com o
// endereço. O motorista escolhe o local ao iniciar a viagem e abre o endereço no mapa.
import { useMutation } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { linkMapa } from '@/lib/mapa';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import { cn } from '@/lib/utils';
import { Campo } from './Campo';

type Local = { id: string; nome: string; endereco: string | null; ativo: boolean };

export function LocaisCarga({ clienteId, locais }: { clienteId: string; locais: Local[] }) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [f, setF] = useState({ nome: '', endereco: '' });
  const [erro, setErro] = useState<string | null>(null);

  const salvar = useMutation({
    mutationFn: async () => {
      if (f.nome.trim().length < 2) throw new Error('Digite o produto. Ex.: Cimento Liz');
      const { error } = await supabase.from('locais_carga').insert({
        cliente_id: clienteId,
        nome: f.nome.trim(),
        endereco: f.endereco.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setF({ nome: '', endereco: '' });
      router.refresh();
    },
    onError: (e) =>
      setErro(e instanceof Error && !('code' in e) ? e.message : traduzirErroBanco(e)),
  });

  const alternar = useMutation({
    mutationFn: async (l: Local) => {
      const { error } = await supabase
        .from('locais_carga')
        .update({ ativo: !l.ativo })
        .eq('id', l.id)
        .select('id')
        .single();
      if (error) throw error;
    },
    onSuccess: () => router.refresh(),
  });

  const ordenados = [...locais].sort(
    (a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome),
  );

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs">
      <div>
        <h2 className="text-lg font-semibold">O que carrega e onde</h2>
        <p className="text-sm text-muted-foreground">
          Produto e local onde o caminhão carrega. O motorista escolhe ao iniciar a viagem.
        </p>
      </div>

      {ordenados.length === 0 ? (
        <p className="text-muted-foreground">Nada cadastrado ainda.</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {ordenados.map((l) => (
            <li
              key={l.id}
              className={cn(
                'flex flex-wrap items-center justify-between gap-2 py-2',
                !l.ativo && 'opacity-60',
              )}
            >
              <span className="flex flex-col">
                <span className="font-semibold">{l.nome}</span>
                {l.endereco && <span className="text-sm text-muted-foreground">{l.endereco}</span>}
              </span>
              <span className="flex items-center gap-1">
                <a
                  href={linkMapa(l)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center gap-1 rounded-lg px-3 text-primary hover:underline"
                >
                  <MapPin className="size-4" aria-hidden /> Mapa
                </a>
                <Button
                  type="button"
                  variant="outline"
                  disabled={alternar.isPending}
                  onClick={() => alternar.mutate(l)}
                >
                  {l.ativo ? 'Desativar' : 'Reativar'}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {alternar.isError && (
        <p className="font-medium text-destructive">{traduzirErroBanco(alternar.error)}</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setErro(null);
          salvar.mutate();
        }}
        className="flex flex-col gap-3 border-t pt-4"
      >
        <h3 className="font-medium">Adicionar produto e local</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo id="local-nome" rotulo="Produto *" ajuda="Ex.: Cimento Liz">
            <Input
              id="local-nome"
              value={f.nome}
              onChange={(e) => setF({ ...f, nome: e.target.value })}
              aria-describedby="local-nome-ajuda"
              className="h-11 text-base"
            />
          </Campo>
          <Campo
            id="local-endereco"
            rotulo="Local (cidade)"
            ajuda="Ex.: Vespasiano - MG. Abre no mapa do celular"
          >
            <Input
              id="local-endereco"
              value={f.endereco}
              onChange={(e) => setF({ ...f, endereco: e.target.value })}
              aria-describedby="local-endereco-ajuda"
              className="h-11 text-base"
            />
          </Campo>
        </div>
        {erro && (
          <p role="alert" className="font-medium text-destructive">
            {erro}
          </p>
        )}
        <Button type="submit" size="lg" disabled={salvar.isPending} className="self-start">
          {salvar.isPending ? 'Salvando…' : 'Adicionar'}
        </Button>
      </form>
    </section>
  );
}
