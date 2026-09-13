import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/auth";
import { removerConvite } from "@/lib/actions";
import ConviteForm from "@/components/ConviteForm";
import type { Convite, Perfil } from "@/types/database";

export default async function UsuariosPage() {
  const perfil = await getPerfilAtual();
  if (!perfil) return null;
  if (perfil.papel !== "master") redirect("/");

  const supabase = createClient();
  const [{ data: perfisData }, { data: convitesData }] = await Promise.all([
    supabase.from("perfis").select("*").order("nome"),
    supabase.from("convites").select("*").eq("usado", false).order("criado_em", { ascending: false }),
  ]);

  const perfis = (perfisData ?? []) as Perfil[];
  const convites = (convitesData ?? []) as Convite[];

  const headersList = headers();
  const host = headersList.get("host");
  const protocolo = host?.startsWith("localhost") ? "http" : "https";
  const baseUrl = host ? `${protocolo}://${host}` : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Usuários</h1>
        <p className="text-sm text-slate-500">Convide vendedoras e gerencie a equipe</p>
      </div>

      <ConviteForm />

      {convites.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Convites pendentes</h2>
          <p className="mb-3 text-sm text-slate-500">
            Envie o link abaixo para a pessoa completar o cadastro dela.
          </p>
          <div className="space-y-3">
            {convites.map((convite) => {
              const link = `${baseUrl}/cadastro?email=${encodeURIComponent(convite.email)}&nome=${encodeURIComponent(convite.nome)}`;
              return (
                <div
                  key={convite.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {convite.nome} <span className="text-slate-400">· {convite.email}</span>
                    </p>
                    <p className="break-all text-xs text-violet-600">{link}</p>
                  </div>
                  <form action={removerConvite.bind(null, convite.id)}>
                    <button type="submit" className="text-xs font-medium text-red-500 hover:underline">
                      Cancelar convite
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Equipe</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Papel</th>
              </tr>
            </thead>
            <tbody>
              {perfis.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{p.email}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{p.papel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
