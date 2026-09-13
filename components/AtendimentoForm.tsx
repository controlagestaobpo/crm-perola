"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { criarAtendimento, editarAtendimento } from "@/lib/actions";
import { ESTADO_INICIAL } from "@/lib/form-state";
import AtendimentoFormFields from "@/components/AtendimentoFormFields";
import SubmitButton from "@/components/SubmitButton";
import FormMessage from "@/components/FormMessage";
import type { Atendimento, Cliente, Perfil, Produto } from "@/types/database";

interface AtendimentoFormProps {
  clientes: Cliente[];
  produtos: Produto[];
  vendedores: Perfil[];
  souMaster: boolean;
  meuId: string;
  atendimentoParaEditar?: Atendimento;
}

export default function AtendimentoForm({
  clientes,
  produtos,
  vendedores,
  souMaster,
  meuId,
  atendimentoParaEditar,
}: AtendimentoFormProps) {
  const action = atendimentoParaEditar
    ? editarAtendimento.bind(null, atendimentoParaEditar.id)
    : criarAtendimento;

  const [state, formAction] = useFormState(action, ESTADO_INICIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && !atendimentoParaEditar) formRef.current?.reset();
  }, [state.success, atendimentoParaEditar]);

  return (
    <form ref={formRef} action={formAction} className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Data do contato</label>
          <input
            type="date"
            name="data"
            defaultValue={atendimentoParaEditar?.data ?? new Date().toISOString().slice(0, 10)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {souMaster && !atendimentoParaEditar && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Consultor</label>
            <select
              name="vendedor_id"
              defaultValue={meuId}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Cliente</label>
          <select
            name="cliente_id"
            required
            defaultValue={atendimentoParaEditar?.cliente_id ?? ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">-- Selecione --</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <AtendimentoFormFields
        produtos={produtos}
        valoresIniciais={
          atendimentoParaEditar
            ? {
                resultado: atendimentoParaEditar.resultado,
                motivo: atendimentoParaEditar.motivo,
                proximoContato: atendimentoParaEditar.proximo_contato,
                observacoes: atendimentoParaEditar.observacoes,
                produtosOferecidos: atendimentoParaEditar.produtos_oferecidos,
                produtosVendidos: atendimentoParaEditar.produtos_vendidos,
              }
            : undefined
        }
      />

      <div className="mt-6 flex items-center gap-3">
        <SubmitButton>
          {atendimentoParaEditar ? "💾 Salvar alterações" : "💾 Salvar atendimento"}
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
