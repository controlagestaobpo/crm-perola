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
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-perola-texto-2" />
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
          className="w-full rounded-[10px] border border-[#DAD8CD] py-[11px] pl-9 pr-3 text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
        />
      </div>
      {aberto && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-[10px] border border-perola-borda bg-white shadow-lg">
          {filtrados.length === 0 ? (
            <p className="px-3 py-2 text-sm text-perola-texto-2">Nenhum cliente encontrado.</p>
          ) : (
            filtrados.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => selecionar(c)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-perola-tag ${
                  c.id === selecionadoId ? "bg-perola-tag-pos-bg font-medium text-perola-tag-pos-texto" : "text-perola-texto"
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
