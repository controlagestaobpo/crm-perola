"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { criarAtendimento, editarAtendimento } from "@/lib/actions";
import { ESTADO_INICIAL } from "@/lib/form-state";
import { hojeISOBrasil } from "@/lib/metrics";
import AtendimentoFormFields from "@/components/AtendimentoFormFields";
import ClienteSelect from "@/components/ClienteSelect";
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
  clienteIdInicial?: string;
  onSalvo?: (clienteId: string, resultado: string) => void;
}

export default function AtendimentoForm({
  clientes,
  produtos,
  vendedores,
  souMaster,
  meuId,
  atendimentoParaEditar,
  clienteIdInicial,
  onSalvo,
}: AtendimentoFormProps) {
  const action = atendimentoParaEditar
    ? editarAtendimento.bind(null, atendimentoParaEditar.id)
    : criarAtendimento;

  const [state, formAction] = useFormState(action, ESTADO_INICIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      if (formRef.current) {
        const dados = new FormData(formRef.current);
        onSalvo?.(String(dados.get("cliente_id") ?? ""), String(dados.get("resultado") ?? ""));
      }
      if (!atendimentoParaEditar) formRef.current?.reset();
    }
  }, [state.success, atendimentoParaEditar, onSalvo]);

  return (
    <form ref={formRef} action={formAction} className="rounded-[14px] border border-perola-borda bg-white p-6">
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Data do contato</label>
          <input
            type="date"
            name="data"
            defaultValue={atendimentoParaEditar?.data ?? hojeISOBrasil()}
            required
            className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
          />
        </div>

        {souMaster && !atendimentoParaEditar && (
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Consultor</label>
            <select
              name="vendedor_id"
              defaultValue={meuId}
              className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
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
          <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Cliente</label>
          <ClienteSelect
            clientes={clientes}
            defaultValue={atendimentoParaEditar?.cliente_id ?? clienteIdInicial ?? ""}
          />
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
                valor: atendimentoParaEditar.valor,
                quantidadeSacos: atendimentoParaEditar.quantidade_sacos,
                valorFrete: atendimentoParaEditar.valor_frete,
              }
            : undefined
        }
      />

      <div className="mt-6 flex items-center gap-3">
        <SubmitButton>
          {atendimentoParaEditar ? "Salvar alterações" : "Salvar atendimento"}
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
