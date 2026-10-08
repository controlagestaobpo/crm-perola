"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import ClienteForm from "@/components/ClienteForm";

export default function NovoClienteModal({ onFechar }: { onFechar: () => void }) {
  const router = useRouter();

  return (
    <div className="janela-fundo fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[14px] bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-perola-texto">Novo cliente</h2>
          <button onClick={onFechar} className="text-perola-texto-2 hover:text-perola-texto">
            <X className="h-5 w-5" />
          </button>
        </div>

        <ClienteForm
          onSalvo={() => {
            router.refresh();
            onFechar();
          }}
        />
      </div>
    </div>
  );
}
