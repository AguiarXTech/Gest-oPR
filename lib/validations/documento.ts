import { z } from 'zod';
import { aceitaAnexo, TIPOS_DOCUMENTO, type TipoDocumento } from '@/lib/domain/documentos';
import { dataOpcional, textoOpcional } from './comum';

const tipos = Object.keys(TIPOS_DOCUMENTO) as [TipoDocumento, ...TipoDocumento[]];

export const documentoSchema = z
  .object({
    tipo: z.enum(tipos, 'Escolha o tipo.'),
    entidade: z.enum(['empresa', 'caminhao', 'carreta', 'funcionario']),
    caminhao_id: z.string(),
    carreta_id: z.string(),
    funcionario_id: z.string(),
    numero: textoOpcional,
    emissao: dataOpcional,
    vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe o vencimento.'),
    arquivo_path: z.string().nullable(),
    observacoes: textoOpcional,
  })
  .superRefine((d, ctx) => {
    if (!TIPOS_DOCUMENTO[d.tipo].entidades.includes(d.entidade)) {
      ctx.addIssue({
        code: 'custom',
        path: ['entidade'],
        message: 'Esse documento não é desse tipo de dono.',
      });
    }
    if (d.entidade === 'caminhao' && !d.caminhao_id)
      ctx.addIssue({ code: 'custom', path: ['caminhao_id'], message: 'Escolha o caminhão.' });
    if (d.entidade === 'carreta' && !d.carreta_id)
      ctx.addIssue({ code: 'custom', path: ['carreta_id'], message: 'Escolha a carreta.' });
    if (d.entidade === 'funcionario' && !d.funcionario_id) {
      ctx.addIssue({ code: 'custom', path: ['funcionario_id'], message: 'Escolha o funcionário.' });
    }
    if (d.arquivo_path && !aceitaAnexo(d.tipo)) {
      ctx.addIssue({
        code: 'custom',
        path: ['arquivo_path'],
        message: 'Do exame toxicológico guarde só as datas, sem o laudo (LGPD).',
      });
    }
    if (d.emissao && d.emissao > d.vencimento)
      ctx.addIssue({
        code: 'custom',
        path: ['vencimento'],
        message: 'Vencimento antes da emissão.',
      });
  })
  .transform((d) => ({
    ...d,
    // o banco exige só o dono certo preenchido (constraint entidade_consistente)
    caminhao_id: d.entidade === 'caminhao' ? d.caminhao_id : null,
    carreta_id: d.entidade === 'carreta' ? d.carreta_id : null,
    funcionario_id: d.entidade === 'funcionario' ? d.funcionario_id : null,
    arquivo_path: aceitaAnexo(d.tipo) ? d.arquivo_path : null,
  }));

export type DocumentoForm = z.input<typeof documentoSchema>;
export type DocumentoDados = z.output<typeof documentoSchema>;
