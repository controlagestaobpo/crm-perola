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
  Gem,
} from "lucide-react";
import type { Papel } from "@/types/database";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, papeis: ["master", "vendedor"] },
  { href: "/agenda", label: "Agenda", icon: CalendarClock, papeis: ["master", "vendedor"] },
  { href: "/atendimentos", label: "Atendimentos", icon: Handshake, papeis: ["master", "vendedor"] },
  { href: "/clientes", label: "Clientes", icon: Users, papeis: ["master", "vendedor"] },
  { href: "/metas", label: "Metas", icon: Target, papeis: ["master", "vendedor"] },
  { href: "/insights", label: "Insights", icon: Lightbulb, papeis: ["master", "vendedor"] },
  { href: "/relatorios", label: "Relatórios", icon: FileBarChart, papeis: ["master"] },
  { href: "/produtos", label: "Produtos", icon: Package, papeis: ["master"] },
  { href: "/usuarios", label: "Usuários", icon: UserCog, papeis: ["master"] },
];

export default function Sidebar({ papel }: { papel: Papel }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col bg-oliva-900 print:hidden">
      <div className="flex items-center gap-2 border-b border-oliva-800 px-6 py-5">
        <Gem className="h-6 w-6 text-trigo-400" />
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
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-oliva-700 text-white"
                    : "text-oliva-100/80 hover:bg-oliva-800 hover:text-white"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-trigo-400" : ""}`} />
                {label}
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}
