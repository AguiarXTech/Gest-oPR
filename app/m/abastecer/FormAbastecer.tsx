'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Check, QrCode, ScanLine } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ListaAnomalias } from '@/components/abastecimento/ListaAnomalias';
import { LeitorQr } from '@/components/camera/LeitorQr';
import { FotoComprovante } from '@/components/camera/FotoComprovante';
import { ariaCampo, Campo } from '@/components/gestao/Campo';
import { apagarRascunho, lerRascunho, salvarRascunho } from '@/components/motorista/rascunho';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { detectarAnomalias, montarContextoAnalise, type Anomalia } from '@/lib/domain/anomalias';
import { formatarCnpj } from '@/lib/domain/cnpj';
import type { Configuracoes } from '@/lib/domain/configuracoes';
import { decomporChave, extrairChave } from '@/lib/domain/nfce';
import { formatarPlaca } from '@/lib/domain/placa';
import { createClient } from '@/lib/supabase/client';
import { repetirSeFalharRede, traduzirErroBanco } from '@/lib/supabase/erros';
import { cn } from '@/lib/utils';
import { gerarUuid, jaFoiSalvo } from '@/lib/uuid';
import { abastecimentoSchema, type AbastecimentoDados, type AbastecimentoForm } from '@/lib/validations/abastecimento';

type Caminhao = { id: string; placa: string; apelido: string | null; km_atual: number };
type Posto = { id: string; nome: string; cnpj: string | null };
type Props = {
  funcionarioId: string;
  viagem: { id: string; caminhao_id: string } | null;
  caminhoes: Caminhao[];
  postos: Posto[];
  config: Configuracoes;
};

type Rascunho = { id: string; semQr: boolean; valores: AbastecimentoForm };
type Resultado = { kmL: number | null; anomalias: Anomalia[] };

const RASCUNHO = 'abastecimento';
const numero = new Intl.NumberFormat('pt-BR');
const kmL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type DadosAnalise = {
  capacidade_tanque_l: number | null;
  abastecimentos: { id: string; km: number; litros: number; tanque_cheio: boolean; data_hora: string }[];
  precos_litro_centavos: number[];
};

function traduzir(erro: unknown) {
  const e = erro as { code?: string; message?: string };
  if (e?.code === '23505' && e.message?.includes('nfce_chave')) {
    return 'Esta nota já foi lançada antes. Cada cupom só pode ser registrado uma vez.';
  }
  return traduzirErroBanco(e);
}

