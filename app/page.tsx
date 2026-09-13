import { Users, Handshake, DollarSign } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Negocio } from "@/types/database";
import StatCard from "@/components/StatCard";
import RevenueChart from "@/components/RevenueChart";

function formatBRL(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildChartData(negocios: Negocio[]) {
  const ganhos = negocios.filter((n) => n.status === "ganho");
  const porMes = new Map<string, number>();

  for (const negocio of ganhos) {
    const data = new Date(negocio.criado_em);
    const chave = data.toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    });
    porMes.set(chave, (porMes.get(chave) ?? 0) + Number(negocio.valor));
  }

  return Array.from(porMes.entries()).map(([mes, valor]) => ({ mes, valor }));
}

export default async function DashboardPage() {
  const [{ data: clientes, error: erroClientes }, { data: negocios, error: erroNegocios }] =
    await Promise.all([
      supabase.from("clientes").select("*"),
      supabase.from("negocios").select("*"),
    ]);

  const setupPendente = Boolean(erroClientes || erroNegocios);
  const listaNegocios = negocios ?? [];

  const totalClientes = clientes?.length ?? 0;
  const negociosEmAndamento = listaNegocios.filter(
    (n) => n.status === "novo" || n.status === "em_andamento"
  ).length;
  const receitaTotal = listaNegocios
    .filter((n) => n.status === "ganho")
    .reduce((soma, n) => soma + Number(n.valor), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Visão geral do seu CRM Pérola</p>
      </div>

      {setupPendente && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          As tabelas do banco ainda não existem no Supabase. Rode o arquivo{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5">supabase/schema.sql</code>{" "}
          no SQL Editor do seu projeto para ativar os dados reais.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Clientes" value={String(totalClientes)} icon={Users} />
        <StatCard
          label="Negócios em andamento"
          value={String(negociosEmAndamento)}
          icon={Handshake}
        />
        <StatCard label="Receita (ganhos)" value={formatBRL(receitaTotal)} icon={DollarSign} />
      </div>

      <RevenueChart data={buildChartData(listaNegocios)} />
    </div>
  );
}
