"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { removerUsuario } from "@/lib/actions";

export default function UsuarioRowActions({ usuarioId, nome }: { usuarioId: string; nome: string }) {
  const [pending, startTransition] = useTransition();

  function handleExcluir() {
    const confirmado = confirm(
      `Tem certeza que quer remover ${nome}?\n\n` +
        "Essa ação apaga o acesso da pessoa ao CRM e TODOS os atendimentos e metas " +
        "registrados por ela. Não pode ser desfeita."
    );
    if (!confirmado) return;

    startTransition(() => {
      removerUsuario(usuarioId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleExcluir}
      disabled={pending}
      className="flex items-center gap-1 text-xs font-medium text-perola-erro hover:underline disabled:opacity-50"
      title="Remover usuário"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Remover
    </button>
  );
}
