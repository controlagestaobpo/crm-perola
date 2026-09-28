"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import AtendimentoRowActions from "@/components/AtendimentoRowActions";
import { labelResultado, formatBRL } from "@/lib/metrics";
import type { Atendimento } from "@/types/database";

const QTD_INICIAL = 5;

interface AtendimentosRecentesTabelaProps {
  atendimentos: (Atendimento & { clientes: { nome: string } | null })[];
  mensagemVazio: string;
}

export default function AtendimentosRecentesTabela({
  atendimentos,
  mensagemVazio,
}: AtendimentosRecentesTabelaProps) {
  const [expandido, setExpandido] = useState(false);
  const visiveis = expandido ? atendimentos : atendimentos.slice(0, QTD_INICIAL);
  const restantes = atendimentos.length - QTD_INICIAL;

  return (
    <div className="overflow-x-auto rounded-xl bg-oliva-100 shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-stone-500">
          <tr>
            <th className="px-4 py-3 font-medium">Data</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Resultado</th>
            <th className="px-4 py-3 font-medium">Valor</th>
            <th className="px-4 py-3 font-medium">Próx. contato</th>
            <th className="px-4 py-3 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {visiveis.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-stone-400">
                {mensagemVazio}
              </td>
            </tr>
          ) : (
            visiveis.map((a) => (
              <tr key={a.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3 text-stone-600">
                  {new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 font-medium text-stone-900">{a.clientes?.nome ?? "—"}</td>
                <td className="px-4 py-3 text-stone-600">{labelResultado(a.resultado)}</td>
                <td className="px-4 py-3 text-stone-600">{a.valor ? formatBRL(Number(a.valor)) : "—"}</td>
                <td className="px-4 py-3 text-stone-600">
                  {a.proximo_contato
                    ? new Date(a.proximo_contato + "T00:00:00").toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <AtendimentoRowActions atendimentoId={a.id} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {restantes > 0 && (
        <div className="border-t border-stone-100 p-2 text-center">
          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            className="flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-sm font-medium text-oliva-700 hover:bg-oliva-50"
          >
            {expandido ? (
              <>
                Mostrar menos <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Ver mais {restantes} {restantes === 1 ? "atendimento" : "atendimentos"}{" "}
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
