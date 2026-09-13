import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/auth";
import { diasUteisNoMes, formatBRL } from "@/lib/metrics";
import StatCard from "@/components/StatCard";
import BarChartCard from "@/components/charts/BarChartCard";
import LineChartCard from "@/components/charts/LineChartCard";
import MetaForm from "@/components/MetaForm";
import { Target, TrendingUp, AlertCircle, Percent, Wallet, Gauge } from "lucide-react";
import type { Atendimento, Meta, Perfil } from "@/types/database";

export const dynamic = "force-dynamic";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MEDALHAS = ["🥇", "🥈", "🥉"];

function inicioFimMes(ano: number, mes: number) {
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  return { inicio, fim };
}

function ultimosMeses(ano: number, mes: number, quantidade: number) {
  const lista: { ano: number; mes: number }[] = [];
  for (let i = quantidade - 1; i >= 0; i--) {
    const data = new Date(ano, mes - 1 - i, 1);
    lista.push({ ano: data.getFullYear(), mes: data.getMonth() + 1 });
  }
  return lista;
}

export default async function MetasPage({
  searchParams,
}: {
  searchParams: { ano?: string; mes?: string };
}) {
  const hoje = new Date();
  const ano = Number(searchParams.ano) || hoje.getFullYear();
  const mes = Number(searchParams.mes) || hoje.getMonth() + 1;

  const supabase = createClient();
  const perfil = await getPerfilAtual();
  if (!perfil) return null;

  const { inicio, fim } = inicioFimMes(ano, mes);
  const diasUteisTotais = diasUteisNoMes(ano, mes);
  const ehMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1;
  const diasUteisDecorridos = ehMesAtual
    ? diasUteisNoMes(ano, mes, true, hoje)
    : new Date(ano, mes - 1, 1) < hoje
      ? diasUteisTotais
      : 0;
  const periodoTendencia = ultimosMeses(ano, mes, 6);
  const inicioTendencia = inicioFimMes(periodoTendencia[0].ano, periodoTendencia[0].mes).inicio;

  const [{ data: vendedoresData }, { data: metasData }, { data: atendimentosData }, { data: metasTendenciaData }, { data: atendimentosTendenciaData }] =
    await Promise.all([
      supabase.from("perfis").select("*").order("nome"),
      supabase.from("metas").select("*").eq("ano", ano).eq("mes", mes),
      supabase.from("atendimentos").select("*").gte("data", inicio).lte("data", fim),
      supabase.from("metas").select("*").gte("ano", periodoTendencia[0].ano),
      supabase.from("atendimentos").select("*").gte("data", inicioTendencia).lte("data", fim),
    ]);

  const vendedores = (vendedoresData ?? []) as Perfil[];
  const metas = (metasData ?? []) as Meta[];
  const atendimentos = (atendimentosData ?? []) as Atendimento[];
  const metasTendencia = (metasTendenciaData ?? []) as Meta[];
  const atendimentosTendencia = (atendimentosTendenciaData ?? []) as Atendimento[];

  const dados = vendedores.map((v) => {
    const meta = metas.find((m) => m.vendedor_id === v.id);
    const atendimentosVendedor = atendimentos.filter((a) => a.vendedor_id === v.id);
    const realizado = atendimentosVendedor
      .filter((a) => a.resultado === "compra")
      .reduce((soma, a) => soma + Number(a.valor ?? 0), 0);
    const prospeccoes = atendimentosVendedor.length;
    const vendas = atendimentosVendedor.filter((a) => a.resultado === "compra").length;
    const conversao = prospeccoes > 0 ? (vendas / prospeccoes) * 100 : 0;
    const percentualMeta = meta && Number(meta.meta_valor) > 0 ? (realizado / Number(meta.meta_valor)) * 100 : 0;
    const comissaoPercentual = Number(meta?.comissao_percentual ?? 1);
    const comissao = realizado * (comissaoPercentual / 100);

    const metaProspeccoesMensal = Number(meta?.meta_prospeccoes ?? 0);
    const ritmoNecessario = diasUteisTotais > 0 ? metaProspeccoesMensal / diasUteisTotais : 0;
    const ritmoAtual = diasUteisDecorridos > 0 ? prospeccoes / diasUteisDecorridos : 0;
    const noRitmo = metaProspeccoesMensal === 0 || ritmoAtual >= ritmoNecessario;

    return {
      vendedor: v,
      meta,
      realizado,
      prospeccoes,
      vendas,
      conversao,
      percentualMeta,
      comissaoPercentual,
      comissao,
      ritmoNecessario,
      ritmoAtual,
      noRitmo,
    };
  });

  const ranking = [...dados].sort((a, b) => b.percentualMeta - a.percentualMeta);

  const metaTotal = dados.reduce((soma, d) => soma + Number(d.meta?.meta_valor ?? 0), 0);
  const realizadoTotal = dados.reduce((soma, d) => soma + d.realizado, 0);
  const comissaoTotal = dados.reduce((soma, d) => soma + d.comissao, 0);
  const faltam = Math.max(metaTotal - realizadoTotal, 0);
  const conversaoGeral =
    dados.reduce((s, d) => s + d.prospeccoes, 0) > 0
      ? (dados.reduce((s, d) => s + d.vendas, 0) / dados.reduce((s, d) => s + d.prospeccoes, 0)) * 100
      : 0;

  const metaProspeccoesGeral = dados.reduce((soma, d) => soma + Number(d.meta?.meta_prospeccoes ?? 0), 0);
  const prospeccoesTotal = dados.reduce((soma, d) => soma + d.prospeccoes, 0);
  const ritmoNecessarioGeral = diasUteisTotais > 0 ? metaProspeccoesGeral / diasUteisTotais : 0;
  const ritmoAtualGeral = diasUteisDecorridos > 0 ? prospeccoesTotal / diasUteisDecorridos : 0;

  const graficoVendedores = dados.map((d) => ({
    produto: d.vendedor.nome,
    quantidade: d.realizado,
  }));

  const tendenciaMensal = periodoTendencia.map(({ ano: a, mes: m }) => {
    const { inicio: ini, fim: end } = inicioFimMes(a, m);
    const metaMes = metasTendencia
      .filter((meta) => meta.ano === a && meta.mes === m)
      .reduce((soma, meta) => soma + Number(meta.meta_valor), 0);
    const realizadoMes = atendimentosTendencia
      .filter((at) => at.data >= ini && at.data <= end && at.resultado === "compra")
      .reduce((soma, at) => soma + Number(at.valor ?? 0), 0);
    return { mes: MESES_ABREV[m - 1], meta: metaMes, realizado: realizadoMes };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Metas</h1>
          <p className="text-sm text-slate-500">
            Meta vs realizado — {MESES[mes - 1]} de {ano}
          </p>
        </div>
        <form className="flex items-center gap-2" method="get">
          <select name="ano" defaultValue={ano} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            {[ano - 1, ano, ano + 1].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select name="mes" defaultValue={mes} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            {MESES.map((nome, index) => (
              <option key={nome} value={index + 1}>{nome}</option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300">
            Filtrar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Meta do período" value={formatBRL(metaTotal)} icon={Target} />
        <StatCard label="Realizado" value={formatBRL(realizadoTotal)} icon={TrendingUp} />
        <StatCard label="Faltam para meta" value={formatBRL(faltam)} icon={AlertCircle} />
        <StatCard label="Conversão geral" value={`${conversaoGeral.toFixed(1)}%`} icon={Percent} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Comissão ganha (total)" value={formatBRL(comissaoTotal)} icon={Wallet} />
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="rounded-lg bg-violet-50 p-3">
            <Gauge className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Ritmo de contatos</p>
            <p className="text-lg font-semibold text-slate-900">
              {ritmoAtualGeral.toFixed(1)} / dia
              <span className="ml-2 text-sm font-normal text-slate-400">
                (precisa de {ritmoNecessarioGeral.toFixed(1)}/dia pra bater a meta)
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LineChartCard
          title="Tendência — meta vs realizado (últimos 6 meses)"
          data={tendenciaMensal}
          xKey="mes"
          lines={[
            { key: "meta", nome: "Meta", cor: "#94a3b8", tracejada: true },
            { key: "realizado", nome: "Realizado", cor: "#7c3aed" },
          ]}
        />
        <BarChartCard title="Realizado por vendedor no período" data={graficoVendedores} />
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-900">🏆 Ranking do período</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Vendedor</th>
                <th className="px-4 py-3 font-medium">Meta</th>
                <th className="px-4 py-3 font-medium">Realizado</th>
                <th className="px-4 py-3 font-medium">% Meta</th>
                <th className="px-4 py-3 font-medium">Conversão</th>
                <th className="px-4 py-3 font-medium">Ritmo de contatos</th>
                <th className="px-4 py-3 font-medium">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((d, index) => (
                <tr key={d.vendedor.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">{MEDALHAS[index] ?? index + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{d.vendedor.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{formatBRL(Number(d.meta?.meta_valor ?? 0))}</td>
                  <td className="px-4 py-3 text-slate-600">{formatBRL(d.realizado)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-violet-600"
                          style={{ width: `${Math.min(d.percentualMeta, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600">{d.percentualMeta.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{d.conversao.toFixed(1)}%</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        d.noRitmo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {d.ritmoAtual.toFixed(1)}/dia (precisa {d.ritmoNecessario.toFixed(1)}/dia)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatBRL(d.comissao)} <span className="text-xs text-slate-400">({d.comissaoPercentual}%)</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {perfil.papel === "master" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">⚙️ Configurar meta</h2>
          <MetaForm vendedores={vendedores} ano={ano} mes={mes} />
        </div>
      )}
    </div>
  );
}
