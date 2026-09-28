"use client";

import dynamicImport from "next/dynamic";
import type { ComponentProps } from "react";
import type PieChartCardBase from "./PieChartCardBase";

// Recharts é pesado — isso carrega o gráfico em um chunk separado, só no
// navegador, em vez de entrar no JS que a página precisa pra ficar interativa.
const Carregado = dynamicImport(() => import("./PieChartCardBase"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-oliva-100 shadow-sm" />,
});

export default function PieChartCard(props: ComponentProps<typeof PieChartCardBase>) {
  return <Carregado {...props} />;
}
