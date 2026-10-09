import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/auth";
import { getClientesComHistorico } from "@/lib/clientes";
import { getAgenda } from "@/lib/agenda";
import {
  agoraBrasil,
  agruparResultados,
  contarProdutos,
  formatBRL,
  hojeISOBrasil,
  somaValor,
} from "@/lib/metrics";
import { diferencaDias } from "@/lib/periodo";
import {
  funil,
  INTERVALO_PADRAO_REPOSICAO,
  novosERecorrentes,
  reposicaoPrevista,
  resumir,
  situacaoDosOrcamentos,
  VALOR_ORCAMENTO_SUSPEITO,
  variacao,
} from "@/lib/relatorio";
import PrintButton from "@/components/PrintButton";
import RelatoriosAbas from "@/components/RelatoriosAbas";
import ProdutosTabela from "@/components/ProdutosTabela";
import type { Atendimento, Meta } from "@/types/database";

export const dynamic = "force-dynamic";

type AtendimentoRel = Atendimento & {
  clientes: { nome: string; cidade: string | null; telefone: string | null } | null;
};

const CORES_RESULTADO: Record<string, string> = {
  Prospecção: "text-[#3F6E96]",
  Compra: "text-perola-verde",
  Orçamento: "text-perola-verde-medio",
  Interessado: "text-perola-alerta",
  "Sem interesse": "text-perola-texto-2",
  "Não atendeu": "text-perola-texto-2",
  Indisponível: "text-perola-erro",
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const TH = "px-3 py-2 font-medium";
const TD = "px-3 py-2 text-perola-texto-2";
const TD_NOME = "px-3 py-2 font-medium text-perola-texto";
const LINHA = "border-b border-perola-divisor last:border-0";
const CAIXA_TABELA = "overflow-x-auto rounded-[14px] border border-perola-borda bg-white";
const CABECALHO = "border-b border-perola-divisor bg-[#FAFAF6] text-perola-texto-2";

function dataBR(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

function ultimoDiaDoMes(ano: number, mes: number) {
  return new Date(ano, mes, 0).getDate();
}

function isoDia(ano: number, mes: number, dia: number) {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="text-lg font-semibold text-perola-texto">{titulo}</h2>
      {descricao && <p className="mb-3 text-sm text-perola-texto-2">{descricao}</p>}
      <div className={descricao ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

// Seta de comparação com o período anterior. `pontos` = diferença em pontos
// percentuais (para taxas), em vez de variação percentual.
function Variacao({ atual, anterior, pontos = false }: { atual: number; anterior: number; pontos?: boolean }) {
  const valor = pontos ? atual - anterior : variacao(atual, anterior);
  if (valor === null) return <span className="text-xs text-perola-texto-2">sem base anterior</span>;
  if (Math.abs(valor) < 0.05) return <span className="text-xs text-perola-texto-2">= igual</span>;
  const subiu = valor > 0;
  return (
    <span className={`text-xs font-medium ${subiu ? "text-perola-tag-pos-texto" : "text-perola-erro"}`}>
      {subiu ? "▲" : "▼"} {Math.abs(valor).toFixed(1)}
      {pontos ? " p.p." : "%"}
    </span>
  );
}

function Situacao({ dias }: { dias: number }) {
  if (dias < 0) {
    return (
      <span className="rounded-md bg-perola-erro-bg px-2 py-0.5 text-xs font-medium text-perola-erro">
        Atrasado {Math.abs(dias)}d
      </span>
    );
  }
  if (dias === 0) return <span className="rounded-md bg-[#FBF1E4] px-2 py-0.5 text-xs font-medium text-perola-alerta">Hoje</span>;
  return <span className="rounded-md bg-perola-tag px-2 py-0.5 text-xs text-perola-texto-2">Em {dias}d</span>;
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
  const hojeISO = hojeISOBrasil(hoje);
  const ano = Number(searchParams.ano) || hoje.getUTCFullYear();
  const mes = Number(searchParams.mes) || hoje.getUTCMonth() + 1;
  const inicio = isoDia(ano, mes, 1);
  const fim = isoDia(ano, mes, ultimoDiaDoMes(ano, mes));

  // Comparação: no mês corrente, compara com o MESMO trecho do mês anterior
  // (do dia 1 até o dia de hoje), senão o mês em andamento sempre "perde".
  const ehMesAtual = ano === hoje.getUTCFullYear() && mes === hoje.getUTCMonth() + 1;
  const anoAnt = mes === 1 ? ano - 1 : ano;
  const mesAnt = mes === 1 ? 12 : mes - 1;
  const diaLimiteAnt = ehMesAtual
    ? Math.min(hoje.getUTCDate(), ultimoDiaDoMes(anoAnt, mesAnt))
    : ultimoDiaDoMes(anoAnt, mesAnt);
  const inicioAnt = isoDia(anoAnt, mesAnt, 1);
  const fimAnt = isoDia(anoAnt, mesAnt, diaLimiteAnt);
  const rotuloComparacao = ehMesAtual
    ? `vs ${MESES[mesAnt - 1].toLowerCase()} (dias 1 a ${diaLimiteAnt})`
    : `vs ${MESES[mesAnt - 1].toLowerCase()}`;

  const supabase = createClient();

  // Tudo o que já foi lançado: o relatório precisa do histórico para saber se
  // um orçamento virou compra depois, se o cliente é novo e quando deve repor.
  const [{ data: todosData }, { data: perfisData }, { data: metasData }, clientesHistorico, agenda] = await Promise.all([
    supabase
      .from("atendimentos")
      .select("*, clientes(nome, cidade, telefone)")
      .order("data", { ascending: true })
      .order("criado_em", { ascending: true }),
    supabase.from("perfis").select("id, nome, papel").order("nome"),
    supabase.from("metas").select("*").eq("ano", ano).eq("mes", mes),
    getClientesComHistorico(supabase),
    getAgenda(supabase),
  ]);

  const todos = (todosData ?? []) as AtendimentoRel[];
  const perfis = (perfisData ?? []) as { id: string; nome: string; papel: string }[];
  const metas = (metasData ?? []) as Meta[];
  const nomeVendedor = new Map(perfis.map((p) => [p.id, p.nome]));
  const nomeCliente = new Map(clientesHistorico.map((c) => [c.id, c.nome]));
  const clientePorId = new Map(clientesHistorico.map((c) => [c.id, c]));

  const doMes = todos.filter((a) => a.data >= inicio && a.data <= fim);
  const doAnterior = todos.filter((a) => a.data >= inicioAnt && a.data <= fimAnt);
  const todasCompras = todos.filter((a) => a.resultado === "compra");
  const comprasDoMes = doMes.filter((a) => a.resultado === "compra");

  // ---------- 1. Resumo ----------
  const atual = resumir(doMes);
  const anterior = resumir(doAnterior);
  const metaTotal = metas.reduce((s, m) => s + Number(m.meta_valor), 0);

  // ---------- Orçamentos ----------
  const situacao = situacaoDosOrcamentos(todos);
  const orcamentosDoMes = doMes.filter((a) => a.resultado === "negociacao");
  const orcamentosValidosMes = orcamentosDoMes.filter((a) => situacao.get(a.id)?.status !== "substituido");
  const contarStatus = (status: string) => orcamentosValidosMes.filter((a) => situacao.get(a.id)?.status === status).length;
  const orcConvertidos = contarStatus("convertido");
  const orcPerdidos = contarStatus("perdido");
  const orcAbertosMes = contarStatus("aberto");
  const taxaConversaoOrc = orcamentosValidosMes.length > 0 ? (orcConvertidos / orcamentosValidosMes.length) * 100 : 0;
  const diasAteCompra = orcamentosValidosMes
    .map((a) => situacao.get(a.id)?.diasAteCompra)
    .filter((d): d is number => d !== undefined);
  const mediaDiasAteCompra = diasAteCompra.length > 0 ? diasAteCompra.reduce((s, d) => s + d, 0) / diasAteCompra.length : null;

  const orcamentosAbertosAgora = todos
    .filter((a) => a.resultado === "negociacao" && situacao.get(a.id)?.status === "aberto")
    .sort((a, b) => (a.proximo_contato ?? "9999").localeCompare(b.proximo_contato ?? "9999"));
  const pipelineValor = somaValor(orcamentosAbertosAgora, "valor_negociacao");

  // ---------- 2. Desempenho por vendedora ----------
  const idsVendedores = new Set([
    ...perfis.filter((p) => p.papel !== "master").map((p) => p.id),
    ...doMes.map((a) => a.vendedor_id),
  ]);
  const porVendedor = Array.from(idsVendedores)
    .map((id) => {
      const dele = doMes.filter((a) => a.vendedor_id === id);
      const r = resumir(dele);
      const naoAtendeu = dele.filter((a) => a.resultado === "nao_atendeu").length;
      const orcamentos = dele.filter((a) => a.resultado === "negociacao" && situacao.get(a.id)?.status !== "substituido");
      const orcConv = orcamentos.filter((a) => situacao.get(a.id)?.status === "convertido").length;
      const atrasados = agenda.filter((i) => i.vendedorId === id && i.proximoContato < hojeISO).length;
      const baseComissao = Math.max(r.receita - r.frete, 0);
      const meta = metas.find((m) => m.vendedor_id === id);
      const comissaoPercentual = Number(meta?.comissao_percentual ?? 1);
      const valorMeta = Number(meta?.meta_valor ?? 0);
      return {
        id,
        nome: nomeVendedor.get(id) ?? "—",
        ...r,
        naoAtendeuPct: r.contatos > 0 ? (naoAtendeu / r.contatos) * 100 : 0,
        orcamentos: orcamentos.length,
        orcConvertidos: orcConv,
        atrasados,
        baseComissao,
        comissaoPercentual,
        meta: valorMeta,
        percentualMeta: valorMeta > 0 ? (r.receita / valorMeta) * 100 : 0,
        // Comissão = (valor da venda - frete) x % de comissão.
        comissao: baseComissao * (comissaoPercentual / 100),
      };
    })
    .filter((v) => v.contatos > 0 || v.meta > 0 || v.atrasados > 0)
    .sort((a, b) => b.receita - a.receita);
  const comissaoTotal = porVendedor.reduce((s, v) => s + v.comissao, 0);

  // ---------- Funil ----------
  const etapasFunil = funil(doMes);
  const baseFunil = etapasFunil[0].quantidade;

  // ---------- Perdas ----------
  const perdasMap = new Map<string, { quantidade: number; clientes: Set<string>; produtos: string[] }>();
  for (const a of doMes.filter((x) => x.resultado === "sem_interesse")) {
    const motivo = a.motivo?.trim() || "Sem motivo informado";
    const atualPerda = perdasMap.get(motivo) ?? { quantidade: 0, clientes: new Set<string>(), produtos: [] };
    atualPerda.quantidade += 1;
    atualPerda.clientes.add(a.clientes?.nome ?? "—");
    atualPerda.produtos.push(...(a.produtos_oferecidos ?? []));
    perdasMap.set(motivo, atualPerda);
  }
  const perdas = Array.from(perdasMap.entries())
    .map(([motivo, d]) => ({ motivo, quantidade: d.quantidade, clientes: Array.from(d.clientes), produtos: Array.from(new Set(d.produtos)) }))
    .sort((a, b) => b.quantidade - a.quantidade);

  // ---------- Produtos ----------
  const oferecidos = contarProdutos(doMes, "produtos_oferecidos");
  const vendidos = contarProdutos(doMes, "produtos_vendidos");
  const produtosCompletos = Array.from(new Set([...oferecidos.map((o) => o.produto), ...vendidos.map((v) => v.produto)]))
    .map((produto) => {
      const o = oferecidos.find((x) => x.produto === produto)?.quantidade ?? 0;
      const v = vendidos.find((x) => x.produto === produto)?.quantidade ?? 0;
      return { produto, oferecido: o, vendido: v, conversao: o > 0 ? (v / o) * 100 : 0 };
    })
    .sort((a, b) => b.conversao - a.conversao || b.oferecido - a.oferecido);

  // ---------- Clientes do mês ----------
  const { novos, recorrentes } = novosERecorrentes(comprasDoMes, todasCompras, inicio);
  const receitaDoCliente = (id: string) => somaValor(comprasDoMes.filter((c) => c.cliente_id === id), "valor");
  const listaCompradores = (ids: string[]) =>
    ids.map((id) => ({ id, nome: nomeCliente.get(id) ?? "—", receita: receitaDoCliente(id) })).sort((a, b) => b.receita - a.receita);

  const cidadesMap = new Map<string, { compradores: Set<string>; vendas: number; receita: number; sacos: number; contatos: number }>();
  for (const a of doMes) {
    const cidade = a.clientes?.cidade?.trim() || "Sem cidade cadastrada";
    const c = cidadesMap.get(cidade) ?? { compradores: new Set<string>(), vendas: 0, receita: 0, sacos: 0, contatos: 0 };
    c.contatos += 1;
    if (a.resultado === "compra") {
      c.compradores.add(a.cliente_id);
      c.vendas += 1;
      c.receita += Number(a.valor ?? 0);
      c.sacos += Number(a.quantidade_sacos ?? 0);
    }
    cidadesMap.set(cidade, c);
  }
  const cidadesDoMes = Array.from(cidadesMap.entries())
    .map(([cidade, d]) => ({ cidade, ...d, compradores: d.compradores.size }))
    .sort((a, b) => b.receita - a.receita || b.contatos - a.contatos);

  // ---------- Reposição ----------
  const agendaPorCliente = new Map(agenda.map((i) => [i.clienteId, i.proximoContato]));
  const reposicoes = reposicaoPrevista(todasCompras, hojeISO, 7).slice(0, 40);

  // ---------- Carteira (histórico) ----------
  const topClientes = [...clientesHistorico].filter((c) => c.valorTotal > 0).sort((a, b) => b.valorTotal - a.valorTotal).slice(0, 10);
  const clientesInativos = clientesHistorico
    .filter((c) => c.diasSemComprar !== null && c.diasSemComprar > 30)
    .sort((a, b) => (b.diasSemComprar ?? 0) - (a.diasSemComprar ?? 0));
  const clientesSemVendas = clientesHistorico.filter((c) => c.totalCompras === 0).sort((a, b) => a.nome.localeCompare(b.nome));

  // ---------- Observações ----------
  const observacoes = doMes
    .filter((a) => a.observacoes && a.observacoes.trim())
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em));

  // ---------- Qualidade dos dados ----------
  const semCidade = clientesHistorico.filter((c) => !c.cidade?.trim()).length;
  const semTelefone = clientesHistorico.filter((c) => !c.telefone?.trim()).length;
  const orcamentosSuspeitos = orcamentosDoMes.filter(
    (a) => a.valor_negociacao !== null && Number(a.valor_negociacao) < VALOR_ORCAMENTO_SUSPEITO
  );
  const comprasRetornoMesmoDia = comprasDoMes.filter((a) => a.proximo_contato && a.proximo_contato <= a.data);
  const semInteresseSemMotivo = doMes.filter((a) => a.resultado === "sem_interesse" && !a.motivo?.trim()).length;
  const pendencias = [
    {
      ok: semCidade === 0,
      texto: `${semCidade} de ${clientesHistorico.length} clientes sem cidade`,
      dica: "Sem cidade, a análise por cidade fica incompleta. Preencha em Clientes → Editar.",
    },
    {
      ok: semTelefone === 0,
      texto: `${semTelefone} clientes sem telefone`,
      dica: "Dificulta o retorno e a reposição.",
    },
    {
      ok: orcamentosSuspeitos.length === 0,
      texto: `${orcamentosSuspeitos.length} orçamentos do mês com valor abaixo de ${formatBRL(VALOR_ORCAMENTO_SUSPEITO)}`,
      dica: "Provavelmente foi lançado o preço de um saco, e não o total. Isso distorce o pipeline.",
    },
    {
      ok: comprasRetornoMesmoDia.length === 0,
      texto: `${comprasRetornoMesmoDia.length} vendas do mês com próximo contato no mesmo dia (ou antes)`,
      dica: "O cliente aparece como atrasado na agenda logo depois. Na venda, deixe vazio ou marque a data de reposição.",
    },
    {
      ok: semInteresseSemMotivo === 0,
      texto: `${semInteresseSemMotivo} "sem interesse" sem motivo informado`,
      dica: "Sem o motivo, não dá para entender as perdas.",
    },
  ];

  const resultadosDistribuicao = agruparResultados(doMes);

  const cardsResumo: { label: string; valor: string; atual: number; anterior: number; pontos?: boolean }[] = [
    { label: "Atendimentos", valor: String(atual.atendimentos), atual: atual.atendimentos, anterior: anterior.atendimentos },
    { label: "Prospecções", valor: String(atual.prospeccoes), atual: atual.prospeccoes, anterior: anterior.prospeccoes },
    { label: "Clientes atendidos", valor: String(atual.clientesAtendidos), atual: atual.clientesAtendidos, anterior: anterior.clientesAtendidos },
    { label: "Vendas", valor: String(atual.vendas), atual: atual.vendas, anterior: anterior.vendas },
    { label: "Conversão", valor: `${atual.conversao.toFixed(1)}%`, atual: atual.conversao, anterior: anterior.conversao, pontos: true },
    { label: "Receita", valor: formatBRL(atual.receita), atual: atual.receita, anterior: anterior.receita },
    { label: "Ticket médio", valor: formatBRL(atual.ticketMedio), atual: atual.ticketMedio, anterior: anterior.ticketMedio },
    { label: "Sacos vendidos", valor: `${atual.sacos}`, atual: atual.sacos, anterior: anterior.sacos },
    { label: "Frete", valor: formatBRL(atual.frete), atual: atual.frete, anterior: anterior.frete },
  ];

  return (
    <div className="space-y-8 print:space-y-4">
      <RelatoriosAbas ativa="mes" />
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-perola-texto">Relatório do mês</h1>
          <p className="text-sm text-perola-texto-2">
            {MESES[mes - 1]} de {ano}
            {ehMesAtual ? " (em andamento)" : ""}
          </p>
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
        <p className="text-sm text-perola-texto-2">Gerado em {dataBR(hojeISO)}</p>
      </div>

      {/* 1. RESUMO */}
      <Secao titulo="1. Resumo do mês" descricao={`Setas: comparação ${rotuloComparacao}.`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cardsResumo.map((c) => (
            <div key={c.label} className="rounded-[14px] border border-perola-borda bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-perola-texto-2">{c.label}</p>
              <p className="text-xl font-semibold text-perola-texto">{c.valor}</p>
              <Variacao atual={c.atual} anterior={c.anterior} pontos={c.pontos} />
            </div>
          ))}
          {(
            [
              ["Meta do mês", formatBRL(metaTotal), metaTotal > 0 ? `${((atual.receita / metaTotal) * 100).toFixed(1)}% batida` : "sem meta"],
              ["Orçamentos em aberto (hoje)", formatBRL(pipelineValor), `${orcamentosAbertosAgora.length} orçamentos`],
              ["Conversão de orçamentos", `${taxaConversaoOrc.toFixed(0)}%`, `${orcConvertidos} de ${orcamentosValidosMes.length} do mês`],
              ["Comissão da equipe", formatBRL(comissaoTotal), "a pagar no mês"],
            ] as const
          ).map(([label, valor, sub]) => (
            <div key={label} className="rounded-[14px] border border-perola-borda bg-[#FAFAF6] p-4">
              <p className="text-xs uppercase tracking-wide text-perola-texto-2">{label}</p>
              <p className="text-xl font-semibold text-perola-texto">{valor}</p>
              <p className="text-xs text-perola-texto-2">{sub}</p>
            </div>
          ))}
        </div>
      </Secao>

      {/* 2. FUNIL */}
      <Secao titulo="2. Funil do mês" descricao="Quantos clientes passaram por cada etapa, e onde a venda se perde.">
        <div className="space-y-2 rounded-[14px] border border-perola-borda bg-white p-5">
          {etapasFunil.map((e, i) => {
            const pctTotal = baseFunil > 0 ? (e.quantidade / baseFunil) * 100 : 0;
            const anteriorEtapa = i > 0 ? etapasFunil[i - 1].quantidade : 0;
            const pctPasso = anteriorEtapa > 0 ? (e.quantidade / anteriorEtapa) * 100 : null;
            return (
              <div key={e.etapa} className="grid grid-cols-[150px_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[190px_1fr_180px]">
                <span className="text-perola-texto">{e.etapa}</span>
                <div className="h-6 overflow-hidden rounded-md bg-perola-tag">
                  <div className="flex h-full items-center rounded-md bg-perola-verde-medio px-2 text-xs font-semibold text-white" style={{ width: `${Math.max(pctTotal, 6)}%` }}>
                    {e.quantidade}
                  </div>
                </div>
                <span className="text-right text-xs text-perola-texto-2">
                  {i === 0 ? "100%" : `${pctTotal.toFixed(0)}% do total`}
                  {pctPasso !== null && i > 0 ? ` · ${pctPasso.toFixed(0)}% da etapa anterior` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </Secao>

      {/* 3. VENDEDORAS */}
      <Secao titulo="3. Desempenho por vendedora" descricao="Retornos atrasados = clientes na agenda com data vencida (hoje).">
        <div className={CAIXA_TABELA}>
          <table className="w-full text-left text-sm">
            <thead className={CABECALHO}>
              <tr>
                <th className={TH}>Vendedora</th>
                <th className={TH}>Contatos</th>
                <th className={TH}>Prospecções</th>
                <th className={TH}>Não atendeu</th>
                <th className={TH}>Vendas</th>
                <th className={TH}>Conversão</th>
                <th className={TH}>Orçamentos (convertidos)</th>
                <th className={TH}>Receita</th>
                <th className={TH}>Ticket médio</th>
                <th className={TH}>Sacos</th>
                <th className={TH}>% Meta</th>
                <th className={TH}>Retornos atrasados</th>
              </tr>
            </thead>
            <tbody>
              {porVendedor.length === 0 ? (
                <tr><td colSpan={12} className="px-3 py-4 text-center text-perola-texto-2">Sem atendimentos no mês.</td></tr>
              ) : (
                porVendedor.map((v) => (
                  <tr key={v.id} className={LINHA}>
                    <td className={TD_NOME}>{v.nome}</td>
                    <td className={TD}>{v.contatos}</td>
                    <td className={TD}>{v.prospeccoes}</td>
                    <td className={TD}>{v.naoAtendeuPct.toFixed(0)}%</td>
                    <td className={TD}>{v.vendas}</td>
                    <td className={TD}>{v.conversao.toFixed(1)}%</td>
                    <td className={TD}>{v.orcamentos} ({v.orcConvertidos})</td>
                    <td className={TD}>{formatBRL(v.receita)}</td>
                    <td className={TD}>{formatBRL(v.ticketMedio)}</td>
                    <td className={TD}>{v.sacos}</td>
                    <td className={TD}>{v.meta > 0 ? `${v.percentualMeta.toFixed(0)}%` : "—"}</td>
                    <td className={TD}>
                      {v.atrasados > 0 ? <span className="font-semibold text-perola-erro">{v.atrasados}</span> : "0"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Secao>

      {/* FECHAMENTO DE COMISSÃO */}
      <section className="break-inside-avoid">
        <div className="rounded-[14px] border-2 border-perola-tag-pos-texto/25 bg-white p-5">
          <h2 className="mb-3 text-base font-semibold text-perola-texto">Fechamento de comissão do mês</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-perola-divisor text-perola-texto-2">
                <tr>
                  <th className={TH}>Vendedora</th>
                  <th className={TH}>Vendas (R$)</th>
                  <th className={TH}>Frete (R$)</th>
                  <th className={TH}>Base p/ comissão</th>
                  <th className={TH}>%</th>
                  <th className={TH}>A pagar</th>
                </tr>
              </thead>
              <tbody>
                {porVendedor.map((v) => (
                  <tr key={v.id} className={LINHA}>
                    <td className={TD_NOME}>{v.nome}</td>
                    <td className={TD}>{formatBRL(v.receita)}</td>
                    <td className={TD}>{formatBRL(v.frete)}</td>
                    <td className={TD}>{formatBRL(v.baseComissao)}</td>
                    <td className={TD}>{v.comissaoPercentual}%</td>
                    <td className="px-3 py-2 font-semibold text-perola-tag-pos-texto">{formatBRL(v.comissao)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-perola-divisor">
                  <td className="px-3 py-2 font-semibold text-perola-texto">Total</td>
                  <td className="px-3 py-2 font-semibold text-perola-texto">{formatBRL(porVendedor.reduce((s, v) => s + v.receita, 0))}</td>
                  <td className="px-3 py-2 font-semibold text-perola-texto">{formatBRL(porVendedor.reduce((s, v) => s + v.frete, 0))}</td>
                  <td className="px-3 py-2 font-semibold text-perola-texto">{formatBRL(porVendedor.reduce((s, v) => s + v.baseComissao, 0))}</td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2 font-bold text-perola-tag-pos-texto">{formatBRL(comissaoTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* 4. ORÇAMENTOS */}
      <Secao
        titulo="4. Orçamentos"
        descricao="Um orçamento fecha quando o cliente compra (convertido) ou diz que não tem interesse (perdido). Se um orçamento novo é feito para o mesmo cliente, ele substitui o anterior."
      >
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(
            [
              ["Feitos no mês", String(orcamentosValidosMes.length)],
              ["Viraram compra", `${orcConvertidos} (${taxaConversaoOrc.toFixed(0)}%)`],
              ["Perdidos", String(orcPerdidos)],
              ["Ainda abertos", String(orcAbertosMes)],
              ["Dias até a compra (média)", mediaDiasAteCompra === null ? "—" : mediaDiasAteCompra.toFixed(1)],
            ] as const
          ).map(([label, valor]) => (
            <div key={label} className="rounded-[14px] border border-perola-borda bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-perola-texto-2">{label}</p>
              <p className="text-xl font-semibold text-perola-texto">{valor}</p>
            </div>
          ))}
        </div>

        <h3 className="mb-2 text-sm font-semibold text-perola-texto">
          Em aberto agora ({orcamentosAbertosAgora.length}) · {formatBRL(pipelineValor)}
        </h3>
        {orcamentosAbertosAgora.length === 0 ? (
          <p className="text-sm text-perola-texto-2">Nenhum orçamento em aberto.</p>
        ) : (
          <div className={CAIXA_TABELA}>
            <table className="w-full text-left text-sm">
              <thead className={CABECALHO}>
                <tr>
                  <th className={TH}>Data</th>
                  <th className={TH}>Cliente</th>
                  <th className={TH}>Vendedora</th>
                  <th className={TH}>Valor</th>
                  <th className={TH}>Próximo contato</th>
                </tr>
              </thead>
              <tbody>
                {orcamentosAbertosAgora.map((a) => (
                  <tr key={a.id} className={LINHA}>
                    <td className={`${TD} whitespace-nowrap`}>{dataBR(a.data)}</td>
                    <td className={TD_NOME}>{a.clientes?.nome ?? "—"}</td>
                    <td className={TD}>{nomeVendedor.get(a.vendedor_id) ?? "—"}</td>
                    <td className={TD}>
                      {formatBRL(Number(a.valor_negociacao ?? 0))}
                      {a.valor_negociacao !== null && Number(a.valor_negociacao) < VALOR_ORCAMENTO_SUSPEITO && (
                        <span className="ml-1 text-xs text-perola-alerta" title="Parece o preço de um saco, não o total">⚠</span>
                      )}
                    </td>
                    <td className={TD}>
                      {a.proximo_contato ? (
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          {dataBR(a.proximo_contato)} <Situacao dias={diferencaDias(hojeISO, a.proximo_contato)} />
                        </span>
                      ) : (
                        <span className="text-perola-erro">Sem data marcada</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>

      {/* 5. RESULTADOS */}
      <Secao titulo="5. Distribuição de resultados">
        {resultadosDistribuicao.length === 0 ? (
          <p className="text-sm text-perola-texto-2">Sem atendimentos no mês.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {resultadosDistribuicao.map((r) => (
              <div key={r.nome} className="rounded-[14px] border border-perola-borda bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-perola-texto-2">{r.nome}</p>
                <p className={`text-2xl font-semibold ${CORES_RESULTADO[r.nome] ?? "text-perola-texto"}`}>{r.quantidade}</p>
                <p className="text-xs text-perola-texto-2">{((r.quantidade / atual.contatos) * 100).toFixed(0)}% dos contatos</p>
              </div>
            ))}
          </div>
        )}
      </Secao>

      {/* 6. PERDAS */}
      <Secao titulo="6. Por que não compraram" descricao='Atendimentos "sem interesse" do mês, agrupados pelo motivo.'>
        {perdas.length === 0 ? (
          <p className="text-sm text-perola-texto-2">Nenhuma perda registrada no mês.</p>
        ) : (
          <div className={CAIXA_TABELA}>
            <table className="w-full text-left text-sm">
              <thead className={CABECALHO}>
                <tr>
                  <th className={TH}>Motivo</th>
                  <th className={TH}>Vezes</th>
                  <th className={TH}>Clientes</th>
                  <th className={TH}>Produtos oferecidos</th>
                </tr>
              </thead>
              <tbody>
                {perdas.map((p) => (
                  <tr key={p.motivo} className={LINHA}>
                    <td className={TD_NOME}>{p.motivo}</td>
                    <td className={TD}>{p.quantidade}</td>
                    <td className={TD}>{p.clientes.join(", ")}</td>
                    <td className={TD}>{p.produtos.length > 0 ? p.produtos.join(", ") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>

      {/* 7. PRODUTOS */}
      <Secao titulo="7. Produtos — oferecidos vs. vendidos">
        <div className={CAIXA_TABELA}>
          <ProdutosTabela dados={produtosCompletos} />
        </div>
      </Secao>

      {/* 8. CLIENTES DO MÊS */}
      <Secao titulo="8. Clientes do mês" descricao="Novo = primeira compra da vida foi neste mês. Recorrente = já tinha comprado antes.">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {(
            [
              [`Novos (${novos.length})`, listaCompradores(novos)],
              [`Recorrentes (${recorrentes.length})`, listaCompradores(recorrentes)],
            ] as const
          ).map(([titulo, lista]) => (
            <div key={titulo}>
              <h3 className="mb-2 text-sm font-semibold text-perola-texto">{titulo}</h3>
              <div className={CAIXA_TABELA}>
                <table className="w-full text-left text-sm">
                  <tbody>
                    {lista.length === 0 ? (
                      <tr><td className="px-3 py-4 text-center text-perola-texto-2">Nenhum.</td></tr>
                    ) : (
                      lista.map((c) => (
                        <tr key={c.id} className={LINHA}>
                          <td className={TD_NOME}>{c.nome}</td>
                          <td className={`${TD} text-right`}>{formatBRL(c.receita)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <h3 className="mb-2 mt-6 text-sm font-semibold text-perola-texto">Cidades no mês</h3>
        <div className={CAIXA_TABELA}>
          <table className="w-full text-left text-sm">
            <thead className={CABECALHO}>
              <tr>
                <th className={TH}>Cidade</th>
                <th className={TH}>Contatos</th>
                <th className={TH}>Clientes que compraram</th>
                <th className={TH}>Vendas</th>
                <th className={TH}>Receita</th>
                <th className={TH}>Sacos</th>
              </tr>
            </thead>
            <tbody>
              {cidadesDoMes.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-4 text-center text-perola-texto-2">Sem atendimentos no mês.</td></tr>
              ) : (
                cidadesDoMes.map((c) => (
                  <tr key={c.cidade} className={LINHA}>
                    <td className={TD_NOME}>{c.cidade}</td>
                    <td className={TD}>{c.contatos}</td>
                    <td className={TD}>{c.compradores}</td>
                    <td className={TD}>{c.vendas}</td>
                    <td className={TD}>{formatBRL(c.receita)}</td>
                    <td className={TD}>{c.sacos}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Secao>

      {/* 9. REPOSIÇÃO */}
      <Secao
        titulo="9. Quem deve comprar de novo"
        descricao={`Previsão pela frequência de compra de cada cliente (última compra + intervalo médio entre as compras dele). Quem só comprou uma vez usa ${INTERVALO_PADRAO_REPOSICAO} dias. Mostra previsões vencidas e as dos próximos 7 dias, a partir de hoje.`}
      >
        {reposicoes.length === 0 ? (
          <p className="text-sm text-perola-texto-2">Nenhuma reposição prevista para os próximos 7 dias.</p>
        ) : (
          <div className={CAIXA_TABELA}>
            <table className="w-full text-left text-sm">
              <thead className={CABECALHO}>
                <tr>
                  <th className={TH}>Cliente</th>
                  <th className={TH}>Telefone</th>
                  <th className={TH}>Última compra</th>
                  <th className={TH}>Compra a cada</th>
                  <th className={TH}>Previsão</th>
                  <th className={TH}>Já na agenda?</th>
                </tr>
              </thead>
              <tbody>
                {reposicoes.map((r) => {
                  const cliente = clientePorId.get(r.clienteId);
                  const naAgenda = agendaPorCliente.get(r.clienteId);
                  return (
                    <tr key={r.clienteId} className={LINHA}>
                      <td className={TD_NOME}>{cliente?.nome ?? "—"}</td>
                      <td className={`${TD} whitespace-nowrap`}>{cliente?.telefone ?? "—"}</td>
                      <td className={`${TD} whitespace-nowrap`}>{dataBR(r.ultimaCompra)}</td>
                      <td className={TD}>
                        {r.intervaloDias} dias{r.estimado ? " (padrão)" : ` (${r.totalCompras} compras)`}
                      </td>
                      <td className={TD}>
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          {dataBR(r.prevista)} <Situacao dias={r.diasParaRepor} />
                        </span>
                      </td>
                      <td className={TD}>{naAgenda ? `Sim, ${dataBR(naAgenda)}` : <span className="text-perola-erro">Não</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Secao>

      {/* 10. CARTEIRA (HISTÓRICO) */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-perola-texto">10. Carteira</h2>
          <p className="text-sm text-perola-texto-2">Histórico completo, sem depender do mês escolhido.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="break-inside-avoid">
            <h3 className="mb-2 text-sm font-semibold text-perola-texto">Top 10 clientes</h3>
            <div className="max-h-80 overflow-y-auto rounded-[14px] border border-perola-borda bg-white">
              <table className="w-full text-left text-sm">
                <tbody>
                  {topClientes.length === 0 ? (
                    <tr><td className="px-3 py-4 text-center text-perola-texto-2">Sem compras registradas.</td></tr>
                  ) : (
                    topClientes.map((c) => (
                      <tr key={c.id} className={LINHA}>
                        <td className={TD_NOME}>{c.nome}</td>
                        <td className={`${TD} text-right`}>
                          {formatBRL(c.valorTotal)}
                          <span className="block text-xs">{c.totalCompras} compras</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="break-inside-avoid">
            <h3 className="mb-2 text-sm font-semibold text-perola-texto">Sem comprar há 30+ dias ({clientesInativos.length})</h3>
            <div className="max-h-80 overflow-y-auto rounded-[14px] border border-perola-borda bg-white">
              <table className="w-full text-left text-sm">
                <tbody>
                  {clientesInativos.length === 0 ? (
                    <tr><td className="px-3 py-4 text-center text-perola-texto-2">Nenhum cliente parado.</td></tr>
                  ) : (
                    clientesInativos.map((c) => (
                      <tr key={c.id} className={LINHA}>
                        <td className={TD_NOME}>{c.nome}</td>
                        <td className={`${TD} text-right whitespace-nowrap`}>{c.diasSemComprar} dias</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="break-inside-avoid">
            <h3 className="mb-2 text-sm font-semibold text-perola-texto">Nunca compraram ({clientesSemVendas.length})</h3>
            <div className="max-h-80 overflow-y-auto rounded-[14px] border border-perola-borda bg-white">
              <table className="w-full text-left text-sm">
                <tbody>
                  {clientesSemVendas.length === 0 ? (
                    <tr><td className="px-3 py-4 text-center text-perola-texto-2">Todos já compraram alguma vez.</td></tr>
                  ) : (
                    clientesSemVendas.map((c) => (
                      <tr key={c.id} className={LINHA}>
                        <td className={TD_NOME}>{c.nome}</td>
                        <td className={`${TD} text-right whitespace-nowrap`}>{c.telefone ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* 11. OBSERVAÇÕES */}
      <Secao titulo="11. Observações dos atendimentos">
        {observacoes.length === 0 ? (
          <p className="text-sm text-perola-texto-2">Nenhuma observação registrada no mês.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-[14px] border border-perola-borda bg-white">
            <table className="w-full text-left text-sm">
              <thead className={`sticky top-0 ${CABECALHO}`}>
                <tr>
                  <th className={TH}>Data</th>
                  <th className={TH}>Cliente</th>
                  <th className={TH}>Vendedora</th>
                  <th className={TH}>Observação</th>
                </tr>
              </thead>
              <tbody>
                {observacoes.map((a) => (
                  <tr key={a.id} className={LINHA}>
                    <td className={`${TD} whitespace-nowrap`}>{dataBR(a.data)}</td>
                    <td className={TD_NOME}>{a.clientes?.nome ?? "—"}</td>
                    <td className={`${TD} whitespace-nowrap`}>{nomeVendedor.get(a.vendedor_id) ?? "—"}</td>
                    <td className={TD}>{a.observacoes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>

      {/* 12. QUALIDADE DOS DADOS */}
      <Secao titulo="12. Qualidade dos dados" descricao="Cadastros e lançamentos incompletos que deixam este relatório menos preciso.">
        <ul className="space-y-2">
          {pendencias.map((p) => (
            <li key={p.texto} className="flex items-start gap-3 rounded-lg border border-perola-borda bg-white px-4 py-3 text-sm">
              <span className={p.ok ? "text-perola-tag-pos-texto" : "text-perola-alerta"}>{p.ok ? "✓" : "⚠"}</span>
              <span>
                <span className="font-medium text-perola-texto">{p.texto}</span>
                {!p.ok && <span className="block text-perola-texto-2">{p.dica}</span>}
              </span>
            </li>
          ))}
        </ul>
      </Secao>
    </div>
  );
}
