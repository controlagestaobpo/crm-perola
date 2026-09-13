"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { X } from "lucide-react";
import { editarCliente } from "@/lib/actions";
import { ESTADO_INICIAL } from "@/lib/form-state";
import SubmitButton from "@/components/SubmitButton";
import FormMessage from "@/components/FormMessage";
import type { Cliente } from "@/types/database";

export default function ClienteEditModal({
  cliente,
  onFechar,
}: {
  cliente: Cliente;
  onFechar: () => void;
}) {
  const action = editarCliente.bind(null, cliente.id);
  const [state, formAction] = useFormState(action, ESTADO_INICIAL);
  const jaFechou = useRef(false);

  useEffect(() => {
    if (state.success && !jaFechou.current) {
      jaFechou.current = true;
      onFechar();
    }
  }, [state.success, onFechar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Editar cliente</h2>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nome</label>
            <input
              name="nome"
              required
              defaultValue={cliente.nome}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Telefone</label>
            <input
              name="telefone"
              defaultValue={cliente.telefone ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cidade</label>
            <input
              name="cidade"
              defaultValue={cliente.cidade ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <SubmitButton>Salvar alterações</SubmitButton>
            <FormMessage state={state} />
          </div>
        </form>
      </div>
    </div>
  );
}
