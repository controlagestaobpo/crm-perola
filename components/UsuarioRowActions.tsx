"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { removerUsuario } from "@/lib/actions";
import UsuarioEditModal from "@/components/UsuarioEditModal";

export default function UsuarioRowActions({
  usuarioId,
  nome,
  podeRemover = true,
}: {
  usuarioId: string;
  nome: string;
  podeRemover?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);

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
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="flex items-center gap-1 text-xs font-medium text-perola-texto-2 hover:text-perola-verde"
        title="Editar usuário"
      >
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </button>
      {podeRemover && (
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
      )}
      {editando && (
        <UsuarioEditModal usuarioId={usuarioId} nome={nome} onFechar={() => setEditando(false)} />
      )}
    </div>
  );
}
