import Link from "next/link";
import { rotuloData, type ItemAgenda } from "@/lib/agenda";

export default function ProximasAtividades({ itens }: { itens: ItemAgenda[] }) {
  const proximos = itens.slice(0, 6);

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-stone-700">📅 Próximas atividades</p>
        <Link href="/agenda" className="text-xs font-medium text-oliva-600 hover:underline">
          Ver agenda completa
        </Link>
      </div>
      {proximos.length === 0 ? (
        <p className="text-sm text-stone-400">Nenhum contato agendado. Direcione o dia registrando atendimentos com &quot;próximo contato&quot;.</p>
      ) : (
        <ul className="space-y-3">
          {proximos.map((item) => {
            const rotulo = rotuloData(item.proximoContato);
            return (
              <li key={item.clienteId} className="flex items-center justify-between text-sm">
                <span className="font-medium text-stone-900">{item.clienteNome}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${rotulo.cor}`}>
                  {rotulo.texto}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
