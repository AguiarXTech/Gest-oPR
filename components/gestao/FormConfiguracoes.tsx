'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Configuracoes } from '@/lib/domain/configuracoes';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import { configuracoesSchema, type ConfiguracoesDados, type ConfiguracoesForm } from '@/lib/validations/configuracoes';
import { ariaCampo, Campo } from './Campo';

const texto = (n: number) => String(n).replace('.', ',');

const grupos: { titulo: string; campos: { nome: keyof ConfiguracoesForm; rotulo: string; ajuda: string }[] }[] = [
  {
    titulo: 'Rota',
    campos: [
      { nome: 'origem', rotulo: 'Saída padrão', ajuda: 'Já vem preenchida ao iniciar viagem' },
      { nome: 'destino', rotulo: 'Destino padrão', ajuda: 'Onde o caminhão vira para voltar' },
      { nome: 'rota_padrao_km', rotulo: 'Km de um trecho', ajuda: 'O ciclo ida + volta é o dobro' },
      { nome: 'km_viagem_tolerancia_pct', rotulo: 'Avisar se a viagem fugir (%)', ajuda: 'Do km normal do ciclo' },
    ],
  },
  {
    titulo: 'Alertas de abastecimento',
    campos: [
      { nome: 'fator_tanque', rotulo: 'Folga do tanque', ajuda: '1,05 = até 5% acima da capacidade' },
      { nome: 'consumo_tolerancia_pct', rotulo: 'Consumo fora do normal (%)', ajuda: 'Diferença da média do caminhão' },
      { nome: 'consumo_janela', rotulo: 'Medições na média', ajuda: 'Quantos tanques cheios entram na média' },
      { nome: 'preco_tolerancia_pct', rotulo: 'Preço fora do normal (%)', ajuda: 'Diferença da mediana de 30 dias' },
      { nome: 'intervalo_min_km', rotulo: 'Intervalo mínimo (km)', ajuda: 'Abastecer antes disso gera aviso' },
    ],
  },
  {
    titulo: 'Documentos',
    campos: [{ nome: 'alerta_documentos_dias', rotulo: 'Avisar faltando (dias)', ajuda: 'Três faixas, ex.: 30, 15, 7' }],
  },
  {
    titulo: 'Manutenção e multas',
    campos: [
      { nome: 'manutencao_aviso_km', rotulo: 'Avisar manutenção faltando (km)', ajuda: 'Ex.: 1000' },
      { nome: 'manutencao_aviso_dias', rotulo: 'Avisar manutenção faltando (dias)', ajuda: 'Ex.: 15' },
      { nome: 'multa_prazo_indicacao_dias', rotulo: 'Prazo para indicar condutor (dias)', ajuda: 'Contado da notificação; hoje 30' },
    ],
  },
];

export function FormConfiguracoes({ config }: { config: Configuracoes }) {
  const router = useRouter();
  const [supabase] = useState(createClient);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    getValues,
  } = useForm<ConfiguracoesForm, unknown, ConfiguracoesDados>({
    resolver: zodResolver(configuracoesSchema),
    defaultValues: {
      origem: config.rotaPadrao.origem,
      destino: config.rotaPadrao.destino,
      rota_padrao_km: texto(config.rotaPadraoKm),
      km_viagem_tolerancia_pct: texto(config.kmViagemToleranciaPct),
      fator_tanque: texto(config.fatorTanque),
      consumo_tolerancia_pct: texto(config.consumoToleranciaPct),
      consumo_janela: texto(config.consumoJanela),
      preco_tolerancia_pct: texto(config.precoToleranciaPct),
      intervalo_min_km: texto(config.intervaloMinKm),
      alerta_documentos_dias: config.alertaDocumentosDias.join(', '),
      manutencao_aviso_km: texto(config.manutencaoAvisoKm),
      manutencao_aviso_dias: texto(config.manutencaoAvisoDias),
      multa_prazo_indicacao_dias: texto(config.multaPrazoIndicacaoDias),
    },
  });

  const salvar = useMutation({
    mutationFn: async (linhas: ConfiguracoesDados) => {
      // upsert: a linha pode não existir ainda (vale o padrão das regras)
      const { error } = await supabase.from('configuracoes').upsert(linhas, { onConflict: 'chave' });
      if (error) throw error;
    },
    onSuccess: () => {
      reset(getValues());
      router.refresh();
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => salvar.mutate(d))} noValidate className="flex max-w-2xl flex-col gap-6">
      {grupos.map((g) => (
        <section key={g.titulo} className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-6">
          <h2 className="text-lg font-semibold">{g.titulo}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {g.campos.map(({ nome, rotulo, ajuda }) => (
              <Campo key={nome} id={nome} rotulo={rotulo} erro={errors[nome]?.message} ajuda={ajuda}>
                <Input {...register(nome)} {...ariaCampo(nome, errors[nome]?.message, ajuda)} inputMode={nome === 'origem' || nome === 'destino' ? 'text' : 'decimal'} />
              </Campo>
            ))}
          </div>
        </section>
      ))}
      {salvar.isError && (
        <p role="alert" className="font-medium text-destructive">
          {traduzirErroBanco(salvar.error)}
        </p>
      )}
      {salvar.isSuccess && !isDirty && <p className="font-medium text-sucesso">✓ Configurações salvas. Os alertas já usam os novos valores.</p>}
      <Button type="submit" size="lg" disabled={salvar.isPending || !isDirty} className="sm:self-end">
        {salvar.isPending ? 'Salvando…' : 'Salvar configurações'}
      </Button>
    </form>
  );
}
