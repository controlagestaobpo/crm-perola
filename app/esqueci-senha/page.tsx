"use client";

import { useState } from "react";
import Link from "next/link";
import { Beef } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function EsqueciSenhaPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    setCarregando(false);

    if (error) {
      setErro("Não foi possível enviar o e-mail agora. Tente de novo em alguns minutos.");
      return;
    }

    setEnviado(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-perola-verde px-4">
      <div className="w-full max-w-sm rounded-[14px] border border-perola-borda bg-white p-8">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Beef className="h-6 w-6 text-perola-verde-medio" />
          <span className="text-lg font-semibold text-perola-texto">CRM Pérola</span>
        </div>

        {enviado ? (
          <p className="text-center text-sm text-perola-texto">
            Se <strong>{email}</strong> tiver uma conta, você vai receber um e-mail com o link para criar
            uma senha nova. Confira também a caixa de spam.
          </p>
        ) : (
          <>
            <h1 className="mb-6 text-center text-sm text-perola-texto-2">
              Informe seu e-mail e enviaremos um link para criar uma senha nova
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-[13px] font-semibold text-perola-texto">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
                />
              </div>

              {erro && <p className="text-sm text-perola-erro">{erro}</p>}

              <button
                type="submit"
                disabled={carregando}
                className="w-full rounded-lg bg-perola-lima px-4 py-2 text-sm font-semibold text-perola-texto transition-colors hover:brightness-95 disabled:opacity-60"
              >
                {carregando ? "Enviando..." : "Enviar link"}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-perola-texto-2">
          <Link href="/login" className="font-medium text-perola-tag-pos-texto hover:underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
