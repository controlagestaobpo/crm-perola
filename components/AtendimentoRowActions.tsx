"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { excluirAtendimento } from "@/lib/actions";

export default function AtendimentoRowActions({ atendimentoId }: { atendimentoId: string }) {
  const [pending, startTransition] = useTransition();

  function handleExcluir() {
    if (!confirm("Excluir este atendimento? Essa ação não pode ser desfeita.")) return;
    startTransition(() => {
      excluirAtendimento(atendimentoId);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/atendimentos/${atendimentoId}/editar`}
        className="text-slate-400 hover:text-violet-600"
        title="Editar"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        type="button"
        onClick={handleExcluir}
        disabled={pending}
        className="text-slate-400 hover:text-red-600 disabled:opacity-50"
        title="Excluir"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
