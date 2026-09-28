import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/auth";
import { getClientesComHistorico } from "@/lib/clientes";
import { agoraBrasil, atendimentosValidos, contarProdutos, diasEntreHojeE, formatBRL, melhorHorarioContato, somaComissao, somaValor } from "@/lib/metrics";
import StatCard from "@/components/StatCard";
import PieChartCard from "@/components/charts/PieChartCard";
import BarChartCard from "@/components/charts/BarChartCard";
import { Percent, Clock, AlertTriangle, Receipt, Wallet, Package } from "lucide-react";
import type { Atendimento, Meta } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const supabase = createClient();
  const perfil = await getPerfilAtual();
  if (!perfil) return null;
  if (perfil.papel === "vendedor") redirect("/");

  const hoje = agoraBrasil();
  const ano = hoje.getUTCFullYear();
  const mes = hoje.getUTCMonth() + 1;
  const inicioMes = `${ano}-${String(mes).padStart(2, "0")}-01`;

  // Só as colunas que essa página usa (sem cliente_id/observações/etc, que
  // ficam pesadas e não fazem falta aqui).
  const CAMPOS_ATENDIMENTO =
    "vendedor_id, resultado, valor, valor_frete, quantidade_sacos, motivo, produtos_oferecidos, produtos_vendidos, criado_em";

  const [{ data: atendimentosData }, clientesHistorico, { data: metasData }] = await Promise.all([
    supabase.from("atendimentos").select(CAMPOS_ATENDIMENTO).gte("data", inicioMes),
    getClientesComHistorico(supabase),
    supabase.from("metas").select("*").eq("ano", ano).eq("mes", mes),
  ]);

  const atendimentos = (atendimentosData ?? []) as Pick<
    Atendimento,
    "vendedor_id" | "resultado" | "valor" | "valor_frete" | "quantidade_sacos" | "motivo" | "produtos_oferecidos" | "produtos_vendidos" | "criado_em"
  >[];
  const metas = (metasData ?? []) as Meta[];

  const comissaoTotal = metas.reduce((soma, meta) => {
    const atendimentosVendedor = atendimentos.filter((a) => a.vendedor_id === meta.vendedor_id);
    return soma + somaComissao(atendimentosVendedor, Number(meta.comissao_percentual));
  }, 0);
  const sacosVendidos = somaValor(atendimentos, "quantidade_sacos");
  // "Não atendeu" não conta como atendimento pra fins de conversão/contagem.
  const totalAtendimentos = atendimentosValidos(atendimentos).length;
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

  const horarios = melhorHorarioContato(atendimentos).slice(0, 6);
  const graficoHorarios = horarios.map((h) => ({ produto: h.faixa, quantidade: Math.round(h.taxa) }));

  const oportunidadesComUrgencia = oportunidades.map((c) => ({
    ...c,
    dias: c.proximo_contato ? diasEntreHojeE(c.proximo_contato) : null,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-perola-texto">Inteligência comercial</h1>
        <p className="text-sm text-perola-texto-2">Insights do mês atual</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Taxa de conversão" value={`${conversaoGeral.toFixed(1)}%`} icon={Percent} />
        <StatCard label="Ticket médio" value={formatBRL(ticketMedio)} icon={Receipt} />
        <StatCard label="Clientes sem comprar (30d+)" value={String(clientesSemComprar)} icon={AlertTriangle} />
        <StatCard label="Atendimentos no mês" value={String(totalAtendimentos)} icon={Clock} />
        <StatCard label="Sacos vendidos no mês" value={`${sacosVendidos} sacos`} icon={Package} />
        <StatCard label="Comissão do mês (total)" value={formatBRL(comissaoTotal)} icon={Wallet} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PieChartCard
          title="Razões de não-venda"
          data={razoesNaoVenda.map((r) => ({ nome: r.motivo, quantidade: r.quantidade }))}
        />

        <div className="rounded-[14px] border border-perola-borda bg-white p-5">
          <p className="mb-4 text-sm font-semibold text-perola-texto">Oportunidades rápidas</p>
          {oportunidadesComUrgencia.length === 0 ? (
            <p className="text-sm text-perola-texto-2">Nenhum orçamento em aberto.</p>
          ) : (
            <ul className="space-y-3">
              {oportunidadesComUrgencia.map((c) => {
                const corBadge =
                  c.dias === null
                    ? "bg-perola-tag text-perola-texto-2"
                    : c.dias <= 0
                      ? "bg-perola-erro-bg text-perola-erro"
                      : c.dias <= 2
                        ? "bg-[#FBF1E4] text-perola-alerta"
                        : "bg-perola-tag-pos-bg text-perola-tag-pos-texto";
                const textoBadge =
                  c.dias === null
                    ? "Sem data"
                    : c.dias === 0
                      ? "Hoje"
                      : c.dias < 0
                        ? `Atrasado ${Math.abs(c.dias)}d`
                        : `Em ${c.dias}d`;
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <strong className="text-perola-texto">{c.nome}</strong>
                      <span className="text-perola-texto-2">
                        {" "}
                        — {c.estagio === "negociacao" ? "Em orçamento" : "Contatado"}
                      </span>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${corBadge}`}>
                      {textoBadge}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BarChartCard
          title="Melhor horário para ligar"
          data={graficoHorarios}
          cor="#7FB52A"
        />

        <div className="rounded-[14px] border border-perola-borda bg-white p-5">
          <p className="mb-4 text-sm font-semibold text-perola-texto">Detalhe: atendimento por horário</p>
          {horarios.length === 0 ? (
            <p className="text-sm text-perola-texto-2">Sem dados neste mês ainda.</p>
          ) : (
            <div className="space-y-4">
              {horarios.map((h) => (
                <div key={h.hora}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <strong className="text-perola-texto">{h.faixa}</strong>
                    <span className="text-perola-texto-2">
                      {h.atendidas}/{h.total} atendidas ({h.taxa.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-perola-tag">
                    <div
                      className="h-full rounded-full bg-perola-verde-medio"
                      style={{ width: `${Math.min(h.taxa, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BarChartCard
          title="Produtos com maior potencial (por acerto)"
          data={graficoPotencial}
          cor="#1E2A18"
        />

        <div className="rounded-[14px] border border-perola-borda bg-white p-5">
          <p className="mb-4 text-sm font-semibold text-perola-texto">Detalhe: oferecido x vendido</p>
          {potencialProdutos.length === 0 ? (
            <p className="text-sm text-perola-texto-2">Sem dados neste mês ainda.</p>
          ) : (
            <div className="space-y-4">
              {potencialProdutos.map((p) => (
                <div key={p.produto}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <strong className="text-perola-texto">{p.produto}</strong>
                    <span className="text-perola-texto-2">
                      Oferecido {p.oferecido}x | Vendido {p.vendido}x ({p.conversao.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-perola-tag">
                    <div
                      className="h-full rounded-full bg-perola-verde-medio"
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
