"use client";

import dynamicImport from "next/dynamic";
import type { ComponentProps } from "react";
import type LineChartCardBase from "./LineChartCardBase";

const Carregado = dynamicImport(() => import("./LineChartCardBase"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-white/80 backdrop-blur-sm shadow-sm" />,
});

export default function LineChartCard(props: ComponentProps<typeof LineChartCardBase>) {
  return <Carregado {...props} />;
}
