import type { SupabaseClient } from "@supabase/supabase-js";
import { diasEntreHojeE } from "@/lib/metrics";
import type { Cliente } from "@/types/database";

export interface ClienteComHistorico extends Cliente {
  ultimaCompra: string | null;
  totalCompras: number;
  valorTotal: number;
  diasSemComprar: number | null;
}

export async function getClientesComHistorico(
  supabase: SupabaseClient
): Promise<ClienteComHistorico[]> {
  const [{ data: clientes }, { data: compras }] = await Promise.all([
    supabase.from("clientes").select("*").order("nome"),
    supabase
      .from("atendimentos")
      .select("cliente_id, data, valor")
      .eq("resultado", "compra")
      .order("data", { ascending: false }),
  ]);

  const listaClientes = (clientes ?? []) as Cliente[];
  const listaCompras = (compras ?? []) as { cliente_id: string; data: string; valor: number | null }[];

  return listaClientes.map((cliente) => {
    const comprasCliente = listaCompras.filter((c) => c.cliente_id === cliente.id);
    const ultimaCompra = comprasCliente[0]?.data ?? null;
    const valorTotal = comprasCliente.reduce((soma, c) => soma + Number(c.valor ?? 0), 0);
    const diasSemComprar = ultimaCompra ? -diasEntreHojeE(ultimaCompra) : null;

    return {
      ...cliente,
      ultimaCompra,
      totalCompras: comprasCliente.length,
      valorTotal,
      diasSemComprar,
    };
  });
}
