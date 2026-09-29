"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { criarAtendimento } from "@/lib/actions";
import { ESTADO_INICIAL } from "@/lib/form-state";
import { hojeISOBrasil } from "@/lib/metrics";
import AtendimentoFormFields from "@/components/AtendimentoFormFields";
import SubmitButton from "@/components/SubmitButton";
import FormMessage from "@/components/FormMessage";
import type { Perfil } from "@/types/database";

interface KanbanAtendimentoModalProps {
  clienteId: string;
  clienteNome: string;
  resultado: "compra" | "negociacao";
  vendedores: Perfil[];
  souMaster: boolean;
  meuId: string;
  produtos: import("@/types/database").Produto[];
  onFechar: () => void;
  onSalvo: () => void;
}

export default function KanbanAtendimentoModal({
  clienteId,
  clienteNome,
  resultado,
  vendedores,
  souMaster,
  produtos,
  onFechar,
  onSalvo,
}: KanbanAtendimentoModalProps) {
  const [state, formAction] = useFormState(criarAtendimento, ESTADO_INICIAL);
  const router = useRouter();
  const jaSalvou = useRef(false);

  useEffect(() => {
    if (state.success && !jaSalvou.current) {
      jaSalvou.current = true;
      onSalvo();
      router.refresh();
    }
  }, [state.success, onSalvo, router]);

  const titulo = resultado === "compra" ? "Registrar venda" : "Registrar orçamento";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[14px] bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-perola-texto">{titulo}</h2>
            <p className="text-sm text-perola-texto-2">{clienteNome}</p>
          </div>
          <button onClick={onFechar} className="text-perola-texto-2 hover:text-perola-texto">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={formAction}>
          <input type="hidden" name="cliente_id" value={clienteId} />
          <input type="hidden" name="data" value={hojeISOBrasil()} />

          {souMaster && (
            <div className="mb-4">
              <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Consultor</label>
              <select
                name="vendedor_id"
                required
                defaultValue=""
                className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
              >
                <option value="" disabled>
                  -- Selecione --
                </option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <AtendimentoFormFields produtos={produtos} valoresIniciais={{ resultado }} />

          <div className="mt-6 flex items-center gap-3">
            <SubmitButton>Confirmar</SubmitButton>
            <button
              type="button"
              onClick={onFechar}
              className="rounded-lg border border-perola-borda px-4 py-2 text-sm font-medium text-perola-texto-2 hover:bg-perola-tag"
            >
              Cancelar
            </button>
            <FormMessage state={state} />
          </div>
        </form>
      </div>
    </div>
  );
}
