import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/auth";
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
  const [clientes, perfil] = await Promise.all([getClientesComHistorico(supabase), getPerfilAtual()]);

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
        <h1 className="text-2xl font-semibold text-perola-texto">Clientes</h1>
        <p className="text-sm text-perola-texto-2">Sua carteira de clientes</p>
      </div>

      <details className="rounded-[14px] border border-perola-borda bg-white p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-perola-tag-pos-texto [&::-webkit-details-marker]:hidden">
          + Novo cliente
        </summary>
        <ClienteForm />
      </details>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de clientes" value={String(totalClientes)} icon={Users} />
        <StatCard label="Clientes ativos (30d)" value={String(clientesAtivos)} icon={UserCheck} />
        <StatCard label="Valor total da carteira" value={formatBRL(valorTotalCarteira)} icon={Wallet} />
        <StatCard label="Ticket médio" value={formatBRL(ticketMedio)} icon={Receipt} />
      </div>

      {topClientes.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-perola-texto">Top clientes</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {topClientes.map((cliente, index) => (
              <div key={cliente.id} className="rounded-[14px] border border-perola-borda bg-white p-5 text-center">
                <div className="mb-2 text-3xl">{MEDALHAS[index]}</div>
                <p className="text-sm font-semibold text-perola-texto">{cliente.nome}</p>
                <p className="mt-1 text-lg font-semibold text-perola-texto">{formatBRL(cliente.valorTotal)}</p>
                <p className="mt-1 text-xs text-perola-texto-2">{cliente.totalCompras} compras</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <ClientesTabela clientes={clientes} podeExcluir={perfil?.papel === "master"} />
    </div>
  );
}
