import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  cor?: string;
}

export default function StatCard({ label, value, sub, icon: Icon, cor = "text-perola-texto" }: StatCardProps) {
  return (
    <div className="rounded-[14px] border border-perola-borda bg-white p-5">
      <div className="mb-2 flex items-center gap-1.5 text-perola-texto-2">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className={`break-words text-2xl font-semibold ${cor}`}>{value}</p>
      {sub && <p className="mt-1 text-xs font-medium text-perola-texto-2">{sub}</p>}
    </div>
  );
}
