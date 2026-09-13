"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { moverClienteKanban } from "@/lib/actions";
import { estagioParaResultado } from "@/lib/estagio";
import KanbanAtendimentoModal from "@/components/KanbanAtendimentoModal";
import NovoAtendimentoModal from "@/components/NovoAtendimentoModal";
import type { ClienteComHistorico } from "@/lib/clientes";
import type { Estagio, Perfil, Produto, ResultadoAtendimento } from "@/types/database";

const COLUNAS: { estagio: Estagio; titulo: string }[] = [
  { estagio: "prospectar", titulo: "📞 A Prospectar" },
  { estagio: "contatado", titulo: "☎️ Contatado" },
  { estagio: "negociacao", titulo: "⭐ Negociação" },
  { estagio: "vendido", titulo: "✅ Vendido" },
  { estagio: "recusado", titulo: "❌ Sem Interesse" },
];

const ESTAGIOS_COM_REGISTRO: Partial<Record<Estagio, "compra" | "negociacao">> = {
  vendido: "compra",
  negociacao: "negociacao",
};

interface KanbanAtendimentosProps {
  clientes: ClienteComHistorico[];
  produtos: Produto[];
  vendedores: Perfil[];
  souMaster: boolean;
  meuId: string;
}

export default function KanbanAtendimentos({
  clientes,
  produtos,
  vendedores,
  souMaster,
  meuId,
}: KanbanAtendimentosProps) {
  const [lista, setLista] = useState(clientes);
  const [, startTransition] = useTransition();
  const [modal, setModal] = useState<{
    clienteId: string;
    clienteNome: string;
    resultado: "compra" | "negociacao";
    novoEstagio: Estagio;
  } | null>(null);
  const [mostrarNovo, setMostrarNovo] = useState(false);

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const novoEstagio = result.destination.droppableId as Estagio;
    const clienteId = result.draggableId;
    const cliente = lista.find((c) => c.id === clienteId);
    if (!cliente || cliente.estagio === novoEstagio) return;

    const resultadoNecessario = ESTAGIOS_COM_REGISTRO[novoEstagio];

    if (resultadoNecessario) {
      setModal({
        clienteId,
        clienteNome: cliente.nome,
        resultado: resultadoNecessario,
        novoEstagio,
      });
      return;
    }

    setLista((atual) =>
      atual.map((c) => (c.id === clienteId ? { ...c, estagio: novoEstagio } : c))
    );
    startTransition(() => {
      moverClienteKanban(clienteId, novoEstagio);
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setMostrarNovo(true)}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          Novo atendimento
        </button>
      </div>

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

      {modal && (
        <KanbanAtendimentoModal
          clienteId={modal.clienteId}
          clienteNome={modal.clienteNome}
          resultado={modal.resultado}
          produtos={produtos}
          vendedores={vendedores}
          souMaster={souMaster}
          meuId={meuId}
          onFechar={() => setModal(null)}
          onSalvo={() => {
            setLista((atual) =>
              atual.map((c) => (c.id === modal.clienteId ? { ...c, estagio: modal.novoEstagio } : c))
            );
            setModal(null);
          }}
        />
      )}

      {mostrarNovo && (
        <NovoAtendimentoModal
          clientes={lista}
          produtos={produtos}
          vendedores={vendedores}
          souMaster={souMaster}
          meuId={meuId}
          onFechar={() => setMostrarNovo(false)}
          onSalvo={(clienteId, resultado) => {
            const novoEstagio = estagioParaResultado(resultado as ResultadoAtendimento);
            setLista((atual) =>
              atual.map((c) => (c.id === clienteId ? { ...c, estagio: novoEstagio } : c))
            );
          }}
        />
      )}
    </>
  );
}
