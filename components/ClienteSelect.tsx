"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Cliente } from "@/types/database";

interface ClienteSelectProps {
  clientes: Cliente[];
  name?: string;
  defaultValue?: string;
}

export default function ClienteSelect({ clientes, name = "cliente_id", defaultValue = "" }: ClienteSelectProps) {
  const clienteInicial = clientes.find((c) => c.id === defaultValue);
  const [busca, setBusca] = useState(clienteInicial?.nome ?? "");
  const [selecionadoId, setSelecionadoId] = useState(defaultValue);
  const [aberto, setAberto] = useState(false);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = termo ? clientes.filter((c) => c.nome.toLowerCase().includes(termo)) : clientes;
    return lista.slice(0, 30);
  }, [clientes, busca]);

  function selecionar(cliente: Cliente) {
    setSelecionadoId(cliente.id);
    setBusca(cliente.nome);
    setAberto(false);
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selecionadoId} />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setSelecionadoId("");
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 150)}
          placeholder="Digite o nome do cliente..."
          autoComplete="off"
          className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-sm"
        />
      </div>
      {aberto && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-lg">
          {filtrados.length === 0 ? (
            <p className="px-3 py-2 text-sm text-stone-400">Nenhum cliente encontrado.</p>
          ) : (
            filtrados.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => selecionar(c)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-oliva-50 ${
                  c.id === selecionadoId ? "bg-oliva-50 font-medium text-oliva-700" : "text-stone-700"
                }`}
              >
                {c.nome}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
