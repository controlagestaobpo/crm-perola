import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Papel, Perfil } from "@/types/database";

// "gerente" continua sendo o valor salvo no banco (papel/RLS não mudam) —
// só o texto exibido virou "Sócio", já que esse papel enxerga tudo que os
// vendedores lançam (não só a própria carteira) e por isso remete ao dono.
const LABEL_PAPEL: Record<Papel, string> = {
  master: "Master",
  gerente: "Sócio",
  vendedor: "Vendedor(a)",
};

export function labelPapel(papel: Papel) {
  return LABEL_PAPEL[papel];
}

// Toda página chama getPerfilAtual() e o layout tambem chama — sem isso,
// cada navegação faria essa consulta duas vezes. `cache()` faz a segunda
// chamada reaproveitar o resultado da primeira dentro da MESMA requisição
// (nunca entre requisições diferentes, então nunca fica desatualizado).
export const getPerfilAtual = cache(async (): Promise<Perfil | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil } = await supabase.from("perfis").select("*").eq("id", user.id).single();
  if (perfil) return perfil as Perfil;

  // Usuário removido e convidado de novo: o login dele continua existindo no
  // Supabase Auth, então o gatilho de cadastro não roda outra vez. Aqui o
  // convite pendente vira perfil no primeiro login.
  await supabase.rpc("aceitar_convite_pendente");
  const { data: perfilNovo } = await supabase.from("perfis").select("*").eq("id", user.id).single();

  return (perfilNovo as Perfil) ?? null;
});
