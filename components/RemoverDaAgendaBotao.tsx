"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { removerDaAgenda } from "@/lib/actions";

const SUGESTOES = ["Já foi atendido", "Já comprou", "Sem interesse", "Contato errado", "Cliente parou de comprar"];

export default function RemoverDaAgendaBotao({
  atendimentoId,
  clienteNome,
}: {
  atendimentoId: string;
  clienteNome: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function fechar() {
    setAberto(false);
    setMotivo("");
    setErro(null);
  }

  function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    startTransition(async () => {
      const resultado = await removerDaAgenda(atendimentoId, motivo);
      if (resultado.error) setErro(resultado.error);
      else fechar();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="whitespace-nowrap text-xs font-medium text-perola-texto-2 hover:text-perola-erro"
      >
        Remover da agenda
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={confirmar} className="w-full max-w-md rounded-[14px] bg-white p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-perola-texto">Remover da agenda</h2>
                <p className="text-sm text-perola-texto-2">{clienteNome}</p>
              </div>
              <button type="button" onClick={fechar} className="text-perola-texto-2 hover:text-perola-texto">
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Motivo</label>
            <input
              autoFocus
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Por que este cliente sai da agenda?"
              className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setMotivo(s)}
                  className="rounded-full bg-perola-tag px-2.5 py-1 text-xs text-perola-texto-2 hover:text-perola-texto"
                >
                  {s}
                </button>
              ))}
            </div>

            {erro && <p className="mt-3 text-sm text-perola-erro">{erro}</p>}

            <div className="mt-5 flex items-center gap-3">
              <button
                type="submit"
                disabled={pending || !motivo.trim()}
                className="rounded-lg bg-perola-lima px-4 py-2 text-sm font-semibold text-perola-texto hover:brightness-95 disabled:opacity-50"
              >
                {pending ? "Removendo..." : "Remover"}
              </button>
              <button
                type="button"
                onClick={fechar}
                className="rounded-lg border border-perola-borda px-4 py-2 text-sm font-medium text-perola-texto-2 hover:bg-perola-tag"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
