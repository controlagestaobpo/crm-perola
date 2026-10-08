"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { Trash2, X } from "lucide-react";
import { editarCliente, excluirCliente } from "@/lib/actions";
import { ESTADO_INICIAL } from "@/lib/form-state";
import SubmitButton from "@/components/SubmitButton";
import FormMessage from "@/components/FormMessage";
import type { Cliente } from "@/types/database";
import { formatarDocumento } from "@/lib/documento";

export default function ClienteEditModal({
  cliente,
  podeExcluir = false,
  onFechar,
}: {
  cliente: Cliente;
  podeExcluir?: boolean;
  onFechar: () => void;
}) {
  const action = editarCliente.bind(null, cliente.id);
  const [state, formAction] = useFormState(action, ESTADO_INICIAL);
  const jaFechou = useRef(false);
  const [excluindo, startExcluir] = useTransition();
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  function handleExcluir() {
    const ok = confirm(
      `Excluir o cliente "${cliente.nome}"?\n\nTodos os atendimentos dele também serão apagados. Essa ação não pode ser desfeita.`
    );
    if (!ok) return;
    setErroExcluir(null);
    startExcluir(async () => {
      try {
        await excluirCliente(cliente.id);
        onFechar();
      } catch {
        setErroExcluir("Não foi possível excluir o cliente.");
      }
    });
  }

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
          <h2 className="text-lg font-semibold text-perola-texto">Editar cliente</h2>
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
              defaultValue={cliente.nome}
              className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Telefone</label>
            <input
              name="telefone"
              defaultValue={cliente.telefone ?? ""}
              className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Cidade</label>
            <input
              name="cidade"
              defaultValue={cliente.cidade ?? ""}
              className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-perola-texto">
              CPF/CNPJ <span className="font-normal text-perola-texto-2">(opcional)</span>
            </label>
            <input
              name="documento"
              inputMode="numeric"
              placeholder="Só números"
              defaultValue={formatarDocumento(cliente.documento)}
              className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <SubmitButton>Salvar alterações</SubmitButton>
            <FormMessage state={state} />
            {podeExcluir && (
              <button
                type="button"
                onClick={handleExcluir}
                disabled={excluindo}
                className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-perola-erro hover:bg-perola-erro/10 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {excluindo ? "Excluindo..." : "Excluir cliente"}
              </button>
            )}
          </div>
          {erroExcluir && <p className="text-right text-sm text-perola-erro">{erroExcluir}</p>}
        </form>
      </div>
    </div>
  );
}
