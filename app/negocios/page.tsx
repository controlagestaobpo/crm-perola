import { supabase } from "@/lib/supabase";
import type { Negocio, StatusNegocio } from "@/types/database";

const colunas: { status: StatusNegocio; titulo: string }[] = [
  { status: "novo", titulo: "Novo" },
  { status: "em_andamento", titulo: "Em andamento" },
  { status: "ganho", titulo: "Ganho" },
  { status: "perdido", titulo: "Perdido" },
];

function formatBRL(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function NegociosPage() {
  const { data, error } = await supabase
    .from("negocios")
    .select("*")
    .order("criado_em", { ascending: false });

  const negocios: Negocio[] = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Negócios</h1>
        <p className="text-sm text-slate-500">Funil de vendas</p>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Não foi possível carregar os negócios. Rode{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5">supabase/schema.sql</code>{" "}
          no Supabase para criar a tabela.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {colunas.map((coluna) => {
          const itens = negocios.filter((n) => n.status === coluna.status);
          return (
            <div key={coluna.status} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-sm font-medium text-slate-700">
                {coluna.titulo}{" "}
                <span className="text-slate-400">({itens.length})</span>
              </p>
              <div className="space-y-2">
                {itens.length === 0 ? (
                  <p className="text-sm text-slate-400">Sem negócios</p>
                ) : (
                  itens.map((negocio) => (
                    <div
                      key={negocio.id}
                      className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                    >
                      <p className="text-sm font-medium text-slate-900">{negocio.titulo}</p>
                      <p className="text-sm text-violet-600">{formatBRL(Number(negocio.valor))}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
