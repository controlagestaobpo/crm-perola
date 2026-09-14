"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 rounded-lg bg-oliva-600 px-4 py-2 text-sm font-medium text-white hover:bg-oliva-700 print:hidden"
    >
      <Printer className="h-4 w-4" />
      Imprimir / Salvar PDF
    </button>
  );
}
