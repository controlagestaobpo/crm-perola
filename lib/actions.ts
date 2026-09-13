"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/auth";
import type { ActionState } from "@/lib/form-state";
import type { Estagio, Papel, ResultadoAtendimento } from "@/types/database";

function ehViolacaoDeDuplicidade(error: { code?: string } | null) {
  return error?.code === "23505";
}

function estagioParaResultado(resultado: ResultadoAtendimento): Estagio {
  switch (resultado) {
    case "compra":
      return "vendido";
    case "negociacao":
      return "negociacao";
    case "interessado":
      return "contatado";
    case "sem_interesse":
      return "recusado";
    default:
      return "contatado";
  }
}

export async function criarCliente(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const perfil = await getPerfilAtual();
  if (!perfil) return { error: "Não autenticado" };

  const supabase = createClient();
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim() || null;
  const cidade = String(formData.get("cidade") ?? "").trim() || null;

  if (!nome) return { error: "Informe o nome do cliente." };

  const { data: existente } = await supabase
    .from("clientes")
    .select("id")
    .ilike("nome", nome)
    .maybeSingle();

  if (existente) return { error: `Já existe um cliente cadastrado como "${nome}".` };

  const { error } = await supabase.from("clientes").insert({
    organizacao_id: perfil.organizacao_id,
    nome,
    telefone,
    cidade,
  });

  if (error) {
    if (ehViolacaoDeDuplicidade(error)) return { error: `Já existe um cliente cadastrado como "${nome}".` };
    return { error: error.message };
  }

  revalidatePath("/clientes");
  revalidatePath("/atendimentos");
  return { success: `Cliente "${nome}" cadastrado com sucesso.` };
}

export async function editarCliente(
  clienteId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const perfil = await getPerfilAtual();
  if (!perfil) return { error: "Não autenticado" };

  const supabase = createClient();
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim() || null;
  const cidade = String(formData.get("cidade") ?? "").trim() || null;

  if (!nome) return { error: "Informe o nome do cliente." };

  const { data: existente } = await supabase
    .from("clientes")
    .select("id")
    .ilike("nome", nome)
    .neq("id", clienteId)
    .maybeSingle();

  if (existente) return { error: `Já existe outro cliente cadastrado como "${nome}".` };

  const { error } = await supabase
    .from("clientes")
    .update({ nome, telefone, cidade })
    .eq("id", clienteId);

  if (error) {
    if (ehViolacaoDeDuplicidade(error)) return { error: `Já existe outro cliente cadastrado como "${nome}".` };
    return { error: error.message };
  }

  revalidatePath("/clientes");
  revalidatePath("/atendimentos");
  return { success: "Cliente atualizado com sucesso." };
}

export async function criarAtendimento(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const perfil = await getPerfilAtual();
  if (!perfil) return { error: "Não autenticado" };

  const supabase = createClient();

  const clienteId = String(formData.get("cliente_id") ?? "");
  const resultado = String(formData.get("resultado") ?? "") as ResultadoAtendimento;
  const vendedorId = perfil.papel === "master"
    ? String(formData.get("vendedor_id") ?? perfil.id)
    : perfil.id;

  if (!clienteId || !resultado) return { error: "Preencha cliente e resultado." };

  const valor = formData.get("valor") ? Number(formData.get("valor")) : null;
  const valorNegociacao = formData.get("valor_negociacao")
    ? Number(formData.get("valor_negociacao"))
    : null;
  const motivo = String(formData.get("motivo") ?? "").trim() || null;
  const proximoContato = String(formData.get("proximo_contato") ?? "").trim() || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;
  const data = String(formData.get("data") ?? "").trim() || new Date().toISOString().slice(0, 10);

  const produtosOferecidos = formData.getAll("produtos_oferecidos").map(String);
  const produtosVendidos = formData.getAll("produtos_vendidos").map(String);

  if (resultado === "compra" && produtosVendidos.length === 0) {
    return { error: "Marque pelo menos um produto vendido antes de salvar." };
  }

  const { error } = await supabase.from("atendimentos").insert({
    organizacao_id: perfil.organizacao_id,
    vendedor_id: vendedorId,
    cliente_id: clienteId,
    data,
    resultado,
    motivo,
    valor,
    valor_negociacao: valorNegociacao,
    produtos_oferecidos: produtosOferecidos,
    produtos_vendidos: produtosVendidos,
    proximo_contato: proximoContato,
    observacoes,
  });

  if (error) return { error: error.message };

  await supabase
    .from("clientes")
    .update({
      estagio: estagioParaResultado(resultado),
      proximo_contato: proximoContato,
    })
    .eq("id", clienteId);

  revalidatePath("/");
  revalidatePath("/atendimentos");
  revalidatePath("/clientes");
  revalidatePath("/insights");
  revalidatePath("/agenda");
  return { success: "Atendimento registrado com sucesso." };
}

