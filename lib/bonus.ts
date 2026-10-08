import { atendimentosValidos, somaValor } from "@/lib/metrics";
import type { Atendimento, Meta } from "@/types/database";

export interface FaixaBonus {
  percentual: number;
  valor: number;
}

export interface ConfigBonus {
  metaVendas: number;
  faixas: FaixaBonus[];
  atendimentosMeta: number;
  atendimentosValor: number;
  clientesMeta: number;
  clientesValor: number;
  vendasFaturadas: number | null;
}

export function configDoBonus(meta: Meta | undefined): ConfigBonus | null {
  if (!meta) return null;
  const faixas = (Array.isArray(meta.bonus_vendas_faixas) ? meta.bonus_vendas_faixas : [])
    .map((f) => ({ percentual: Number(f.percentual), valor: Number(f.valor) }))
    .filter((f) => f.percentual > 0 && f.valor > 0)
    .sort((a, b) => a.percentual - b.percentual);
  const config: ConfigBonus = {
    metaVendas: Number(meta.meta_valor ?? 0),
    faixas,
    atendimentosMeta: Number(meta.bonus_atendimentos_meta ?? 0),
    atendimentosValor: Number(meta.bonus_atendimentos_valor ?? 0),
    clientesMeta: Number(meta.bonus_clientes_meta ?? 0),
    clientesValor: Number(meta.bonus_clientes_valor ?? 0),
    vendasFaturadas: meta.vendas_faturadas === null || meta.vendas_faturadas === undefined ? null : Number(meta.vendas_faturadas),
  };
  const temBonus = faixas.length > 0 || config.atendimentosValor > 0 || config.clientesValor > 0;
  return temBonus ? config : null;
}

export interface DegrauVendas extends FaixaBonus {
  alvo: number;
  atingido: boolean;
}

export interface ResultadoBonus {
  config: ConfigBonus;
  maximo: number;
  ganho: number;
  vendas: {
    realizado: number;
    usandoFaturado: boolean;
    degraus: DegrauVendas[];
    ganho: number;
    proximo: DegrauVendas | null;
    faltaProximo: number;
    porDiaProximo: number;
  };
  atendimentos: { realizado: number; meta: number; valor: number; atingido: boolean; falta: number; porDia: number };
  clientes: { realizado: number; meta: number; valor: number; atingido: boolean; falta: number; porDia: number };
}

// Regras (definidas com a Pérola):
// - Vendas: recebe só o degrau mais alto atingido (não soma degraus). Se o
//   master informou o faturado do mês, ele vale no lugar das vendas do CRM.
// - Atendimentos e clientes diferentes: "Não atendeu" não conta, como no
//   resto do CRM. Cliente diferente = CPF/CNPJ diferente (sem documento,
//   cada cadastro conta como um cliente).
// - As três metas são independentes.
export function calcularBonus(
  config: ConfigBonus,
  atendimentosDoMes: (Pick<Atendimento, "cliente_id" | "resultado" | "valor" | "quantidade_sacos" | "valor_frete"> & {
    clientes?: { documento?: string | null } | null;
  })[],
  diasUteisRestantes: number
): ResultadoBonus {
  const dias = Math.max(diasUteisRestantes, 1);
  const validos = atendimentosValidos(atendimentosDoMes);
  const vendasCRM = somaValor(
    atendimentosDoMes.filter((a) => a.resultado === "compra"),
    "valor"
  );
  const usandoFaturado = config.vendasFaturadas !== null;
  const realizadoVendas = usandoFaturado ? (config.vendasFaturadas as number) : vendasCRM;

  const degraus = config.faixas.map((f) => {
    const alvo = (config.metaVendas * f.percentual) / 100;
    return { ...f, alvo, atingido: realizadoVendas >= alvo };
  });
  const ganhoVendas = degraus.filter((d) => d.atingido).reduce((maior, d) => Math.max(maior, d.valor), 0);
  const proximo = degraus.find((d) => !d.atingido) ?? null;
  const faltaProximo = proximo ? proximo.alvo - realizadoVendas : 0;

  const atendRealizado = validos.length;
  const atendAtingido = config.atendimentosValor > 0 && atendRealizado >= config.atendimentosMeta;
  const atendFalta = Math.max(config.atendimentosMeta - atendRealizado, 0);

  // Cliente diferente = CPF/CNPJ diferente; sem documento, vale o cadastro.
  const clientesRealizado = new Set(validos.map((a) => a.clientes?.documento || a.cliente_id)).size;
  const clientesAtingido = config.clientesValor > 0 && clientesRealizado >= config.clientesMeta;
  const clientesFalta = Math.max(config.clientesMeta - clientesRealizado, 0);

  const maximo =
    degraus.reduce((maior, d) => Math.max(maior, d.valor), 0) + config.atendimentosValor + config.clientesValor;
  const ganho =
    ganhoVendas + (atendAtingido ? config.atendimentosValor : 0) + (clientesAtingido ? config.clientesValor : 0);

  return {
    config,
    maximo,
    ganho,
    vendas: {
      realizado: realizadoVendas,
      usandoFaturado,
      degraus,
      ganho: ganhoVendas,
      proximo,
      faltaProximo,
      porDiaProximo: faltaProximo / dias,
    },
    atendimentos: {
      realizado: atendRealizado,
      meta: config.atendimentosMeta,
      valor: config.atendimentosValor,
      atingido: atendAtingido,
      falta: atendFalta,
      porDia: atendFalta / dias,
    },
    clientes: {
      realizado: clientesRealizado,
      meta: config.clientesMeta,
      valor: config.clientesValor,
      atingido: clientesAtingido,
      falta: clientesFalta,
      porDia: clientesFalta / dias,
    },
  };
}
