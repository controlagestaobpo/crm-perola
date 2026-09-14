import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
}

export default function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-5">
      <div className="rounded-lg bg-oliva-50 p-3">
        <Icon className="h-5 w-5 text-oliva-600" />
      </div>
      <div>
        <p className="text-sm text-stone-500">{label}</p>
        <p className="text-2xl font-semibold text-stone-900">{value}</p>
      </div>
    </div>
  );
}
