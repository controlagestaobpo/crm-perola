import type { Atendimento, ResultadoAtendimento } from "@/types/database";

const LABEL_RESULTADO: Record<ResultadoAtendimento, string> = {
  prospeccao: "Prospecção",
  compra: "Compra",
  negociacao: "Orçamento",
  interessado: "Interessado",
  sem_interesse: "Sem interesse",
  nao_atendeu: "Não atendeu",
  indisponivel: "Indisponível",
};

export function labelResultado(resultado: ResultadoAtendimento) {
  return LABEL_RESULTADO[resultado];
}

// "Não atendeu" = ninguém atendeu o telefone, então não conta como um
// atendimento de verdade pra fins de meta/contagem/conversão. Ainda fica
// salvo e aparece na Distribuição de resultados — só não entra nesses totais.
export function atendimentosValidos<T extends { resultado: ResultadoAtendimento }>(atendimentos: T[]): T[] {
  return atendimentos.filter((a) => a.resultado !== "nao_atendeu");
}

// O servidor roda em UTC. Esse deslocamento fixo (-3h, o Brasil não tem mais
// horário de verão) garante que "hoje"/"agora" sempre reflita o horário de
// Brasília, e não vire o dia seguinte 3h mais cedo do que deveria.
// Depois de chamar isso, leia os campos com getUTCFullYear/getUTCMonth/etc.
export function agoraBrasil() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000);
}

export function hojeISOBrasil(agora = agoraBrasil()) {
  return agora.toISOString().slice(0, 10);
}

// Diferença em dias (arredondada) entre uma data "YYYY-MM-DD" e o dia atual
// no horário de Brasília. Positivo = no futuro, negativo = no passado.
export function diasEntreHojeE(dataISO: string) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const alvo = Date.UTC(ano, mes - 1, dia);
  const agora = agoraBrasil();
  const hojeMeiaNoite = Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate());
  return Math.round((alvo - hojeMeiaNoite) / 86400000);
}

export function diasUteisNoMes(ano: number, mes: number, ateHoje = false, hoje = agoraBrasil()) {
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const limite = ateHoje && hoje.getUTCFullYear() === ano && hoje.getUTCMonth() + 1 === mes
    ? hoje.getUTCDate()
    : ultimoDia;

  let dias = 0;
  for (let dia = 1; dia <= limite; dia++) {
    const diaSemana = new Date(ano, mes - 1, dia).getDay();
    if (diaSemana !== 0 && diaSemana !== 6) dias++;
  }
  return dias;
}

export function diasUteisRestantes(diasUteisTotais: number, diasUteisDecorridos: number) {
  return Math.max(diasUteisTotais - diasUteisDecorridos, 1);
}

// Tipo enxuto: aceita tanto uma linha completa de atendimento quanto uma
// consulta que só trouxe algumas colunas (ver metas/page.tsx e insights/page.tsx).
type AtendimentoValores = Pick<Atendimento, "resultado" | "valor" | "quantidade_sacos" | "valor_frete"> & {
  valor_negociacao?: number | null;
};

export function somaValor(
  atendimentos: AtendimentoValores[],
  campo: "valor" | "valor_negociacao" | "quantidade_sacos" | "valor_frete"
) {
  return atendimentos.reduce((soma, a) => soma + Number(a[campo] ?? 0), 0);
}

export function somaComissao(atendimentos: AtendimentoValores[], comissaoPercentual: number) {
  const base = atendimentos
    .filter((a) => a.resultado === "compra")
    .reduce((soma, a) => soma + (Number(a.valor ?? 0) - Number(a.valor_frete ?? 0)), 0);
  return Math.max(base, 0) * (comissaoPercentual / 100);
}

export function contarResultado(atendimentos: Atendimento[], resultado: ResultadoAtendimento) {
  return atendimentos.filter((a) => a.resultado === resultado).length;
}

export function agruparResultados(atendimentos: Atendimento[]) {
  const resultados: ResultadoAtendimento[] = [
    "prospeccao",
    "compra",
    "negociacao",
    "interessado",
    "sem_interesse",
    "nao_atendeu",
    "indisponivel",
  ];
  return resultados
    .map((resultado) => ({
      nome: labelResultado(resultado),
      quantidade: contarResultado(atendimentos, resultado),
    }))
    .filter((item) => item.quantidade > 0);
}

