"use client";

import dynamicImport from "next/dynamic";
import type { ComponentProps } from "react";
import type BarChartCardBase from "./BarChartCardBase";

const Carregado = dynamicImport(() => import("./BarChartCardBase"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-white/80 backdrop-blur-sm shadow-sm" />,
});

export default function BarChartCard(props: ComponentProps<typeof BarChartCardBase>) {
  return <Carregado {...props} />;
}
