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
    <form ref={formRef} action={formAction} className="rounded-[14px] border border-perola-borda bg-white p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Nome</label>
          <input name="nome" required className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-semibold text-perola-texto">E-mail</label>
          <input type="email" name="email" required className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Papel</label>
          <select name="papel" defaultValue="vendedor" className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none">
            <option value="vendedor">Vendedor(a)</option>
            <option value="gerente">Sócio (metas, comissões e insights)</option>
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
