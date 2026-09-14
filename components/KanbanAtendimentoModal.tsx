"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { criarAtendimento } from "@/lib/actions";
import { ESTADO_INICIAL } from "@/lib/form-state";
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
  meuId,
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

  const titulo = resultado === "compra" ? "Registrar venda" : "Registrar negociação";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">{titulo}</h2>
            <p className="text-sm text-stone-500">{clienteNome}</p>
          </div>
          <button onClick={onFechar} className="text-stone-400 hover:text-stone-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={formAction}>
          <input type="hidden" name="cliente_id" value={clienteId} />
          <input type="hidden" name="data" value={new Date().toISOString().slice(0, 10)} />

          {souMaster && (
            <div className="mb-4">
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

          <AtendimentoFormFields produtos={produtos} valoresIniciais={{ resultado }} />

          <div className="mt-6 flex items-center gap-3">
            <SubmitButton>Confirmar</SubmitButton>
            <button
              type="button"
              onClick={onFechar}
              className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-50"
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
