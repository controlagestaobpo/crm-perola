"use client";

import { useState } from "react";
import { ArrowUpDown } from "lucide-react";

interface ProdutoLinha {
  produto: string;
  oferecido: number;
  vendido: number;
  conversao: number;
}

type Coluna = "produto" | "oferecido" | "vendido" | "conversao";

const CABECALHOS: { key: Coluna; label: string }[] = [
  { key: "produto", label: "Produto" },
  { key: "oferecido", label: "Oferecido" },
  { key: "vendido", label: "Vendido" },
  { key: "conversao", label: "Conversão" },
];

export default function ProdutosTabela({ dados }: { dados: ProdutoLinha[] }) {
  const [coluna, setColuna] = useState<Coluna>("conversao");
  const [ordem, setOrdem] = useState<"asc" | "desc">("desc");

  function ordenarPor(col: Coluna) {
    if (col === coluna) {
      setOrdem((o) => (o === "desc" ? "asc" : "desc"));
    } else {
      setColuna(col);
      setOrdem("desc");
    }
  }

  const ordenados = [...dados].sort((a, b) => {
    const dir = ordem === "desc" ? -1 : 1;
    if (coluna === "produto") return dir * a.produto.localeCompare(b.produto);
    return dir * (a[coluna] - b[coluna]);
  });

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-stone-200 bg-stone-50 text-stone-500">
        <tr>
          {CABECALHOS.map((c) => (
            <th key={c.key} className="px-3 py-2 font-medium">
              <button
                type="button"
                onClick={() => ordenarPor(c.key)}
                className="flex items-center gap-1 hover:text-stone-800"
              >
                {c.label}
                <ArrowUpDown className={`h-3 w-3 ${coluna === c.key ? "text-oliva-600" : "text-stone-300"}`} />
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ordenados.length === 0 ? (
          <tr>
            <td colSpan={4} className="px-3 py-4 text-center text-stone-400">
              Sem dados no período.
            </td>
          </tr>
        ) : (
          ordenados.map((p) => (
            <tr key={p.produto} className="border-b border-stone-100 last:border-0">
              <td className="px-3 py-2 text-stone-900">{p.produto}</td>
              <td className="px-3 py-2 text-stone-600">{p.oferecido}x</td>
              <td className="px-3 py-2 text-stone-600">{p.vendido}x</td>
              <td className="px-3 py-2 text-stone-600">{p.conversao.toFixed(0)}%</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
