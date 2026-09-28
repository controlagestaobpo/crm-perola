import Link from "next/link";
import { diasEntreHojeE } from "@/lib/metrics";
import { rotuloData, type ItemAgenda } from "@/lib/agenda";

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

function ItemLinha({ item }: { item: ItemAgenda }) {
  const rotulo = rotuloData(item.proximoContato);
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-perola-tag text-xs font-semibold text-perola-texto-2">
        {iniciais(item.clienteNome)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-perola-texto">{item.clienteNome}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${rotulo.cor}`}>
        {rotulo.texto}
      </span>
    </div>
  );
}

export default function ProximasAtividades({ itens }: { itens: ItemAgenda[] }) {
  const proximos6 = itens.slice(0, 6);
  const atrasados = proximos6.filter((item) => diasEntreHojeE(item.proximoContato) < 0);
  const demais = proximos6.filter((item) => diasEntreHojeE(item.proximoContato) >= 0);

  return (
    <div className="flex flex-col gap-4 rounded-[14px] border border-perola-borda bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-perola-texto">Agenda de hoje</p>
        <Link href="/agenda" className="text-xs font-medium text-perola-tag-pos-texto hover:underline">
          Ver agenda completa
        </Link>
      </div>
      {proximos6.length === 0 ? (
        <p className="text-sm text-perola-texto-2">
          Nenhum contato agendado. Direcione o dia registrando atendimentos com &quot;próximo contato&quot;.
        </p>
      ) : (
        <>
          {atrasados.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-perola-erro">
                Atrasados ({atrasados.length})
              </p>
              <div className="flex flex-col gap-3">
                {atrasados.map((item) => (
                  <ItemLinha key={item.clienteId} item={item} />
                ))}
              </div>
            </div>
          )}
          {demais.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-perola-texto-2">Próximos</p>
              <div className="flex flex-col gap-3">
                {demais.map((item) => (
                  <ItemLinha key={item.clienteId} item={item} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
