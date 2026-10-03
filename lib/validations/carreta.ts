import { z } from 'zod';
import {
  conferirSuspensos,
  eixosSuspensos,
  inteiroOpcional,
  placaObrigatoria,
  textoOpcional,
} from './comum';

// Carreta (pedido de 2026-10-03): placa própria, puxada por cavalos diferentes.

export const carretaSchema = z
  .object({
    placa: placaObrigatoria,
    apelido: textoOpcional,
    /** Texto livre: a variação é grande (carreta, vanderléia, bitrem, rodotrem...). */
    composicao: textoOpcional,
    carroceria: textoOpcional,
    eixos: inteiroOpcional(1, 9, 'Eixos: de 1 a 9.'),
    eixos_suspensos: eixosSuspensos,
    observacoes: textoOpcional,
  })
  .superRefine(conferirSuspensos);

export type CarretaForm = z.input<typeof carretaSchema>;
export type CarretaDados = z.output<typeof carretaSchema>;
