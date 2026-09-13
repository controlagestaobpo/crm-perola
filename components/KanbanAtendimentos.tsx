"use client";

import { useState, useTransition } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { moverClienteKanban } from "@/lib/actions";
import type { ClienteComHistorico } from "@/lib/clientes";
import type { Estagio } from "@/types/database";

const COLUNAS: { estagio: Estagio; titulo: string }[] = [
  { estagio: "prospectar", titulo: "📞 A Prospectar" },
  { estagio: "contatado", titulo: "☎️ Contatado" },
  { estagio: "negociacao", titulo: "⭐ Negociação" },
  { estagio: "vendido", titulo: "✅ Vendido" },
  { estagio: "recusado", titulo: "❌ Sem Interesse" },
];

export default function KanbanAtendimentos({ clientes }: { clientes: ClienteComHistorico[] }) {
  const [lista, setLista] = useState(clientes);
  const [, startTransition] = useTransition();

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const novoEstagio = result.destination.droppableId as Estagio;
    const clienteId = result.draggableId;

    setLista((atual) =>
      atual.map((c) => (c.id === clienteId ? { ...c, estagio: novoEstagio } : c))
    );

    startTransition(() => {
      moverClienteKanban(clienteId, novoEstagio);
    });
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {COLUNAS.map((coluna) => {
          const itens = lista.filter((c) => c.estagio === coluna.estagio);
          return (
            <Droppable droppableId={coluna.estagio} key={coluna.estagio}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="min-h-[300px] rounded-xl bg-slate-100 p-3"
                >
                  <p className="mb-3 border-b border-slate-200 pb-2 text-sm font-semibold text-slate-700">
                    {coluna.titulo} <span className="text-slate-400">({itens.length})</span>
                  </p>
                  <div className="space-y-2">
                    {itens.map((cliente, index) => (
                      <Draggable draggableId={cliente.id} index={index} key={cliente.id}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="rounded-lg border-l-4 border-violet-500 bg-white p-3 shadow-sm"
                          >
                            <p className="text-sm font-semibold text-slate-900">{cliente.nome}</p>
                            <p className="text-xs text-slate-500">
                              {cliente.ultimaCompra
                                ? `Última compra: ${new Date(cliente.ultimaCompra + "T00:00:00").toLocaleDateString("pt-BR")}`
                                : "Ainda sem compras"}
                            </p>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </div>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}
