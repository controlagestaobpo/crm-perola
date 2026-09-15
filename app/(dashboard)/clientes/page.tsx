import { createClient } from "@/lib/supabase/server";
import { getClientesComHistorico } from "@/lib/clientes";
import { formatBRL } from "@/lib/metrics";
import StatCard from "@/components/StatCard";
import ClienteForm from "@/components/ClienteForm";
import ClientesTabela from "@/components/ClientesTabela";
import { Users, UserCheck, Wallet, Receipt } from "lucide-react";

export const dynamic = "force-dynamic";

const MEDALHAS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

export default async function ClientesPage() {
  const supabase = createClient();
  const clientes = await getClientesComHistorico(supabase);

  const totalClientes = clientes.length;
  const clientesAtivos = clientes.filter((c) => (c.diasSemComprar ?? 999) <= 30).length;
  const valorTotalCarteira = clientes.reduce((soma, c) => soma + c.valorTotal, 0);
  const ticketMedio =
    clientes.reduce((soma, c) => soma + c.totalCompras, 0) > 0
      ? valorTotalCarteira / clientes.reduce((soma, c) => soma + c.totalCompras, 0)
      : 0;

  const topClientes = [...clientes]
    .sort((a, b) => b.valorTotal - a.valorTotal)
    .filter((c) => c.valorTotal > 0)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Clientes</h1>
        <p className="text-sm text-stone-500">Sua carteira de clientes</p>
      </div>

      <details className="rounded-xl bg-white shadow-sm p-4">
        <summary className="cursor-pointer text-sm font-medium text-oliva-700">+ Novo cliente</summary>
        <ClienteForm />
      </details>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de clientes" value={String(totalClientes)} icon={Users} cor="text-blue-600" />
        <StatCard label="Clientes ativos (30d)" value={String(clientesAtivos)} icon={UserCheck} cor="text-amber-500" />
        <StatCard label="Valor total da carteira" value={formatBRL(valorTotalCarteira)} icon={Wallet} cor="text-emerald-600" />
        <StatCard label="Ticket médio" value={formatBRL(ticketMedio)} icon={Receipt} cor="text-orange-500" />
      </div>

      {topClientes.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-stone-900">🏆 Top clientes</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {topClientes.map((cliente, index) => (
              <div key={cliente.id} className="rounded-xl bg-white shadow-sm p-5 text-center">
                <div className="mb-2 text-3xl">{MEDALHAS[index]}</div>
                <p className="text-sm font-semibold text-stone-900">{cliente.nome}</p>
                <p className="mt-1 text-lg font-bold text-oliva-600">{formatBRL(cliente.valorTotal)}</p>
                <p className="mt-1 text-xs text-stone-500">{cliente.totalCompras} compras</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <ClientesTabela clientes={clientes} />
    </div>
  );
}
