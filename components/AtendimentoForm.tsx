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
    <form ref={formRef} action={formAction} className="rounded-xl bg-white/80 backdrop-blur-sm shadow-sm p-6">
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Data do contato</label>
          <input
            type="date"
            name="data"
            defaultValue={atendimentoParaEditar?.data ?? hojeISOBrasil()}
            required
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </div>

        {souMaster && !atendimentoParaEditar && (
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Consultor</label>
            <select
              name="vendedor_id"
              defaultValue={meuId}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
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
          <label className="mb-1 block text-sm font-medium text-stone-700">Cliente</label>
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
          {atendimentoParaEditar ? "💾 Salvar alterações" : "💾 Salvar atendimento"}
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
