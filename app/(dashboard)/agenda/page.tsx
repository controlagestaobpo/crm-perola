import Link from "next/link";
import { Phone, MapPin, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAgenda, type ItemAgenda } from "@/lib/agenda";
import { labelResultado } from "@/lib/metrics";
import type { ResultadoAtendimento } from "@/types/database";

export const dynamic = "force-dynamic";

function diasAte(dataISO: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const data = new Date(dataISO + "T00:00:00");
  return Math.round((data.getTime() - hoje.getTime()) / 86400000);
}

function agrupar(itens: ItemAgenda[]) {
  const grupos = {
    atrasados: [] as ItemAgenda[],
    hoje: [] as ItemAgenda[],
    amanha: [] as ItemAgenda[],
    semana: [] as ItemAgenda[],
    depois: [] as ItemAgenda[],
  };

  for (const item of itens) {
    const dias = diasAte(item.proximoContato);
    if (dias < 0) grupos.atrasados.push(item);
    else if (dias === 0) grupos.hoje.push(item);
    else if (dias === 1) grupos.amanha.push(item);
    else if (dias <= 7) grupos.semana.push(item);
    else grupos.depois.push(item);
  }

  return grupos;
}

const SECOES: { chave: keyof ReturnType<typeof agrupar>; titulo: string; estilo: string }[] = [
  { chave: "atrasados", titulo: "🔴 Atrasados", estilo: "border-red-400" },
  { chave: "hoje", titulo: "🟡 Hoje", estilo: "border-amber-400" },
  { chave: "amanha", titulo: "🔵 Amanhã", estilo: "border-violet-400" },
  { chave: "semana", titulo: "📅 Próximos 7 dias", estilo: "border-slate-300" },
  { chave: "depois", titulo: "🗓️ Mais tarde", estilo: "border-slate-200" },
];

function Iniciais(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default async function AgendaPage() {
  const supabase = createClient();
  const itens = await getAgenda(supabase);
  const grupos = agrupar(itens);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Agenda</h1>
        <p className="text-sm text-slate-500">
          O direcionamento do dia: quem cada vendedor precisa contatar e quando
        </p>
      </div>

      {itens.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
          Nenhum contato agendado ainda. Ao registrar um atendimento, preencha
          &quot;Próximo contato&quot; para ele aparecer aqui.
        </div>
      ) : (
        SECOES.map(({ chave, titulo, estilo }) => {
          const lista = grupos[chave];
          if (lista.length === 0) return null;

          return (
            <div key={chave}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {titulo} <span className="text-slate-400">({lista.length})</span>
              </h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {lista.map((item) => (
                  <div
                    key={item.clienteId}
                    className={`flex items-start gap-4 rounded-xl border-l-4 bg-white p-4 shadow-sm ${estilo}`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
                      {Iniciais(item.clienteNome)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{item.clienteNome}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        {item.clienteCidade && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {item.clienteCidade}
                          </span>
                        )}
                        {item.clienteTelefone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {item.clienteTelefone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> {item.vendedorNome}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Último contato:{" "}
                        <span className="font-medium text-slate-700">
                          {labelResultado(item.ultimoResultado as ResultadoAtendimento)}
                        </span>
                        {item.observacoes && <span className="italic"> — {item.observacoes}</span>}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="text-xs font-medium text-slate-400">
                        {new Date(item.proximoContato + "T00:00:00").toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                      <Link
                        href={`/atendimentos?cliente=${item.clienteId}`}
                        className="whitespace-nowrap rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100"
                      >
                        Registrar atendimento
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
