import { DollarSign, ShoppingCart, Receipt, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/auth";
import { getClienteIdsDoVendedor, getClientesComHistorico } from "@/lib/clientes";
import { getAgenda } from "@/lib/agenda";
import StatCard from "@/components/StatCard";
import LineChartCard from "@/components/charts/LineChartCard";
import ProdutoChartComTabela from "@/components/charts/ProdutoChartComTabela";
import ProximasAtividades from "@/components/ProximasAtividades";
import BonusResumo from "@/components/BonusResumo";
import { calcularBonus, configDoBonus } from "@/lib/bonus";
import FiltroDashboard from "@/components/FiltroDashboard";
import CarregandoPagina from "@/components/CarregandoPagina";
import AtendimentosRecentesTabela from "@/components/AtendimentosRecentesTabela";
import { agruparPorDia, formatarDataCurta, inicioDoMes, metasPorDia, normalizarPeriodo } from "@/lib/periodo";
import { situacaoDosOrcamentos } from "@/lib/relatorio";
import {
  agoraBrasil,
  agruparPorDiaAcumulado,
  agruparPorHora,
  agruparResultados,
  atendimentosValidos,
  contarProdutos,
  contarResultado,
  diasUteisNoMes,
  diasUteisRestantes,
  formatBRL,
  hojeISOBrasil,
  ritmoEsperadoPercentual,
  somaValor,
} from "@/lib/metrics";
import type { Atendimento, Meta } from "@/types/database";

type AtendimentoComCliente = Atendimento & { clientes: { nome: string; documento?: string | null } | null };

const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";

const CORES_RESULTADO: Record<string, string> = {
  Compra: "#1E2A18",
  Orçamento: "#7FB52A",
  Interessado: "#A6E23A",
  "Sem interesse": "#D9C9A3",
  "Não atendeu": "#E5E3D9",
  Indisponível: "#C4CCBA",
};

function inicioFimMes(ano: number, mes: number) {
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  return { inicio, fim };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { periodo?: string; de?: string; ate?: string; vendedor?: string };
}) {
  const periodo =
    searchParams.periodo === "mes" ? "mes" : searchParams.periodo === "personalizado" ? "personalizado" : "hoje";
  const supabase = createClient();
  const perfil = await getPerfilAtual();
  if (!perfil) return null;

  const hoje = agoraBrasil();
  const hojeISO = hojeISOBrasil(hoje);
  const ano = hoje.getUTCFullYear();
  const mes = hoje.getUTCMonth() + 1;
  const { inicio, fim } = inicioFimMes(ano, mes);

  // Período personalizado: um dia (de = até) ou um intervalo, escolhido no
  // filtro do topo. As métricas "de agora" (ritmo, projeção) não se aplicam.
  const personalizado = periodo === "personalizado";
  const { de, ate } = normalizarPeriodo(searchParams.de, searchParams.ate, hojeISO);
  const umDia = de === ate;
  const sufixoPeriodo = !personalizado
    ? periodo === "hoje"
      ? "hoje"
      : "no mês"
    : umDia
      ? `em ${formatarDataCurta(de)}`
      : `de ${formatarDataCurta(de)} a ${formatarDataCurta(ate)}`;

  // Master e sócio enxergam os atendimentos de todo mundo e podem filtrar
  // por vendedor(a); vendedor já só enxerga os próprios (RLS).
  const podeFiltrarVendedor = perfil.papel === "master" || perfil.papel === "gerente";
  const vendedorId =
    podeFiltrarVendedor && searchParams.vendedor && REGEX_UUID.test(searchParams.vendedor) ? searchParams.vendedor : "";

  // A meta de um dia passado depende do que já tinha sido feito no mês, então
  // a busca começa no dia 1 do mês de "de".
  const buscaInicio = personalizado ? inicioDoMes(de) : inicio;
  const buscaFim = personalizado ? ate : fim;

  let consultaAtendimentos = supabase
    .from("atendimentos")
    .select("*, clientes(nome, documento)")
    .gte("data", buscaInicio)
    .lte("data", buscaFim)
    .order("criado_em", { ascending: true });
  let consultaMetas = personalizado
    ? supabase.from("metas").select("*").gte("ano", Number(de.slice(0, 4))).lte("ano", Number(ate.slice(0, 4)))
    : supabase.from("metas").select("*").eq("ano", ano).eq("mes", mes);
  // Para saber se um orçamento do período já virou compra (ou foi perdido),
  // é preciso olhar também o que foi lançado depois dele, até hoje.
  let consultaDesfechos = supabase
    .from("atendimentos")
    .select("id, cliente_id, data, criado_em, resultado")
    .in("resultado", ["negociacao", "compra", "sem_interesse"])
    .gte("data", buscaInicio);
  if (vendedorId) {
    consultaDesfechos = consultaDesfechos.eq("vendedor_id", vendedorId);
    consultaAtendimentos = consultaAtendimentos.eq("vendedor_id", vendedorId);
    consultaMetas = consultaMetas.eq("vendedor_id", vendedorId);
  }

  // Vendedor só vê a carteira dos clientes que ele mesmo já atendeu — a
  // tabela de clientes é compartilhada pela organização. Master e gerente
  // continuam vendo todo mundo.
  const meusClienteIds =
    perfil.papel === "vendedor" ? await getClienteIdsDoVendedor(supabase, perfil.id) : undefined;

  const [
    { data: atendimentosData },
    { data: metasData },
    clientesHistorico,
    agendaItens,
    { data: perfisData },
    { data: desfechosData },
  ] = await Promise.all([
      consultaAtendimentos,
      consultaMetas,
      getClientesComHistorico(supabase, meusClienteIds),
      getAgenda(supabase),
      podeFiltrarVendedor
        ? supabase.from("perfis").select("id, nome, papel").order("nome")
        : Promise.resolve({ data: [{ id: perfil.id, nome: perfil.nome, papel: perfil.papel }] }),
      consultaDesfechos,
    ]);

  const atendimentosMes = (atendimentosData ?? []) as AtendimentoComCliente[];
  const metas = metasData ?? [];
  const perfis = (perfisData ?? []) as { id: string; nome: string; papel: string }[];
  const nomesVendedores = Object.fromEntries(perfis.map((p) => [p.id, p.nome]));
  const vendedoresFiltro = podeFiltrarVendedor
    ? perfis.filter((p) => p.papel !== "master").map((p) => ({ id: p.id, nome: p.nome }))
    : null;

  // "hoje" mostra só os atendimentos de hoje, mas o cálculo de ritmo/meta diária
  // sempre usa o mês inteiro até agora, senão a meta dinâmica fica errada.
  const atendimentos = personalizado
    ? atendimentosMes.filter((a) => a.data >= de)
    : periodo === "hoje"
      ? atendimentosMes.filter((a) => a.data === hojeISO)
      : atendimentosMes;

  // Metas do período personalizado: soma da meta que valia em cada dia.
  const metasDoPeriodo = personalizado ? metasPorDia(de, ate, metas, atendimentosMes) : [];
  const somaMetasPeriodo = (campo: "valor" | "sacos" | "atendimentos") =>
    metasDoPeriodo.reduce((soma, m) => soma + m[campo], 0);

  const metaMensalTotal = metas.reduce((soma, m) => soma + Number(m.meta_valor), 0);
  const diasUteisTotais = diasUteisNoMes(ano, mes);
  const diasUteisAteHoje = diasUteisNoMes(ano, mes, true, hoje);
  const diasUteisFaltando = diasUteisRestantes(diasUteisTotais, diasUteisAteHoje);

  // "Não atendeu" não conta como atendimento de verdade (ninguém atendeu o
  // telefone) — fica de fora das contagens/metas, mas continua salvo e
  // aparece na Distribuição de resultados.
  const atendimentosContam = atendimentosValidos(atendimentos);
  const atendimentosMesContam = atendimentosValidos(atendimentosMes);

  const vendido = somaValor(atendimentos, "valor");
  const vendidoMes = somaValor(atendimentosMes, "valor");
  const freteTotal = somaValor(atendimentos, "valor_frete");
  const totalAtendimentos = atendimentosContam.length;
  const totalVendas = contarResultado(atendimentos, "compra");
  const ticketMedio = totalVendas > 0 ? vendido / totalVendas : 0;
  const conversao = totalAtendimentos > 0 ? (totalVendas / totalAtendimentos) * 100 : 0;

  const metaProspeccoesTotal = metas.reduce((soma, m) => soma + Number(m.meta_prospeccoes), 0);
  // Meta diária de atendimentos = o que falta pra bater a meta do mês, dividido
  // pelos dias úteis que ainda restam — não um valor fixo o mês inteiro.
  const metaAtendimentosDiaria = Math.max(metaProspeccoesTotal - atendimentosMesContam.length, 0) / diasUteisFaltando;
  const metaAtendimentosPeriodo = personalizado
    ? somaMetasPeriodo("atendimentos")
    : periodo === "hoje"
      ? metaAtendimentosDiaria
      : metaProspeccoesTotal;

  const situacaoOrcamentos = situacaoDosOrcamentos(
    (desfechosData ?? []) as Pick<Atendimento, "id" | "cliente_id" | "data" | "criado_em" | "resultado">[]
  );
  const pipelineAbertos = atendimentos.filter(
    (a) => a.resultado === "negociacao" && situacaoOrcamentos.get(a.id)?.status === "aberto"
  );
  const pipelineValor = somaValor(pipelineAbertos, "valor_negociacao");

  const clientesSemComprar = clientesHistorico
    .filter((c) => c.diasSemComprar === null || c.diasSemComprar > 25)
    .sort((a, b) => (b.diasSemComprar ?? 9999) - (a.diasSemComprar ?? 9999))
    .slice(0, 5);

  // Mesma lógica pra meta diária em R$: o que falta pra bater a meta, dividido
  // pelos dias úteis restantes. Quem já bateu a meta não tem mais pressão diária.
  const metaDiaria = Math.max(metaMensalTotal - vendidoMes, 0) / diasUteisFaltando;
  const projecao = diasUteisAteHoje > 0 ? (vendidoMes / diasUteisAteHoje) * diasUteisTotais : 0;

  // Sacos seguem exatamente o mesmo molde da meta em R$: o que falta pra bater
  // a meta de sacos do mês, dividido pelos dias úteis restantes.
  const metaSacosTotal = metas.reduce((soma, m) => soma + Number(m.meta_sacos ?? 0), 0);
  const sacosVendidos = somaValor(atendimentos, "quantidade_sacos");
  const sacosVendidosMes = somaValor(atendimentosMes, "quantidade_sacos");
  const metaSacosDiaria = Math.max(metaSacosTotal - sacosVendidosMes, 0) / diasUteisFaltando;
  const metaSacosPeriodo = personalizado
    ? somaMetasPeriodo("sacos")
    : periodo === "hoje"
      ? metaSacosDiaria
      : metaSacosTotal;

  const clientesAtendidos = new Set(atendimentosContam.map((a) => a.cliente_id)).size;

  // Barra de progresso do card principal: mostra o quanto do alvo do período já
  // foi vendido. Alvo = o que já vendeu + o que falta pra bater a meta (hoje),
  // ou a meta do mês inteira (visão mensal) — os mesmos números já calculados acima.
  const metaAlvoPeriodo = personalizado
    ? somaMetasPeriodo("valor")
    : periodo === "hoje"
      ? vendido + metaDiaria
      : metaMensalTotal;
  const labelMeta = personalizado
    ? `Meta ${umDia ? "do dia" : "do período"}: ${formatBRL(metaAlvoPeriodo)}`
    : `Meta ${periodo === "hoje" ? "diária" : "do mês"}: ${formatBRL(periodo === "hoje" ? metaDiaria : metaMensalTotal)}`;
  const percentualMeta =
    metaAlvoPeriodo > 0 ? Math.min(100, (vendido / metaAlvoPeriodo) * 100) : vendido > 0 ? 100 : 0;
  const ritmoPercentual = ritmoEsperadoPercentual(hoje);
  const horaAtualBrasil = (hoje.getUTCHours() + 24 - 3) % 24;

  const resultados = agruparResultados(atendimentos);
  const totalResultados = resultados.reduce((soma, r) => soma + r.quantidade, 0);

  // Bônus da vendedora logada (mês corrente; não aparece no período personalizado).
  const configBonus =
    perfil.papel === "vendedor" && !personalizado
      ? configDoBonus((metas as Meta[]).find((m) => m.vendedor_id === perfil.id))
      : null;
  const hojeEhUtil = ![0, 6].includes(new Date(Date.UTC(ano, mes - 1, hoje.getUTCDate())).getUTCDay());
  const bonus = configBonus
    ? calcularBonus(
        configBonus,
        atendimentosMes.filter((a) => a.vendedor_id === perfil.id),
        diasUteisFaltando + (hojeEhUtil ? 1 : 0)
      )
    : null;

  return (
    <CarregandoPagina>
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-perola-texto">Dashboard</h1>
          <p className="text-sm text-perola-texto-2">Visão geral do seu CRM Pérola</p>
        </div>
        <FiltroDashboard
          periodo={periodo}
          de={de}
          ate={ate}
          hojeISO={hojeISO}
          vendedorId={vendedorId}
          vendedores={vendedoresFiltro}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Card principal: vendido + progresso + ritmo esperado */}
          <div className="flex flex-col gap-6 rounded-[14px] border border-perola-borda bg-white p-6 sm:flex-row sm:items-stretch">
            <div className="flex-1">
              <p className="text-sm font-medium text-perola-texto-2">
                Vendido {sufixoPeriodo}
              </p>
              <p className="mt-1 text-3xl font-semibold text-perola-texto">{formatBRL(vendido)}</p>

              <div className="relative mt-4 h-2.5 w-full overflow-hidden rounded-full bg-perola-tag">
                <div
                  className="h-full rounded-full bg-perola-verde-medio transition-all"
                  style={{ width: `${percentualMeta}%` }}
                />
                {periodo === "hoje" && (
                  <div
                    className="absolute top-0 h-2.5 w-0.5 bg-perola-alerta"
                    style={{ left: `${ritmoPercentual}%` }}
                    title={`Ritmo esperado às ${horaAtualBrasil}h`}
                  />
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs text-perola-texto-2">
                <span>{labelMeta}</span>
                {periodo === "hoje" && (
                  <span>
                    Ritmo esperado às {horaAtualBrasil}h: {ritmoPercentual}%
                  </span>
                )}
              </div>
              {periodo === "mes" && (
                <p className="mt-3 text-xs text-perola-texto-2">
                  Projeção de fechamento do mês: <span className="font-medium text-perola-texto">{formatBRL(projecao)}</span>
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-row gap-4 border-perola-divisor sm:w-44 sm:flex-col sm:border-l sm:pl-6">
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-perola-texto-2">Sacos</p>
                <p className="text-lg font-semibold text-perola-texto">
                  {sacosVendidos}
                  <span className="text-xs font-normal text-perola-texto-2"> / {Math.round(metaSacosPeriodo)}</span>
                </p>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-perola-texto-2">Atendimentos</p>
                <p className="text-lg font-semibold text-perola-texto">
                  {totalAtendimentos}
                  <span className="text-xs font-normal text-perola-texto-2"> / {Math.round(metaAtendimentosPeriodo)}</span>
                </p>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-perola-texto-2">Clientes diferentes</p>
                <p className="text-lg font-semibold text-perola-texto">{clientesAtendidos}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Vendas"
              value={String(totalVendas)}
              sub={`${conversao.toFixed(1)}% de conversão`}
              icon={ShoppingCart}
            />
            <StatCard label="Ticket médio" value={formatBRL(ticketMedio)} icon={DollarSign} />
            <StatCard
              label={`Total de frete ${sufixoPeriodo}`}
              value={formatBRL(freteTotal)}
              icon={Truck}
            />
            {periodo === "mes" && (
              <StatCard label="Projeção (fim do mês)" value={formatBRL(projecao)} icon={Receipt} />
            )}
          </div>

          {personalizado ? (
            umDia ? (
              <LineChartCard
                title={`Atendimentos por hora (${formatarDataCurta(de)}) vs meta do dia`}
                data={agruparPorHora(atendimentosContam, metaAtendimentosPeriodo)}
                xKey="hora"
                lines={[
                  { key: "meta", nome: "Ritmo necessário", cor: "#B8751A", tracejada: true },
                  { key: "valor", nome: "Atendimentos", cor: "#7FB52A" },
                ]}
              />
            ) : (
              <LineChartCard
                title="Atendimentos por dia vs meta do dia"
                data={agruparPorDia(atendimentos, metasDoPeriodo)}
                xKey="dia"
                lines={[
                  { key: "meta", nome: "Meta do dia", cor: "#B8751A", tracejada: true },
                  { key: "valor", nome: "Atendimentos", cor: "#7FB52A" },
                ]}
              />
            )
          ) : periodo === "hoje" ? (
            <LineChartCard
              title="Evolução de atendimentos (hoje) vs ritmo da meta"
              data={agruparPorHora(atendimentosContam, metaAtendimentosDiaria)}
              xKey="hora"
              lines={[
                { key: "meta", nome: "Ritmo necessário", cor: "#B8751A", tracejada: true },
                { key: "valor", nome: "Atendimentos", cor: "#7FB52A" },
              ]}
            />
          ) : (
            <LineChartCard
              title="Evolução da meta no mês"
              data={agruparPorDiaAcumulado(atendimentos, ano, mes)}
              xKey="dia"
              lines={[{ key: "valor", nome: "Realizado (R$)", cor: "#7FB52A" }]}
            />
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ProdutoChartComTabela
              title="Produtos oferecidos"
              dados={contarProdutos(atendimentos, "produtos_oferecidos")}
            />
            <ProdutoChartComTabela
              title="Produtos vendidos"
              dados={contarProdutos(atendimentos, "produtos_vendidos")}
              cor="#1E2A18"
            />
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-perola-texto">Pipeline do período</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-[14px] border border-perola-borda bg-white p-5">
                <p className="text-sm font-semibold text-perola-texto">
                  Orçamentos em andamento ({pipelineAbertos.length})
                </p>
                <p className="mt-2 text-2xl font-semibold text-perola-texto">{formatBRL(pipelineValor)}</p>
                <p className="mt-1 text-xs text-perola-texto-2">Valor total em negociação no pipeline</p>
              </div>
              <div className="rounded-[14px] border border-perola-borda bg-white p-5">
                <p className="text-sm font-semibold text-perola-texto">Compras confirmadas ({totalVendas})</p>
                <p className="mt-2 text-2xl font-semibold text-perola-texto">{formatBRL(vendido)}</p>
                <p className="mt-1 text-xs text-perola-texto-2">Dinheiro fechado no período</p>
              </div>
            </div>
          </div>

          {periodo !== "mes" && (
            <div>
              <h2 className="mb-3 text-base font-semibold text-perola-texto">
                Atendimentos {sufixoPeriodo} ({atendimentos.length})
              </h2>
              <AtendimentosRecentesTabela
                atendimentos={atendimentos}
                mensagemVazio="Nenhum atendimento neste período."
                nomesVendedores={nomesVendedores}
                mostrarObservacoes
                qtdInicial={10}
              />
            </div>
          )}

          {clientesSemComprar.length > 0 && (
            <div>
              <h2 className="mb-3 text-base font-semibold text-perola-texto">Clientes sem comprar há mais tempo</h2>
              <div className="overflow-hidden rounded-[14px] border border-perola-borda bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-perola-divisor bg-[#FAFAF6] text-xs uppercase text-perola-texto-2">
                    <tr>
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">Última compra</th>
                      <th className="px-4 py-3 font-medium">Dias</th>
                      <th className="px-4 py-3 font-medium">Histórico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesSemComprar.map((c) => (
                      <tr key={c.id} className="border-b border-perola-divisor last:border-0">
                        <td className="px-4 py-3 font-medium text-perola-texto">{c.nome}</td>
                        <td className="px-4 py-3 text-perola-texto-2">
                          {c.ultimaCompra
                            ? new Date(c.ultimaCompra + "T00:00:00").toLocaleDateString("pt-BR")
                            : "Nunca comprou"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-perola-erro-bg px-2 py-1 text-xs font-medium text-perola-erro">
                            {c.diasSemComprar ?? "—"} dias
                          </span>
                        </td>
                        <td className="px-4 py-3 text-perola-texto-2">
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

        <div className="space-y-6">
          {bonus && <BonusResumo resultado={bonus} />}
          <ProximasAtividades itens={agendaItens} />

          <div className="rounded-[14px] border border-perola-borda bg-white p-5">
            <p className="mb-4 text-sm font-semibold text-perola-texto">Resultados dos atendimentos</p>
            {resultados.length === 0 ? (
              <p className="text-sm text-perola-texto-2">Sem dados neste período ainda.</p>
            ) : (
              <>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full">
                  {resultados.map((r) => (
                    <div
                      key={r.nome}
                      style={{
                        width: `${(r.quantidade / totalResultados) * 100}%`,
                        backgroundColor: CORES_RESULTADO[r.nome] ?? "#C4CCBA",
                      }}
                    />
                  ))}
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {resultados.map((r) => (
                    <div key={r.nome} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-perola-texto">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: CORES_RESULTADO[r.nome] ?? "#C4CCBA" }}
                        />
                        {r.nome}
                      </span>
                      <span className="text-perola-texto-2">{r.quantidade}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </CarregandoPagina>
  );
}
