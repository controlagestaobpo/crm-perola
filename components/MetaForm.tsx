"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { salvarMeta } from "@/lib/actions";
import { ESTADO_INICIAL } from "@/lib/form-state";
import SubmitButton from "@/components/SubmitButton";
import FormMessage from "@/components/FormMessage";
import type { Perfil } from "@/types/database";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function MetaForm({
  vendedores,
  ano,
  mes,
}: {
  vendedores: Perfil[];
  ano: number;
  mes: number;
}) {
  const [state, formAction] = useFormState(salvarMeta, ESTADO_INICIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <div className="sm:col-span-1 lg:col-span-2">
        <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Vendedor</label>
        <select name="vendedor_id" required className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none">
          {vendedores.map((v) => (
            <option key={v.id} value={v.id}>{v.nome}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Ano</label>
        <input type="number" name="ano" defaultValue={ano} required className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Mês</label>
        <select name="mes" defaultValue={mes} required className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none">
          {MESES.map((nome, index) => (
            <option key={nome} value={index + 1}>{nome}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Meta (R$)</label>
        <input type="number" name="meta_valor" step="100" min="0" required className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Meta de contatos</label>
        <input type="number" name="meta_prospeccoes" step="10" min="0" defaultValue={150} className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Meta de conversão (%)</label>
        <input type="number" name="meta_conversao" step="0.1" min="0" defaultValue={22} className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Meta de sacos</label>
        <input type="number" name="meta_sacos" step="10" min="0" defaultValue={0} className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Comissão (%)</label>
        <input type="number" name="comissao_percentual" step="0.1" min="0" defaultValue={1} className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none" />
      </div>
      <div className="flex items-center gap-3 sm:col-span-3 lg:col-span-6">
        <SubmitButton>Salvar meta</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
