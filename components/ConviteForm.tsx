"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { criarConvite } from "@/lib/actions";
import { ESTADO_INICIAL } from "@/lib/form-state";
import SubmitButton from "@/components/SubmitButton";
import FormMessage from "@/components/FormMessage";

export default function ConviteForm() {
  const [state, formAction] = useFormState(criarConvite, ESTADO_INICIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="rounded-xl border border-stone-200 bg-white p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Nome</label>
          <input name="nome" required className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">E-mail</label>
          <input type="email" name="email" required className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Papel</label>
          <select name="papel" defaultValue="vendedor" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm">
            <option value="vendedor">Vendedor(a)</option>
            <option value="master">Master</option>
          </select>
        </div>
        <div className="flex items-end">
          <SubmitButton>+ Convidar</SubmitButton>
        </div>
      </div>
      <div className="mt-3">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
