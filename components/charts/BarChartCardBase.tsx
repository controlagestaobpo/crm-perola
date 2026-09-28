"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface BarChartCardProps {
  title: string;
  data: { produto: string; quantidade: number }[];
  cor?: string;
  altura?: string;
}

export default function BarChartCard({ title, data, cor = "#7FB52A", altura = "h-72" }: BarChartCardProps) {
  return (
    <div className={`${altura} w-full rounded-[14px] border border-perola-borda bg-white p-5`}>
      <p className="mb-4 text-sm font-semibold text-perola-texto">{title}</p>
      {data.length === 0 ? (
        <div className="flex h-[90%] items-center justify-center text-sm text-perola-texto-2">
          Sem dados neste período ainda.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDEBE3" />
            <XAxis type="number" stroke="#6D7365" fontSize={12} allowDecimals={false} />
            <YAxis type="category" dataKey="produto" stroke="#6D7365" fontSize={12} width={160} />
            <Tooltip />
            <Bar dataKey="quantidade" fill={cor} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
