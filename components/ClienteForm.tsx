"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { criarCliente } from "@/lib/actions";
import { ESTADO_INICIAL } from "@/lib/form-state";
import SubmitButton from "@/components/SubmitButton";
import FormMessage from "@/components/FormMessage";

export default function ClienteForm({ onSalvo }: { onSalvo?: () => void } = {}) {
  const [state, formAction] = useFormState(criarCliente, ESTADO_INICIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      onSalvo?.();
    }
  }, [state.success, onSalvo]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Nome</label>
          <input
            name="nome"
            required
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Telefone</label>
          <input
            name="telefone"
            placeholder="(69) 9xxxx-xxxx"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Cidade</label>
          <input
            name="cidade"
            placeholder="Ex: Ji-Paraná"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton>Salvar cliente</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
