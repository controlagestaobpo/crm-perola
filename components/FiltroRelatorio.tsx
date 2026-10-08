"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PRESETS_PERIODO, type PresetPeriodo } from "@/lib/periodo";

const CAMPO =
  "rounded-[10px] border border-[#DAD8CD] bg-white px-3 py-1.5 text-sm text-perola-texto focus:border-perola-verde focus:outline-none";

// Período e vendedora mudam a busca no servidor; o resto (resultado, busca,
// ordenação) é filtrado na hora, na própria tabela.
export default function FiltroRelatorio({
  preset,
  de,
  ate,
  hojeISO,
  vendedorId,
  vendedores,
}: {
  preset: PresetPeriodo;
  de: string;
  ate: string;
  hojeISO: string;
  vendedorId: string;
  vendedores: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [carregando, startTransition] = useTransition();

  function navegar(mudancas: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor) params.set(chave, valor);
      else params.delete(chave);
    }
    if (params.get("periodo") !== "personalizado") {
      params.delete("de");
      params.delete("ate");
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className={`flex flex-wrap items-end gap-3 transition-opacity ${carregando ? "opacity-60" : ""}`}>
      <label className="flex flex-col gap-1 text-xs font-semibold text-perola-texto-2">
        Período
        <select
          value={preset}
          onChange={(e) =>
            navegar(
              e.target.value === "personalizado"
                ? { periodo: "personalizado", de, ate }
                : { periodo: e.target.value }
            )
          }
          className={CAMPO}
        >
          {PRESETS_PERIODO.map((p) => (
            <option key={p.valor} value={p.valor}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      {preset === "personalizado" && (
        <>
          <label className="flex flex-col gap-1 text-xs font-semibold text-perola-texto-2">
            De
            <input
              type="date"
              value={de}
              max={hojeISO}
              onChange={(e) => e.target.value && navegar({ periodo: "personalizado", de: e.target.value, ate: e.target.value > ate ? e.target.value : ate })}
              className={CAMPO}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-perola-texto-2">
            Até
            <input
              type="date"
              value={ate}
              max={hojeISO}
              onChange={(e) => e.target.value && navegar({ periodo: "personalizado", ate: e.target.value, de: e.target.value < de ? e.target.value : de })}
              className={CAMPO}
            />
          </label>
        </>
      )}

      <label className="flex flex-col gap-1 text-xs font-semibold text-perola-texto-2">
        Vendedor(a)
        <select value={vendedorId} onChange={(e) => navegar({ vendedor: e.target.value })} className={CAMPO}>
          <option value="">Todas</option>
          {vendedores.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nome}
            </option>
          ))}
        </select>
      </label>

      {carregando && <span className="pb-2 text-xs text-perola-texto-2">Carregando…</span>}
    </div>
  );
}
