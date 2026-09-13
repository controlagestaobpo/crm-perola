"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface BarChartCardProps {
  title: string;
  data: { produto: string; quantidade: number }[];
  cor?: string;
}

export default function BarChartCard({ title, data, cor = "#0f9e8c" }: BarChartCardProps) {
  return (
    <div className="h-72 w-full rounded-xl border border-slate-200 bg-white p-5">
      <p className="mb-4 text-sm font-medium text-slate-700">{title}</p>
      {data.length === 0 ? (
        <div className="flex h-[85%] items-center justify-center text-sm text-slate-400">
          Sem dados neste período ainda.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" stroke="#94a3b8" fontSize={12} allowDecimals={false} />
            <YAxis type="category" dataKey="produto" stroke="#94a3b8" fontSize={12} width={140} />
            <Tooltip />
            <Bar dataKey="quantidade" fill={cor} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
