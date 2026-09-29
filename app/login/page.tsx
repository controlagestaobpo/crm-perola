"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Beef } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
      setErro("E-mail ou senha incorretos.");
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
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-[13px] font-semibold text-perola-texto">Senha</label>
              <Link href="/esqueci-senha" className="text-[13px] text-perola-tag-pos-texto hover:underline">
                Esqueci minha senha
              </Link>
            </div>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
            />
          </div>

          {erro && <p className="text-sm text-perola-erro">{erro}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-lg bg-perola-lima px-4 py-2 text-sm font-semibold text-perola-texto transition-colors hover:brightness-95 disabled:opacity-60"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-perola-texto-2">
          Primeira vez por aqui?{" "}
          <Link href="/cadastro" className="font-medium text-perola-tag-pos-texto hover:underline">
            Criar empresa e conta master
          </Link>
        </p>
      </div>
    </div>
  );
}
