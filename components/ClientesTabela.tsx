"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import ClienteEditModal from "@/components/ClienteEditModal";
import { formatBRL } from "@/lib/metrics";
import type { ClienteComHistorico } from "@/lib/clientes";

export default function ClientesTabela({ clientes }: { clientes: ClienteComHistorico[] }) {
  const [editando, setEditando] = useState<ClienteComHistorico | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">Cidade</th>
              <th className="px-4 py-3 font-medium">Estágio</th>
              <th className="px-4 py-3 font-medium">Última compra</th>
              <th className="px-4 py-3 font-medium">Total gasto</th>
              <th className="px-4 py-3 font-medium">Compras</th>
              <th className="px-4 py-3 font-medium">Próx. contato</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-stone-400">
                  Nenhum cliente cadastrado ainda.
                </td>
              </tr>
            ) : (
              clientes.map((c) => (
                <tr key={c.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-stone-900">{c.nome}</td>
                  <td className="px-4 py-3 text-stone-600">{c.telefone ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600">{c.cidade ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600 capitalize">{c.estagio}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {c.ultimaCompra ? new Date(c.ultimaCompra + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{formatBRL(c.valorTotal)}</td>
                  <td className="px-4 py-3 text-stone-600">{c.totalCompras}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {c.proximo_contato ? new Date(c.proximo_contato + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditando(c)}
                      className="text-stone-400 hover:text-oliva-600"
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
