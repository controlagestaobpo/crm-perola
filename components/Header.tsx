"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Papel } from "@/types/database";

export default function Header({ nome, papel }: { nome: string; papel: Papel }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-stone-200 bg-white px-8 py-4 print:hidden">
      <div />
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-oliva-50 px-3 py-1.5 text-sm font-medium text-oliva-700">
          {nome} {papel === "master" && <span className="text-xs text-oliva-400">(master)</span>}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-900"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </header>
  );
}
