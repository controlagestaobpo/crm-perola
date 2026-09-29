import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/auth";
import { getClientesComHistorico } from "@/lib/clientes";
import {
  agoraBrasil,
  agruparResultados,
  atendimentosValidos,
  contarProdutos,
  contarResultado,
  formatBRL,
  labelResultado,
  somaValor,
} from "@/lib/metrics";
import PrintButton from "@/components/PrintButton";
import ProdutosTabela from "@/components/ProdutosTabela";
import type { Atendimento, Meta, Perfil } from "@/types/database";

const CORES_RESULTADO: Record<string, string> = {
  Compra: "text-perola-verde",
  Orçamento: "text-perola-verde-medio",
  Interessado: "text-perola-alerta",
  "Sem interesse": "text-perola-texto-2",
  "Não atendeu": "text-perola-texto-2",
  Indisponível: "text-perola-erro",
};

export const dynamic = "force-dynamic";

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
  const perfilAtual = await getPerfilAtual();
  if (!perfilAtual) return null;
  if (perfilAtual.papel !== "master") redirect("/");

  const hoje = agoraBrasil();
  const ano = Number(searchParams.ano) || hoje.getUTCFullYear();
  const mes = Number(searchParams.mes) || hoje.getUTCMonth() + 1;
  const { inicio, fim } = inicioFimMes(ano, mes);

  const supabase = createClient();

  const [{ data: atendimentosData }, { data: vendedoresData }, { data: metasData }, clientesHistorico] =
    await Promise.all([
      supabase.from("atendimentos").select("*, clientes(nome)").gte("data", inicio).lte("data", fim),
      supabase.from("perfis").select("*").neq("papel", "master").order("nome"),
      supabase.from("metas").select("*").eq("ano", ano).eq("mes", mes),
      getClientesComHistorico(supabase),
    ]);

  const atendimentos = (atendimentosData ?? []) as (Atendimento & { clientes: { nome: string } | null })[];
  const vendedores = (vendedoresData ?? []) as Perfil[];
  const metas = (metasData ?? []) as Meta[];

  // "Não atendeu" não conta como atendimento pra fins de contagem/conversão
  // (ninguém atendeu o telefone) — continua salvo e aparece na Distribuição
  // de resultados (seção 3), só fica fora dos totais de atividade.
  const atendimentosContam = atendimentosValidos(atendimentos);

  const totalAtendimentos = atendimentosContam.length;
  const totalVendas = contarResultado(atendimentos, "compra");
  const receita = somaValor(atendimentos, "valor");
  const ticketMedio = totalVendas > 0 ? receita / totalVendas : 0;
  const conversaoGeral = totalAtendimentos > 0 ? (totalVendas / totalAtendimentos) * 100 : 0;
  const metaTotal = metas.reduce((s, m) => s + Number(m.meta_valor), 0);
  const pipelineAberto = atendimentos.filter((a) => a.resultado === "negociacao");
  const pipelineValor = somaValor(pipelineAberto, "valor_negociacao");
  const clientesAtendidos = new Set(atendimentosContam.map((a) => a.cliente_id)).size;
  const sacosVendidosTotal = somaValor(atendimentos, "quantidade_sacos");
  const freteTotal = somaValor(atendimentos, "valor_frete");

  const porVendedor = vendedores.map((v) => {
    const dele = atendimentosContam.filter((a) => a.vendedor_id === v.id);
    const vendas = dele.filter((a) => a.resultado === "compra");
    const receitaVendedor = somaValor(vendas, "valor");
    const sacosVendidos = somaValor(vendas, "quantidade_sacos");
    const freteVendedor = somaValor(vendas, "valor_frete");
    const baseComissao = Math.max(receitaVendedor - freteVendedor, 0);
    const meta = metas.find((m) => m.vendedor_id === v.id);
    const comissaoPercentual = Number(meta?.comissao_percentual ?? 1);
    return {
      vendedor: v,
      atendimentos: dele.length,
      vendas: vendas.length,
      receita: receitaVendedor,
      sacosVendidos,
      freteVendedor,
      baseComissao,
      comissaoPercentual,
      conversao: dele.length > 0 ? (vendas.length / dele.length) * 100 : 0,
      meta: Number(meta?.meta_valor ?? 0),
      percentualMeta: meta && Number(meta.meta_valor) > 0 ? (receitaVendedor / Number(meta.meta_valor)) * 100 : 0,
      // Comissão = (valor da venda - frete) x % de comissão.
      comissao: baseComissao * (comissaoPercentual / 100),
    };
  });

  const comissaoTotal = porVendedor.reduce((soma, d) => soma + d.comissao, 0);

  const oferecidos = contarProdutos(atendimentos, "produtos_oferecidos");
  const vendidos = contarProdutos(atendimentos, "produtos_vendidos");
  const produtosCompletos = oferecidos
    .map((o) => {
      const v = vendidos.find((x) => x.produto === o.produto)?.quantidade ?? 0;
      return { produto: o.produto, oferecido: o.quantidade, vendido: v, conversao: o.quantidade > 0 ? (v / o.quantidade) * 100 : 0 };
    })
    .sort((a, b) => b.conversao - a.conversao || b.oferecido - a.oferecido);

  const topClientes = [...clientesHistorico].sort((a, b) => b.valorTotal - a.valorTotal).filter((c) => c.valorTotal > 0).slice(0, 10);
  const clientesInativos = clientesHistorico
    .filter((c) => c.diasSemComprar !== null && c.diasSemComprar > 30)
    .sort((a, b) => (b.diasSemComprar ?? 9999) - (a.diasSemComprar ?? 9999));
  const clientesSemVendas = clientesHistorico
    .filter((c) => c.totalCompras === 0)
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const cidadesMap = new Map<string, { quantidade: number; valorTotal: number }>();
  for (const c of clientesHistorico) {
    const cidade = c.cidade?.trim() || "Sem cidade cadastrada";
    const atual = cidadesMap.get(cidade) ?? { quantidade: 0, valorTotal: 0 };
    cidadesMap.set(cidade, { quantidade: atual.quantidade + 1, valorTotal: atual.valorTotal + c.valorTotal });
  }
  const clientesPorCidade = Array.from(cidadesMap.entries())
    .map(([cidade, dados]) => ({ cidade, ...dados }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const observacoesCompiladas = atendimentos
    .filter((a) => a.observacoes && a.observacoes.trim())
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em));

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
          <h1 className="text-2xl font-semibold text-perola-texto">Relatório completo</h1>
          <p className="text-sm text-perola-texto-2">Todos os dados do período, prontos para análise</p>
        </div>
        <div className="flex items-center gap-2">
          <form className="flex items-center gap-2" method="get">
            <select name="ano" defaultValue={ano} className="rounded-[10px] border border-[#DAD8CD] bg-white px-3 py-1.5 text-sm text-perola-texto focus:border-perola-verde focus:outline-none">
              {[ano - 1, ano, ano + 1].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select name="mes" defaultValue={mes} className="rounded-[10px] border border-[#DAD8CD] bg-white px-3 py-1.5 text-sm text-perola-texto focus:border-perola-verde focus:outline-none">
              {MESES.map((nome, index) => (
                <option key={nome} value={index + 1}>{nome}</option>
              ))}
            </select>
            <button type="submit" className="rounded-[10px] bg-perola-tag px-3 py-1.5 text-sm font-medium text-perola-texto hover:brightness-95">
              Filtrar
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      <div className="hidden print:block">
        <h1 className="text-2xl font-bold text-perola-texto">CRM Pérola — Relatório de {MESES[mes - 1]} de {ano}</h1>
        <p className="text-sm text-perola-texto-2">Gerado em {hoje.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p>
      </div>

      {/* RESUMO GERAL */}
      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold text-perola-texto">1. Resumo geral</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(() => {
            const itens: [string, string][] = [
              ["Atendimentos", String(totalAtendimentos)],
              ["Clientes atendidos", String(clientesAtendidos)],
              ["Vendas", `${totalVendas} (${conversaoGeral.toFixed(1)}%)`],
              ["Receita", formatBRL(receita)],
              ["Ticket médio", formatBRL(ticketMedio)],
              ["Sacos vendidos", `${sacosVendidosTotal} sacos`],
              ["Total de frete", formatBRL(freteTotal)],
              ["Meta do período", formatBRL(metaTotal)],
              ["% da meta batida", metaTotal > 0 ? `${((receita / metaTotal) * 100).toFixed(1)}%` : "—"],
              ["Pipeline em aberto", formatBRL(pipelineValor)],
              ["Orçamentos abertos", String(pipelineAberto.length)],
              ["Comissão total (equipe)", formatBRL(comissaoTotal)],
            ];
            return itens.map(([label, value]) => (
              <div key={label} className="rounded-[14px] border border-perola-borda bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-perola-texto-2">{label}</p>
                <p className="text-xl font-semibold text-perola-texto">{value}</p>
              </div>
            ));
          })()}
        </div>
      </section>

      {/* DESEMPENHO POR VENDEDOR */}
      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold text-perola-texto">2. Desempenho por vendedor</h2>
        <div className="overflow-x-auto rounded-[14px] border border-perola-borda bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-perola-divisor bg-[#FAFAF6] text-perola-texto-2">
              <tr>
                <th className="px-3 py-2 font-medium">Vendedor</th>
                <th className="px-3 py-2 font-medium">Atendimentos</th>
                <th className="px-3 py-2 font-medium">Vendas</th>
                <th className="px-3 py-2 font-medium">Conversão</th>
                <th className="px-3 py-2 font-medium">Receita</th>
                <th className="px-3 py-2 font-medium">Sacos</th>
                <th className="px-3 py-2 font-medium">Meta</th>
                <th className="px-3 py-2 font-medium">% Meta</th>
                <th className="px-3 py-2 font-medium">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {porVendedor.map((d) => (
                <tr key={d.vendedor.id} className="border-b border-perola-divisor last:border-0">
                  <td className="px-3 py-2 font-medium text-perola-texto">{d.vendedor.nome}</td>
                  <td className="px-3 py-2 text-perola-texto-2">{d.atendimentos}</td>
                  <td className="px-3 py-2 text-perola-texto-2">{d.vendas}</td>
                  <td className="px-3 py-2 text-perola-texto-2">{d.conversao.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-perola-texto-2">{formatBRL(d.receita)}</td>
                  <td className="px-3 py-2 text-perola-texto-2">{d.sacosVendidos} sacos</td>
                  <td className="px-3 py-2 text-perola-texto-2">{formatBRL(d.meta)}</td>
                  <td className="px-3 py-2 text-perola-texto-2">{d.percentualMeta.toFixed(0)}%</td>
                  <td className="px-3 py-2 text-perola-texto-2">{formatBRL(d.comissao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FECHAMENTO DE COMISSÃO */}
      <section className="break-inside-avoid">
        <div className="rounded-[14px] border-2 border-perola-tag-pos-texto/25 bg-white p-5">
          <h2 className="mb-3 text-base font-semibold text-perola-texto">Fechamento de comissão do período</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-perola-divisor text-perola-texto-2">
                <tr>
                  <th className="px-3 py-2 font-medium">Vendedor</th>
                  <th className="px-3 py-2 font-medium">Vendas (R$)</th>
                  <th className="px-3 py-2 font-medium">Frete (R$)</th>
                  <th className="px-3 py-2 font-medium">Base p/ comissão</th>
                  <th className="px-3 py-2 font-medium">%</th>
                  <th className="px-3 py-2 font-medium">A pagar</th>
                </tr>
              </thead>
              <tbody>
                {porVendedor.map((d) => (
                  <tr key={d.vendedor.id} className="border-b border-perola-divisor last:border-0">
                    <td className="px-3 py-2 font-medium text-perola-texto">{d.vendedor.nome}</td>
                    <td className="px-3 py-2 text-perola-texto-2">{formatBRL(d.receita)}</td>
                    <td className="px-3 py-2 text-perola-texto-2">{formatBRL(d.freteVendedor)}</td>
                    <td className="px-3 py-2 text-perola-texto-2">{formatBRL(d.baseComissao)}</td>
                    <td className="px-3 py-2 text-perola-texto-2">{d.comissaoPercentual}%</td>
                    <td className="px-3 py-2 font-semibold text-perola-tag-pos-texto">{formatBRL(d.comissao)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-perola-divisor">
                  <td className="px-3 py-2 font-semibold text-perola-texto">Total</td>
                  <td className="px-3 py-2 font-semibold text-perola-texto">{formatBRL(receita)}</td>
                  <td className="px-3 py-2 font-semibold text-perola-texto">{formatBRL(freteTotal)}</td>
                  <td className="px-3 py-2 font-semibold text-perola-texto">
                    {formatBRL(porVendedor.reduce((soma, d) => soma + d.baseComissao, 0))}
                  </td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2 font-bold text-perola-tag-pos-texto">{formatBRL(comissaoTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* RESULTADOS */}
      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold text-perola-texto">3. Distribuição de resultados</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {resultadosDistribuicao.map((r) => (
            <div key={r.nome} className="rounded-[14px] border border-perola-borda bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-perola-texto-2">{r.nome}</p>
              <p className={`text-2xl font-semibold ${CORES_RESULTADO[r.nome] ?? "text-perola-texto"}`}>{r.quantidade}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUTOS */}
      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold text-perola-texto">4. Produtos — oferecidos vs. vendidos</h2>
        <div className="overflow-x-auto rounded-[14px] border border-perola-borda bg-white">
          <ProdutosTabela dados={produtosCompletos} />
        </div>
      </section>

      {/* CLIENTES */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="break-inside-avoid">
          <h2 className="mb-3 text-lg font-semibold text-perola-texto">5. Top 10 clientes (histórico)</h2>
          <div className="overflow-x-auto rounded-[14px] border border-perola-borda bg-white">
            <table className="w-full text-left text-sm">
              <tbody>
                {topClientes.length === 0 ? (
                  <tr><td className="px-3 py-4 text-center text-perola-texto-2">Sem compras registradas.</td></tr>
                ) : (
                  topClientes.map((c) => (
                    <tr key={c.id} className="border-b border-perola-divisor last:border-0">
                      <td className="px-3 py-2 font-medium text-perola-texto">{c.nome}</td>
                      <td className="px-3 py-2 text-perola-texto-2">{formatBRL(c.valorTotal)}</td>
                      <td className="px-3 py-2 text-perola-texto-2">{c.totalCompras} compras</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="break-inside-avoid">
          <h2 className="mb-3 text-lg font-semibold text-perola-texto">6. Clientes inativos (30+ dias)</h2>
          <div className="max-h-80 overflow-y-auto rounded-[14px] border border-perola-borda bg-white">
            <table className="w-full text-left text-sm">
              <tbody>
                {clientesInativos.length === 0 ? (
                  <tr><td className="px-3 py-4 text-center text-perola-texto-2">Nenhum cliente inativo.</td></tr>
                ) : (
                  clientesInativos.map((c) => (
                    <tr key={c.id} className="border-b border-perola-divisor last:border-0">
                      <td className="px-3 py-2 font-medium text-perola-texto">{c.nome}</td>
                      <td className="px-3 py-2 text-perola-texto-2">
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

      {/* CLIENTES POR CIDADE E SEM VENDAS */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="break-inside-avoid">
          <h2 className="mb-3 text-lg font-semibold text-perola-texto">7. Clientes por cidade</h2>
          <div className="max-h-80 overflow-y-auto rounded-[14px] border border-perola-borda bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-perola-divisor bg-[#FAFAF6] text-perola-texto-2">
                <tr>
                  <th className="px-3 py-2 font-medium">Cidade</th>
                  <th className="px-3 py-2 font-medium">Clientes</th>
                  <th className="px-3 py-2 font-medium">Valor total</th>
                </tr>
              </thead>
              <tbody>
                {clientesPorCidade.map((c) => (
                  <tr key={c.cidade} className="border-b border-perola-divisor last:border-0">
                    <td className="px-3 py-2 font-medium text-perola-texto">{c.cidade}</td>
                    <td className="px-3 py-2 text-perola-texto-2">{c.quantidade}</td>
                    <td className="px-3 py-2 text-perola-texto-2">{formatBRL(c.valorTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="break-inside-avoid">
          <h2 className="mb-3 text-lg font-semibold text-perola-texto">8. Clientes sem nenhuma venda</h2>
          <div className="max-h-80 overflow-y-auto rounded-[14px] border border-perola-borda bg-white">
            <table className="w-full text-left text-sm">
              <tbody>
                {clientesSemVendas.length === 0 ? (
                  <tr><td className="px-3 py-4 text-center text-perola-texto-2">Todos os clientes já compraram alguma vez.</td></tr>
                ) : (
                  clientesSemVendas.map((c) => (
                    <tr key={c.id} className="border-b border-perola-divisor last:border-0">
                      <td className="px-3 py-2 font-medium text-perola-texto">{c.nome}</td>
                      <td className="px-3 py-2 text-perola-texto-2">{c.cidade ?? "—"}</td>
                      <td className="px-3 py-2 text-perola-texto-2">{c.telefone ?? "—"}</td>
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
        <h2 className="mb-3 text-lg font-semibold text-perola-texto">9. Motivos de não-venda</h2>
        {razoesNaoVenda.length === 0 ? (
          <p className="text-sm text-perola-texto-2">Sem registros no período.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {razoesNaoVenda.map((r) => (
              <li key={r.motivo} className="rounded-lg border border-perola-borda bg-white px-4 py-2 text-sm text-perola-texto">
                <strong>{r.motivo}</strong> — {r.quantidade}x
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* PIPELINE ABERTO */}
      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold text-perola-texto">10. Orçamentos em aberto</h2>
        {pipelineAberto.length === 0 ? (
          <p className="text-sm text-perola-texto-2">Nenhum orçamento em aberto.</p>
        ) : (
          <div className="overflow-x-auto rounded-[14px] border border-perola-borda bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-perola-divisor bg-[#FAFAF6] text-perola-texto-2">
                <tr>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Resultado</th>
                  <th className="px-3 py-2 font-medium">Valor do orçamento</th>
                </tr>
              </thead>
              <tbody>
                {pipelineAberto.map((a) => (
                  <tr key={a.id} className="border-b border-perola-divisor last:border-0">
                    <td className="px-3 py-2 text-perola-texto-2">{new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                    <td className="px-3 py-2 text-perola-texto-2">{labelResultado(a.resultado)}</td>
                    <td className="px-3 py-2 text-perola-texto-2">{formatBRL(Number(a.valor_negociacao ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* OBSERVACOES COMPILADAS */}
      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold text-perola-texto">11. Observações dos atendimentos</h2>
        {observacoesCompiladas.length === 0 ? (
          <p className="text-sm text-perola-texto-2">Nenhuma observação registrada no período.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-[14px] border border-perola-borda bg-white">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-perola-divisor bg-[#FAFAF6] text-perola-texto-2">
                <tr>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Observação</th>
                </tr>
              </thead>
              <tbody>
                {observacoesCompiladas.map((a) => (
                  <tr key={a.id} className="border-b border-perola-divisor last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap text-perola-texto-2">
                      {new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-2 font-medium text-perola-texto">{a.clientes?.nome ?? "—"}</td>
                    <td className="px-3 py-2 text-perola-texto-2">{a.observacoes}</td>
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
