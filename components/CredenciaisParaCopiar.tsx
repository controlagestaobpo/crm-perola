"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// Caixa com login e senha prontos para colar no WhatsApp.
export default function CredenciaisParaCopiar({ email, senha }: { email: string; senha: string }) {
  const [copiado, setCopiado] = useState(false);
  const endereco = typeof window !== "undefined" ? window.location.origin : "";
  const texto = `Acesso ao CRM Pérola\n${endereco}/login\nLogin: ${email}\nSenha: ${senha}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-[10px] border border-perola-tag-pos-bg bg-perola-tag-pos-bg/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-perola-texto">
        <p>
          <span className="text-perola-texto-2">Login:</span> <strong>{email}</strong>
        </p>
        <p>
          <span className="text-perola-texto-2">Senha:</span> <strong className="font-mono">{senha}</strong>
        </p>
      </div>
      <button
        type="button"
        onClick={copiar}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-perola-lima px-4 py-2 text-sm font-semibold text-perola-texto hover:brightness-95"
      >
        {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copiado ? "Copiado!" : "Copiar login e senha"}
      </button>
    </div>
  );
}
