'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { FileUp, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BUCKET_COMPROVANTES } from '@/lib/domain/comprovante';
import { aceitaAnexo, TIPOS_DOCUMENTO } from '@/lib/domain/documentos';
import { hojeIso } from '@/lib/formatar';
import { comprimir } from '@/lib/imagem';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import { gerarUuid } from '@/lib/uuid';
import { documentoSchema, type DocumentoDados, type DocumentoForm } from '@/lib/validations/documento';
import { ariaCampo, Campo } from './Campo';

type Props = {
  caminhoes: { id: string; placa: string }[];
  funcionarios: { id: string; nome: string }[];
  /** Renovação: começa com o mesmo tipo e dono do documento anterior. */
  inicial?: Partial<Pick<DocumentoForm, 'tipo' | 'entidade' | 'caminhao_id' | 'funcionario_id'>>;
  aoSalvar?: () => void;
};

const NOMES_ENTIDADE = { empresa: 'Empresa', caminhao: 'Caminhão', funcionario: 'Funcionário' } as const;
const LIMITE_PDF = 2 * 1024 * 1024; // limite do bucket

const classeSelect = 'h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base';

export function FormDocumento({ caminhoes, funcionarios, inicial, aoSalvar }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [enviando, setEnviando] = useState(false);
  const [erroAnexo, setErroAnexo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<DocumentoForm, unknown, DocumentoDados>({
    resolver: zodResolver(documentoSchema),
    defaultValues: {
      tipo: 'crlv',
      entidade: 'caminhao',
      caminhao_id: '',
      funcionario_id: '',
      numero: '',
      emissao: '',
      vencimento: '',
      arquivo_path: null,
      observacoes: '',
      ...inicial,
    },
  });
  const [tipo, entidade, arquivo] = useWatch({ control, name: ['tipo', 'entidade', 'arquivo_path'] });
  const entidadesPossiveis = TIPOS_DOCUMENTO[tipo].entidades;

  async function anexar(f: File | undefined) {
    if (!f) return;
    setErroAnexo(null);
    const pdf = f.type === 'application/pdf';
    if (pdf && f.size > LIMITE_PDF) {
      setErroAnexo('PDF maior que 2 MB. Tire uma foto do documento.');
      return;
    }
    setEnviando(true);
    try {
      const corpo = pdf ? f : await comprimir(f);
      const caminho = `documentos/${hojeIso().slice(0, 4)}/${gerarUuid()}.${pdf ? 'pdf' : 'jpg'}`;
      const { error } = await supabase.storage
        .from(BUCKET_COMPROVANTES)
        .upload(caminho, corpo, { contentType: pdf ? 'application/pdf' : 'image/jpeg' });
      if (error) throw error;
      setValue('arquivo_path', caminho);
    } catch {
      setErroAnexo('Não foi possível enviar o anexo. Verifique a internet.');
    } finally {
      setEnviando(false);
    }
  }

  const salvar = useMutation({
    mutationFn: async (dados: DocumentoDados) => {
      const { error } = await supabase.from('documentos').insert(dados);
      if (error) throw error;
    },
    onSuccess: () => {
      reset();
      router.refresh();
      aoSalvar?.();
    },
  });

  const e = (c: keyof DocumentoForm) => errors[c]?.message;

  return (
    <form onSubmit={handleSubmit((d) => salvar.mutate(d))} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="tipo" rotulo="Documento *" erro={e('tipo')}>
          <select
            {...register('tipo', {
              onChange: (ev) => {
                const novos = TIPOS_DOCUMENTO[ev.target.value as keyof typeof TIPOS_DOCUMENTO].entidades;
                if (!novos.includes(entidade)) setValue('entidade', novos[0]);
              },
            })}
            {...ariaCampo('tipo', e('tipo'))}
            className={classeSelect}
          >
            {Object.entries(TIPOS_DOCUMENTO).map(([v, { rotulo }]) => (
              <option key={v} value={v}>
                {rotulo}
              </option>
            ))}
          </select>
        </Campo>

        {entidadesPossiveis.length > 1 && (
          <Campo id="entidade" rotulo="De quem é" erro={e('entidade')}>
            <select {...register('entidade')} {...ariaCampo('entidade', e('entidade'))} className={classeSelect}>
              {entidadesPossiveis.map((en) => (
                <option key={en} value={en}>
                  {NOMES_ENTIDADE[en]}
                </option>
              ))}
            </select>
          </Campo>
        )}
        {entidade === 'caminhao' && (
          <Campo id="caminhao_id" rotulo="Caminhão *" erro={e('caminhao_id')}>
            <select {...register('caminhao_id')} {...ariaCampo('caminhao_id', e('caminhao_id'))} className={classeSelect}>
              <option value="">Escolha…</option>
              {caminhoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.placa}
                </option>
              ))}
            </select>
          </Campo>
        )}
        {entidade === 'funcionario' && (
          <Campo id="funcionario_id" rotulo="Funcionário *" erro={e('funcionario_id')}>
            <select {...register('funcionario_id')} {...ariaCampo('funcionario_id', e('funcionario_id'))} className={classeSelect}>
              <option value="">Escolha…</option>
              {funcionarios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </Campo>
        )}

        <Campo id="vencimento" rotulo="Vencimento *" erro={e('vencimento')}>
          <Input {...register('vencimento')} {...ariaCampo('vencimento', e('vencimento'))} type="date" />
        </Campo>
        <Campo id="emissao" rotulo={tipo === 'toxicologico' ? 'Data do exame' : 'Emissão'} erro={e('emissao')}>
          <Input {...register('emissao')} {...ariaCampo('emissao', e('emissao'))} type="date" />
        </Campo>
        <Campo id="numero" rotulo="Número" erro={e('numero')}>
          <Input {...register('numero')} {...ariaCampo('numero', e('numero'))} />
        </Campo>
        <Campo id="observacoes_doc" rotulo="Observação">
          <Input {...register('observacoes')} id="observacoes_doc" />
        </Campo>
      </div>

      {aceitaAnexo(tipo) ? (
        <div className="flex flex-col gap-1.5">
          <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-card font-medium hover:bg-muted sm:self-start sm:px-5">
            {enviando ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <FileUp className="size-5" aria-hidden />}
            {arquivo ? 'Trocar anexo' : 'Anexar foto ou PDF (opcional)'}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={(ev) => {
                void anexar(ev.target.files?.[0]);
                ev.target.value = '';
              }}
            />
          </label>
          {arquivo && <p className="font-medium text-sucesso">✓ Anexo enviado</p>}
          {erroAnexo && <p className="font-medium text-destructive">{erroAnexo}</p>}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Exame toxicológico: guarde só as datas. O resultado e o laudo não ficam no app (LGPD).</p>
      )}

      {salvar.isError && (
        <p role="alert" className="font-medium text-destructive">
          {traduzirErroBanco(salvar.error)}
        </p>
      )}
      <Button type="submit" size="lg" disabled={salvar.isPending || enviando} className="sm:self-end">
        {salvar.isPending ? 'Salvando…' : 'Salvar documento'}
      </Button>
    </form>
  );
}
