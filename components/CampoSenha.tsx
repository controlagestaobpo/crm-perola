"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { gerarSenha } from "@/lib/senha";

// Campo de senha visível (o master vai repassar a senha para a pessoa), já
// preenchido com uma senha gerada, que pode ser trocada à mão.
export default function CampoSenha({ label = "Senha" }: { label?: string }) {
  const [senha, setSenha] = useState(gerarSenha);

  return (
    <div>
      <label className="mb-1 block text-[13px] font-semibold text-perola-texto">{label}</label>
      <div className="flex gap-2">
        <input
          name="senha"
          required
          minLength={6}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="off"
          className="w-full min-w-0 rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] font-mono text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setSenha(gerarSenha())}
          className="shrink-0 rounded-[10px] border border-[#DAD8CD] px-3 text-perola-texto-2 hover:text-perola-texto"
          title="Gerar outra senha"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
