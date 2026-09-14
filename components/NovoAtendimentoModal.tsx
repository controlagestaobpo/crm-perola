"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import AtendimentoForm from "@/components/AtendimentoForm";
import type { Cliente, Perfil, Produto } from "@/types/database";

interface NovoAtendimentoModalProps {
  clientes: Cliente[];
  produtos: Produto[];
  vendedores: Perfil[];
  souMaster: boolean;
  meuId: string;
  onFechar: () => void;
  onSalvo?: (clienteId: string, resultado: string) => void;
}

export default function NovoAtendimentoModal({
  clientes,
  produtos,
  vendedores,
  souMaster,
  meuId,
  onFechar,
  onSalvo,
}: NovoAtendimentoModalProps) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-8">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">Novo atendimento</h2>
          <button onClick={onFechar} className="text-stone-400 hover:text-stone-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <AtendimentoForm
          clientes={clientes}
          produtos={produtos}
          vendedores={vendedores}
          souMaster={souMaster}
          meuId={meuId}
          onSalvo={(clienteId, resultado) => {
            onSalvo?.(clienteId, resultado);
            router.refresh();
            onFechar();
          }}
        />
      </div>
    </div>
  );
}
