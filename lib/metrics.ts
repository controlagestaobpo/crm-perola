import type { Atendimento, ResultadoAtendimento } from "@/types/database";

const LABEL_RESULTADO: Record<ResultadoAtendimento, string> = {
  compra: "Compra",
  negociacao: "Negociação",
  interessado: "Interessado",
  sem_interesse: "Sem interesse",
  nao_atendeu: "Não atendeu",
  indisponivel: "Indisponível",
};

export function labelResultado(resultado: ResultadoAtendimento) {
  return LABEL_RESULTADO[resultado];
}

export function diasUteisNoMes(ano: number, mes: number, ateHoje = false, hoje = new Date()) {
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const limite = ateHoje && hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes
    ? hoje.getDate()
    : ultimoDia;

  let dias = 0;
  for (let dia = 1; dia <= limite; dia++) {
    const diaSemana = new Date(ano, mes - 1, dia).getDay();
    if (diaSemana !== 0 && diaSemana !== 6) dias++;
  }
  return dias;
}

export function somaValor(atendimentos: Atendimento[], campo: "valor" | "valor_negociacao") {
  return atendimentos.reduce((soma, a) => soma + Number(a[campo] ?? 0), 0);
}

export function contarResultado(atendimentos: Atendimento[], resultado: ResultadoAtendimento) {
  return atendimentos.filter((a) => a.resultado === resultado).length;
}

export function agruparResultados(atendimentos: Atendimento[]) {
  const resultados: ResultadoAtendimento[] = [
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

export function agruparPorHora(atendimentos: Atendimento[]) {
  const vendas = atendimentos
    .filter((a) => a.resultado === "compra")
    .sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime());

  let acumulado = 0;
  return vendas.map((a) => {
    acumulado += Number(a.valor ?? 0);
    const hora = new Date(a.criado_em).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { hora, valor: acumulado };
  });
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

export function contarProdutos(atendimentos: Atendimento[], campo: "produtos_oferecidos" | "produtos_vendidos") {
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
