import type { Estagio, ResultadoAtendimento } from "@/types/database";

const LABEL_ESTAGIO: Record<Estagio, string> = {
  prospectar: "A prospectar",
  contatado: "Contatado",
  negociacao: "Orçamento",
  vendido: "Vendido",
  recusado: "Sem interesse",
};

export function labelEstagio(estagio: Estagio) {
  return LABEL_ESTAGIO[estagio];
}

export function estagioParaResultado(resultado: ResultadoAtendimento): Estagio {
  switch (resultado) {
    case "compra":
      return "vendido";
    case "negociacao":
      return "negociacao";
    case "interessado":
      return "contatado";
    case "sem_interesse":
      return "recusado";
    default:
      return "contatado";
  }
}
