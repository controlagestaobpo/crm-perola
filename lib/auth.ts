import { createClient } from "@/lib/supabase/server";
import type { Perfil } from "@/types/database";

export async function getPerfilAtual(): Promise<Perfil | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil } = await supabase.from("perfis").select("*").eq("id", user.id).single();

  return (perfil as Perfil) ?? null;
}
