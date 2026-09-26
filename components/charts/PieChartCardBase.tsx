"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const CORES = ["#22c55e", "#3b82f6", "#f97316", "#a855f7", "#eab308", "#94a3b8"];
const RADIAN = Math.PI / 180;

interface PieChartCardProps {
  title: string;
  data: { nome: string; quantidade: number }[];
}

function rotuloPercentual(props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props;
  if (percent === 0) return null;
  const raio = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + raio * Math.cos(-midAngle * RADIAN);
  const y = cy + raio * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function PieChartCard({ title, data }: PieChartCardProps) {
  return (
    <div className="h-72 w-full rounded-2xl bg-white/80 backdrop-blur-sm p-5 shadow-sm">
      <p className="mb-4 text-sm font-medium text-stone-700">{title}</p>
      {data.length === 0 ? (
        <div className="flex h-[85%] items-center justify-center text-sm text-stone-400">
          Sem dados neste período ainda.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <PieChart>
            <Pie
              data={data}
              dataKey="quantidade"
              nameKey="nome"
              outerRadius={80}
              labelLine={false}
              label={rotuloPercentual}
            >
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
