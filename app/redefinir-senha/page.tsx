"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Beef } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  // O link do e-mail traz um código na URL; o cliente do Supabase troca esse
  // código por uma sessão sozinho ao carregar. Só depois disso dá para trocar a senha.
  const [linkValido, setLinkValido] = useState<boolean | null>(null);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLinkValido(Boolean(session)));
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha !== confirmacao) {
      setErro("As senhas não são iguais.");
      return;
    }

    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });

    if (error) {
      setErro("Não foi possível salvar a senha nova. " + error.message);
      setCarregando(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-perola-verde px-4">
      <div className="w-full max-w-sm rounded-[14px] border border-perola-borda bg-white p-8">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Beef className="h-6 w-6 text-perola-verde-medio" />
          <span className="text-lg font-semibold text-perola-texto">CRM Pérola</span>
        </div>

        {linkValido === null && <p className="text-center text-sm text-perola-texto-2">Carregando...</p>}

        {linkValido === false && (
          <div className="space-y-4 text-center text-sm text-perola-texto">
            <p>Este link expirou ou já foi usado. Peça um link novo e abra-o no mesmo navegador em que pediu.</p>
            <Link href="/esqueci-senha" className="font-medium text-perola-tag-pos-texto hover:underline">
              Pedir um link novo
            </Link>
          </div>
        )}

        {linkValido && (
          <>
            <h1 className="mb-6 text-center text-sm text-perola-texto-2">Crie sua senha nova</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Senha nova</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-semibold text-perola-texto">
                  Repita a senha nova
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
                />
              </div>

              {erro && <p className="text-sm text-perola-erro">{erro}</p>}

              <button
                type="submit"
                disabled={carregando}
                className="w-full rounded-lg bg-perola-lima px-4 py-2 text-sm font-semibold text-perola-texto transition-colors hover:brightness-95 disabled:opacity-60"
              >
                {carregando ? "Salvando..." : "Salvar senha e entrar"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
