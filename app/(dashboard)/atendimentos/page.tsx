import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/auth";
import { getClientesComHistorico } from "@/lib/clientes";
import { labelResultado, formatBRL } from "@/lib/metrics";
import AtendimentoForm from "@/components/AtendimentoForm";
import AtendimentoRowActions from "@/components/AtendimentoRowActions";
import ClienteForm from "@/components/ClienteForm";
import KanbanAtendimentos from "@/components/KanbanAtendimentos";
import type { Atendimento, Cliente, Perfil, Produto } from "@/types/database";

export default async function AtendimentosPage({
  searchParams,
}: {
  searchParams: { view?: string };
}) {
  const view = searchParams.view === "kanban" ? "kanban" : "form";
  const supabase = createClient();
  const perfil = await getPerfilAtual();
  if (!perfil) return null;

  const [{ data: clientesData }, { data: produtosData }, { data: vendedoresData }, { data: atendimentosData }, clientesHistorico] =
    await Promise.all([
      supabase.from("clientes").select("*").order("nome"),
      supabase.from("produtos").select("*").eq("ativo", true).order("categoria"),
      perfil.papel === "master"
        ? supabase.from("perfis").select("*").order("nome")
        : Promise.resolve({ data: [perfil] }),
      supabase
        .from("atendimentos")
        .select("*, clientes(nome)")
        .order("criado_em", { ascending: false })
        .limit(20),
      getClientesComHistorico(supabase),
    ]);

  const clientes = (clientesData ?? []) as Cliente[];
  const produtos = (produtosData ?? []) as Produto[];
  const vendedores = (vendedoresData ?? []) as Perfil[];
  const atendimentos = (atendimentosData ?? []) as (Atendimento & { clientes: { nome: string } | null })[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Atendimentos</h1>
          <p className="text-sm text-slate-500">Registre contatos e acompanhe o funil</p>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white p-1">
          <Link
            href="/atendimentos?view=form"
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              view === "form" ? "bg-violet-600 text-white" : "text-slate-600"
            }`}
          >
            Formulário
          </Link>
          <Link
            href="/atendimentos?view=kanban"
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              view === "kanban" ? "bg-violet-600 text-white" : "text-slate-600"
            }`}
          >
            Kanban
          </Link>
        </div>
      </div>

      {view === "kanban" ? (
        <KanbanAtendimentos clientes={clientesHistorico} />
      ) : (
        <>
          <details className="rounded-xl border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-medium text-violet-700">
              + Novo cliente
            </summary>
            <ClienteForm />
          </details>

          <AtendimentoForm
            clientes={clientes}
            produtos={produtos}
            vendedores={vendedores}
            souMaster={perfil.papel === "master"}
            meuId={perfil.id}
          />

          <div>
            <h2 className="mb-3 text-base font-semibold text-slate-900">Últimos atendimentos</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Resultado</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                    <th className="px-4 py-3 font-medium">Próx. contato</th>
                    <th className="px-4 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {atendimentos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                        Nenhum atendimento registrado ainda.
                      </td>
                    </tr>
                  ) : (
                    atendimentos.map((a) => (
                      <tr key={a.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {a.clientes?.nome ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{labelResultado(a.resultado)}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {a.valor ? formatBRL(Number(a.valor)) : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {a.proximo_contato
                            ? new Date(a.proximo_contato + "T00:00:00").toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <AtendimentoRowActions atendimentoId={a.id} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
