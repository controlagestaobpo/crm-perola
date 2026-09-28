"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { removerProduto } from "@/lib/actions";
import { corBadgeCategoria } from "@/lib/categoriaCores";
import type { Produto } from "@/types/database";

export default function ProdutosLista({ produtos }: { produtos: Produto[] }) {
  const [busca, setBusca] = useState("");

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return produtos;
    return produtos.filter(
      (p) => p.nome.toLowerCase().includes(termo) || p.categoria.toLowerCase().includes(termo)
    );
  }, [produtos, busca]);

  const categorias = Array.from(new Set(produtosFiltrados.map((p) => p.categoria)));

  return (
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-perola-texto-2" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar produto ou categoria..."
          className="w-full rounded-[10px] border border-[#DAD8CD] py-2 pl-9 pr-3 text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
        />
      </div>

      {categorias.length === 0 && (
        <p className="text-sm text-perola-texto-2">Nenhum produto encontrado.</p>
      )}

      {categorias.map((categoria) => (
        <div key={categoria}>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-perola-texto">
            <span className={`rounded px-2 py-0.5 text-sm ${corBadgeCategoria(categoria)}`}>{categoria}</span>
            <span className="text-sm font-normal text-perola-texto-2">
              ({produtosFiltrados.filter((p) => p.categoria === categoria).length})
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {produtosFiltrados
              .filter((p) => p.categoria === categoria)
              .map((produto) => (
                <div
                  key={produto.id}
                  className="flex items-center justify-between rounded-[10px] border border-perola-borda bg-white px-4 py-3"
                >
                  <span className="text-sm font-medium text-perola-texto">{produto.nome}</span>
                  <form action={removerProduto.bind(null, produto.id)}>
                    <button type="submit" className="text-xs font-medium text-perola-erro hover:underline">
                      Remover
                    </button>
                  </form>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
