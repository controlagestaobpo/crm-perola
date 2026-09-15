"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const CORES = ["#22c55e", "#3b82f6", "#f97316", "#a855f7", "#eab308", "#94a3b8"];

interface PieChartCardProps {
  title: string;
  data: { nome: string; quantidade: number }[];
}

export default function PieChartCard({ title, data }: PieChartCardProps) {
  return (
    <div className="h-72 w-full rounded-2xl bg-white p-5 shadow-sm">
      <p className="mb-4 text-sm font-medium text-stone-700">{title}</p>
      {data.length === 0 ? (
        <div className="flex h-[85%] items-center justify-center text-sm text-stone-400">
          Sem dados neste período ainda.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <PieChart>
            <Pie data={data} dataKey="quantidade" nameKey="nome" outerRadius={80}>
              {data.map((_, index) => (
                <Cell key={index} fill={CORES[index % CORES.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
