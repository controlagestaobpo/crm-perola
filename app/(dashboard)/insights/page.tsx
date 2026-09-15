import { createClient } from "@/lib/supabase/server";
import { getClientesComHistorico } from "@/lib/clientes";
import { contarProdutos, formatBRL } from "@/lib/metrics";
import StatCard from "@/components/StatCard";
import PieChartCard from "@/components/charts/PieChartCard";
import BarChartCard from "@/components/charts/BarChartCard";
import { Percent, Clock, AlertTriangle, Receipt, Wallet } from "lucide-react";
import type { Atendimento, Meta } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const supabase = createClient();
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;
  const inicioMes = `${ano}-${String(mes).padStart(2, "0")}-01`;

  const [{ data: atendimentosData }, clientesHistorico, { data: metasData }] = await Promise.all([
    supabase.from("atendimentos").select("*").gte("data", inicioMes),
    getClientesComHistorico(supabase),
    supabase.from("metas").select("*").eq("ano", ano).eq("mes", mes),
  ]);

  const atendimentos = (atendimentosData ?? []) as Atendimento[];
  const metas = (metasData ?? []) as Meta[];

  const comissaoTotal = metas.reduce((soma, meta) => {
    const realizadoVendedor = atendimentos
      .filter((a) => a.vendedor_id === meta.vendedor_id && a.resultado === "compra")
      .reduce((s, a) => s + Number(a.valor ?? 0), 0);
    return soma + realizadoVendedor * (Number(meta.comissao_percentual) / 100);
  }, 0);
  const totalAtendimentos = atendimentos.length;
  const vendas = atendimentos.filter((a) => a.resultado === "compra");
  const conversaoGeral = totalAtendimentos > 0 ? (vendas.length / totalAtendimentos) * 100 : 0;
  const ticketMedio = vendas.length > 0
    ? vendas.reduce((s, a) => s + Number(a.valor ?? 0), 0) / vendas.length
    : 0;

  const clientesSemComprar = clientesHistorico.filter(
    (c) => c.diasSemComprar === null || c.diasSemComprar > 30
  ).length;

  const semInteresse = atendimentos.filter((a) => a.resultado === "sem_interesse" && a.motivo);
  const motivos = new Map<string, number>();
  for (const a of semInteresse) {
    motivos.set(a.motivo as string, (motivos.get(a.motivo as string) ?? 0) + 1);
  }
  const razoesNaoVenda = Array.from(motivos.entries())
    .map(([motivo, quantidade]) => ({
      motivo,
      quantidade,
      percentual: semInteresse.length > 0 ? (quantidade / semInteresse.length) * 100 : 0,
    }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const oportunidades = clientesHistorico
    .filter((c) => c.estagio === "negociacao" || c.estagio === "contatado")
    .sort((a, b) => {
      if (!a.proximo_contato) return 1;
      if (!b.proximo_contato) return -1;
      return a.proximo_contato.localeCompare(b.proximo_contato);
    })
    .slice(0, 6);

  const oferecidos = contarProdutos(atendimentos, "produtos_oferecidos");
  const vendidos = contarProdutos(atendimentos, "produtos_vendidos");
  const potencialProdutos = oferecidos
    .map((o) => {
      const vendidoQtd = vendidos.find((v) => v.produto === o.produto)?.quantidade ?? 0;
      return {
        produto: o.produto,
        oferecido: o.quantidade,
        vendido: vendidoQtd,
        conversao: o.quantidade > 0 ? (vendidoQtd / o.quantidade) * 100 : 0,
      };
    })
    // Ordenado pela melhor assertividade (conversão vendido/oferecido), não por volume ofertado
    .sort((a, b) => b.conversao - a.conversao || b.oferecido - a.oferecido)
    .slice(0, 8);

  const graficoPotencial = potencialProdutos.map((p) => ({
    produto: p.produto,
    quantidade: Math.round(p.conversao),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Inteligência comercial</h1>
        <p className="text-sm text-stone-500">Insights do mês atual</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Taxa de conversão" value={`${conversaoGeral.toFixed(1)}%`} icon={Percent} cor="text-blue-600" />
        <StatCard label="Ticket médio" value={formatBRL(ticketMedio)} icon={Receipt} cor="text-amber-500" />
        <StatCard label="Clientes sem comprar (30d+)" value={String(clientesSemComprar)} icon={AlertTriangle} cor="text-orange-500" />
        <StatCard label="Atendimentos no mês" value={String(totalAtendimentos)} icon={Clock} cor="text-emerald-600" />
        <StatCard label="Comissão do mês (total)" value={formatBRL(comissaoTotal)} icon={Wallet} cor="text-blue-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PieChartCard
          title="🚨 Razões de não-venda"
          data={razoesNaoVenda.map((r) => ({ nome: r.motivo, quantidade: r.quantidade }))}
        />

        <div className="rounded-xl bg-white/80 backdrop-blur-sm p-5 shadow-sm">
          <p className="mb-4 text-sm font-medium text-stone-700">⭐ Oportunidades rápidas</p>
          {oportunidades.length === 0 ? (
            <p className="text-sm text-stone-400">Nenhuma negociação em aberto.</p>
          ) : (
            <ul className="space-y-3">
              {oportunidades.map((c) => (
                <li key={c.id} className="text-sm text-stone-700">
                  <strong>{c.nome}</strong> — {c.estagio === "negociacao" ? "Em negociação" : "Contatado"}
                  {c.proximo_contato && (
                    <> · retorno em {new Date(c.proximo_contato + "T00:00:00").toLocaleDateString("pt-BR")}</>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BarChartCard
          title="📈 Produtos com maior potencial (por acerto)"
          data={graficoPotencial}
          cor="#84cc16"
        />

        <div className="rounded-xl bg-white/80 backdrop-blur-sm p-5 shadow-sm">
          <p className="mb-4 text-sm font-medium text-stone-700">Detalhe: oferecido x vendido</p>
          {potencialProdutos.length === 0 ? (
            <p className="text-sm text-stone-400">Sem dados neste mês ainda.</p>
          ) : (
            <div className="space-y-4">
              {potencialProdutos.map((p) => (
                <div key={p.produto}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <strong className="text-stone-900">{p.produto}</strong>
                    <span className="text-emerald-600">
                      Oferecido {p.oferecido}x | Vendido {p.vendido}x ({p.conversao.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                      style={{ width: `${Math.min(p.conversao, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
