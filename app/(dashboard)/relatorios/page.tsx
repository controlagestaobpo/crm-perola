import { createClient } from "@/lib/supabase/server";
import { getClientesComHistorico } from "@/lib/clientes";
import {
  agruparResultados,
  contarProdutos,
  contarResultado,
  formatBRL,
  labelResultado,
  somaValor,
} from "@/lib/metrics";
import PrintButton from "@/components/PrintButton";
import type { Atendimento, Meta, Perfil } from "@/types/database";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function inicioFimMes(ano: number, mes: number) {
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  return { inicio, fim };
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: { ano?: string; mes?: string };
}) {
  const hoje = new Date();
  const ano = Number(searchParams.ano) || hoje.getFullYear();
  const mes = Number(searchParams.mes) || hoje.getMonth() + 1;
  const { inicio, fim } = inicioFimMes(ano, mes);

  const supabase = createClient();

  const [{ data: atendimentosData }, { data: vendedoresData }, { data: metasData }, clientesHistorico] =
    await Promise.all([
      supabase.from("atendimentos").select("*").gte("data", inicio).lte("data", fim),
      supabase.from("perfis").select("*").order("nome"),
      supabase.from("metas").select("*").eq("ano", ano).eq("mes", mes),
      getClientesComHistorico(supabase),
    ]);

  const atendimentos = (atendimentosData ?? []) as Atendimento[];
  const vendedores = (vendedoresData ?? []) as Perfil[];
  const metas = (metasData ?? []) as Meta[];

  const totalAtendimentos = atendimentos.length;
  const totalVendas = contarResultado(atendimentos, "compra");
  const receita = somaValor(atendimentos, "valor");
  const ticketMedio = totalVendas > 0 ? receita / totalVendas : 0;
  const conversaoGeral = totalAtendimentos > 0 ? (totalVendas / totalAtendimentos) * 100 : 0;
  const metaTotal = metas.reduce((s, m) => s + Number(m.meta_valor), 0);
  const pipelineAberto = atendimentos.filter((a) => a.resultado === "negociacao");
  const pipelineValor = somaValor(pipelineAberto, "valor_negociacao");

  const porVendedor = vendedores.map((v) => {
    const dele = atendimentos.filter((a) => a.vendedor_id === v.id);
    const vendas = dele.filter((a) => a.resultado === "compra");
    const receitaVendedor = somaValor(vendas, "valor");
    const meta = metas.find((m) => m.vendedor_id === v.id);
    return {
      vendedor: v,
      atendimentos: dele.length,
      vendas: vendas.length,
      receita: receitaVendedor,
      conversao: dele.length > 0 ? (vendas.length / dele.length) * 100 : 0,
      meta: Number(meta?.meta_valor ?? 0),
      percentualMeta: meta && Number(meta.meta_valor) > 0 ? (receitaVendedor / Number(meta.meta_valor)) * 100 : 0,
    };
  });

  const oferecidos = contarProdutos(atendimentos, "produtos_oferecidos");
  const vendidos = contarProdutos(atendimentos, "produtos_vendidos");
  const produtosCompletos = oferecidos
    .map((o) => {
      const v = vendidos.find((x) => x.produto === o.produto)?.quantidade ?? 0;
      return { produto: o.produto, oferecido: o.quantidade, vendido: v, conversao: o.quantidade > 0 ? (v / o.quantidade) * 100 : 0 };
    })
    .sort((a, b) => b.oferecido - a.oferecido);

  const topClientes = [...clientesHistorico].sort((a, b) => b.valorTotal - a.valorTotal).filter((c) => c.valorTotal > 0).slice(0, 10);
  const clientesInativos = clientesHistorico
    .filter((c) => c.diasSemComprar === null || c.diasSemComprar > 30)
    .sort((a, b) => (b.diasSemComprar ?? 9999) - (a.diasSemComprar ?? 9999));

  const semInteresse = atendimentos.filter((a) => a.resultado === "sem_interesse" && a.motivo);
  const motivos = new Map<string, number>();
  for (const a of semInteresse) motivos.set(a.motivo as string, (motivos.get(a.motivo as string) ?? 0) + 1);
  const razoesNaoVenda = Array.from(motivos.entries())
    .map(([motivo, quantidade]) => ({ motivo, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const resultadosDistribuicao = agruparResultados(atendimentos);

  return (
    <div className="space-y-8 print:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Relatório completo</h1>
          <p className="text-sm text-slate-500">Todos os dados do período, prontos para análise</p>
        </div>
        <div className="flex items-center gap-2">
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
          <PrintButton />
        </div>
      </div>

      <div className="hidden print:block">
        <h1 className="text-2xl font-bold text-slate-900">CRM Pérola — Relatório de {MESES[mes - 1]} de {ano}</h1>
        <p className="text-sm text-slate-500">Gerado em {new Date().toLocaleDateString("pt-BR")}</p>
      </div>

      {/* RESUMO GERAL */}
      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">1. Resumo geral</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Atendimentos", String(totalAtendimentos)],
            ["Vendas", `${totalVendas} (${conversaoGeral.toFixed(1)}%)`],
            ["Receita", formatBRL(receita)],
            ["Ticket médio", formatBRL(ticketMedio)],
            ["Meta do período", formatBRL(metaTotal)],
            ["% da meta batida", metaTotal > 0 ? `${((receita / metaTotal) * 100).toFixed(1)}%` : "—"],
            ["Pipeline em aberto", formatBRL(pipelineValor)],
            ["Negociações abertas", String(pipelineAberto.length)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-lg font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DESEMPENHO POR VENDEDOR */}
      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">2. Desempenho por vendedor</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Vendedor</th>
                <th className="px-3 py-2 font-medium">Atendimentos</th>
                <th className="px-3 py-2 font-medium">Vendas</th>
                <th className="px-3 py-2 font-medium">Conversão</th>
                <th className="px-3 py-2 font-medium">Receita</th>
                <th className="px-3 py-2 font-medium">Meta</th>
                <th className="px-3 py-2 font-medium">% Meta</th>
              </tr>
            </thead>
            <tbody>
              {porVendedor.map((d) => (
                <tr key={d.vendedor.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2 font-medium text-slate-900">{d.vendedor.nome}</td>
                  <td className="px-3 py-2 text-slate-600">{d.atendimentos}</td>
                  <td className="px-3 py-2 text-slate-600">{d.vendas}</td>
                  <td className="px-3 py-2 text-slate-600">{d.conversao.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-slate-600">{formatBRL(d.receita)}</td>
                  <td className="px-3 py-2 text-slate-600">{formatBRL(d.meta)}</td>
                  <td className="px-3 py-2 text-slate-600">{d.percentualMeta.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* RESULTADOS */}
      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">3. Distribuição de resultados</h2>
        <div className="flex flex-wrap gap-3">
          {resultadosDistribuicao.map((r) => (
            <div key={r.nome} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm">
              <span className="font-medium text-slate-900">{r.nome}:</span>{" "}
              <span className="text-slate-600">{r.quantidade}</span>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUTOS */}
      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">4. Produtos — oferecidos vs. vendidos</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-3 py-2 font-medium">Oferecido</th>
                <th className="px-3 py-2 font-medium">Vendido</th>
                <th className="px-3 py-2 font-medium">Conversão</th>
              </tr>
            </thead>
            <tbody>
              {produtosCompletos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-slate-400">Sem dados no período.</td>
                </tr>
              ) : (
                produtosCompletos.map((p) => (
                  <tr key={p.produto} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-slate-900">{p.produto}</td>
                    <td className="px-3 py-2 text-slate-600">{p.oferecido}x</td>
                    <td className="px-3 py-2 text-slate-600">{p.vendido}x</td>
                    <td className="px-3 py-2 text-slate-600">{p.conversao.toFixed(0)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* CLIENTES */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="break-inside-avoid">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">5. Top 10 clientes (histórico)</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <tbody>
                {topClientes.length === 0 ? (
                  <tr><td className="px-3 py-4 text-center text-slate-400">Sem compras registradas.</td></tr>
                ) : (
                  topClientes.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2 font-medium text-slate-900">{c.nome}</td>
                      <td className="px-3 py-2 text-slate-600">{formatBRL(c.valorTotal)}</td>
                      <td className="px-3 py-2 text-slate-600">{c.totalCompras} compras</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="break-inside-avoid">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">6. Clientes inativos (30+ dias)</h2>
          <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <tbody>
                {clientesInativos.length === 0 ? (
                  <tr><td className="px-3 py-4 text-center text-slate-400">Nenhum cliente inativo.</td></tr>
                ) : (
                  clientesInativos.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2 font-medium text-slate-900">{c.nome}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {c.diasSemComprar ? `${c.diasSemComprar} dias` : "Nunca comprou"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* MOTIVOS DE NAO VENDA */}
      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">7. Motivos de não-venda</h2>
        {razoesNaoVenda.length === 0 ? (
          <p className="text-sm text-slate-400">Sem registros no período.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {razoesNaoVenda.map((r) => (
              <li key={r.motivo} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
                <strong>{r.motivo}</strong> — {r.quantidade}x
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* PIPELINE ABERTO */}
      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">8. Negociações em aberto</h2>
        {pipelineAberto.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma negociação em aberto.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Resultado</th>
                  <th className="px-3 py-2 font-medium">Valor em negociação</th>
                </tr>
              </thead>
              <tbody>
                {pipelineAberto.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-slate-600">{new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                    <td className="px-3 py-2 text-slate-600">{labelResultado(a.resultado)}</td>
                    <td className="px-3 py-2 text-slate-600">{formatBRL(Number(a.valor_negociacao ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
