import Link from "next/link";
import { DollarSign, Phone, ShoppingCart, Target, CalendarCheck, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/auth";
import { getClientesComHistorico } from "@/lib/clientes";
import { getAgenda } from "@/lib/agenda";
import StatCard from "@/components/StatCard";
import LineChartCard from "@/components/charts/LineChartCard";
import PieChartCard from "@/components/charts/PieChartCard";
import ProdutoChartComTabela from "@/components/charts/ProdutoChartComTabela";
import ProximasAtividades from "@/components/ProximasAtividades";
import {
  agruparPorDiaAcumulado,
  agruparPorHora,
  agruparResultados,
  contarProdutos,
  contarResultado,
  diasUteisNoMes,
  formatBRL,
  somaValor,
} from "@/lib/metrics";
import type { Atendimento } from "@/types/database";

export const dynamic = "force-dynamic";

function inicioFimMes(ano: number, mes: number) {
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  return { inicio, fim };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { periodo?: string };
}) {
  const periodo = searchParams.periodo === "mes" ? "mes" : "hoje";
  const supabase = createClient();
  const perfil = await getPerfilAtual();
  if (!perfil) return null;

  const hoje = new Date();
  const hojeISO = hoje.toISOString().slice(0, 10);
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;
  const { inicio, fim } = inicioFimMes(ano, mes);

  const dataInicio = periodo === "hoje" ? hojeISO : inicio;
  const dataFim = periodo === "hoje" ? hojeISO : fim;

  const [{ data: atendimentosData }, { data: metasData }, clientesHistorico, agendaItens] = await Promise.all([
    supabase
      .from("atendimentos")
      .select("*")
      .gte("data", dataInicio)
      .lte("data", dataFim)
      .order("criado_em", { ascending: true }),
    supabase.from("metas").select("*").eq("ano", ano).eq("mes", mes),
    getClientesComHistorico(supabase),
    getAgenda(supabase),
  ]);

  const atendimentos = (atendimentosData ?? []) as Atendimento[];
  const metas = metasData ?? [];

  const metaMensalTotal = metas.reduce((soma, m) => soma + Number(m.meta_valor), 0);
  const diasUteisTotais = diasUteisNoMes(ano, mes);
  const diasUteisAteHoje = diasUteisNoMes(ano, mes, true, hoje);

  const vendido = somaValor(atendimentos, "valor");
  const totalAtendimentos = atendimentos.length;
  const totalVendas = contarResultado(atendimentos, "compra");
  const ticketMedio = totalVendas > 0 ? vendido / totalVendas : 0;
  const conversao = totalAtendimentos > 0 ? (totalVendas / totalAtendimentos) * 100 : 0;

  const metaProspeccoesTotal = metas.reduce((soma, m) => soma + Number(m.meta_prospeccoes), 0);
  const metaAtendimentosDiaria = diasUteisTotais > 0 ? metaProspeccoesTotal / diasUteisTotais : 0;
  const metaAtendimentosPeriodo = periodo === "hoje" ? metaAtendimentosDiaria : metaProspeccoesTotal;

  const pipelineAbertos = atendimentos.filter((a) => a.resultado === "negociacao");
  const pipelineValor = somaValor(pipelineAbertos, "valor_negociacao");

  const clientesSemComprar = clientesHistorico
    .filter((c) => c.diasSemComprar === null || c.diasSemComprar > 25)
    .sort((a, b) => (b.diasSemComprar ?? 9999) - (a.diasSemComprar ?? 9999))
    .slice(0, 5);

  const metaDiaria = diasUteisTotais > 0 ? metaMensalTotal / diasUteisTotais : 0;
  const projecao = diasUteisAteHoje > 0 ? (vendido / diasUteisAteHoje) * diasUteisTotais : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Dashboard</h1>
          <p className="text-sm text-stone-500">Visão geral do seu CRM Pérola</p>
        </div>
        <div className="flex rounded-lg bg-white shadow-sm p-1">
          <Link
            href="/?periodo=hoje"
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              periodo === "hoje" ? "bg-oliva-600 text-white" : "text-stone-600"
            }`}
          >
            Hoje
          </Link>
          <Link
            href="/?periodo=mes"
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              periodo === "mes" ? "bg-oliva-600 text-white" : "text-stone-600"
            }`}
          >
            Este mês
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={periodo === "hoje" ? "Meta diária" : "Meta do mês"}
          value={formatBRL(periodo === "hoje" ? metaDiaria : metaMensalTotal)}
          icon={Target}
          cor="text-blue-600"
        />
        <StatCard
          label={periodo === "hoje" ? "Vendido hoje" : "Vendido no mês"}
          value={formatBRL(vendido)}
          icon={DollarSign}
          cor="text-emerald-600"
        />
        {periodo === "mes" && (
          <StatCard label="Projeção (fim do mês)" value={formatBRL(projecao)} icon={Receipt} cor="text-orange-500" />
        )}
        <StatCard label="Atendimentos" value={String(totalAtendimentos)} icon={Phone} cor="text-amber-500" />
        <StatCard
          label="Vendas"
          value={`${totalVendas} (${conversao.toFixed(1)}% conversão)`}
          icon={ShoppingCart}
          cor="text-emerald-600"
        />
        <StatCard label="Ticket médio" value={formatBRL(ticketMedio)} icon={DollarSign} cor="text-blue-600" />
        <StatCard
          label={periodo === "hoje" ? "Meta de atendimentos (dia)" : "Meta de atendimentos (mês)"}
          value={`${totalAtendimentos} / ${Math.round(metaAtendimentosPeriodo)}`}
          icon={CalendarCheck}
          cor="text-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {periodo === "hoje" ? (
          <LineChartCard
            title="Evolução de atendimentos (hoje) vs ritmo da meta"
            data={agruparPorHora(atendimentos, metaAtendimentosDiaria)}
            xKey="hora"
            lines={[
              { key: "meta", nome: "Ritmo necessário", cor: "#94a3b8", tracejada: true },
              { key: "valor", nome: "Atendimentos", cor: "#84cc16" },
            ]}
          />
        ) : (
          <LineChartCard
            title="Evolução da meta no mês"
            data={agruparPorDiaAcumulado(atendimentos, ano, mes)}
            xKey="dia"
            lines={[{ key: "valor", nome: "Realizado (R$)", cor: "#84cc16" }]}
          />
        )}
        <PieChartCard title="Resultados dos atendimentos" data={agruparResultados(atendimentos)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProdutoChartComTabela
          title="Produtos oferecidos"
          dados={contarProdutos(atendimentos, "produtos_oferecidos")}
        />
        <ProdutoChartComTabela
          title="Produtos vendidos"
          dados={contarProdutos(atendimentos, "produtos_vendidos")}
          cor="#3b82f6"
        />
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-stone-900">
          Pipeline e direcionamento do dia
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-700">
              ⚠️ Negociações em andamento ({pipelineAbertos.length})
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-800">{formatBRL(pipelineValor)}</p>
            <p className="mt-1 text-xs text-amber-600">Valor total em risco no pipeline</p>
          </div>
          <div className="rounded-xl border-l-4 border-emerald-400 bg-emerald-50 p-5">
            <p className="text-sm font-semibold text-emerald-700">✓ Compras confirmadas ({totalVendas})</p>
            <p className="mt-2 text-2xl font-bold text-emerald-800">{formatBRL(vendido)}</p>
            <p className="mt-1 text-xs text-emerald-600">Dinheiro fechado no período</p>
          </div>
          <ProximasAtividades itens={agendaItens} />
        </div>
      </div>

      {clientesSemComprar.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-stone-900">
            🚨 Clientes sem comprar há mais tempo
          </h2>
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Última compra</th>
                  <th className="px-4 py-3 font-medium">Dias</th>
                  <th className="px-4 py-3 font-medium">Histórico</th>
                </tr>
              </thead>
              <tbody>
                {clientesSemComprar.map((c) => (
                  <tr key={c.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-stone-900">{c.nome}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {c.ultimaCompra
                        ? new Date(c.ultimaCompra + "T00:00:00").toLocaleDateString("pt-BR")
                        : "Nunca comprou"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                        {c.diasSemComprar ?? "—"} dias
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {c.totalCompras} compras (média {formatBRL(c.totalCompras > 0 ? c.valorTotal / c.totalCompras : 0)})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