const HORA_INICIO_EXPEDIENTE = 8;
const HORA_FIM_EXPEDIENTE = 18;

// Quanto do dia de expediente já passou, em %. Usado só para mostrar
// "ritmo esperado" ao lado da barra de progresso do dia (visual, não altera metas/cálculos existentes).
export function ritmoEsperadoPercentual(agora: Date): number {
  const horaAtual = (agora.getUTCHours() + OFFSET_HORARIO_BRASIL + 24) % 24;
  const minutos = agora.getUTCMinutes();
  const horaDecimal = horaAtual + minutos / 60;

  if (horaDecimal <= HORA_INICIO_EXPEDIENTE) return 0;
  if (horaDecimal >= HORA_FIM_EXPEDIENTE) return 100;

  const totalHoras = HORA_FIM_EXPEDIENTE - HORA_INICIO_EXPEDIENTE;
  const decorridas = horaDecimal - HORA_INICIO_EXPEDIENTE;
  return Math.round((decorridas / totalHoras) * 100);
}

export function agruparPorHora(atendimentos: Atendimento[], metaDiaria = 0) {
  const horas: { hora: string; valor: number; meta: number }[] = [];
  const totalHoras = HORA_FIM_EXPEDIENTE - HORA_INICIO_EXPEDIENTE + 1;

  for (let h = HORA_INICIO_EXPEDIENTE; h <= HORA_FIM_EXPEDIENTE; h++) {
    const realizado = atendimentos.filter(
      (a) => (new Date(a.criado_em).getUTCHours() + OFFSET_HORARIO_BRASIL + 24) % 24 <= h
    ).length;
    const passoMeta = ((h - HORA_INICIO_EXPEDIENTE + 1) / totalHoras) * metaDiaria;
    horas.push({ hora: `${h}h`, valor: realizado, meta: Math.round(passoMeta) });
  }

  return horas;
}

export function agruparPorDiaAcumulado(atendimentos: Atendimento[], ano: number, mes: number) {
  const vendas = atendimentos.filter((a) => a.resultado === "compra");
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const porDia = new Map<number, number>();

  for (const a of vendas) {
    const dia = new Date(a.data + "T00:00:00").getDate();
    porDia.set(dia, (porDia.get(dia) ?? 0) + Number(a.valor ?? 0));
  }

  let acumulado = 0;
  const resultado: { dia: string; valor: number }[] = [];
  for (let dia = 1; dia <= ultimoDia; dia++) {
    acumulado += porDia.get(dia) ?? 0;
    resultado.push({ dia: String(dia).padStart(2, "0"), valor: acumulado });
  }
  return resultado;
}

export function contarProdutos(
  atendimentos: Pick<Atendimento, "produtos_oferecidos" | "produtos_vendidos">[],
  campo: "produtos_oferecidos" | "produtos_vendidos"
) {
  const contagem = new Map<string, number>();
  for (const a of atendimentos) {
    for (const produto of a[campo] ?? []) {
      contagem.set(produto, (contagem.get(produto) ?? 0) + 1);
    }
  }
  return Array.from(contagem.entries())
    .map(([produto, quantidade]) => ({ produto, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);
}

export function formatBRL(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const OFFSET_HORARIO_BRASIL = -3;

export function melhorHorarioContato(atendimentos: Pick<Atendimento, "criado_em" | "resultado">[]) {
  const buckets = new Map<number, { total: number; atendidas: number }>();

  for (const a of atendimentos) {
    const hora = (new Date(a.criado_em).getUTCHours() + OFFSET_HORARIO_BRASIL + 24) % 24;
    const atual = buckets.get(hora) ?? { total: 0, atendidas: 0 };
    atual.total += 1;
    if (a.resultado !== "nao_atendeu") atual.atendidas += 1;
    buckets.set(hora, atual);
  }

  return Array.from(buckets.entries())
    .map(([hora, { total, atendidas }]) => ({
      hora,
      faixa: `${String(hora).padStart(2, "0")}h-${String((hora + 1) % 24).padStart(2, "0")}h`,
      total,
      atendidas,
      taxa: total > 0 ? (atendidas / total) * 100 : 0,
    }))
    .filter((b) => b.total > 0)
    .sort((a, b) => b.taxa - a.taxa || b.total - a.total);
}
