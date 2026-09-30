import type { SupabaseClient } from "@supabase/supabase-js";
import { diasEntreHojeE } from "@/lib/metrics";

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
    .select("id, cliente_id, data, proximo_contato, resultado, observacoes, criado_em, clientes(nome, telefone, cidade), perfis(nome)")
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false });

  const linhas = (data ?? []) as unknown as {
    id: string;
    cliente_id: string;
    proximo_contato: string | null;
    resultado: string;
    observacoes: string | null;
    clientes: { nome: string; telefone: string | null; cidade: string | null } | null;
    perfis: { nome: string } | null;
  }[];

  // Quem manda na agenda é o atendimento MAIS RECENTE de cada cliente. Se ele
  // não marcou próximo contato (ex.: o orçamento virou compra), o cliente sai
  // da agenda, mesmo que um atendimento anterior tivesse uma data marcada.
  // Exceção: "Não atendeu" sem data nova não resolve nada, então o retorno
  // que já estava marcado continua valendo.
  const maisRecentePorCliente = new Map<string, ItemAgenda>();
  const clientesResolvidos = new Set<string>();

  for (const linha of linhas) {
    if (clientesResolvidos.has(linha.cliente_id)) continue;
    if (!linha.proximo_contato) {
      if (linha.resultado !== "nao_atendeu") clientesResolvidos.add(linha.cliente_id);
      continue;
    }
    clientesResolvidos.add(linha.cliente_id);
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
  const diffDias = diasEntreHojeE(dataISO);

  if (diffDias < 0) return { texto: `Atrasado (${Math.abs(diffDias)}d)`, cor: "text-perola-erro bg-perola-erro-bg" };
  if (diffDias === 0) return { texto: "Hoje", cor: "text-perola-alerta bg-[#FBF1E4]" };
  if (diffDias === 1) return { texto: "Amanhã", cor: "text-perola-tag-pos-texto bg-perola-tag-pos-bg" };
  return { texto: `Em ${diffDias} dias`, cor: "text-perola-texto-2 bg-perola-tag" };
}
