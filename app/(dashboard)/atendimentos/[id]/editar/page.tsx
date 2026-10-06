import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/auth";
import AtendimentoForm from "@/components/AtendimentoForm";
import type { Atendimento, Cliente, Perfil, Produto } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function EditarAtendimentoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const perfil = await getPerfilAtual();
  if (!perfil) return null;

  const [{ data: atendimento }, { data: clientesData }, { data: produtosData }, { data: vendedoresData }] =
    await Promise.all([
      supabase.from("atendimentos").select("*").eq("id", params.id).single(),
      supabase.from("clientes").select("*").order("nome"),
      supabase.from("produtos").select("*").eq("ativo", true).order("categoria"),
      supabase.from("perfis").select("*").order("nome"),
    ]);

  if (!atendimento) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-perola-texto">Editar atendimento</h1>
        <p className="text-sm text-perola-texto-2">Corrija dados de preenchimento ou duplicidade</p>
      </div>

      <AtendimentoForm
        clientes={(clientesData ?? []) as Cliente[]}
        produtos={(produtosData ?? []) as Produto[]}
        // O master fica fora da lista, a não ser que já seja o dono deste atendimento.
        vendedores={((vendedoresData ?? []) as Perfil[]).filter(
          (v) => v.papel !== "master" || v.id === atendimento.vendedor_id
        )}
        souMaster={perfil.papel === "master"}
        meuId={perfil.id}
        atendimentoParaEditar={atendimento as Atendimento}
      />
    </div>
  );
}
