"use client";

import { createContext, useContext, useTransition } from "react";

// Enquanto a página busca os dados novos (ex.: trocar o dia no Dashboard), o
// conteúdo fica levemente apagado. Sem isso, parece que o clique não funcionou.
const Contexto = createContext<(acao: () => void) => void>((acao) => acao());

export function useNavegacaoComCarregamento() {
  return useContext(Contexto);
}

export default function CarregandoPagina({ children }: { children: React.ReactNode }) {
  const [carregando, startTransition] = useTransition();
  return (
    <Contexto.Provider value={startTransition}>
      <div
        aria-busy={carregando}
        className={`transition-opacity duration-150 ${carregando ? "pointer-events-none opacity-60" : "opacity-100"}`}
      >
        {children}
      </div>
    </Contexto.Provider>
  );
}
