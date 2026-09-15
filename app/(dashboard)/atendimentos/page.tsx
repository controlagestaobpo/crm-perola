import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/auth";
import { getClientesComHistorico } from "@/lib/clientes";
import { labelResultado, formatBRL } from "@/lib/metrics";
import AtendimentoForm from "@/components/AtendimentoForm";
import AtendimentoRowActions from "@/components/AtendimentoRowActions";
import ClienteForm from "@/components/ClienteForm";
import KanbanAtendimentos from "@/components/KanbanAtendimentos";
import type { Atendimento, Cliente, Perfil, Produto, ResultadoAtendimento } from "@/types/database";

export const dynamic = "force-dynamic";

const OPCOES_RESULTADO: { valor: ResultadoAtendimento | ""; label: string }[] = [
  { valor: "", label: "Todos os estágios" },
  { valor: "compra", label: "✓ Compra realizada" },
  { valor: "negociacao", label: "⭐ Negociação em andamento" },
  { valor: "interessado", label: "⊕ Interessado - retornar" },
  { valor: "sem_interesse", label: "⏳ Sem interesse" },
  { valor: "nao_atendeu", label: "☎️ Não atendeu" },
  { valor: "indisponivel", label: "❌ Indisponível" },
];

export default async function AtendimentosPage({
  searchParams,
}: {
  searchParams: { view?: string; cliente?: string; resultado?: string };
}) {
  const view = searchParams.view === "kanban" ? "kanban" : "form";
  const clienteIdInicial = searchParams.cliente;
  const filtroResultado = searchParams.resultado ?? "";
  const supabase = createClient();
  const perfil = await getPerfilAtual();
  if (!perfil) return null;

  let consultaAtendimentos = supabase
    .from("atendimentos")
    .select("*, clientes(nome)")
    .order("criado_em", { ascending: false });

  consultaAtendimentos = filtroResultado
    ? consultaAtendimentos.eq("resultado", filtroResultado).limit(100)
    : consultaAtendimentos.limit(20);

  const [{ data: clientesData }, { data: produtosData }, { data: vendedoresData }, { data: atendimentosData }, clientesHistorico] =
    await Promise.all([
      supabase.from("clientes").select("*").order("nome"),
      supabase.from("produtos").select("*").eq("ativo", true).order("categoria"),
      perfil.papel === "master"
        ? supabase.from("perfis").select("*").order("nome")
        : Promise.resolve({ data: [perfil] }),
      consultaAtendimentos,
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
          <h1 className="text-2xl font-semibold text-stone-900">Atendimentos</h1>
          <p className="text-sm text-stone-500">Registre contatos e acompanhe o funil</p>
        </div>
        <div className="flex rounded-lg bg-white/80 backdrop-blur-sm shadow-sm p-1">
          <Link
            href="/atendimentos?view=form"
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              view === "form" ? "bg-oliva-600 text-white" : "text-stone-600"
            }`}
          >
            Formulário
          </Link>
          <Link
            href="/atendimentos?view=kanban"
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              view === "kanban" ? "bg-oliva-600 text-white" : "text-stone-600"
            }`}
          >
            Kanban
          </Link>
        </div>
      </div>

      {view === "kanban" ? (
        <KanbanAtendimentos
          clientes={clientesHistorico}
          produtos={produtos}
          vendedores={vendedores}
          souMaster={perfil.papel === "master"}
          meuId={perfil.id}
        />
      ) : (
        <>
          <details className="rounded-xl bg-white/80 backdrop-blur-sm shadow-sm p-4">
            <summary className="cursor-pointer text-sm font-medium text-oliva-700">
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
            clienteIdInicial={clienteIdInicial}
          />

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-stone-900">
                {filtroResultado ? "Atendimentos filtrados" : "Últimos atendimentos"}
              </h2>
              <form method="get" className="flex items-center gap-2">
                <input type="hidden" name="view" value="form" />
                <select
                  name="resultado"
                  defaultValue={filtroResultado}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
                >
                  {OPCOES_RESULTADO.map((opcao) => (
                    <option key={opcao.valor} value={opcao.valor}>
                      {opcao.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-300"
                >
                  Filtrar
                </button>
              </form>
            </div>
            <div className="overflow-x-auto rounded-xl bg-white/80 backdrop-blur-sm shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-stone-200 bg-stone-50 text-stone-500">
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
                      <td colSpan={6} className="px-4 py-6 text-center text-stone-400">
                        {filtroResultado
                          ? "Nenhum atendimento encontrado para esse estágio."
                          : "Nenhum atendimento registrado ainda."}
                      </td>
                    </tr>
                  ) : (
                    atendimentos.map((a) => (
                      <tr key={a.id} className="border-b border-stone-100 last:border-0">
                        <td className="px-4 py-3 text-stone-600">
                          {new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 font-medium text-stone-900">
                          {a.clientes?.nome ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-stone-600">{labelResultado(a.resultado)}</td>
                        <td className="px-4 py-3 text-stone-600">
                          {a.valor ? formatBRL(Number(a.valor)) : "—"}
                        </td>
                        <td className="px-4 py-3 text-stone-600">
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
