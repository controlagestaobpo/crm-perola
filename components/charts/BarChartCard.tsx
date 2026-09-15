"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface BarChartCardProps {
  title: string;
  data: { produto: string; quantidade: number }[];
  cor?: string;
  altura?: string;
}

export default function BarChartCard({ title, data, cor = "#84cc16", altura = "h-72" }: BarChartCardProps) {
  return (
    <div className={`${altura} w-full rounded-2xl bg-white p-5 shadow-sm`}>
      <p className="mb-4 text-sm font-medium text-stone-700">{title}</p>
      {data.length === 0 ? (
        <div className="flex h-[90%] items-center justify-center text-sm text-stone-400">
          Sem dados neste período ainda.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" stroke="#94a3b8" fontSize={12} allowDecimals={false} />
            <YAxis type="category" dataKey="produto" stroke="#94a3b8" fontSize={12} width={160} />
            <Tooltip />
            <Bar dataKey="quantidade" fill={cor} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
