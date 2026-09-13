export type Papel = "master" | "vendedor";

export type Estagio = "prospectar" | "contatado" | "negociacao" | "vendido" | "recusado";

export type ResultadoAtendimento =
  | "compra"
  | "negociacao"
  | "interessado"
  | "sem_interesse"
  | "nao_atendeu"
  | "indisponivel";

export interface Organizacao {
  id: string;
  nome: string;
  criado_em: string;
}

export interface Perfil {
  id: string;
  organizacao_id: string;
  nome: string;
  email: string;
  papel: Papel;
  criado_em: string;
}

export interface Convite {
  id: string;
  organizacao_id: string;
  email: string;
  nome: string;
  papel: Papel;
  criado_por: string | null;
  usado: boolean;
  criado_em: string;
}

export interface Produto {
  id: string;
  organizacao_id: string;
  categoria: string;
  nome: string;
  ativo: boolean;
  criado_em: string;
}

export interface Cliente {
  id: string;
  organizacao_id: string;
  nome: string;
  telefone: string | null;
  cidade: string | null;
  proximo_contato: string | null;
  estagio: Estagio;
  criado_em: string;
}

export interface Atendimento {
  id: string;
  organizacao_id: string;
  vendedor_id: string;
  cliente_id: string;
  data: string;
  resultado: ResultadoAtendimento;
  motivo: string | null;
  valor: number | null;
  valor_negociacao: number | null;
  produtos_oferecidos: string[];
  produtos_vendidos: string[];
  proximo_contato: string | null;
  observacoes: string | null;
  criado_em: string;
}

export interface Meta {
  id: string;
  organizacao_id: string;
  vendedor_id: string;
  ano: number;
  mes: number;
  meta_valor: number;
  meta_prospeccoes: number;
  meta_conversao: number;
  criado_em: string;
}
