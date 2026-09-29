import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual, labelPapel } from "@/lib/auth";
import { removerConvite } from "@/lib/actions";
import ConviteForm from "@/components/ConviteForm";
import UsuarioRowActions from "@/components/UsuarioRowActions";
import type { Convite, Perfil } from "@/types/database";

export const dynamic = "force-dynamic";

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
        <h1 className="text-2xl font-semibold text-perola-texto">Usuários</h1>
        <p className="text-sm text-perola-texto-2">Convide vendedoras e gerencie a equipe</p>
      </div>

      <ConviteForm />

      {convites.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-perola-texto">Convites pendentes</h2>
          <p className="mb-3 text-sm text-perola-texto-2">
            Envie o link abaixo para a pessoa completar o cadastro dela.
          </p>
          <div className="space-y-3">
            {convites.map((convite) => {
              const link = `${baseUrl}/cadastro?email=${encodeURIComponent(convite.email)}&nome=${encodeURIComponent(convite.nome)}`;
              return (
                <div
                  key={convite.id}
                  className="flex flex-col gap-2 rounded-[10px] border border-perola-borda bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-perola-texto">
                      {convite.nome} <span className="text-perola-texto-2">· {convite.email}</span>
                    </p>
                    <p className="break-all text-xs text-perola-tag-pos-texto">{link}</p>
                  </div>
                  <form action={removerConvite.bind(null, convite.id)}>
                    <button type="submit" className="text-xs font-medium text-perola-erro hover:underline">
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
        <h2 className="mb-3 text-base font-semibold text-perola-texto">Equipe</h2>
        <div className="overflow-hidden rounded-[14px] border border-perola-borda bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-perola-divisor bg-[#FAFAF6] text-xs uppercase text-perola-texto-2">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Papel</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {perfis.map((p) => (
                <tr key={p.id} className="border-b border-perola-divisor last:border-0">
                  <td className="px-4 py-3 font-medium text-perola-texto">{p.nome}</td>
                  <td className="px-4 py-3 text-perola-texto-2">{p.email}</td>
                  <td className="px-4 py-3 text-perola-texto-2">{labelPapel(p.papel)}</td>
                  <td className="px-4 py-3">
                    <UsuarioRowActions usuarioId={p.id} nome={p.nome} podeRemover={p.id !== perfil.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
