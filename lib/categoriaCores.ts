const PALETA: Record<string, string> = {
  "Bovinos de Corte": "peer-checked:border-amber-600 peer-checked:bg-amber-600",
  "Bovinos de Leite": "peer-checked:border-sky-600 peer-checked:bg-sky-600",
  "Bovinos de Cria": "peer-checked:border-rose-600 peer-checked:bg-rose-600",
  "Suínos": "peer-checked:border-pink-600 peer-checked:bg-pink-600",
  "Aves": "peer-checked:border-orange-600 peer-checked:bg-orange-600",
  "Peixes": "peer-checked:border-cyan-600 peer-checked:bg-cyan-600",
  "Equinos": "peer-checked:border-emerald-600 peer-checked:bg-emerald-600",
  "Ovinos": "peer-checked:border-indigo-600 peer-checked:bg-indigo-600",
};

const PADRAO = "peer-checked:border-violet-600 peer-checked:bg-violet-600";

const PALETA_BADGE: Record<string, string> = {
  "Bovinos de Corte": "bg-amber-100 text-amber-700",
  "Bovinos de Leite": "bg-sky-100 text-sky-700",
  "Bovinos de Cria": "bg-rose-100 text-rose-700",
  "Suínos": "bg-pink-100 text-pink-700",
  "Aves": "bg-orange-100 text-orange-700",
  "Peixes": "bg-cyan-100 text-cyan-700",
  "Equinos": "bg-emerald-100 text-emerald-700",
  "Ovinos": "bg-indigo-100 text-indigo-700",
};

const PADRAO_BADGE = "bg-violet-100 text-violet-700";

export function corCategoria(categoria: string) {
  return PALETA[categoria] ?? PADRAO;
}

export function corBadgeCategoria(categoria: string) {
  return PALETA_BADGE[categoria] ?? PADRAO_BADGE;
}
