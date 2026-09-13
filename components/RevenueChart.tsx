"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface RevenueChartProps {
  data: { mes: string; valor: number }[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="h-72 w-full rounded-xl border border-slate-200 bg-white p-5">
      <p className="mb-4 text-sm font-medium text-slate-700">
        Receita de negócios ganhos por mês
      </p>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="valor"
            stroke="#7c3aed"
            strokeWidth={2}
            dot={{ fill: "#7c3aed" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