export async function editarAtendimento(
  atendimentoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const perfil = await getPerfilAtual();
  if (!perfil) return { error: "Não autenticado" };

  const supabase = createClient();
  const resultado = String(formData.get("resultado") ?? "") as ResultadoAtendimento;
  const clienteId = String(formData.get("cliente_id") ?? "");
  if (!clienteId || !resultado) return { error: "Preencha cliente e resultado." };

  const valor = formData.get("valor") ? Number(formData.get("valor")) : null;
  const valorNegociacao = formData.get("valor_negociacao")
    ? Number(formData.get("valor_negociacao"))
    : null;
  const motivo = String(formData.get("motivo") ?? "").trim() || null;
  const proximoContato = String(formData.get("proximo_contato") ?? "").trim() || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;
  const data = String(formData.get("data") ?? "").trim();
  const produtosOferecidos = formData.getAll("produtos_oferecidos").map(String);
  const produtosVendidos = formData.getAll("produtos_vendidos").map(String);

  if (resultado === "compra" && produtosVendidos.length === 0) {
    return { error: "Marque pelo menos um produto vendido antes de salvar." };
  }

  const { error } = await supabase
    .from("atendimentos")
    .update({
      cliente_id: clienteId,
      data,
      resultado,
      motivo,
      valor,
      valor_negociacao: valorNegociacao,
      produtos_oferecidos: produtosOferecidos,
      produtos_vendidos: produtosVendidos,
      proximo_contato: proximoContato,
      observacoes,
    })
    .eq("id", atendimentoId);

  if (error) return { error: error.message };

  await supabase
    .from("clientes")
    .update({ estagio: estagioParaResultado(resultado), proximo_contato: proximoContato })
    .eq("id", clienteId);

  revalidatePath("/");
  revalidatePath("/atendimentos");
  revalidatePath("/clientes");
  revalidatePath("/insights");
  revalidatePath("/agenda");
  return { success: "Atendimento atualizado com sucesso." };
}

export async function excluirAtendimento(atendimentoId: string) {
  const perfil = await getPerfilAtual();
  if (!perfil) throw new Error("Não autenticado");

  const supabase = createClient();
  const { error } = await supabase.from("atendimentos").delete().eq("id", atendimentoId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/atendimentos");
  revalidatePath("/insights");
  revalidatePath("/agenda");
}

export async function moverClienteKanban(clienteId: string, estagio: Estagio) {
  const perfil = await getPerfilAtual();
  if (!perfil) throw new Error("Não autenticado");

  const supabase = createClient();
  const { error } = await supabase.from("clientes").update({ estagio }).eq("id", clienteId);
  if (error) throw new Error(error.message);

  revalidatePath("/atendimentos");
}

export async function criarConvite(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const perfil = await getPerfilAtual();
  if (!perfil || perfil.papel !== "master") return { error: "Apenas o master pode convidar." };

  const supabase = createClient();
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const papel = String(formData.get("papel") ?? "vendedor") as Papel;

  if (!nome || !email) return { error: "Preencha nome e e-mail." };

  const { error } = await supabase.from("convites").insert({
    organizacao_id: perfil.organizacao_id,
    nome,
    email,
    papel,
    criado_por: perfil.id,
  });

  if (error) {
    if (ehViolacaoDeDuplicidade(error)) return { error: `Já existe um convite para "${email}".` };
    return { error: error.message };
  }

  revalidatePath("/usuarios");
  return { success: `Convite enviado para ${email}.` };
}

export async function removerConvite(conviteId: string) {
  const perfil = await getPerfilAtual();
  if (!perfil || perfil.papel !== "master") throw new Error("Apenas o master pode remover convites");

  const supabase = createClient();
  const { error } = await supabase.from("convites").delete().eq("id", conviteId);
  if (error) throw new Error(error.message);

  revalidatePath("/usuarios");
}

export async function salvarMeta(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const perfil = await getPerfilAtual();
  if (!perfil || perfil.papel !== "master") return { error: "Apenas o master define metas." };

  const supabase = createClient();
  const vendedorId = String(formData.get("vendedor_id") ?? "");
  const ano = Number(formData.get("ano"));
  const mes = Number(formData.get("mes"));
  const metaValor = Number(formData.get("meta_valor") ?? 0);
  const metaProspeccoes = Number(formData.get("meta_prospeccoes") ?? 0);
  const metaConversao = Number(formData.get("meta_conversao") ?? 0);
  const comissaoPercentual = Number(formData.get("comissao_percentual") ?? 1);

  if (!vendedorId || !ano || !mes) return { error: "Preencha vendedor, ano e mês." };

  const { error } = await supabase.from("metas").upsert(
    {
      organizacao_id: perfil.organizacao_id,
      vendedor_id: vendedorId,
      ano,
      mes,
      meta_valor: metaValor,
      meta_prospeccoes: metaProspeccoes,
      meta_conversao: metaConversao,
      comissao_percentual: comissaoPercentual,
    },
    { onConflict: "vendedor_id,ano,mes" }
  );

  if (error) return { error: error.message };

  revalidatePath("/metas");
  revalidatePath("/");
  return { success: "Meta salva com sucesso." };
}

export async function criarProduto(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const perfil = await getPerfilAtual();
  if (!perfil || perfil.papel !== "master") return { error: "Apenas o master gerencia produtos." };

  const supabase = createClient();
  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim();

  if (!nome || !categoria) return { error: "Preencha nome e categoria." };

  const { data: existente } = await supabase
    .from("produtos")
    .select("id")
    .eq("categoria", categoria)
    .eq("ativo", true)
    .ilike("nome", nome)
    .maybeSingle();

  if (existente) return { error: `"${nome}" já está cadastrado em "${categoria}".` };

  const { error } = await supabase.from("produtos").insert({
    organizacao_id: perfil.organizacao_id,
    nome,
    categoria,
  });

  if (error) {
    if (ehViolacaoDeDuplicidade(error)) return { error: `"${nome}" já está cadastrado em "${categoria}".` };
    return { error: error.message };
  }

  revalidatePath("/produtos");
  return { success: `Produto "${nome}" cadastrado com sucesso.` };
}

export async function removerProduto(produtoId: string) {
  const perfil = await getPerfilAtual();
  if (!perfil || perfil.papel !== "master") throw new Error("Apenas o master gerencia produtos");

  const supabase = createClient();
  const { error } = await supabase.from("produtos").update({ ativo: false }).eq("id", produtoId);
  if (error) throw new Error(error.message);

  revalidatePath("/produtos");
}
