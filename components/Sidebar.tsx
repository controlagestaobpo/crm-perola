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
  type LucideIcon,
} from "lucide-react";
import type { Papel } from "@/types/database";

type LinkNav = { href: string; label: string; icon: LucideIcon; papeis: Papel[]; grupo: "operacional" | "gestao" };

// Mesmas permissões de sempre (papeis) — só a ordem/agrupamento visual mudou:
// grupo "operacional" primeiro, depois um divisor, depois o grupo "gestão".
const links: LinkNav[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, papeis: ["master", "gerente", "vendedor"], grupo: "operacional" },
  { href: "/agenda", label: "Agenda", icon: CalendarClock, papeis: ["master", "gerente", "vendedor"], grupo: "operacional" },
  { href: "/atendimentos", label: "Atendimentos", icon: Handshake, papeis: ["master", "gerente", "vendedor"], grupo: "operacional" },
  { href: "/clientes", label: "Clientes", icon: Users, papeis: ["master", "gerente", "vendedor"], grupo: "operacional" },
  { href: "/produtos", label: "Produtos", icon: Package, papeis: ["master"], grupo: "operacional" },
  { href: "/metas", label: "Metas", icon: Target, papeis: ["master", "gerente", "vendedor"], grupo: "gestao" },
  { href: "/insights", label: "Insights", icon: Lightbulb, papeis: ["master", "gerente"], grupo: "gestao" },
  { href: "/relatorios", label: "Relatórios", icon: FileBarChart, papeis: ["master"], grupo: "gestao" },
  { href: "/usuarios", label: "Usuários", icon: UserCog, papeis: ["master"], grupo: "gestao" },
];

function ItemNav({ href, label, icon: Icon }: LinkNav, active: boolean) {
  return (
    <Link
      key={href}
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-perola-lima/[0.14] text-perola-lima-texto"
          : "text-perola-item hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

export default function Sidebar({ papel }: { papel: Papel }) {
  const pathname = usePathname();

  const visiveis = links.filter((link) => link.papeis.includes(papel));
  const operacionais = visiveis.filter((l) => l.grupo === "operacional");
  const gestao = visiveis.filter((l) => l.grupo === "gestao");

  return (
    <aside className="flex h-full w-[228px] flex-col bg-perola-verde print:hidden">
      <div className="flex items-center gap-2 px-6 py-5">
        <Beef className="h-6 w-6 text-perola-lima" />
        <span className="text-lg font-semibold text-white">CRM Pérola</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {operacionais.map((link) => ItemNav(link, pathname === link.href || pathname.startsWith(link.href + "/")))}
        {operacionais.length > 0 && gestao.length > 0 && (
          <div className="my-2 h-px bg-white/10" />
        )}
        {gestao.map((link) => ItemNav(link, pathname === link.href || pathname.startsWith(link.href + "/")))}
      </nav>
    </aside>
  );
}
