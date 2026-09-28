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
    <div className="h-72 w-full rounded-[14px] border border-perola-borda bg-white p-5">
      <p className="mb-4 text-sm font-semibold text-perola-texto">{title}</p>
      {data.length === 0 ? (
        <div className="flex h-[85%] items-center justify-center text-sm text-perola-texto-2">
          Sem dados neste período ainda.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDEBE3" />
            <XAxis dataKey={xKey} stroke="#6D7365" fontSize={12} />
            <YAxis stroke="#6D7365" fontSize={12} />
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
