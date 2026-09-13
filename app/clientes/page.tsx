import { supabase } from "@/lib/supabase";

export default async function ClientesPage() {
  const { data: clientes, error } = await supabase
    .from("clientes")
    .select("*")
    .order("criado_em", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Clientes</h1>
        <p className="text-sm text-slate-500">Lista de clientes cadastrados</p>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Não foi possível carregar os clientes. Rode{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5">supabase/schema.sql</code>{" "}
          no Supabase para criar a tabela.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
            </tr>
          </thead>
          <tbody>
            {clientes && clientes.length > 0 ? (
              clientes.map((cliente) => (
                <tr key={cliente.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-900">{cliente.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{cliente.empresa ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{cliente.email ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{cliente.telefone ?? "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Nenhum cliente cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
