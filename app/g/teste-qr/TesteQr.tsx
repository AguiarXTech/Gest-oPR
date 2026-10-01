'use client';

import { useState } from 'react';
import { LeitorQr, type Leitura } from '@/components/camera/LeitorQr';
import { Button } from '@/components/ui/button';
import { formatarCnpj } from '@/lib/domain/cnpj';
import { decomporChave, extrairChave } from '@/lib/domain/nfce';

type Resultado = Leitura & { chave: string | null; hora: string };

const nomesMetodo = { camera: 'câmera', foto: 'foto' } as const;

export function TesteQr() {
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [copiado, setCopiado] = useState(false);

  function registrar(leitura: Leitura) {
    const hora = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    setResultados((r) => [{ ...leitura, chave: extrairChave(leitura.texto), hora }, ...r]);
  }

  async function copiarRelatorio() {
    // Sem a chave nem o texto lido: o relatório vai para fora do app e a chave identifica a nota.
    const linhas = resultados.map((r) => {
      const d = r.chave ? decomporChave(r.chave) : null;
      return `${r.hora} · ${nomesMetodo[r.metodo]} · ${r.ms} ms · ${
        d ? `ok (${d.uf}, modelo ${d.modelo}, ${String(d.mes).padStart(2, '0')}/${d.ano})` : 'sem chave válida'
      }`;
    });
    await navigator.clipboard.writeText([`Aparelho: ${navigator.userAgent}`, ...linhas].join('\n'));
    setCopiado(true);
  }

  return (
    <div className="flex max-w-md flex-col gap-6">
      <LeitorQr onLeitura={registrar} />

      {resultados.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Leituras ({resultados.length})</h2>
            <Button type="button" variant="outline" onClick={copiarRelatorio} className="h-10">
              {copiado ? 'Copiado!' : 'Copiar relatório'}
            </Button>
          </div>
          <ul className="flex flex-col gap-3">
            {resultados.map((r, i) => {
              const d = r.chave ? decomporChave(r.chave) : null;
              return (
                <li
                  key={resultados.length - i}
                  className={`flex flex-col gap-1 rounded-xl border-2 p-3 text-sm ${d ? 'border-sucesso' : 'border-destructive'}`}
                >
                  <p className="font-medium">
                    {d ? '✓ Chave válida' : '✗ Sem chave válida'} · {nomesMetodo[r.metodo]} · {r.ms} ms · {r.hora}
                  </p>
                  {d && (
                    <p className="text-muted-foreground">
                      {d.uf} · {String(d.mes).padStart(2, '0')}/{d.ano} · {d.modelo === '65' ? 'NFC-e' : 'NF-e'} nº {d.numero}
                      <br />
                      Posto: CNPJ {formatarCnpj(d.cnpjEmitente)}
                    </p>
                  )}
                  <p className="font-mono text-xs break-all text-muted-foreground">{r.chave ?? r.texto}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
