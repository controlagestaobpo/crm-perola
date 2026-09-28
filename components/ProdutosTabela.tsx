"use client";

import { useMemo, useState } from "react";
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

  const ordenados = useMemo(() => {
    const dir = ordem === "desc" ? -1 : 1;
    return [...dados].sort((a, b) => {
      if (coluna === "produto") return dir * a.produto.localeCompare(b.produto);
      return dir * (a[coluna] - b[coluna]);
    });
  }, [dados, coluna, ordem]);

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-perola-divisor bg-[#FAFAF6] text-xs uppercase text-perola-texto-2">
        <tr>
          {CABECALHOS.map((c) => (
            <th key={c.key} className="px-3 py-2 font-medium">
              <button
                type="button"
                onClick={() => ordenarPor(c.key)}
                className="flex items-center gap-1 hover:text-perola-texto"
              >
                {c.label}
                <ArrowUpDown className={`h-3 w-3 ${coluna === c.key ? "text-perola-verde-medio" : "text-perola-texto-2/50"}`} />
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ordenados.length === 0 ? (
          <tr>
            <td colSpan={4} className="px-3 py-4 text-center text-perola-texto-2">
              Sem dados no período.
            </td>
          </tr>
        ) : (
          ordenados.map((p) => (
            <tr key={p.produto} className="border-b border-perola-divisor last:border-0">
              <td className="px-3 py-2 text-perola-texto">{p.produto}</td>
              <td className="px-3 py-2 text-perola-texto-2">{p.oferecido}x</td>
              <td className="px-3 py-2 text-perola-texto-2">{p.vendido}x</td>
              <td className="px-3 py-2 text-perola-texto-2">{p.conversao.toFixed(0)}%</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
