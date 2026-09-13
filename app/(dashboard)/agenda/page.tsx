import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAgenda, rotuloData } from "@/lib/agenda";
import { labelResultado } from "@/lib/metrics";
import type { ResultadoAtendimento } from "@/types/database";

export default async function AgendaPage() {
  const supabase = createClient();
  const itens = await getAgenda(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Agenda</h1>
        <p className="text-sm text-slate-500">
          Próximos contatos agendados — o direcionamento do dia para cada vendedor
        </p>
      </div>

      {itens.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          Nenhum contato agendado ainda. Ao registrar um atendimento, preencha &quot;Próximo contato&quot;
          para ele aparecer aqui.
        </div>
      ) : (
        <div className="space-y-3">
          {itens.map((item) => {
            const rotulo = rotuloData(item.proximoContato);
            return (
              <div
                key={item.clienteId}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{item.clienteNome}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${rotulo.cor}`}>
                      {rotulo.texto}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(item.proximoContato + "T00:00:00").toLocaleDateString("pt-BR")}
                    {item.clienteCidade && <> · {item.clienteCidade}</>}
                    {item.clienteTelefone && <> · {item.clienteTelefone}</>}
                    {" · responsável: "}
                    {item.vendedorNome}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Último contato: {labelResultado(item.ultimoResultado as ResultadoAtendimento)}
                    {item.observacoes && <> — {item.observacoes}</>}
                  </p>
                </div>
                <Link
                  href="/atendimentos"
                  className="shrink-0 rounded-lg bg-violet-50 px-3 py-1.5 text-center text-xs font-medium text-violet-700 hover:bg-violet-100"
                >
                  Registrar contato
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
