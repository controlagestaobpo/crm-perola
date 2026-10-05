"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { criarUsuarioComSenha } from "@/lib/actions";
import { ESTADO_INICIAL } from "@/lib/form-state";
import SubmitButton from "@/components/SubmitButton";
import CampoSenha from "@/components/CampoSenha";
import CredenciaisParaCopiar from "@/components/CredenciaisParaCopiar";

const CLASSE_CAMPO =
  "w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none";

export default function NovoUsuarioForm() {
  const [state, formAction] = useFormState(criarUsuarioComSenha, ESTADO_INICIAL);
  const [enviado, setEnviado] = useState<{ email: string; senha: string } | null>(null);
  // Cada envio remonta os campos (key) para limpar o formulário e gerar outra senha.
  const [rodada, setRodada] = useState(0);

  useEffect(() => {
    if (state.success) setRodada((r) => r + 1);
  }, [state]);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const dados = new FormData(e.currentTarget);
        setEnviado({ email: String(dados.get("email") ?? "").trim().toLowerCase(), senha: String(dados.get("senha") ?? "") });
      }}
      className="rounded-[14px] border border-perola-borda bg-white p-6"
    >
      <h2 className="mb-1 text-base font-semibold text-perola-texto">Novo usuário</h2>
      <p className="mb-4 text-sm text-perola-texto-2">
        Crie o login com uma senha e passe para a pessoa. Ela entra direto, sem precisar de convite.
      </p>
      <div key={rodada} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Nome</label>
          <input name="nome" required className={CLASSE_CAMPO} />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-semibold text-perola-texto">E-mail</label>
          <input type="email" name="email" required className={CLASSE_CAMPO} />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Papel</label>
          <select name="papel" defaultValue="vendedor" className={CLASSE_CAMPO}>
            <option value="vendedor">Vendedor(a)</option>
            <option value="gerente">Sócio (metas, comissões e insights)</option>
            <option value="master">Master</option>
          </select>
        </div>
        <CampoSenha label="Senha inicial" />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <SubmitButton>+ Criar usuário</SubmitButton>
        {state.error && <p className="text-sm text-perola-erro">{state.error}</p>}
      </div>
      {state.success && enviado && <CredenciaisParaCopiar email={enviado.email} senha={enviado.senha} />}
    </form>
  );
}
