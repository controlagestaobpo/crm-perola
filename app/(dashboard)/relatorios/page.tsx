import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/auth";
import { hojeISOBrasil } from "@/lib/metrics";
import { PRESETS_PERIODO, periodoDoPreset } from "@/lib/periodo";
import RelatoriosAbas from "@/components/RelatoriosAbas";
import FiltroRelatorio from "@/components/FiltroRelatorio";
import ExplorarTabela, { type LinhaExplorar } from "@/components/ExplorarTabela";
import type { ResultadoAtendimento } from "@/types/database";

export const dynamic = "force-dynamic";

const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function dataBR(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: { periodo?: string; de?: string; ate?: string; vendedor?: string; resultado?: string; visao?: string };
}) {
  const perfil = await getPerfilAtual();
  if (!perfil) return null;
  // Explorar: master e sócio. O Relatório do mês (com comissões) segue só do master.
  if (perfil.papel !== "master" && perfil.papel !== "gerente") redirect("/");

  const hojeISO = hojeISOBrasil();
  const { preset, de, ate } = periodoDoPreset(searchParams.periodo, searchParams.de, searchParams.ate, hojeISO);
  const vendedorId = searchParams.vendedor && REGEX_UUID.test(searchParams.vendedor) ? searchParams.vendedor : "";

  const supabase = createClient();
  let consulta = supabase
    .from("atendimentos")
    .select(
      "id, data, criado_em, cliente_id, vendedor_id, resultado, valor, valor_negociacao, motivo, observacoes, clientes(nome, cidade, telefone)"
    )
    .gte("data", de)
    .lte("data", ate)
    .order("data", { ascending: false })
    .limit(5000);
  if (vendedorId) consulta = consulta.eq("vendedor_id", vendedorId);

  const [{ data: atendimentosData }, { data: perfisData }] = await Promise.all([
    consulta,
    supabase.from("perfis").select("id, nome, papel").order("nome"),
  ]);

  const perfis = (perfisData ?? []) as { id: string; nome: string; papel: string }[];
  const nomeVendedor = new Map(perfis.map((p) => [p.id, p.nome]));

  const linhas: LinhaExplorar[] = (
    (atendimentosData ?? []) as unknown as {
      id: string;
      data: string;
      criado_em: string;
      cliente_id: string;
      vendedor_id: string;
      resultado: ResultadoAtendimento;
      valor: number | null;
      valor_negociacao: number | null;
      motivo: string | null;
      observacoes: string | null;
      clientes: { nome: string; cidade: string | null; telefone: string | null } | null;
    }[]
  ).map((a) => ({
    id: a.id,
    data: a.data,
    criado_em: a.criado_em,
    clienteId: a.cliente_id,
    clienteNome: a.clientes?.nome ?? "—",
    cidade: a.clientes?.cidade?.trim() || null,
    telefone: a.clientes?.telefone?.trim() || null,
    vendedorNome: nomeVendedor.get(a.vendedor_id) ?? "—",
    resultado: a.resultado,
    valor: Number(a.valor ?? 0),
    valorOrcamento: Number(a.valor_negociacao ?? 0),
    motivo: a.motivo,
    observacoes: a.observacoes,
  }));

  const rotuloPreset = PRESETS_PERIODO.find((p) => p.valor === preset)?.label ?? "";
  const rotuloPeriodo = `${rotuloPreset}: ${de === ate ? dataBR(de) : `${dataBR(de)} a ${dataBR(ate)}`}${
    vendedorId ? ` · ${nomeVendedor.get(vendedorId) ?? ""}` : " · todas as vendedoras"
  }`;

  return (
    <div className="space-y-6">
      <RelatoriosAbas ativa="explorar" mostrarMes={perfil.papel === "master"} />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-perola-texto">Explorar atendimentos</h1>
          <p className="text-sm text-perola-texto-2">Filtre e veja quem foi atendido, quantas vezes e quem comprou</p>
        </div>
        <FiltroRelatorio
          preset={preset}
          de={de}
          ate={ate}
          hojeISO={hojeISO}
          vendedorId={vendedorId}
          vendedores={perfis.filter((p) => p.papel !== "master" || p.id === vendedorId).map((p) => ({ id: p.id, nome: p.nome }))}
        />
      </div>

      {/* key: ao mudar período/vendedora, a tabela recomeça com os dados novos */}
      <ExplorarTabela
        key={`${de}-${ate}-${vendedorId}`}
        linhas={linhas}
        resultadoInicial={searchParams.resultado ?? ""}
        visaoInicial={searchParams.visao ?? ""}
        rotuloPeriodo={rotuloPeriodo}
      />
    </div>
  );
}
