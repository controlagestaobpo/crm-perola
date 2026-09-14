"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { criarProduto } from "@/lib/actions";
import { ESTADO_INICIAL } from "@/lib/form-state";
import SubmitButton from "@/components/SubmitButton";
import FormMessage from "@/components/FormMessage";

export default function ProdutoForm({ categorias }: { categorias: string[] }) {
  const [state, formAction] = useFormState(criarProduto, ESTADO_INICIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="rounded-xl border border-stone-200 bg-white p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Categoria</label>
          <input
            name="categoria"
            required
            list="categorias-existentes"
            placeholder="Ex: Bovinos de Corte"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <datalist id="categorias-existentes">
            {categorias.map((categoria) => (
              <option key={categoria} value={categoria} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Nome do produto</label>
          <input
            name="nome"
            required
            placeholder="Ex: PRÓ TORQUE 20 FML"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-end">
          <SubmitButton>+ Adicionar produto</SubmitButton>
        </div>
      </div>
      <div className="mt-3">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
