import { redirect } from "next/navigation";
import { getPerfilAtual } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await getPerfilAtual();

  if (!perfil) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden print:h-auto print:overflow-visible">
      <Sidebar papel={perfil.papel} />
      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible">
        <Header nome={perfil.nome} papel={perfil.papel} />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-lime-100 via-lime-50 to-stone-200 p-6 sm:p-8 print:overflow-visible print:p-0">
          <div className="mx-auto max-w-6xl print:max-w-none">{children}</div>
        </main>
      </div>
    </div>
  );
}
