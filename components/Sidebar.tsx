"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Handshake,
  Target,
  Lightbulb,
  Package,
  UserCog,
  CalendarClock,
  FileBarChart,
  Beef,
} from "lucide-react";
import type { Papel } from "@/types/database";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, papeis: ["master", "gerente", "vendedor"] },
  { href: "/agenda", label: "Agenda", icon: CalendarClock, papeis: ["master", "gerente", "vendedor"] },
  { href: "/atendimentos", label: "Atendimentos", icon: Handshake, papeis: ["master", "gerente", "vendedor"] },
  { href: "/clientes", label: "Clientes", icon: Users, papeis: ["master", "gerente", "vendedor"] },
  { href: "/metas", label: "Metas", icon: Target, papeis: ["master", "gerente", "vendedor"] },
  { href: "/insights", label: "Insights", icon: Lightbulb, papeis: ["master", "gerente", "vendedor"] },
  { href: "/relatorios", label: "Relatórios", icon: FileBarChart, papeis: ["master"] },
  { href: "/produtos", label: "Produtos", icon: Package, papeis: ["master"] },
  { href: "/usuarios", label: "Usuários", icon: UserCog, papeis: ["master"] },
];

export default function Sidebar({ papel }: { papel: Papel }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-oliva-900 print:hidden">
      <div className="flex items-center gap-2 border-b border-oliva-800 px-6 py-5">
        <Beef className="h-6 w-6 text-lime-400" />
        <span className="text-lg font-semibold text-white">CRM Pérola</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {links
          .filter((link) => link.papeis.includes(papel))
          .map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-lime-400 text-oliva-900"
                    : "text-oliva-100/80 hover:bg-oliva-800 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}
