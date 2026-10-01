export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      abastecimentos: {
        Row: {
          acerto_id: string | null
          caminhao_id: string
          comentario_gestor: string | null
          conferido: boolean
          conferido_por: string | null
          created_at: string
          data_hora: string
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento_abastecimento"]
          fornecedor_id: string | null
          foto_path: string | null
          id: string
          km: number
          litros: number
          motorista_id: string
          nfce_chave: string | null
          nfce_url: string | null
          posto_nome: string | null
          tanque_cheio: boolean
          updated_at: string
          valor_total_centavos: number
          viagem_id: string | null
        }
        Insert: {
          acerto_id?: string | null
          caminhao_id: string
          comentario_gestor?: string | null
          conferido?: boolean
          conferido_por?: string | null
          created_at?: string
          data_hora?: string
          forma_pagamento?: Database["public"]["Enums"]["forma_pagamento_abastecimento"]
          fornecedor_id?: string | null
          foto_path?: string | null
          id?: string
          km: number
          litros: number
          motorista_id: string
          nfce_chave?: string | null
          nfce_url?: string | null
          posto_nome?: string | null
          tanque_cheio?: boolean
          updated_at?: string
          valor_total_centavos: number
          viagem_id?: string | null
        }
        Update: {
          acerto_id?: string | null
          caminhao_id?: string
          comentario_gestor?: string | null
          conferido?: boolean
          conferido_por?: string | null
          created_at?: string
          data_hora?: string
          forma_pagamento?: Database["public"]["Enums"]["forma_pagamento_abastecimento"]
          fornecedor_id?: string | null
          foto_path?: string | null
          id?: string
          km?: number
          litros?: number
          motorista_id?: string
          nfce_chave?: string | null
          nfce_url?: string | null
          posto_nome?: string | null
          tanque_cheio?: boolean
          updated_at?: string
          valor_total_centavos?: number
          viagem_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abastecimentos_acerto_id_fkey"
            columns: ["acerto_id"]
            isOneToOne: false
            referencedRelation: "acertos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastecimentos_caminhao_id_fkey"
            columns: ["caminhao_id"]
            isOneToOne: false
            referencedRelation: "caminhoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastecimentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastecimentos_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastecimentos_viagem_id_fkey"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "viagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastecimentos_viagem_id_fkey"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "vw_viagens_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      acertos: {
        Row: {
          created_at: string
          fechado_em: string | null
          fechado_por: string | null
          forma_pagamento: string | null
          id: string
          motorista_id: string
          observacoes: string | null
          pago_em: string | null
          periodo_fim: string
          periodo_inicio: string
          regra_snapshot: Json | null
          saldo_centavos: number
          status: Database["public"]["Enums"]["status_acerto"]
          total_adiantamentos_centavos: number
          total_comissao_centavos: number
          total_frete_centavos: number
          total_reembolsos_centavos: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          fechado_em?: string | null
          fechado_por?: string | null
          forma_pagamento?: string | null
          id?: string
          motorista_id: string
          observacoes?: string | null
          pago_em?: string | null
          periodo_fim: string
          periodo_inicio: string
          regra_snapshot?: Json | null
          saldo_centavos?: number
          status?: Database["public"]["Enums"]["status_acerto"]
          total_adiantamentos_centavos?: number
          total_comissao_centavos?: number
          total_frete_centavos?: number
          total_reembolsos_centavos?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          fechado_em?: string | null
          fechado_por?: string | null
          forma_pagamento?: string | null
          id?: string
          motorista_id?: string
          observacoes?: string | null
          pago_em?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          regra_snapshot?: Json | null
          saldo_centavos?: number
          status?: Database["public"]["Enums"]["status_acerto"]
          total_adiantamentos_centavos?: number
          total_comissao_centavos?: number
          total_frete_centavos?: number
          total_reembolsos_centavos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acertos_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      adiantamentos: {
        Row: {
          acerto_id: string | null
          created_at: string
          data: string
          forma: string | null
          id: string
          motorista_id: string
          observacao: string | null
          updated_at: string
          valor_centavos: number
          viagem_id: string | null
        }
        Insert: {
          acerto_id?: string | null
          created_at?: string
          data?: string
          forma?: string | null
          id?: string
          motorista_id: string
          observacao?: string | null
          updated_at?: string
          valor_centavos: number
          viagem_id?: string | null
        }
        Update: {
          acerto_id?: string | null
          created_at?: string
          data?: string
          forma?: string | null
          id?: string
          motorista_id?: string
          observacao?: string | null
          updated_at?: string
          valor_centavos?: number
          viagem_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adiantamentos_acerto_id_fkey"
            columns: ["acerto_id"]
            isOneToOne: false
            referencedRelation: "acertos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamentos_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamentos_viagem_id_fkey"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "viagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamentos_viagem_id_fkey"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "vw_viagens_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          acao: string
          antes: Json | null
          criado_em: string
          depois: Json | null
          id: number
          registro_id: string | null
          tabela: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          antes?: Json | null
          criado_em?: string
          depois?: Json | null
          id?: never
          registro_id?: string | null
          tabela: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          antes?: Json | null
          criado_em?: string
          depois?: Json | null
          id?: never
          registro_id?: string | null
          tabela?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      caminhoes: {
        Row: {
          ano: number | null
          apelido: string | null
          ativo: boolean
          capacidade_tanque_l: number | null
          configuracao_eixos: string | null
          created_at: string
          eixos: number | null
          id: string
          km_atual: number
          marca: string | null
          modelo: string | null
          observacoes: string | null
          placa: string
          updated_at: string
        }
        Insert: {
          ano?: number | null
          apelido?: string | null
          ativo?: boolean
          capacidade_tanque_l?: number | null
          configuracao_eixos?: string | null
          created_at?: string
          eixos?: number | null
          id?: string
          km_atual?: number
          marca?: string | null
          modelo?: string | null
          observacoes?: string | null
          placa: string
          updated_at?: string
        }
        Update: {
          ano?: number | null
          apelido?: string | null
          ativo?: boolean
          capacidade_tanque_l?: number | null
          configuracao_eixos?: string | null
          created_at?: string
          eixos?: number | null
          id?: string
          km_atual?: number
          marca?: string | null
          modelo?: string | null
          observacoes?: string | null
          placa?: string
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          ativo: boolean
          cnpj: string | null
          contato: string | null
          created_at: string
          id: string
          prazo_pagamento_dias: number | null
          razao_social: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          id?: string
          prazo_pagamento_dias?: number | null
          razao_social: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          id?: string
          prazo_pagamento_dias?: number | null
          razao_social?: string
          updated_at?: string
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          chave: string
          descricao: string | null
          updated_at: string
          valor: Json
        }
        Insert: {
          chave: string
          descricao?: string | null
          updated_at?: string
          valor: Json
        }
        Update: {
          chave?: string
          descricao?: string | null
          updated_at?: string
          valor?: Json
        }
        Relationships: []
      }
      despesas_viagem: {
        Row: {
          acerto_id: string | null
          caminhao_id: string | null
          comentario_gestor: string | null
          conferido: boolean
          conferido_por: string | null
          created_at: string
          data: string
          descricao: string | null
          foto_path: string | null
          id: string
          motorista_id: string
          reembolsavel: boolean
          tipo: Database["public"]["Enums"]["tipo_despesa"]
          updated_at: string
          valor_centavos: number
          viagem_id: string | null
        }
        Insert: {
          acerto_id?: string | null
          caminhao_id?: string | null
          comentario_gestor?: string | null
          conferido?: boolean
          conferido_por?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          foto_path?: string | null
          id?: string
          motorista_id: string
          reembolsavel?: boolean
          tipo: Database["public"]["Enums"]["tipo_despesa"]
          updated_at?: string
          valor_centavos: number
          viagem_id?: string | null
        }
        Update: {
          acerto_id?: string | null
          caminhao_id?: string | null
          comentario_gestor?: string | null
          conferido?: boolean
          conferido_por?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          foto_path?: string | null
          id?: string
          motorista_id?: string
          reembolsavel?: boolean
          tipo?: Database["public"]["Enums"]["tipo_despesa"]
          updated_at?: string
          valor_centavos?: number
          viagem_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "despesas_viagem_acerto_id_fkey"
            columns: ["acerto_id"]
            isOneToOne: false
            referencedRelation: "acertos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_viagem_caminhao_id_fkey"
            columns: ["caminhao_id"]
            isOneToOne: false
            referencedRelation: "caminhoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_viagem_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_viagem_viagem_id_fkey"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "viagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_viagem_viagem_id_fkey"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "vw_viagens_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          arquivo_path: string | null
          caminhao_id: string | null
          created_at: string
          emissao: string | null
          entidade: Database["public"]["Enums"]["entidade_documento"]
          funcionario_id: string | null
          id: string
          numero: string | null
          observacoes: string | null
          tipo: Database["public"]["Enums"]["tipo_documento"]
          updated_at: string
          vencimento: string
        }
        Insert: {
          arquivo_path?: string | null
          caminhao_id?: string | null
          created_at?: string
          emissao?: string | null
          entidade: Database["public"]["Enums"]["entidade_documento"]
          funcionario_id?: string | null
          id?: string
          numero?: string | null
          observacoes?: string | null
          tipo: Database["public"]["Enums"]["tipo_documento"]
          updated_at?: string
          vencimento: string
        }
        Update: {
          arquivo_path?: string | null
          caminhao_id?: string | null
          created_at?: string
          emissao?: string | null
          entidade?: Database["public"]["Enums"]["entidade_documento"]
          funcionario_id?: string | null
          id?: string
          numero?: string | null
          observacoes?: string | null
          tipo?: Database["public"]["Enums"]["tipo_documento"]
          updated_at?: string
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_caminhao_id_fkey"
            columns: ["caminhao_id"]
            isOneToOne: false
            referencedRelation: "caminhoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean
          cidade: string | null
          cnpj: string | null
          created_at: string
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["tipo_fornecedor"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          nome: string
          tipo?: Database["public"]["Enums"]["tipo_fornecedor"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["tipo_fornecedor"]
          updated_at?: string
        }
        Relationships: []
      }
      fretes: {
        Row: {
          cliente_id: string | null
          created_at: string
          cte_chave: string | null
          id: string
          mdfe_chave: string | null
          observacoes: string | null
          peso_kg: number | null
          sentido: Database["public"]["Enums"]["sentido_frete"]
          updated_at: string
          valor_frete_centavos: number
          viagem_id: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          cte_chave?: string | null
          id?: string
          mdfe_chave?: string | null
          observacoes?: string | null
          peso_kg?: number | null
          sentido: Database["public"]["Enums"]["sentido_frete"]
          updated_at?: string
          valor_frete_centavos: number
          viagem_id: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          cte_chave?: string | null
          id?: string
          mdfe_chave?: string | null
          observacoes?: string | null
          peso_kg?: number | null
          sentido?: Database["public"]["Enums"]["sentido_frete"]
          updated_at?: string
          valor_frete_centavos?: number
          viagem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fretes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fretes_viagem_id_fkey"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "viagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fretes_viagem_id_fkey"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "vw_viagens_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          ativo: boolean
          cargo: string
          cnh_categoria: string | null
          cnh_numero: string | null
          cpf: string
          created_at: string
          data_admissao: string | null
          data_demissao: string | null
          id: string
          nome: string
          observacoes: string | null
          pix_chave: string | null
          salario_base_centavos: number | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string
          cnh_categoria?: string | null
          cnh_numero?: string | null
          cpf: string
          created_at?: string
          data_admissao?: string | null
          data_demissao?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          pix_chave?: string | null
          salario_base_centavos?: number | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cargo?: string
          cnh_categoria?: string | null
          cnh_numero?: string | null
          cpf?: string
          created_at?: string
          data_admissao?: string | null
          data_demissao?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          pix_chave?: string | null
          salario_base_centavos?: number | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          funcionario_id: string | null
          id: string
          nome: string
          papel: Database["public"]["Enums"]["papel_usuario"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          funcionario_id?: string | null
          id: string
          nome: string
          papel: Database["public"]["Enums"]["papel_usuario"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          funcionario_id?: string | null
          id?: string
          nome?: string
          papel?: Database["public"]["Enums"]["papel_usuario"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: true
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_comissao: {
        Row: {
          apenas_com_frete: boolean
          created_at: string
          deduz_combustivel: boolean
          deduz_pedagio: boolean
          funcionario_id: string
          id: string
          observacoes: string | null
          percentual: number | null
          tipo: Database["public"]["Enums"]["tipo_comissao"]
          updated_at: string
          valor_centavos: number | null
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          apenas_com_frete?: boolean
          created_at?: string
          deduz_combustivel?: boolean
          deduz_pedagio?: boolean
          funcionario_id: string
          id?: string
          observacoes?: string | null
          percentual?: number | null
          tipo: Database["public"]["Enums"]["tipo_comissao"]
          updated_at?: string
          valor_centavos?: number | null
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          apenas_com_frete?: boolean
          created_at?: string
          deduz_combustivel?: boolean
          deduz_pedagio?: boolean
          funcionario_id?: string
          id?: string
          observacoes?: string | null
          percentual?: number | null
          tipo?: Database["public"]["Enums"]["tipo_comissao"]
          updated_at?: string
          valor_centavos?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "regras_comissao_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      viagens: {
        Row: {
          acerto_id: string | null
          caminhao_id: string
          created_at: string
          data_chegada: string | null
          data_saida: string
          destino: string
          id: string
          km_chegada: number | null
          km_saida: number
          motorista_id: string
          observacoes: string | null
          origem: string
          status: Database["public"]["Enums"]["status_viagem"]
          updated_at: string
        }
        Insert: {
          acerto_id?: string | null
          caminhao_id: string
          created_at?: string
          data_chegada?: string | null
          data_saida?: string
          destino: string
          id?: string
          km_chegada?: number | null
          km_saida: number
          motorista_id: string
          observacoes?: string | null
          origem: string
          status?: Database["public"]["Enums"]["status_viagem"]
          updated_at?: string
        }
        Update: {
          acerto_id?: string | null
          caminhao_id?: string
          created_at?: string
          data_chegada?: string | null
          data_saida?: string
          destino?: string
          id?: string
          km_chegada?: number | null
          km_saida?: number
          motorista_id?: string
          observacoes?: string | null
          origem?: string
          status?: Database["public"]["Enums"]["status_viagem"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viagens_acerto_id_fkey"
            columns: ["acerto_id"]
            isOneToOne: false
            referencedRelation: "acertos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagens_caminhao_id_fkey"
            columns: ["caminhao_id"]
            isOneToOne: false
            referencedRelation: "caminhoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagens_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_documentos_status: {
        Row: {
          arquivo_path: string | null
          caminhao_id: string | null
          created_at: string | null
          dias_para_vencer: number | null
          emissao: string | null
          entidade: Database["public"]["Enums"]["entidade_documento"] | null
          funcionario_id: string | null
          id: string | null
          numero: string | null
          observacoes: string | null
          tipo: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at: string | null
          vencimento: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_caminhao_id_fkey"
            columns: ["caminhao_id"]
            isOneToOne: false
            referencedRelation: "caminhoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_viagens_resumo: {
        Row: {
          abastecimentos_vinculados_centavos: number | null
          acerto_id: string | null
          caminhao_id: string | null
          created_at: string | null
          data_chegada: string | null
          data_saida: string | null
          destino: string | null
          frete_total_centavos: number | null
          id: string | null
          km_chegada: number | null
          km_rodado: number | null
          km_saida: number | null
          motorista_id: string | null
          observacoes: string | null
          origem: string | null
          outras_despesas_centavos: number | null
          pedagio_centavos: number | null
          quantidade_fretes: number | null
          status: Database["public"]["Enums"]["status_viagem"] | null
          updated_at: string | null
        }
        Insert: {
          abastecimentos_vinculados_centavos?: never
          acerto_id?: string | null
          caminhao_id?: string | null
          created_at?: string | null
          data_chegada?: string | null
          data_saida?: string | null
          destino?: string | null
          frete_total_centavos?: never
          id?: string | null
          km_chegada?: number | null
          km_rodado?: never
          km_saida?: number | null
          motorista_id?: string | null
          observacoes?: string | null
          origem?: string | null
          outras_despesas_centavos?: never
          pedagio_centavos?: never
          quantidade_fretes?: never
          status?: Database["public"]["Enums"]["status_viagem"] | null
          updated_at?: string | null
        }
        Update: {
          abastecimentos_vinculados_centavos?: never
          acerto_id?: string | null
          caminhao_id?: string | null
          created_at?: string | null
          data_chegada?: string | null
          data_saida?: string | null
          destino?: string | null
          frete_total_centavos?: never
          id?: string | null
          km_chegada?: number | null
          km_rodado?: never
          km_saida?: number | null
          motorista_id?: string | null
          observacoes?: string | null
          origem?: string | null
          outras_despesas_centavos?: never
          pedagio_centavos?: never
          quantidade_fretes?: never
          status?: Database["public"]["Enums"]["status_viagem"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "viagens_acerto_id_fkey"
            columns: ["acerto_id"]
            isOneToOne: false
            referencedRelation: "acertos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagens_caminhao_id_fkey"
            columns: ["caminhao_id"]
            isOneToOne: false
            referencedRelation: "caminhoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagens_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      contexto_privilegiado: { Args: never; Returns: boolean }
      funcionario_atual: { Args: never; Returns: string }
      is_gestor: { Args: never; Returns: boolean }
      papel_atual: {
        Args: never
        Returns: Database["public"]["Enums"]["papel_usuario"]
      }
    }
    Enums: {
      entidade_documento: "empresa" | "caminhao" | "funcionario"
      forma_pagamento_abastecimento: "motorista" | "cartao_empresa" | "faturado"
      papel_usuario: "dono" | "admin" | "motorista"
      sentido_frete: "ida" | "volta"
      status_acerto: "rascunho" | "fechado" | "pago"
      status_viagem: "planejada" | "em_andamento" | "concluida" | "cancelada"
      tipo_comissao:
        | "pct_frete_bruto"
        | "pct_frete_liquido"
        | "valor_por_viagem"
        | "valor_por_km"
      tipo_despesa:
        | "pedagio"
        | "alimentacao"
        | "pernoite"
        | "chapa"
        | "borracharia"
        | "manutencao"
        | "estacionamento"
        | "lavagem"
        | "outros"
      tipo_documento:
        | "crlv"
        | "licenciamento"
        | "ipva"
        | "seguro"
        | "rntrc"
        | "cronotacografo"
        | "certificado_digital"
        | "cnh"
        | "toxicologico"
        | "outro"
      tipo_fornecedor: "posto" | "oficina" | "recapadora" | "loja" | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      entidade_documento: ["empresa", "caminhao", "funcionario"],
      forma_pagamento_abastecimento: [
        "motorista",
        "cartao_empresa",
        "faturado",
      ],
      papel_usuario: ["dono", "admin", "motorista"],
      sentido_frete: ["ida", "volta"],
      status_acerto: ["rascunho", "fechado", "pago"],
      status_viagem: ["planejada", "em_andamento", "concluida", "cancelada"],
      tipo_comissao: [
        "pct_frete_bruto",
        "pct_frete_liquido",
        "valor_por_viagem",
        "valor_por_km",
      ],
      tipo_despesa: [
        "pedagio",
        "alimentacao",
        "pernoite",
        "chapa",
        "borracharia",
        "manutencao",
        "estacionamento",
        "lavagem",
        "outros",
      ],
      tipo_documento: [
        "crlv",
        "licenciamento",
        "ipva",
        "seguro",
        "rntrc",
        "cronotacografo",
        "certificado_digital",
        "cnh",
        "toxicologico",
        "outro",
      ],
      tipo_fornecedor: ["posto", "oficina", "recapadora", "loja", "outro"],
    },
  },
} as const
