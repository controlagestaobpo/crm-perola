import type { Estagio, ResultadoAtendimento } from "@/types/database";

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
