import Link from "next/link";
import { Phone, MapPin, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAgenda, type ItemAgenda } from "@/lib/agenda";
import { diasEntreHojeE, labelResultado } from "@/lib/metrics";
import type { ResultadoAtendimento } from "@/types/database";

export const dynamic = "force-dynamic";

function agrupar(itens: ItemAgenda[]) {
  const grupos = {
    atrasados: [] as ItemAgenda[],
    hoje: [] as ItemAgenda[],
    amanha: [] as ItemAgenda[],
    semana: [] as ItemAgenda[],
    depois: [] as ItemAgenda[],
  };

  for (const item of itens) {
    const dias = diasEntreHojeE(item.proximoContato);
    if (dias < 0) grupos.atrasados.push(item);
    else if (dias === 0) grupos.hoje.push(item);
    else if (dias === 1) grupos.amanha.push(item);
    else if (dias <= 7) grupos.semana.push(item);
    else grupos.depois.push(item);
  }

  return grupos;
}

const SECOES: { chave: keyof ReturnType<typeof agrupar>; titulo: string }[] = [
  { chave: "atrasados", titulo: "Atrasados" },
  { chave: "hoje", titulo: "Hoje" },
  { chave: "amanha", titulo: "Amanhã" },
  { chave: "semana", titulo: "Próximos 7 dias" },
  { chave: "depois", titulo: "Mais tarde" },
];

function Iniciais(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function estiloPillResultado(resultado: ResultadoAtendimento) {
  if (resultado === "compra") return "bg-perola-verde text-white";
  if (resultado === "negociacao") return "bg-perola-tag-pos-bg text-perola-tag-pos-texto";
  return "bg-perola-tag text-perola-texto-2";
}

export default async function AgendaPage() {
  const supabase = createClient();
  const itens = await getAgenda(supabase);
  const grupos = agrupar(itens);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-perola-texto">Agenda</h1>
        <p className="text-sm text-perola-texto-2">
          O direcionamento do dia: quem cada vendedor precisa contatar e quando
        </p>
      </div>

      {itens.length === 0 ? (
        <div className="rounded-[14px] border border-perola-borda bg-white p-10 text-center text-sm text-perola-texto-2">
          Nenhum contato agendado ainda. Ao registrar um atendimento, preencha
          &quot;Próximo contato&quot; para ele aparecer aqui.
        </div>
      ) : (
        SECOES.map(({ chave, titulo }) => {
          const lista = grupos[chave];
          if (lista.length === 0) return null;

          return (
            <div key={chave}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-perola-texto-2">
                {titulo} <span className="text-perola-texto-2/70">({lista.length})</span>
              </h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {lista.map((item) => (
                  <div
                    key={item.clienteId}
                    className="flex items-start gap-4 rounded-[14px] border border-perola-borda bg-white p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-perola-tag text-sm font-semibold text-perola-texto-2">
                      {Iniciais(item.clienteNome)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-perola-texto">{item.clienteNome}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-perola-texto-2">
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
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${estiloPillResultado(
                            item.ultimoResultado as ResultadoAtendimento
                          )}`}
                        >
                          {labelResultado(item.ultimoResultado as ResultadoAtendimento)}
                        </span>
                        {item.observacoes && (
                          <span className="text-xs italic text-perola-texto-2">{item.observacoes}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="text-xs font-medium text-perola-texto-2">
                        {new Date(item.proximoContato + "T00:00:00").toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                      <Link
                        href={`/atendimentos?cliente=${item.clienteId}`}
                        className="whitespace-nowrap rounded-lg bg-perola-lima px-3 py-1.5 text-xs font-semibold text-perola-texto hover:brightness-95"
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
