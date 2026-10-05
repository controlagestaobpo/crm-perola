"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/auth";
import type { ActionState } from "@/lib/form-state";
import { estagioParaResultado } from "@/lib/estagio";
import { hojeISOBrasil } from "@/lib/metrics";
import type { Estagio, ResultadoAtendimento } from "@/types/database";

function ehViolacaoDeDuplicidade(error: { code?: string } | null) {
  return error?.code === "23505";
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

export async function excluirCliente(clienteId: string) {
  const perfil = await getPerfilAtual();
  if (!perfil || perfil.papel !== "master") throw new Error("Apenas o master exclui clientes");

  const supabase = createClient();
  // Os atendimentos do cliente são apagados junto (on delete cascade).
  const { error } = await supabase.from("clientes").delete().eq("id", clienteId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/clientes");
  revalidatePath("/atendimentos");
  revalidatePath("/insights");
  revalidatePath("/agenda");
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
  const quantidadeSacos = formData.get("quantidade_sacos") ? Number(formData.get("quantidade_sacos")) : null;
  const valorFrete = formData.get("valor_frete") ? Number(formData.get("valor_frete")) : null;
  const motivo = String(formData.get("motivo") ?? "").trim() || null;
  const proximoContato = String(formData.get("proximo_contato") ?? "").trim() || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;
  const data = String(formData.get("data") ?? "").trim() || hojeISOBrasil();

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
    quantidade_sacos: quantidadeSacos,
    valor_frete: valorFrete,
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
  const quantidadeSacos = formData.get("quantidade_sacos") ? Number(formData.get("quantidade_sacos")) : null;
  const valorFrete = formData.get("valor_frete") ? Number(formData.get("valor_frete")) : null;
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
      quantidade_sacos: quantidadeSacos,
      valor_frete: valorFrete,
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
  if (!perfil || (perfil.papel !== "master" && perfil.papel !== "gerente")) {
    return { error: "Apenas master ou gerente definem metas." };
  }

  const supabase = createClient();
  const vendedorId = String(formData.get("vendedor_id") ?? "");
  const ano = Number(formData.get("ano"));
  const mes = Number(formData.get("mes"));
  const metaValor = Number(formData.get("meta_valor") ?? 0);
  const metaProspeccoes = Number(formData.get("meta_prospeccoes") ?? 0);
  const metaConversao = Number(formData.get("meta_conversao") ?? 0);
  const metaSacos = Number(formData.get("meta_sacos") ?? 0);
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
      meta_sacos: metaSacos,
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

export async function editarUsuario(
  usuarioId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const perfil = await getPerfilAtual();
  if (!perfil || perfil.papel !== "master") return { error: "Apenas o master edita usuários." };

  const supabase = createClient();
  const nome = String(formData.get("nome") ?? "").trim();

  if (!nome) return { error: "Informe o nome." };

  const { error } = await supabase.from("perfis").update({ nome }).eq("id", usuarioId);
  if (error) return { error: error.message };

  revalidatePath("/usuarios");
  revalidatePath("/");
  return { success: "Usuário atualizado com sucesso." };
}

export async function removerUsuario(usuarioId: string) {
  const perfil = await getPerfilAtual();
  if (!perfil || perfil.papel !== "master") throw new Error("Apenas o master remove usuários");
  if (usuarioId === perfil.id) throw new Error("Você não pode remover a sua própria conta.");

  const supabase = createClient();
  // Apaga só o perfil (login/e-mail continuam existindo no Supabase Auth).
  // Como atendimentos/metas referenciam o vendedor com "on delete cascade",
  // o histórico de atendimentos e metas dessa pessoa é apagado junto.
  const { error } = await supabase.from("perfis").delete().eq("id", usuarioId);
  if (error) throw new Error(error.message);

  revalidatePath("/usuarios");
}

// Criar usuário com senha e trocar senha precisam da chave de administrador
// do Supabase, então quem faz é a Edge Function "gerenciar-usuario" (ela
// confere de novo se quem pediu é master).
async function chamarGerenciarUsuario(corpo: Record<string, string>): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase.functions.invoke("gerenciar-usuario", { body: corpo });
  if (!error) return null;

  try {
    const detalhe = await (error as { context?: Response }).context?.json();
    if (detalhe?.erro) return String(detalhe.erro);
  } catch {
    // resposta sem corpo JSON; cai na mensagem genérica abaixo
  }
  return "Não foi possível concluir. Tente de novo.";
}

export async function criarUsuarioComSenha(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const perfil = await getPerfilAtual();
  if (!perfil || perfil.papel !== "master") return { error: "Apenas o master cria usuários." };

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const papel = String(formData.get("papel") ?? "vendedor");
  const senha = String(formData.get("senha") ?? "");

  if (!nome || !email) return { error: "Preencha nome e e-mail." };
  if (senha.length < 6) return { error: "A senha precisa ter pelo menos 6 caracteres." };

  const erro = await chamarGerenciarUsuario({ acao: "criar", nome, email, papel, senha });
  if (erro) return { error: erro };

  revalidatePath("/usuarios");
  return { success: `Usuário criado. Login: ${email} · Senha: ${senha}` };
}

export async function redefinirSenhaUsuario(
  usuarioId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const perfil = await getPerfilAtual();
  if (!perfil || perfil.papel !== "master") return { error: "Apenas o master troca senhas." };

  const senha = String(formData.get("senha") ?? "");
  if (senha.length < 6) return { error: "A senha precisa ter pelo menos 6 caracteres." };

  const erro = await chamarGerenciarUsuario({ acao: "redefinir_senha", usuarioId, senha });
  if (erro) return { error: erro };

  return { success: `Senha nova: ${senha}` };
}