export function FormAbastecer({ funcionarioId, viagem, caminhoes, postos, config }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);

  const padrao: AbastecimentoForm = {
    caminhao_id: viagem?.caminhao_id ?? (caminhoes.length === 1 ? caminhoes[0].id : ''),
    km: '',
    litros: '',
    valor_total: '',
    tanque_cheio: true,
    forma_pagamento: 'faturado', // Q11: o diesel é pago direto ao posto
    nfce_chave: null,
    nfce_url: null,
    foto_path: '',
    foto_painel_path: null,
  };
  // Rascunho: lido uma vez ao abrir. O id vai junto para a nova tentativa não duplicar.
  const [inicial] = useState<Rascunho>(() => {
    const r = lerRascunho<Rascunho>(RASCUNHO);
    return {
      id: r?.id ?? gerarUuid(),
      semQr: r?.semQr ?? false,
      valores: { ...padrao, ...r?.valores, forma_pagamento: 'faturado', ...(viagem ? { caminhao_id: viagem.caminhao_id } : {}) },
    };
  });
  const recuperado = Boolean(lerRascunhoSemErro());
  const [semQr, setSemQr] = useState(inicial.semQr);
  const [erroQr, setErroQr] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<AbastecimentoForm, unknown, AbastecimentoDados>({
    resolver: zodResolver(abastecimentoSchema),
    defaultValues: inicial.valores,
  });

  const valores = useWatch({ control }) as AbastecimentoForm;
  useEffect(() => {
    if (!resultado) salvarRascunho<Rascunho>(RASCUNHO, { id: inicial.id, semQr, valores });
  }, [valores, semQr, inicial.id, resultado]);

  const chave = valores.nfce_chave ? decomporChave(valores.nfce_chave) : null;
  const posto = chave ? postos.find((p) => p.cnpj === chave.cnpjEmitente) : undefined;
  const caminhao = caminhoes.find((c) => c.id === valores.caminhao_id);

  const salvar = useMutation({
    ...repetirSeFalharRede,
    mutationFn: async (dados: AbastecimentoDados): Promise<Resultado> => {
      const { valor_total, ...resto } = dados;
      const { error } = await supabase.from('abastecimentos').insert({
        ...resto,
        id: inicial.id,
        valor_total_centavos: valor_total,
        motorista_id: funcionarioId, // o trigger força o funcionário logado
        viagem_id: viagem?.id ?? null,
        fornecedor_id: posto?.id ?? null,
      });
      if (error && !jaFoiSalvo(error)) throw error;

      // Análise só para avisar o motorista; se falhar, o abastecimento já está salvo.
      const { data } = await supabase.rpc('dados_analise_abastecimento', { p_caminhao_id: dados.caminhao_id });
      const analise = data as DadosAnalise | null;
      if (!analise) return { kmL: null, anomalias: [] };

      const historico = analise.abastecimentos.map((a) => ({
        id: a.id,
        km: a.km,
        litros: Number(a.litros),
        tanqueCheio: a.tanque_cheio,
        dataHora: a.data_hora,
      }));
      const alvo = historico.find((h) => h.id === inicial.id) ?? { id: inicial.id, km: dados.km, dataHora: new Date().toISOString() };
      const contexto = montarContextoAnalise(
        alvo,
        historico,
        analise.capacidade_tanque_l === null ? null : Number(analise.capacidade_tanque_l),
        analise.precos_litro_centavos,
        config,
      );
      const anomalias = detectarAnomalias(
        { km: dados.km, litros: dados.litros, valorTotalCentavos: valor_total, dataHora: alvo.dataHora, nfceChave: dados.nfce_chave, fotoPath: dados.foto_path },
        // o próprio preço não entra na mediana
        { ...contexto, precosLitroRecentesCentavos: removerUm(analise.precos_litro_centavos, Math.round(valor_total / dados.litros)) },
      );
      return { kmL: contexto.kmLDesteAbastecimento, anomalias };
    },
    onSuccess: (r) => {
      apagarRascunho(RASCUNHO);
      setResultado(r);
    },
  });

  function aoLerQr(texto: string) {
    const lida = extrairChave(texto);
    if (!lida) {
      setErroQr('Esse QR não tem a chave de uma nota. Tente de novo, leia de uma foto ou toque em "Sem QR".');
      return;
    }
    setErroQr(null);
    setValue('nfce_chave', lida, { shouldValidate: true });
    setValue('nfce_url', /^https?:\/\//i.test(texto.trim()) ? texto.trim() : null);
  }

  if (resultado) {
    return (
      <div className="flex flex-col gap-4">
        <section role="status" className="flex flex-col gap-1 rounded-2xl border-2 border-sucesso bg-card p-5 shadow-xs">
          <p className="text-2xl font-bold text-sucesso">✓ Abastecimento salvo</p>
          {resultado.kmL !== null ? (
            <p className="text-lg">
              Consumo desde o último tanque cheio: <span className="font-semibold tabular-nums">{kmL.format(resultado.kmL)} km/L</span>
            </p>
          ) : (
            <p className="text-muted-foreground">O consumo aparece quando houver dois abastecimentos de tanque cheio.</p>
          )}
        </section>
        {resultado.anomalias.length > 0 && (
          <section className="flex flex-col gap-2">
            <p className="font-semibold">Confira, por favor:</p>
            <ListaAnomalias anomalias={resultado.anomalias} />
            <p className="text-sm text-muted-foreground">Se algum dado estiver errado, avise o escritório.</p>
          </section>
        )}
        <Button
          size="xl"
          onClick={() => {
            router.replace('/m');
            router.refresh();
          }}
        >
          Voltar ao início
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((d) => salvar.mutate(d))} noValidate className="flex flex-col gap-6">
      {recuperado && (
        <p className="rounded-xl border border-alerta/50 bg-alerta/10 p-3 text-sm font-medium">
          Continuando o abastecimento que não foi enviado.
        </p>
      )}

      {/* 1. Cupom */}
      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <QrCode className="size-5 text-primary" aria-hidden /> 1. QR do cupom
        </h2>
        {valores.nfce_chave && chave ? (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 font-semibold text-sucesso">
              <Check className="size-5" aria-hidden /> Nota lida
            </p>
            <p className="text-muted-foreground">
              {posto ? posto.nome : `Posto CNPJ ${formatarCnpj(chave.cnpjEmitente)}`} · nota nº {chave.numero}
            </p>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                setValue('nfce_chave', null);
                setValue('nfce_url', null);
              }}
            >
              <ScanLine aria-hidden /> Ler outro QR
            </Button>
          </div>
        ) : semQr ? (
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground">Sem QR. O escritório confere pela foto.</p>
            <Button type="button" variant="outline" size="lg" onClick={() => setSemQr(false)}>
              <ScanLine aria-hidden /> Ler o QR agora
            </Button>
          </div>
        ) : (
          <>
            <LeitorQr onLeitura={({ texto }) => aoLerQr(texto)} />
            {erroQr && (
              <p role="alert" className="font-medium text-destructive">
                {erroQr}
              </p>
            )}
            <Button type="button" variant="ghost" size="lg" onClick={() => setSemQr(true)} className="text-muted-foreground">
              Sem QR / cupom apagado
            </Button>
          </>
        )}
      </section>

      {/* 2. Foto */}
      <section className="flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-xs">
        <h2 className="text-lg font-semibold">2. Foto do cupom</h2>
        <FotoComprovante
          funcionarioId={funcionarioId}
          caminho={valores.foto_path || null}
          onChange={(c) => setValue('foto_path', c ?? '', { shouldValidate: Boolean(c) })}
          rotulo=""
        />
        {errors.foto_path && <p className="font-medium text-destructive">{errors.foto_path.message}</p>}
        <div className="mt-2 border-t pt-3">
          <FotoComprovante
            funcionarioId={funcionarioId}
            caminho={valores.foto_painel_path || null}
            onChange={(c) => setValue('foto_painel_path', c)}
            rotulo="Foto do painel mostrando o km (opcional)"
          />
        </div>
      </section>

      {/* 3. Dados */}
      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs">
        <h2 className="text-lg font-semibold">3. Dados do abastecimento</h2>

        {viagem && caminhao ? (
          <p className="text-muted-foreground">
            Caminhão <span className="font-mono font-semibold text-foreground">{formatarPlaca(caminhao.placa)}</span> (viagem em
            andamento)
          </p>
        ) : (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-medium">Caminhão</legend>
            {caminhoes.map((c) => (
              <label
                key={c.id}
                className={cn(
                  'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3',
                  valores.caminhao_id === c.id && 'border-primary ring-2 ring-primary',
                )}
              >
                <input type="radio" value={c.id} {...register('caminhao_id')} className="sr-only" />
                <span className="font-mono text-lg font-bold">{formatarPlaca(c.placa)}</span>
                {c.apelido && <span className="text-muted-foreground">{c.apelido}</span>}
              </label>
            ))}
            {errors.caminhao_id && <p className="font-medium text-destructive">{errors.caminhao_id.message}</p>}
          </fieldset>
        )}

        <Campo
          id="km"
          rotulo="Km do painel"
          erro={errors.km?.message}
          ajuda={caminhao ? `Último registrado: ${numero.format(caminhao.km_atual)}` : undefined}
        >
          <Input {...register('km')} {...ariaCampo('km', errors.km?.message, caminhao ? 'ajuda' : undefined)} inputMode="numeric" autoComplete="off" className="h-14 text-2xl tabular-nums" />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo id="litros" rotulo="Litros" erro={errors.litros?.message}>
            <Input {...register('litros')} {...ariaCampo('litros', errors.litros?.message)} inputMode="decimal" autoComplete="off" className="h-14 text-2xl tabular-nums" />
          </Campo>
          <Campo id="valor_total" rotulo="Valor total (R$)" erro={errors.valor_total?.message}>
            <Input
              {...register('valor_total')}
              {...ariaCampo('valor_total', errors.valor_total?.message)}
              inputMode="decimal"
              autoComplete="off"
              className="h-14 text-2xl tabular-nums"
            />
          </Campo>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-medium">Encheu o tanque?</legend>
          <div className="grid grid-cols-2 gap-3">
            {[
              [true, 'Sim, cheio'],
              [false, 'Não, parcial'],
            ].map(([valor, rotulo]) => (
              <button
                key={String(valor)}
                type="button"
                aria-pressed={valores.tanque_cheio === valor}
                onClick={() => setValue('tanque_cheio', valor as boolean)}
                className={cn(
                  'h-14 rounded-xl border text-lg font-semibold',
                  valores.tanque_cheio === valor ? 'border-primary bg-primary text-primary-foreground' : 'bg-card',
                )}
              >
                {rotulo as string}
              </button>
            ))}
          </div>
        </fieldset>

      </section>

      {salvar.isError && (
        <div role="alert" className="flex flex-col gap-1 rounded-xl border border-destructive/50 bg-destructive/10 p-4">
          <p className="font-semibold text-destructive">Não enviado.</p>
          <p>{traduzir(salvar.error)}</p>
          <p className="text-sm text-muted-foreground">Os dados continuam guardados neste celular. Toque em Salvar de novo.</p>
        </div>
      )}

      <Button type="submit" size="xl" disabled={salvar.isPending} className="w-full">
        {salvar.isPending ? 'Salvando…' : salvar.isError ? 'Tentar de novo' : 'Salvar abastecimento'}
      </Button>
    </form>
  );
}

/** Remove uma ocorrência do valor (o preço do próprio abastecimento já veio na lista do banco). */
function removerUm(lista: readonly number[], valor: number): number[] {
  const i = lista.indexOf(valor);
  return i === -1 ? [...lista] : [...lista.slice(0, i), ...lista.slice(i + 1)];
}

function lerRascunhoSemErro() {
  return typeof window === 'undefined' ? null : lerRascunho(RASCUNHO);
}
