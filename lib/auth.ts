import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Perfil } from "@/types/database";

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

  return (perfil as Perfil) ?? null;
});
