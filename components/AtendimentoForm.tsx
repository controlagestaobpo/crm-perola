"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { criarAtendimento, editarAtendimento, excluirAtendimento } from "@/lib/actions";
import { ESTADO_INICIAL } from "@/lib/form-state";
import { hojeISOBrasil } from "@/lib/metrics";
import AtendimentoFormFields from "@/components/AtendimentoFormFields";
import ClienteSelect from "@/components/ClienteSelect";
import CampoVendedor from "@/components/CampoVendedor";
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
  const router = useRouter();
  const [excluindo, startExcluir] = useTransition();
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  function handleExcluir() {
    if (!atendimentoParaEditar) return;
    if (!confirm("Excluir este atendimento? Essa ação não pode ser desfeita.")) return;
    setErroExcluir(null);
    startExcluir(async () => {
      try {
        await excluirAtendimento(atendimentoParaEditar.id);
        router.push("/atendimentos");
      } catch {
        setErroExcluir("Não foi possível excluir o atendimento.");
      }
    });
  }

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

        <CampoVendedor
          vendedores={vendedores}
          defaultValue={atendimentoParaEditar?.vendedor_id ?? meuId}
        />

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
                valorNegociacao: atendimentoParaEditar.valor_negociacao,
              }
            : undefined
        }
      />

      <div className="mt-6 flex items-center gap-3">
        <SubmitButton>
          {atendimentoParaEditar ? "Salvar alterações" : "Salvar atendimento"}
        </SubmitButton>
        <FormMessage state={state} />
        {atendimentoParaEditar && (
          <button
            type="button"
            onClick={handleExcluir}
            disabled={excluindo}
            className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-perola-erro hover:bg-perola-erro/10 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {excluindo ? "Excluindo..." : "Excluir atendimento"}
          </button>
        )}
      </div>
      {erroExcluir && <p className="mt-2 text-right text-sm text-perola-erro">{erroExcluir}</p>}
    </form>
  );
}
