import type { SupabaseClient } from "@supabase/supabase-js";

export interface ItemAgenda {
  atendimentoId: string;
  clienteId: string;
  clienteNome: string;
  clienteTelefone: string | null;
  clienteCidade: string | null;
  proximoContato: string;
  ultimoResultado: string;
  observacoes: string | null;
  vendedorNome: string;
}

export async function getAgenda(supabase: SupabaseClient): Promise<ItemAgenda[]> {
  const { data } = await supabase
    .from("atendimentos")
    .select("id, cliente_id, proximo_contato, resultado, observacoes, criado_em, clientes(nome, telefone, cidade), perfis(nome)")
    .not("proximo_contato", "is", null)
    .order("criado_em", { ascending: false });

  const linhas = (data ?? []) as unknown as {
    id: string;
    cliente_id: string;
    proximo_contato: string;
    resultado: string;
    observacoes: string | null;
    clientes: { nome: string; telefone: string | null; cidade: string | null } | null;
    perfis: { nome: string } | null;
  }[];

  const maisRecentePorCliente = new Map<string, ItemAgenda>();

  for (const linha of linhas) {
    if (maisRecentePorCliente.has(linha.cliente_id)) continue;
    maisRecentePorCliente.set(linha.cliente_id, {
      atendimentoId: linha.id,
      clienteId: linha.cliente_id,
      clienteNome: linha.clientes?.nome ?? "—",
      clienteTelefone: linha.clientes?.telefone ?? null,
      clienteCidade: linha.clientes?.cidade ?? null,
      proximoContato: linha.proximo_contato,
      ultimoResultado: linha.resultado,
      observacoes: linha.observacoes,
      vendedorNome: linha.perfis?.nome ?? "—",
    });
  }

  return Array.from(maisRecentePorCliente.values()).sort((a, b) =>
    a.proximoContato.localeCompare(b.proximoContato)
  );
}

export function rotuloData(dataISO: string): { texto: string; cor: string } {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const data = new Date(dataISO + "T00:00:00");
  const diffDias = Math.round((data.getTime() - hoje.getTime()) / 86400000);

  if (diffDias < 0) return { texto: `Atrasado (${Math.abs(diffDias)}d)`, cor: "text-red-600 bg-red-50" };
  if (diffDias === 0) return { texto: "Hoje", cor: "text-amber-700 bg-amber-50" };
  if (diffDias === 1) return { texto: "Amanhã", cor: "text-violet-700 bg-violet-50" };
  return { texto: `Em ${diffDias} dias`, cor: "text-slate-600 bg-slate-100" };
}
