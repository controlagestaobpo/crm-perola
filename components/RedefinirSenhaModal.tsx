"use client";

import { useRef, useState } from "react";
import { useFormState } from "react-dom";
import { X } from "lucide-react";
import { redefinirSenhaUsuario } from "@/lib/actions";
import { ESTADO_INICIAL } from "@/lib/form-state";
import SubmitButton from "@/components/SubmitButton";
import CampoSenha from "@/components/CampoSenha";
import CredenciaisParaCopiar from "@/components/CredenciaisParaCopiar";

export default function RedefinirSenhaModal({
  usuarioId,
  nome,
  email,
  onFechar,
}: {
  usuarioId: string;
  nome: string;
  email: string;
  onFechar: () => void;
}) {
  const action = redefinirSenhaUsuario.bind(null, usuarioId);
  const [state, formAction] = useFormState(action, ESTADO_INICIAL);
  const [senhaEnviada, setSenhaEnviada] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-[14px] bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-perola-texto">Nova senha para {nome}</h2>
          <button onClick={onFechar} className="text-perola-texto-2 hover:text-perola-texto">
            <X className="h-5 w-5" />
          </button>
        </div>

        {state.success ? (
          <>
            <p className="text-sm text-perola-texto-2">
              Senha trocada. A senha antiga não funciona mais. Passe os dados abaixo para {nome}.
            </p>
            <CredenciaisParaCopiar email={email} senha={senhaEnviada} />
            <button
              type="button"
              onClick={onFechar}
              className="mt-4 rounded-lg border border-perola-borda px-4 py-2 text-sm font-medium text-perola-texto-2 hover:bg-perola-tag"
            >
              Fechar
            </button>
          </>
        ) : (
          <form
            ref={formRef}
            action={formAction}
            onSubmit={(e) => setSenhaEnviada(String(new FormData(e.currentTarget).get("senha") ?? ""))}
            className="space-y-4"
          >
            <p className="text-sm text-perola-texto-2">
              Login: <strong className="text-perola-texto">{email}</strong>
            </p>
            <CampoSenha label="Senha nova" />
            <div className="flex items-center gap-3">
              <SubmitButton>Salvar senha nova</SubmitButton>
              {state.error && <p className="text-sm text-perola-erro">{state.error}</p>}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
