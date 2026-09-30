"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { diferencaDias, somarDias } from "@/lib/periodo";

type Periodo = "hoje" | "mes" | "personalizado";

interface FiltroDashboardProps {
  periodo: Periodo;
  de: string;
  ate: string;
  hojeISO: string;
  vendedorId: string;
  // null = quem está logado não pode filtrar por vendedor (vendedor só vê os próprios)
  vendedores: { id: string; nome: string }[] | null;
}

const CLASSE_CAMPO =
  "rounded-[10px] border border-[#DAD8CD] bg-white px-3 py-1.5 text-sm text-perola-texto focus:border-perola-verde focus:outline-none";

export default function FiltroDashboard({ periodo, de, ate, hojeISO, vendedorId, vendedores }: FiltroDashboardProps) {
  const router = useRouter();

  function navegar(novo: { periodo?: Periodo; de?: string; ate?: string; vendedor?: string }) {
    const p = novo.periodo ?? periodo;
    const params = new URLSearchParams({ periodo: p });
    if (p === "personalizado") {
      params.set("de", novo.de ?? de);
      params.set("ate", novo.ate ?? ate);
    }
    const vendedor = novo.vendedor ?? vendedorId;
    if (vendedor) params.set("vendedor", vendedor);
    router.push(`/?${params.toString()}`);
  }

  function mudarDe(valor: string) {
    if (!valor) return;
    navegar({ de: valor, ate: valor > ate ? valor : ate });
  }

  function mudarAte(valor: string) {
    if (!valor) return;
    navegar({ ate: valor, de: valor < de ? valor : de });
  }

  // As setas andam o tamanho do próprio período: um dia de cada vez, uma
  // semana de cada vez, etc.
  const tamanho = diferencaDias(de, ate) + 1;
  const podeAvancar = somarDias(ate, tamanho) <= hojeISO;

  function andar(direcao: -1 | 1) {
    navegar({ de: somarDias(de, direcao * tamanho), ate: somarDias(ate, direcao * tamanho) });
  }

  const botaoPeriodo = (valor: Periodo, label: string, extra: { de?: string; ate?: string } = {}) => (
    <button
      type="button"
      onClick={() => navegar({ periodo: valor, ...extra })}
      className={`rounded-md px-4 py-1.5 text-sm font-medium ${
        periodo === valor ? "bg-perola-verde text-white" : "text-perola-texto-2"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {vendedores && (
          <select
            value={vendedorId}
            onChange={(e) => navegar({ vendedor: e.target.value })}
            className={CLASSE_CAMPO}
            aria-label="Vendedor(a)"
          >
            <option value="">Todas as vendedoras</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </select>
        )}
        <div className="flex rounded-lg border border-perola-borda bg-white p-1">
          {botaoPeriodo("hoje", "Hoje")}
          {botaoPeriodo("mes", "Este mês")}
          {botaoPeriodo("personalizado", "Personalizado", { de: hojeISO, ate: hojeISO })}
        </div>
      </div>

      {periodo === "personalizado" && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => andar(-1)}
            className="rounded-lg border border-perola-borda bg-white p-1.5 text-perola-texto-2 hover:text-perola-texto"
            title={tamanho === 1 ? "Dia anterior" : "Período anterior"}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <label className="flex items-center gap-1.5 text-sm text-perola-texto-2">
            De
            <input type="date" value={de} max={hojeISO} onChange={(e) => mudarDe(e.target.value)} className={CLASSE_CAMPO} />
          </label>
          <label className="flex items-center gap-1.5 text-sm text-perola-texto-2">
            até
            <input type="date" value={ate} max={hojeISO} onChange={(e) => mudarAte(e.target.value)} className={CLASSE_CAMPO} />
          </label>
          <button
            type="button"
            onClick={() => andar(1)}
            disabled={!podeAvancar}
            className="rounded-lg border border-perola-borda bg-white p-1.5 text-perola-texto-2 hover:text-perola-texto disabled:opacity-40"
            title={tamanho === 1 ? "Próximo dia" : "Próximo período"}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
