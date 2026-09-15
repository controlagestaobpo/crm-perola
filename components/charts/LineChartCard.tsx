"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface LineChartCardProps {
  title: string;
  data: Record<string, string | number>[];
  xKey: string;
  lines: { key: string; nome: string; cor: string; tracejada?: boolean }[];
}

export default function LineChartCard({ title, data, xKey, lines }: LineChartCardProps) {
  return (
    <div className="h-72 w-full rounded-2xl bg-white/80 backdrop-blur-sm p-5 shadow-sm">
      <p className="mb-4 text-sm font-medium text-stone-700">{title}</p>
      {data.length === 0 ? (
        <div className="flex h-[85%] items-center justify-center text-sm text-stone-400">
          Sem dados neste período ainda.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xKey} stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip />
            {lines.length > 1 && <Legend />}
            {lines.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.nome}
                stroke={line.cor}
                strokeWidth={2}
                strokeDasharray={line.tracejada ? "5 5" : undefined}
                dot={{ fill: line.cor, r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
