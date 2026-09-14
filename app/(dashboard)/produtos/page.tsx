import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/auth";
import ProdutoForm from "@/components/ProdutoForm";
import ProdutosLista from "@/components/ProdutosLista";
import type { Produto } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const perfil = await getPerfilAtual();
  if (!perfil) return null;
  if (perfil.papel !== "master") redirect("/");

  const supabase = createClient();
  const { data } = await supabase
    .from("produtos")
    .select("*")
    .eq("ativo", true)
    .order("categoria")
    .order("nome");

  const produtos = (data ?? []) as Produto[];
  const categorias = Array.from(new Set(produtos.map((p) => p.categoria))).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Produtos</h1>
          <p className="text-sm text-stone-500">Catálogo usado nos atendimentos</p>
        </div>
        <span className="text-sm text-stone-400">{produtos.length} produtos cadastrados</span>
      </div>

      <ProdutoForm categorias={categorias} />
      <ProdutosLista produtos={produtos} />
    </div>
  );
}
