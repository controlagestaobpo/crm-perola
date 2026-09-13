export type StatusNegocio = "novo" | "em_andamento" | "ganho" | "perdido";

export interface Cliente {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  empresa: string | null;
  criado_em: string;
}

export interface Negocio {
  id: string;
  titulo: string;
  cliente_id: string | null;
  valor: number;
  status: StatusNegocio;
  criado_em: string;
}

export interface Database {
  public: {
    Tables: {
      clientes: {
        Row: Cliente;
        Insert: Partial<Cliente>;
        Update: Partial<Cliente>;
      };
      negocios: {
        Row: Negocio;
        Insert: Partial<Negocio>;
        Update: Partial<Negocio>;
      };
    };
  };
}
