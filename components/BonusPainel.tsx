import { Check, Gift, Phone, ShoppingCart, Users } from "lucide-react";
import { formatBRL } from "@/lib/metrics";
import type { ResultadoBonus } from "@/lib/bonus";

function formatarInteiro(valor: number) {
  return Math.ceil(valor).toLocaleString("pt-BR");
}

function Pilula({ valor, atingido }: { valor: number; atingido: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        atingido ? "bg-perola-verde text-white" : "bg-perola-tag text-perola-texto-2"
      }`}
    >
      {atingido && <Check className="h-3 w-3" />}+{formatBRL(valor)}
    </span>
  );
}

function Barra({ percentual, cor }: { percentual: number; cor: string }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-perola-tag">
      <div className={`h-full rounded-full ${cor} transition-all`} style={{ width: `${Math.min(percentual, 100)}%` }} />
    </div>
  );
}

function BlocoContagem({
  titulo,
  icone: Icone,
  unidade,
  dados,
  mesAberto,
}: {
  titulo: string;
  icone: typeof Phone;
  unidade: string;
  dados: ResultadoBonus["atendimentos"];
  mesAberto: boolean;
}) {
  const percentual = dados.meta > 0 ? (dados.realizado / dados.meta) * 100 : 0;
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-perola-borda p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-perola-texto">
          <Icone className="h-4 w-4 text-perola-texto-2" /> {titulo}
        </p>
        <Pilula valor={dados.valor} atingido={dados.atingido} />
      </div>
      <p className="text-2xl font-semibold text-perola-texto">
        {dados.realizado}
        <span className="text-sm font-normal text-perola-texto-2"> / {dados.meta}</span>
      </p>
      <Barra percentual={percentual} cor={dados.atingido ? "bg-perola-verde" : "bg-perola-verde-medio"} />
      <p className="text-xs text-perola-texto-2">
        {dados.atingido ? (
          <span className="font-medium text-perola-tag-pos-texto">Bônus garantido! 🎉</span>
        ) : (
          <>
            Faltam <strong className="text-perola-texto">{dados.falta}</strong> {unidade}
            {mesAberto && <> · cerca de {formatarInteiro(dados.porDia)} por dia útil</>}
          </>
        )}
      </p>
    </div>
  );
}

export default function BonusPainel({
  nome,
  rotuloMes,
  resultado,
  diasUteisRestantes,
  mesAberto,
}: {
  nome: string;
  rotuloMes: string;
  resultado: ResultadoBonus;
  diasUteisRestantes: number;
  mesAberto: boolean;
}) {
  const { vendas, atendimentos, clientes, ganho, maximo, config } = resultado;
  const percentualVendas = config.metaVendas > 0 ? (vendas.realizado / config.metaVendas) * 100 : 0;
  const percentualGanho = maximo > 0 ? (ganho / maximo) * 100 : 0;

  return (
    <div className="overflow-hidden rounded-[14px] border border-perola-borda bg-white">
      {/* Cabeçalho: quanto já garantiu do bônus */}
      <div className="flex flex-col gap-4 bg-perola-verde p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-white/80">
            <Gift className="h-4 w-4" /> Bônus de {rotuloMes} · {nome}
          </p>
          <p className="mt-1 text-3xl font-semibold">
            {formatBRL(ganho)}
            <span className="text-base font-normal text-white/70"> de {formatBRL(maximo)}</span>
          </p>
          <p className="text-xs text-white/70">
            {mesAberto
              ? `garantidos até agora · ${diasUteisRestantes} ${diasUteisRestantes === 1 ? "dia útil" : "dias úteis"} para o fim do mês`
              : "resultado do mês"}
          </p>
        </div>
        <div className="w-full sm:w-56">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-perola-lima" style={{ width: `${Math.min(percentualGanho, 100)}%` }} />
          </div>
          <p className="mt-1 text-right text-xs text-white/70">{percentualGanho.toFixed(0)}% do bônus máximo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[1.4fr_1fr_1fr]">
        {/* Vendas com degraus */}
        {vendas.degraus.length > 0 && (
          <div className="flex flex-col gap-3 rounded-[12px] border border-perola-borda p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-perola-texto">
                <ShoppingCart className="h-4 w-4 text-perola-texto-2" /> Vendas {vendas.usandoFaturado ? "faturadas" : "do mês"}
              </p>
              <Pilula
                valor={vendas.ganho > 0 ? vendas.ganho : Math.max(...vendas.degraus.map((d) => d.valor))}
                atingido={vendas.ganho > 0}
              />
            </div>
            <p className="text-2xl font-semibold text-perola-texto">
              {formatBRL(vendas.realizado)}
              <span className="text-sm font-normal text-perola-texto-2"> / {formatBRL(config.metaVendas)}</span>
            </p>

            {/* Barra com os degraus marcados */}
            <div className="relative">
              <Barra percentual={percentualVendas} cor={vendas.ganho > 0 ? "bg-perola-verde" : "bg-perola-verde-medio"} />
              {vendas.degraus.map((d) => (
                <div
                  key={d.percentual}
                  className={`absolute -top-1 h-5 w-0.5 -translate-x-1/2 ${d.atingido ? "bg-perola-verde" : "bg-perola-texto-2/40"}`}
                  style={{ left: `${Math.min(d.percentual, 100)}%` }}
                />
              ))}
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${vendas.degraus.length}, minmax(0, 1fr))` }}>
              {vendas.degraus.map((d) => (
                <div
                  key={d.percentual}
                  className={`rounded-lg border px-2 py-1.5 text-center ${
                    d.atingido ? "border-perola-verde bg-perola-tag-pos-bg" : "border-perola-borda"
                  }`}
                >
                  <p className={`text-sm font-semibold ${d.atingido ? "text-perola-tag-pos-texto" : "text-perola-texto"}`}>
                    {d.atingido ? "✓ " : ""}
                    {formatBRL(d.valor)}
                  </p>
                  <p className="text-[11px] text-perola-texto-2">
                    {d.percentual}% · {formatBRL(d.alvo).replace(",00", "")}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-xs text-perola-texto-2">
              {vendas.proximo ? (
                <>
                  Faltam <strong className="text-perola-texto">{formatBRL(vendas.faltaProximo)}</strong> para ganhar{" "}
                  <strong className="text-perola-texto">{formatBRL(vendas.proximo.valor)}</strong>
                  {mesAberto && <> · cerca de {formatBRL(vendas.porDiaProximo)} por dia útil</>}
                </>
              ) : (
                <span className="font-medium text-perola-tag-pos-texto">Meta de vendas batida! 🎉</span>
              )}
            </p>
            <p className="text-[11px] text-perola-texto-2/80">
              {vendas.usandoFaturado
                ? "Valor faturado informado pela gestão."
                : "Pelas vendas lançadas no CRM. No fechamento, vale o faturado (com devoluções e cancelamentos)."}
            </p>
          </div>
        )}

        {atendimentos.valor > 0 && (
          <BlocoContagem titulo="Atendimentos" icone={Phone} unidade="atendimentos" dados={atendimentos} mesAberto={mesAberto} />
        )}
        {clientes.valor > 0 && (
          <BlocoContagem titulo="Clientes diferentes" icone={Users} unidade="clientes" dados={clientes} mesAberto={mesAberto} />
        )}
      </div>

      <p className="border-t border-perola-divisor px-5 py-3 text-[11px] text-perola-texto-2">
        As metas são independentes: o que bater, ganha. Em vendas vale só o degrau mais alto. &quot;Não atendeu&quot; não
        conta como atendimento. Cliente atendido várias vezes conta uma vez.
      </p>
    </div>
  );
}
