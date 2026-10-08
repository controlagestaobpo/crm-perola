"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { X } from "lucide-react";
import { editarUsuario } from "@/lib/actions";
import { ESTADO_INICIAL } from "@/lib/form-state";
import SubmitButton from "@/components/SubmitButton";
import FormMessage from "@/components/FormMessage";

export default function UsuarioEditModal({
  usuarioId,
  nome,
  onFechar,
}: {
  usuarioId: string;
  nome: string;
  onFechar: () => void;
}) {
  const action = editarUsuario.bind(null, usuarioId);
  const [state, formAction] = useFormState(action, ESTADO_INICIAL);
  const jaFechou = useRef(false);

  useEffect(() => {
    if (state.success && !jaFechou.current) {
      jaFechou.current = true;
      onFechar();
    }
  }, [state.success, onFechar]);

  return (
    <div className="janela-fundo fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-[14px] bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-perola-texto">Editar usuário</h2>
          <button onClick={onFechar} className="text-perola-texto-2 hover:text-perola-texto">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Nome</label>
            <input
              name="nome"
              required
              defaultValue={nome}
              className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
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
