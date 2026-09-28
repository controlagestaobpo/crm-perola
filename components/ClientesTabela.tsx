"use client";

import { useMemo, useState } from "react";
import { Pencil, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import ClienteEditModal from "@/components/ClienteEditModal";
import { formatBRL } from "@/lib/metrics";
import { labelEstagio } from "@/lib/estagio";
import type { ClienteComHistorico } from "@/lib/clientes";

type Coluna =
  | "nome"
  | "telefone"
  | "cidade"
  | "estagio"
  | "ultimaCompra"
  | "valorTotal"
  | "totalCompras"
  | "proximo_contato";
type Ordem = "asc" | "desc";

function compararTexto(a: string | null, b: string | null, dir: number) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return dir * a.localeCompare(b);
}

function comparar(a: ClienteComHistorico, b: ClienteComHistorico, coluna: Coluna, ordem: Ordem) {
  const dir = ordem === "asc" ? 1 : -1;

  switch (coluna) {
    case "nome":
      return dir * a.nome.localeCompare(b.nome);
    case "estagio":
      return dir * a.estagio.localeCompare(b.estagio);
    case "valorTotal":
      return dir * (a.valorTotal - b.valorTotal);
    case "totalCompras":
      return dir * (a.totalCompras - b.totalCompras);
    case "telefone":
      return compararTexto(a.telefone, b.telefone, dir);
    case "cidade":
      return compararTexto(a.cidade, b.cidade, dir);
    case "ultimaCompra":
      return compararTexto(a.ultimaCompra, b.ultimaCompra, dir);
    case "proximo_contato":
      return compararTexto(a.proximo_contato, b.proximo_contato, dir);
  }
}

function ThOrdenavel({
  coluna,
  label,
  colunaAtiva,
  ordem,
  onOrdenar,
  alinharDireita,
}: {
  coluna: Coluna;
  label: string;
  colunaAtiva: Coluna | null;
  ordem: Ordem;
  onOrdenar: (coluna: Coluna) => void;
  alinharDireita?: boolean;
}) {
  const ativa = colunaAtiva === coluna;
  return (
    <th className={`px-4 py-3 font-medium ${alinharDireita ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => onOrdenar(coluna)}
        className={`flex items-center gap-1 hover:text-perola-texto ${alinharDireita ? "ml-auto" : ""}`}
      >
        {label}
        {ativa ? (
          ordem === "asc" ? (
            <ArrowUp className="h-3 w-3 text-perola-verde-medio" />
          ) : (
            <ArrowDown className="h-3 w-3 text-perola-verde-medio" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-perola-texto-2/50" />
        )}
      </button>
    </th>
  );
}

export default function ClientesTabela({ clientes }: { clientes: ClienteComHistorico[] }) {
  const [editando, setEditando] = useState<ClienteComHistorico | null>(null);
  const [coluna, setColuna] = useState<Coluna | null>(null);
  const [ordem, setOrdem] = useState<Ordem>("asc");

  function ordenarPor(col: Coluna) {
    if (col === coluna) {
      setOrdem((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setColuna(col);
      setOrdem("asc");
    }
  }

  const clientesOrdenados = useMemo(() => {
    if (!coluna) return clientes;
    return [...clientes].sort((a, b) => comparar(a, b, coluna, ordem));
  }, [clientes, coluna, ordem]);

  return (
    <>
      <div className="overflow-x-auto rounded-[14px] border border-perola-borda bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-perola-divisor bg-[#FAFAF6] text-xs uppercase text-perola-texto-2">
            <tr>
              <ThOrdenavel coluna="nome" label="Nome" colunaAtiva={coluna} ordem={ordem} onOrdenar={ordenarPor} />
              <ThOrdenavel coluna="telefone" label="Telefone" colunaAtiva={coluna} ordem={ordem} onOrdenar={ordenarPor} />
              <ThOrdenavel coluna="cidade" label="Cidade" colunaAtiva={coluna} ordem={ordem} onOrdenar={ordenarPor} />
              <ThOrdenavel coluna="estagio" label="Estágio" colunaAtiva={coluna} ordem={ordem} onOrdenar={ordenarPor} />
              <ThOrdenavel coluna="ultimaCompra" label="Última compra" colunaAtiva={coluna} ordem={ordem} onOrdenar={ordenarPor} />
              <ThOrdenavel coluna="valorTotal" label="Total gasto" colunaAtiva={coluna} ordem={ordem} onOrdenar={ordenarPor} alinharDireita />
              <ThOrdenavel coluna="totalCompras" label="Compras" colunaAtiva={coluna} ordem={ordem} onOrdenar={ordenarPor} alinharDireita />
              <ThOrdenavel coluna="proximo_contato" label="Próx. contato" colunaAtiva={coluna} ordem={ordem} onOrdenar={ordenarPor} />
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {clientesOrdenados.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-perola-texto-2">
                  Nenhum cliente cadastrado ainda.
                </td>
              </tr>
            ) : (
              clientesOrdenados.map((c) => (
                <tr key={c.id} className="border-b border-perola-divisor last:border-0">
                  <td className="px-4 py-3 font-medium text-perola-texto">{c.nome}</td>
                  <td className="px-4 py-3 text-perola-texto-2">{c.telefone ?? "—"}</td>
                  <td className="px-4 py-3 text-perola-texto-2">{c.cidade ?? "—"}</td>
                  <td className="px-4 py-3 text-perola-texto-2">{labelEstagio(c.estagio)}</td>
                  <td className="px-4 py-3 text-perola-texto-2">
                    {c.ultimaCompra ? new Date(c.ultimaCompra + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-perola-texto-2">{formatBRL(c.valorTotal)}</td>
                  <td className="px-4 py-3 text-right text-perola-texto-2">{c.totalCompras}</td>
                  <td className="px-4 py-3 text-perola-texto-2">
                    {c.proximo_contato ? new Date(c.proximo_contato + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditando(c)}
                      className="text-perola-texto-2 hover:text-perola-verde"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editando && <ClienteEditModal cliente={editando} onFechar={() => setEditando(null)} />}
    </>
  );
}
