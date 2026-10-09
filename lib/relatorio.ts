import { atendimentosValidos, somaValor } from "@/lib/metrics";
import { diferencaDias, somarDias } from "@/lib/periodo";
import type { Atendimento } from "@/types/database";

// ==================== ORÇAMENTOS ====================

export type StatusOrcamento = "aberto" | "convertido" | "perdido" | "substituido";

export interface SituacaoOrcamento {
  status: StatusOrcamento;
  // Dias entre o orçamento e a compra (só para "convertido").
  diasAteCompra?: number;
}

type AtendimentoMinimo = Pick<Atendimento, "id" | "cliente_id" | "data" | "criado_em" | "resultado">;

// Um orçamento fica "aberto" até aparecer, depois dele e para o mesmo cliente:
// uma compra (convertido), um "sem interesse" (perdido) ou um orçamento novo
// (o antigo vira "substituído" e o novo passa a valer). Interessado, não
// atendeu e indisponível não fecham o orçamento.
export function situacaoDosOrcamentos(atendimentos: AtendimentoMinimo[]): Map<string, SituacaoOrcamento> {
  const ordenados = [...atendimentos].sort(
    (a, b) => a.data.localeCompare(b.data) || a.criado_em.localeCompare(b.criado_em)
  );
  const situacao = new Map<string, SituacaoOrcamento>();
  const abertosPorCliente = new Map<string, AtendimentoMinimo[]>();

  for (const a of ordenados) {
    const abertos = abertosPorCliente.get(a.cliente_id) ?? [];
    if (a.resultado === "compra") {
      for (const o of abertos) situacao.set(o.id, { status: "convertido", diasAteCompra: diferencaDias(o.data, a.data) });
      abertosPorCliente.set(a.cliente_id, []);
    } else if (a.resultado === "sem_interesse") {
      for (const o of abertos) situacao.set(o.id, { status: "perdido" });
      abertosPorCliente.set(a.cliente_id, []);
    } else if (a.resultado === "negociacao") {
      for (const o of abertos) situacao.set(o.id, { status: "substituido" });
      situacao.set(a.id, { status: "aberto" });
      abertosPorCliente.set(a.cliente_id, [a]);
    }
  }

  return situacao;
}

// ==================== RESUMO E COMPARATIVO ====================

export interface Resumo {
  contatos: number;
  atendimentos: number;
  prospeccoes: number;
  clientesAtendidos: number;
  vendas: number;
  conversao: number;
  receita: number;
  ticketMedio: number;
  sacos: number;
  frete: number;
}

export function resumir(atendimentos: Atendimento[]): Resumo {
  const validos = atendimentosValidos(atendimentos);
  const compras = atendimentos.filter((a) => a.resultado === "compra");
  const receita = somaValor(compras, "valor");
  return {
    contatos: atendimentos.length,
    atendimentos: validos.length,
    prospeccoes: atendimentos.filter((a) => a.resultado === "prospeccao").length,
    clientesAtendidos: new Set(validos.map((a) => a.cliente_id)).size,
    vendas: compras.length,
    conversao: validos.length > 0 ? (compras.length / validos.length) * 100 : 0,
    receita,
    ticketMedio: compras.length > 0 ? receita / compras.length : 0,
    sacos: somaValor(compras, "quantidade_sacos"),
    frete: somaValor(compras, "valor_frete"),
  };
}

// Variação em % (null quando não há base de comparação).
export function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return atual === 0 ? 0 : null;
  return ((atual - anterior) / anterior) * 100;
}

// ==================== FUNIL ====================

export function funil(atendimentos: Atendimento[]) {
  const clientes = (filtro: (a: Atendimento) => boolean) =>
    new Set(atendimentos.filter(filtro).map((a) => a.cliente_id)).size;
  return [
    { etapa: "Clientes contatados", quantidade: clientes(() => true) },
    { etapa: "Atenderam", quantidade: clientes((a) => a.resultado !== "nao_atendeu") },
    { etapa: "Orçamento ou compra", quantidade: clientes((a) => a.resultado === "negociacao" || a.resultado === "compra") },
    { etapa: "Compraram", quantidade: clientes((a) => a.resultado === "compra") },
  ];
}

// ==================== CLIENTES ====================

// Cliente "novo" no período = a primeira compra da vida dele caiu dentro do período.
export function novosERecorrentes(
  comprasDoPeriodo: Atendimento[],
  todasCompras: Pick<Atendimento, "cliente_id" | "data">[],
  inicio: string
) {
  const primeiraCompra = new Map<string, string>();
  for (const c of todasCompras) {
    const atual = primeiraCompra.get(c.cliente_id);
    if (!atual || c.data < atual) primeiraCompra.set(c.cliente_id, c.data);
  }
  const compradores = new Set(comprasDoPeriodo.map((c) => c.cliente_id));
  const novos: string[] = [];
  const recorrentes: string[] = [];
  for (const id of Array.from(compradores)) {
    if ((primeiraCompra.get(id) ?? inicio) >= inicio) novos.push(id);
    else recorrentes.push(id);
  }
  return { novos, recorrentes };
}

export const INTERVALO_PADRAO_REPOSICAO = 30;

export interface Reposicao {
  clienteId: string;
  ultimaCompra: string;
  intervaloDias: number;
  estimado: boolean;
  prevista: string;
  // Negativo = já passou da data prevista.
  diasParaRepor: number;
  totalCompras: number;
}

// Quando cada cliente deve precisar comprar de novo: última compra + intervalo
// médio entre as compras dele. Quem só comprou uma vez usa o intervalo padrão.
export function reposicaoPrevista(
  todasCompras: Pick<Atendimento, "cliente_id" | "data">[],
  hojeISO: string,
  janelaDias = 7
): Reposicao[] {
  const datasPorCliente = new Map<string, Set<string>>();
  for (const c of todasCompras) {
    const datas = datasPorCliente.get(c.cliente_id) ?? new Set<string>();
    datas.add(c.data);
    datasPorCliente.set(c.cliente_id, datas);
  }

  const lista: Reposicao[] = [];
  for (const [clienteId, conjunto] of Array.from(datasPorCliente.entries())) {
    const datas = Array.from(conjunto).sort();
    const ultimaCompra = datas[datas.length - 1];
    const estimado = datas.length < 2;
    const intervaloDias = estimado
      ? INTERVALO_PADRAO_REPOSICAO
      : Math.max(Math.round(diferencaDias(datas[0], ultimaCompra) / (datas.length - 1)), 1);
    const prevista = somarDias(ultimaCompra, intervaloDias);
    const diasParaRepor = diferencaDias(hojeISO, prevista);
    if (diasParaRepor <= janelaDias) {
      lista.push({ clienteId, ultimaCompra, intervaloDias, estimado, prevista, diasParaRepor, totalCompras: datas.length });
    }
  }
  return lista.sort((a, b) => a.diasParaRepor - b.diasParaRepor);
}

// Abaixo disso, o "valor do orçamento" quase certamente foi preenchido com o
// preço de um saco, e não com o total da proposta.
export const VALOR_ORCAMENTO_SUSPEITO = 300;
