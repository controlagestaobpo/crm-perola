import { atendimentosValidos } from "@/lib/metrics";
import type { Atendimento, Meta } from "@/types/database";

// Datas aqui são sempre strings "YYYY-MM-DD" (o mesmo formato da coluna
// atendimentos.data). As contas usam Date.UTC para não sofrer com fuso.

export const MAX_DIAS_PERIODO = 93;

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;

function paraUTC(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

function deUTC(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function dataValida(iso: string | undefined): iso is string {
  return Boolean(iso && REGEX_DATA.test(iso) && !Number.isNaN(paraUTC(iso)));
}

export function somarDias(iso: string, dias: number) {
  return deUTC(paraUTC(iso) + dias * 86400000);
}

export function diferencaDias(de: string, ate: string) {
  return Math.round((paraUTC(ate) - paraUTC(de)) / 86400000);
}

export function ehDiaUtil(iso: string) {
  const diaSemana = new Date(paraUTC(iso)).getUTCDay();
  return diaSemana !== 0 && diaSemana !== 6;
}

export function inicioDoMes(iso: string) {
  return iso.slice(0, 8) + "01";
}

function fimDoMes(iso: string) {
  const [ano, mes] = iso.split("-").map(Number);
  return deUTC(Date.UTC(ano, mes, 0));
}

export function formatarDataCurta(iso: string) {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

// Arruma o período vindo da URL: datas inválidas viram hoje, "até" nunca
// fica antes de "de" nem depois de hoje, e o tamanho fica limitado.
export function normalizarPeriodo(deParam: string | undefined, ateParam: string | undefined, hojeISO: string) {
  let de = dataValida(deParam) ? deParam : hojeISO;
  let ate = dataValida(ateParam) ? ateParam : de;
  if (ate > hojeISO) ate = hojeISO;
  if (de > ate) de = ate;
  if (diferencaDias(de, ate) >= MAX_DIAS_PERIODO) de = somarDias(ate, -(MAX_DIAS_PERIODO - 1));
  return { de, ate };
}

export interface MetaDoDia {
  data: string;
  valor: number;
  sacos: number;
  atendimentos: number;
}

// Meta de cada dia do período, do jeito que ela valia naquele dia: o que
// faltava pra bater a meta do mês (descontando o que foi feito até o dia
// anterior), dividido pelos dias úteis que ainda restavam no mês, contando
// o próprio dia. Fim de semana tem meta zero.
//
// `atendimentos` precisa começar no dia 1 do mês de `de` (e já vir filtrado
// por vendedor, se houver filtro), e `metas` precisa cobrir todos os meses
// do período.
export function metasPorDia(
  de: string,
  ate: string,
  metas: Pick<Meta, "ano" | "mes" | "meta_valor" | "meta_sacos" | "meta_prospeccoes">[],
  atendimentos: Atendimento[]
): MetaDoDia[] {
  const porDia = new Map<string, { valor: number; sacos: number; atendimentos: number }>();
  for (const a of atendimentos) {
    const atual = porDia.get(a.data) ?? { valor: 0, sacos: 0, atendimentos: 0 };
    atual.valor += Number(a.valor ?? 0);
    atual.sacos += Number(a.quantidade_sacos ?? 0);
    atual.atendimentos += atendimentosValidos([a]).length;
    porDia.set(a.data, atual);
  }

  const resultado: MetaDoDia[] = [];
  let mesAtual = "";
  let metaMes = { valor: 0, sacos: 0, atendimentos: 0 };
  let feito = { valor: 0, sacos: 0, atendimentos: 0 };
  let diasUteisRestantes = 0;

  for (let dia = inicioDoMes(de); dia <= ate; dia = somarDias(dia, 1)) {
    const mes = dia.slice(0, 7);
    if (mes !== mesAtual) {
      mesAtual = mes;
      const [ano, numMes] = mes.split("-").map(Number);
      const metasDoMes = metas.filter((m) => m.ano === ano && m.mes === numMes);
      metaMes = {
        valor: metasDoMes.reduce((s, m) => s + Number(m.meta_valor), 0),
        sacos: metasDoMes.reduce((s, m) => s + Number(m.meta_sacos ?? 0), 0),
        atendimentos: metasDoMes.reduce((s, m) => s + Number(m.meta_prospeccoes), 0),
      };
      feito = { valor: 0, sacos: 0, atendimentos: 0 };
      diasUteisRestantes = 0;
      for (let d = dia; d <= fimDoMes(dia); d = somarDias(d, 1)) if (ehDiaUtil(d)) diasUteisRestantes++;
    }

    const util = ehDiaUtil(dia);
    const divisor = Math.max(diasUteisRestantes, 1);
    if (dia >= de) {
      resultado.push({
        data: dia,
        valor: util ? Math.max(metaMes.valor - feito.valor, 0) / divisor : 0,
        sacos: util ? Math.max(metaMes.sacos - feito.sacos, 0) / divisor : 0,
        atendimentos: util ? Math.max(metaMes.atendimentos - feito.atendimentos, 0) / divisor : 0,
      });
    }

    const doDia = porDia.get(dia);
    if (doDia) {
      feito.valor += doDia.valor;
      feito.sacos += doDia.sacos;
      feito.atendimentos += doDia.atendimentos;
    }
    if (util) diasUteisRestantes--;
  }

  return resultado;
}

export function agruparPorDia(atendimentos: Atendimento[], metas: MetaDoDia[]) {
  const contagem = new Map<string, number>();
  for (const a of atendimentosValidos(atendimentos)) contagem.set(a.data, (contagem.get(a.data) ?? 0) + 1);

  return metas.map((m) => ({
    dia: formatarDataCurta(m.data),
    valor: contagem.get(m.data) ?? 0,
    meta: Math.round(m.atendimentos),
  }));
}

export const PRESETS_PERIODO = [
  { valor: "hoje", label: "Hoje" },
  { valor: "semana", label: "Esta semana" },
  { valor: "mes", label: "Este mês" },
  { valor: "mes_passado", label: "Mês passado" },
  { valor: "30d", label: "Últimos 30 dias" },
  { valor: "90d", label: "Últimos 90 dias" },
  { valor: "personalizado", label: "Personalizado" },
] as const;

export type PresetPeriodo = (typeof PRESETS_PERIODO)[number]["valor"];

// Período de um atalho ("Este mês", "Mês passado"...). "personalizado" usa
// de/até da URL, limitado a um ano e nunca depois de hoje.
export function periodoDoPreset(
  preset: string | undefined,
  deParam: string | undefined,
  ateParam: string | undefined,
  hojeISO: string
): { preset: PresetPeriodo; de: string; ate: string } {
  const p = (PRESETS_PERIODO.some((x) => x.valor === preset) ? preset : "mes") as PresetPeriodo;
  const diaSemana = new Date(paraUTC(hojeISO)).getUTCDay();
  switch (p) {
    case "hoje":
      return { preset: p, de: hojeISO, ate: hojeISO };
    case "semana":
      return { preset: p, de: somarDias(hojeISO, -((diaSemana + 6) % 7)), ate: hojeISO };
    case "mes_passado": {
      const fimMesPassado = somarDias(inicioDoMes(hojeISO), -1);
      return { preset: p, de: inicioDoMes(fimMesPassado), ate: fimMesPassado };
    }
    case "30d":
      return { preset: p, de: somarDias(hojeISO, -29), ate: hojeISO };
    case "90d":
      return { preset: p, de: somarDias(hojeISO, -89), ate: hojeISO };
    case "personalizado": {
      let de = dataValida(deParam) ? deParam : inicioDoMes(hojeISO);
      let ate = dataValida(ateParam) ? ateParam : hojeISO;
      if (ate > hojeISO) ate = hojeISO;
      if (de > ate) de = ate;
      if (diferencaDias(de, ate) > 365) de = somarDias(ate, -365);
      return { preset: p, de, ate };
    }
    default:
      return { preset: "mes", de: inicioDoMes(hojeISO), ate: hojeISO };
  }
}
