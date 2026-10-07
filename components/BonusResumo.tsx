import Link from "next/link";
import { Gift } from "lucide-react";
import { formatBRL } from "@/lib/metrics";
import type { ResultadoBonus } from "@/lib/bonus";

// Versão compacta do bônus para o Dashboard da vendedora.
export default function BonusResumo({ resultado }: { resultado: ResultadoBonus }) {
  const { ganho, maximo, vendas, atendimentos, clientes } = resultado;
  const percentual = maximo > 0 ? (ganho / maximo) * 100 : 0;
  const itens = [
    vendas.proximo && `${formatBRL(vendas.faltaProximo)} em vendas para +${formatBRL(vendas.proximo.valor)}`,
    atendimentos.valor > 0 && !atendimentos.atingido && `${atendimentos.falta} atendimentos para +${formatBRL(atendimentos.valor)}`,
    clientes.valor > 0 && !clientes.atingido && `${clientes.falta} clientes diferentes para +${formatBRL(clientes.valor)}`,
  ].filter(Boolean) as string[];

  return (
    <Link href="/metas" className="block rounded-[14px] bg-perola-verde p-5 text-white transition hover:brightness-110">
      <p className="flex items-center gap-1.5 text-sm font-medium text-white/80">
        <Gift className="h-4 w-4" /> Seu bônus do mês
      </p>
      <p className="mt-1 text-2xl font-semibold">
        {formatBRL(ganho)} <span className="text-sm font-normal text-white/70">de {formatBRL(maximo)}</span>
      </p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-perola-lima" style={{ width: `${Math.min(percentual, 100)}%` }} />
      </div>
      {itens.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-white/85">
          {itens.map((t) => (
            <li key={t}>• Faltam {t}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs font-medium text-perola-lima">Bônus máximo garantido! 🎉</p>
      )}
      <p className="mt-3 text-xs font-semibold text-perola-lima">Ver detalhes →</p>
    </Link>
  );
}
