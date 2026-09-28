"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Beef } from "lucide-react";
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
    <div className="flex min-h-screen items-center justify-center bg-perola-verde px-4">
      <div className="w-full max-w-sm rounded-[14px] border border-perola-borda bg-white p-8">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Beef className="h-6 w-6 text-perola-verde-medio" />
          <span className="text-lg font-semibold text-perola-texto">CRM Pérola</span>
        </div>

        <h1 className="mb-6 text-center text-sm text-perola-texto-2">
          {ehConvite
            ? "Complete seu cadastro para entrar na equipe"
            : "Crie sua empresa e sua conta de administrador (master)"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Seu nome</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
            />
          </div>

          {!ehConvite && (
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-perola-texto">
                Nome da empresa
              </label>
              <input
                type="text"
                required
                value={nomeEmpresa}
                onChange={(e) => setNomeEmpresa(e.target.value)}
                className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-[13px] font-semibold text-perola-texto">E-mail</label>
            <input
              type="email"
              required
              readOnly={ehConvite}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none read-only:bg-perola-tag"
            />
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
            />
          </div>

          {erro && <p className="text-sm text-perola-erro">{erro}</p>}
          {aviso && <p className="text-sm text-perola-alerta">{aviso}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-lg bg-perola-lima px-4 py-2 text-sm font-semibold text-perola-texto transition-colors hover:brightness-95 disabled:opacity-60"
          >
            {carregando ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-perola-texto-2">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-perola-tag-pos-texto hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
