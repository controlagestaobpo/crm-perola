import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  cor?: string;
}

export default function StatCard({ label, value, sub, icon: Icon, cor = "text-oliva-700" }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-5 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5 text-stone-400">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-3xl font-bold ${cor}`}>{value}</p>
      {sub && <p className="mt-1 text-xs font-medium text-stone-400">{sub}</p>}
    </div>
  );
}
