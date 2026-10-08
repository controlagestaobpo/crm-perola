import Link from "next/link";

const ABAS = [
  { href: "/relatorios", label: "Explorar", chave: "explorar" },
  { href: "/relatorios/mes", label: "Relatório do mês", chave: "mes" },
] as const;

export default function RelatoriosAbas({ ativa }: { ativa: "explorar" | "mes" }) {
  return (
    <div className="flex w-fit rounded-lg border border-perola-borda bg-white p-1 print:hidden">
      {ABAS.map((aba) => (
        <Link
          key={aba.chave}
          href={aba.href}
          className={`rounded-md px-4 py-1.5 text-sm font-medium ${
            ativa === aba.chave ? "bg-perola-verde text-white" : "text-perola-texto-2 hover:text-perola-texto"
          }`}
        >
          {aba.label}
        </Link>
      ))}
    </div>
  );
}
