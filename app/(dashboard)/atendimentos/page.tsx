import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/auth";
import { getClienteIdsDoVendedor, getClientesComHistorico } from "@/lib/clientes";
import AtendimentoForm from "@/components/AtendimentoForm";
import AtendimentosRecentesTabela from "@/components/AtendimentosRecentesTabela";
import ClienteForm from "@/components/ClienteForm";
import KanbanAtendimentos from "@/components/KanbanAtendimentos";
import type { Atendimento, Cliente, Perfil, Produto, ResultadoAtendimento } from "@/types/database";

export const dynamic = "force-dynamic";

const OPCOES_RESULTADO: { valor: ResultadoAtendimento | ""; label: string }[] = [
  { valor: "", label: "Todos os estágios" },
  { valor: "compra", label: "✓ Compra realizada" },
  { valor: "negociacao", label: "⭐ Orçamento em andamento" },
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

  // Vendedor só vê no Kanban os clientes que ele mesmo já atendeu — a tabela
  // de clientes é compartilhada pela organização. Master e sócio veem todo
  // mundo (o formulário de "novo atendimento" continua livre pra qualquer
  // cliente, já que qualquer um pode precisar registrar um primeiro contato).
  const meusClienteIds =
    perfil.papel === "vendedor" ? await getClienteIdsDoVendedor(supabase, perfil.id) : undefined;

  const [{ data: clientesData }, { data: produtosData }, { data: vendedoresData }, { data: atendimentosData }, clientesHistorico] =
    await Promise.all([
      supabase.from("clientes").select("*").order("nome"),
      supabase.from("produtos").select("*").eq("ativo", true).order("categoria"),
      supabase.from("perfis").select("*").neq("papel", "master").order("nome"),
      consultaAtendimentos,
      getClientesComHistorico(supabase, meusClienteIds),
    ]);

  const clientes = (clientesData ?? []) as Cliente[];
  const produtos = (produtosData ?? []) as Produto[];
  const vendedores = (vendedoresData ?? []) as Perfil[];
  const atendimentos = (atendimentosData ?? []) as (Atendimento & { clientes: { nome: string } | null })[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-perola-texto">Atendimentos</h1>
          <p className="text-sm text-perola-texto-2">Registre contatos e acompanhe o funil</p>
        </div>
        <div className="flex rounded-lg border border-perola-borda bg-white p-1">
          <Link
            href="/atendimentos?view=form"
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              view === "form" ? "bg-perola-verde text-white" : "text-perola-texto-2"
            }`}
          >
            Formulário
          </Link>
          <Link
            href="/atendimentos?view=kanban"
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              view === "kanban" ? "bg-perola-verde text-white" : "text-perola-texto-2"
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
          <details className="group rounded-[14px] border border-perola-borda bg-white p-4">
            <summary className="cursor-pointer list-none text-sm font-semibold text-perola-tag-pos-texto [&::-webkit-details-marker]:hidden">
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
              <h2 className="text-base font-semibold text-perola-texto">
                {filtroResultado ? "Atendimentos filtrados" : "Últimos atendimentos"}
              </h2>
              <form method="get" className="flex items-center gap-2">
                <input type="hidden" name="view" value="form" />
                <select
                  name="resultado"
                  defaultValue={filtroResultado}
                  className="rounded-[10px] border border-[#DAD8CD] bg-white px-3 py-1.5 text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
                >
                  {OPCOES_RESULTADO.map((opcao) => (
                    <option key={opcao.valor} value={opcao.valor}>
                      {opcao.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-[10px] bg-perola-tag px-3 py-1.5 text-sm font-medium text-perola-texto hover:brightness-95"
                >
                  Filtrar
                </button>
              </form>
            </div>
            <AtendimentosRecentesTabela
              atendimentos={atendimentos}
              mensagemVazio={
                filtroResultado
                  ? "Nenhum atendimento encontrado para esse estágio."
                  : "Nenhum atendimento registrado ainda."
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
