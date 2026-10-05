// Cria usuário com senha e redefine a senha de um usuário, a pedido do master.
// Roda no Supabase (Edge Function) porque precisa da chave de administrador
// (service role), que nunca vai para o site. Quem chama manda o próprio login
// no header Authorization; a função confere se é master da mesma organização.
//
// Deploy: supabase functions deploy gerenciar-usuario (verify_jwt ligado)

import { createClient } from "jsr:@supabase/supabase-js@2";

const PAPEIS = ["master", "gerente", "vendedor"];

function resposta(corpo: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return resposta({ erro: "Método não permitido." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return resposta({ erro: "Não autenticado." }, 401);

  const { data: chamador } = await admin
    .from("perfis")
    .select("id, organizacao_id, papel")
    .eq("id", user.id)
    .maybeSingle();
  if (!chamador || chamador.papel !== "master") {
    return resposta({ erro: "Apenas o master gerencia usuários." }, 403);
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return resposta({ erro: "Requisição inválida." }, 400);
  }

  const senha = String(corpo.senha ?? "");
  if (senha.length < 6) return resposta({ erro: "A senha precisa ter pelo menos 6 caracteres." }, 400);

  if (corpo.acao === "redefinir_senha") {
    const usuarioId = String(corpo.usuarioId ?? "");
    const { data: alvo } = await admin
      .from("perfis")
      .select("id")
      .eq("id", usuarioId)
      .eq("organizacao_id", chamador.organizacao_id)
      .maybeSingle();
    if (!alvo) return resposta({ erro: "Usuário não encontrado." }, 404);

    const { error } = await admin.auth.admin.updateUserById(usuarioId, { password: senha, email_confirm: true });
    if (error) return resposta({ erro: "Não foi possível trocar a senha. " + error.message }, 400);
    return resposta({ ok: true });
  }

  if (corpo.acao === "criar") {
    const nome = String(corpo.nome ?? "").trim();
    const email = String(corpo.email ?? "").trim().toLowerCase();
    const papel = String(corpo.papel ?? "vendedor");
    if (!nome || !email) return resposta({ erro: "Preencha nome e e-mail." }, 400);
    if (!PAPEIS.includes(papel)) return resposta({ erro: "Papel inválido." }, 400);

    const { data: jaEhUsuario } = await admin.from("perfis").select("id").eq("email", email).maybeSingle();
    if (jaEhUsuario) {
      return resposta({ erro: `"${email}" já é um usuário. Use o botão "Senha" na lista para criar uma senha nova.` }, 409);
    }

    // O gatilho de cadastro (on_auth_user_created) transforma o convite em
    // perfil assim que o login é criado, com o nome e o papel escolhidos.
    await admin.from("convites").delete().eq("organizacao_id", chamador.organizacao_id).eq("email", email);
    const { data: convite, error: erroConvite } = await admin
      .from("convites")
      .insert({ organizacao_id: chamador.organizacao_id, nome, email, papel, criado_por: chamador.id })
      .select("id")
      .single();
    if (erroConvite) return resposta({ erro: erroConvite.message }, 400);

    const { error: erroCriar } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome },
    });
    if (!erroCriar) return resposta({ ok: true });

    // O login já existia sem perfil (usuário removido antes): reaproveita
    // esse login com a senha nova e cria o perfil a partir do convite.
    const existente = await buscarLoginPorEmail(admin, email);
    if (!existente) {
      await admin.from("convites").delete().eq("id", convite.id);
      return resposta({ erro: "Não foi possível criar o usuário. " + erroCriar.message }, 400);
    }

    const { error: erroSenha } = await admin.auth.admin.updateUserById(existente, { password: senha, email_confirm: true });
    if (erroSenha) return resposta({ erro: "Não foi possível criar o usuário. " + erroSenha.message }, 400);

    const { error: erroPerfil } = await admin.from("perfis").insert({
      id: existente,
      organizacao_id: chamador.organizacao_id,
      nome,
      email,
      papel,
    });
    if (erroPerfil) return resposta({ erro: erroPerfil.message }, 400);
    await admin.from("convites").update({ usado: true }).eq("id", convite.id);
    return resposta({ ok: true });
  }

  return resposta({ erro: "Ação inválida." }, 400);
});

// deno-lint-ignore no-explicit-any
async function buscarLoginPorEmail(admin: any, email: string): Promise<string | null> {
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const achado = data.users.find((u: { email?: string }) => u.email?.toLowerCase() === email);
    if (achado) return achado.id;
    if (data.users.length < 200) return null;
  }
  return null;
}
