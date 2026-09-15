"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Wheat } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function CadastroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const emailConvite = searchParams.get("email");
  const nomeConvite = searchParams.get("nome");
  const ehConvite = Boolean(emailConvite);

  const [nome, setNome] = useState(nomeConvite ?? "");
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [email, setEmail] = useState(emailConvite ?? "");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setCarregando(true);

    const { error: erroCadastro } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: ehConvite ? { nome } : { nome, nome_empresa: nomeEmpresa },
      },
    });

    if (erroCadastro) {
      setErro(
        erroCadastro.message.includes("bloqueado")
          ? "Cadastro bloqueado: peça um convite ao administrador."
          : "Não foi possível criar a conta. " + erroCadastro.message
      );
      setCarregando(false);
      return;
    }

    const { error: erroLogin } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (erroLogin) {
      setAviso("Conta criada! Confirme seu e-mail (verifique a caixa de entrada) e depois faça login.");
      setCarregando(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-oliva-900 via-oliva-800 to-oliva-950 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-sm p-8">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Wheat className="h-6 w-6 text-oliva-600" />
          <span className="text-lg font-semibold text-stone-900">CRM Pérola</span>
        </div>

        <h1 className="mb-6 text-center text-sm text-stone-500">
          {ehConvite
            ? "Complete seu cadastro para entrar na equipe"
            : "Crie sua empresa e sua conta de administrador (master)"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Seu nome</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-oliva-500 focus:outline-none focus:ring-1 focus:ring-oliva-500"
            />
          </div>

          {!ehConvite && (
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Nome da empresa
              </label>
              <input
                type="text"
                required
                value={nomeEmpresa}
                onChange={(e) => setNomeEmpresa(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-oliva-500 focus:outline-none focus:ring-1 focus:ring-oliva-500"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">E-mail</label>
            <input
              type="email"
              required
              readOnly={ehConvite}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-oliva-500 focus:outline-none focus:ring-1 focus:ring-oliva-500 read-only:bg-stone-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-oliva-500 focus:outline-none focus:ring-1 focus:ring-oliva-500"
            />
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}
          {aviso && <p className="text-sm text-amber-600">{aviso}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-lg bg-oliva-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oliva-700 disabled:opacity-60"
          >
            {carregando ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-oliva-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
