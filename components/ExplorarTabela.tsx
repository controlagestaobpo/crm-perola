"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Download, Search } from "lucide-react";
import { formatBRL, labelResultado } from "@/lib/metrics";
import type { ResultadoAtendimento } from "@/types/database";

export interface LinhaExplorar {
  id: string;
  data: string;
  criado_em: string;
  clienteId: string;
  clienteNome: string;
  cidade: string | null;
  telefone: string | null;
  vendedorNome: string;
  resultado: ResultadoAtendimento;
  valor: number;
  valorOrcamento: number;
  motivo: string | null;
  observacoes: string | null;
}

type Visao = "clientes" | "atendimentos";

const FILTROS_RESULTADO: { valor: "" | ResultadoAtendimento; label: string }[] = [
  { valor: "", label: "Todos" },
  { valor: "prospeccao", label: "Prospecção" },
  { valor: "compra", label: "Compraram" },
  { valor: "negociacao", label: "Orçamento" },
  { valor: "interessado", label: "Interessado" },
  { valor: "sem_interesse", label: "Sem interesse" },
  { valor: "nao_atendeu", label: "Não atendeu" },
  { valor: "indisponivel", label: "Indisponível" },
];

const COR_RESULTADO: Record<ResultadoAtendimento, string> = {
  prospeccao: "bg-[#E8F0F7] text-[#3F6E96]",
  compra: "bg-perola-verde text-white",
  negociacao: "bg-perola-tag-pos-bg text-perola-tag-pos-texto",
  interessado: "bg-[#FBF1E4] text-perola-alerta",
  sem_interesse: "bg-perola-tag text-perola-texto-2",
  nao_atendeu: "bg-perola-tag text-perola-texto-2",
  indisponivel: "bg-perola-erro-bg text-perola-erro",
};

interface ResumoCliente {
  clienteId: string;
  nome: string;
  cidade: string | null;
  telefone: string | null;
  contatos: number;
  atendeu: number;
  orcamentos: number;
  compras: number;
  valorComprado: number;
  ultimo: LinhaExplorar;
  vendedoras: string[];
  linhas: LinhaExplorar[];
}

type ColunaCliente = "nome" | "contatos" | "atendeu" | "orcamentos" | "compras" | "valorComprado" | "ultimo";

function dataBR(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function Selo({ resultado }: { resultado: ResultadoAtendimento }) {
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${COR_RESULTADO[resultado]}`}>
      {labelResultado(resultado)}
    </span>
  );
}

function baixarCSV(nomeArquivo: string, cabecalho: string[], linhas: (string | number)[][]) {
  const escapar = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  // ";" e BOM: o Excel em português abre direto, com acentos certos.
  const conteudo = "﻿" + [cabecalho, ...linhas].map((l) => l.map(escapar).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

const numeroCSV = (v: number) => v.toFixed(2).replace(".", ",");

export default function ExplorarTabela({
  linhas,
  resultadoInicial,
  visaoInicial,
  rotuloPeriodo,
}: {
  linhas: LinhaExplorar[];
  resultadoInicial: string;
  visaoInicial: string;
  rotuloPeriodo: string;
}) {
  const [visao, setVisao] = useState<Visao>(visaoInicial === "atendimentos" ? "atendimentos" : "clientes");
  const [resultado, setResultado] = useState<"" | ResultadoAtendimento>(
    FILTROS_RESULTADO.some((f) => f.valor === resultadoInicial) ? (resultadoInicial as ResultadoAtendimento) : ""
  );
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<{ coluna: ColunaCliente; desc: boolean }>({ coluna: "contatos", desc: true });
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  // Guarda visão e resultado na URL (sem recarregar), para dar para mandar o link.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (resultado) url.searchParams.set("resultado", resultado);
    else url.searchParams.delete("resultado");
    if (visao === "atendimentos") url.searchParams.set("visao", visao);
    else url.searchParams.delete("visao");
    window.history.replaceState(null, "", url.toString());
  }, [resultado, visao]);

  const termo = busca.trim().toLowerCase();
  const casaBusca = (l: LinhaExplorar) =>
    !termo || l.clienteNome.toLowerCase().includes(termo) || (l.cidade ?? "").toLowerCase().includes(termo);

  const clientes = useMemo(() => {
    const mapa = new Map<string, ResumoCliente>();
    for (const l of linhas) {
      const c = mapa.get(l.clienteId) ?? {
        clienteId: l.clienteId,
        nome: l.clienteNome,
        cidade: l.cidade,
        telefone: l.telefone,
        contatos: 0,
        atendeu: 0,
        orcamentos: 0,
        compras: 0,
        valorComprado: 0,
        ultimo: l,
        vendedoras: [],
        linhas: [],
      };
      c.contatos += 1;
      if (l.resultado !== "nao_atendeu") c.atendeu += 1;
      if (l.resultado === "negociacao") c.orcamentos += 1;
      if (l.resultado === "compra") {
        c.compras += 1;
        c.valorComprado += l.valor;
      }
      if (l.data > c.ultimo.data || (l.data === c.ultimo.data && l.criado_em > c.ultimo.criado_em)) c.ultimo = l;
      if (!c.vendedoras.includes(l.vendedorNome)) c.vendedoras.push(l.vendedorNome);
      c.linhas.push(l);
      mapa.set(l.clienteId, c);
    }
    return Array.from(mapa.values());
  }, [linhas]);

  // Na visão por cliente, o filtro de resultado escolhe QUAIS clientes aparecem
  // ("quem comprou no período"), mas as contagens mostram todos os contatos deles.
  const clientesFiltrados = useMemo(() => {
    const lista = clientes.filter(
      (c) => casaBusca(c.ultimo) && (!resultado || c.linhas.some((l) => l.resultado === resultado))
    );
    const dir = ordem.desc ? -1 : 1;
    return lista.sort((a, b) => {
      if (ordem.coluna === "nome") return dir * a.nome.localeCompare(b.nome);
      if (ordem.coluna === "ultimo") return dir * (a.ultimo.data.localeCompare(b.ultimo.data) || a.ultimo.criado_em.localeCompare(b.ultimo.criado_em));
      return dir * (a[ordem.coluna] - b[ordem.coluna]) || a.nome.localeCompare(b.nome);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientes, resultado, termo, ordem]);

  const atendimentosFiltrados = useMemo(
    () =>
      linhas
        .filter((l) => casaBusca(l) && (!resultado || l.resultado === resultado))
        .sort((a, b) => b.data.localeCompare(a.data) || b.criado_em.localeCompare(a.criado_em)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [linhas, resultado, termo]
  );

  const base = visao === "clientes" ? clientesFiltrados.flatMap((c) => c.linhas) : atendimentosFiltrados;
  const totalCompras = base.filter((l) => l.resultado === "compra");
  const resumo = [
    { label: "Clientes", valor: String(new Set(base.map((l) => l.clienteId)).size) },
    { label: "Contatos", valor: String(base.length) },
    { label: "Compras", valor: String(totalCompras.length) },
    { label: "Vendido", valor: formatBRL(totalCompras.reduce((s, l) => s + l.valor, 0)) },
  ];

  function ordenarPor(coluna: ColunaCliente) {
    setOrdem((o) => ({ coluna, desc: o.coluna === coluna ? !o.desc : coluna !== "nome" }));
  }

  function alternar(id: string) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function exportar() {
    if (visao === "clientes") {
      baixarCSV(
        "clientes.csv",
        ["Cliente", "Cidade", "Telefone", "Contatos", "Atendeu", "Orçamentos", "Compras", "Valor comprado", "Último contato", "Último resultado", "Vendedoras"],
        clientesFiltrados.map((c) => [
          c.nome, c.cidade ?? "", c.telefone ?? "", c.contatos, c.atendeu, c.orcamentos, c.compras,
          numeroCSV(c.valorComprado), dataBR(c.ultimo.data), labelResultado(c.ultimo.resultado), c.vendedoras.join(", "),
        ])
      );
    } else {
      baixarCSV(
        "atendimentos.csv",
        ["Data", "Cliente", "Cidade", "Vendedora", "Resultado", "Valor", "Valor do orçamento", "Motivo", "Observações"],
        atendimentosFiltrados.map((l) => [
          dataBR(l.data), l.clienteNome, l.cidade ?? "", l.vendedorNome, labelResultado(l.resultado),
          numeroCSV(l.valor), numeroCSV(l.valorOrcamento), l.motivo ?? "", l.observacoes ?? "",
        ])
      );
    }
  }

  const Cabecalho = ({ coluna, children, direita }: { coluna: ColunaCliente; children: React.ReactNode; direita?: boolean }) => (
    <th className={`px-3 py-2 font-medium ${direita ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => ordenarPor(coluna)}
        className={`inline-flex items-center gap-1 hover:text-perola-texto ${ordem.coluna === coluna ? "text-perola-texto" : ""}`}
      >
        {children}
        {ordem.coluna === coluna && (ordem.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
      </button>
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Filtros rápidos */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTROS_RESULTADO.map((f) => (
            <button
              key={f.valor}
              type="button"
              onClick={() => setResultado(f.valor)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors active:scale-[0.97] ${
                resultado === f.valor ? "bg-perola-verde text-white" : "bg-white text-perola-texto-2 ring-1 ring-perola-borda hover:text-perola-texto"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-perola-texto-2" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente ou cidade"
              className="w-56 rounded-[10px] border border-[#DAD8CD] bg-white py-1.5 pl-9 pr-3 text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
            />
          </div>
          <div className="flex rounded-lg border border-perola-borda bg-white p-1">
            {(["clientes", "atendimentos"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisao(v)}
                className={`rounded-md px-3 py-1 text-sm font-medium ${visao === v ? "bg-perola-verde text-white" : "text-perola-texto-2"}`}
              >
                {v === "clientes" ? "Por cliente" : "Atendimentos"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={exportar}
            className="flex items-center gap-1.5 rounded-lg border border-perola-borda bg-white px-3 py-1.5 text-sm font-medium text-perola-texto-2 hover:text-perola-texto active:scale-[0.97]"
            title="Baixar o que está na tela em planilha"
          >
            <Download className="h-4 w-4" /> Planilha
          </button>
        </div>
      </div>

      {/* Totais do que está filtrado */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {resumo.map((r) => (
          <div key={r.label} className="rounded-[14px] border border-perola-borda bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-perola-texto-2">{r.label}</p>
            <p className="text-xl font-semibold tabular-nums text-perola-texto">{r.valor}</p>
          </div>
        ))}
      </div>
      <p className="-mt-2 text-xs text-perola-texto-2">{rotuloPeriodo}</p>

      {visao === "clientes" ? (
        <div className="overflow-x-auto rounded-[14px] border border-perola-borda bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-perola-divisor bg-[#FAFAF6] text-perola-texto-2">
              <tr>
                <Cabecalho coluna="nome">Cliente</Cabecalho>
                <Cabecalho coluna="contatos" direita>Contatos</Cabecalho>
                <Cabecalho coluna="atendeu" direita>Atendeu</Cabecalho>
                <Cabecalho coluna="orcamentos" direita>Orçamentos</Cabecalho>
                <Cabecalho coluna="compras" direita>Compras</Cabecalho>
                <Cabecalho coluna="valorComprado" direita>Valor comprado</Cabecalho>
                <Cabecalho coluna="ultimo">Último contato</Cabecalho>
                <th className="px-3 py-2 font-medium">Vendedora</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-perola-texto-2">Nenhum cliente com esses filtros.</td>
                </tr>
              ) : (
                clientesFiltrados.map((c) => {
                  const aberto = abertos.has(c.clienteId);
                  return (
                    <Fragment key={c.clienteId}>
                      <tr
                        onClick={() => alternar(c.clienteId)}
                        className="cursor-pointer border-b border-perola-divisor last:border-0 hover:bg-[#FAFAF6]"
                      >
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-1.5 font-medium text-perola-texto">
                            {aberto ? <ChevronDown className="h-4 w-4 shrink-0 text-perola-texto-2" /> : <ChevronRight className="h-4 w-4 shrink-0 text-perola-texto-2" />}
                            {c.nome}
                          </span>
                          {(c.cidade || c.telefone) && (
                            <span className="block pl-[22px] text-xs text-perola-texto-2">
                              {[c.cidade, c.telefone].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-perola-texto">{c.contatos}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-perola-texto-2">{c.atendeu}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-perola-texto-2">{c.orcamentos || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-perola-texto-2">{c.compras || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-perola-texto-2">{c.valorComprado > 0 ? formatBRL(c.valorComprado) : "—"}</td>
                        <td className="px-3 py-2 text-perola-texto-2">
                          <span className="flex items-center gap-2 whitespace-nowrap">
                            {dataBR(c.ultimo.data)} <Selo resultado={c.ultimo.resultado} />
                          </span>
                        </td>
                        <td className="px-3 py-2 text-perola-texto-2">{c.vendedoras.join(", ")}</td>
                      </tr>
                      {aberto && (
                        <tr className="border-b border-perola-divisor bg-[#FAFAF6]">
                          <td colSpan={8} className="px-3 py-3">
                            <ul className="space-y-1.5 pl-[22px]">
                              {[...c.linhas]
                                .sort((a, b) => b.data.localeCompare(a.data) || b.criado_em.localeCompare(a.criado_em))
                                .map((l) => (
                                  <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                    <span className="w-20 tabular-nums text-perola-texto-2">{dataBR(l.data)}</span>
                                    <Selo resultado={l.resultado} />
                                    {l.valor > 0 && <span className="font-medium tabular-nums text-perola-texto">{formatBRL(l.valor)}</span>}
                                    {l.valorOrcamento > 0 && <span className="tabular-nums text-perola-texto-2">orçamento {formatBRL(l.valorOrcamento)}</span>}
                                    <span className="text-xs text-perola-texto-2">{l.vendedorNome}</span>
                                    {(l.motivo || l.observacoes) && (
                                      <span className="basis-full pl-[92px] text-xs italic text-perola-texto-2">
                                        {[l.motivo, l.observacoes].filter(Boolean).join(" · ")}
                                      </span>
                                    )}
                                  </li>
                                ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-perola-borda bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-perola-divisor bg-[#FAFAF6] text-perola-texto-2">
              <tr>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Vendedora</th>
                <th className="px-3 py-2 font-medium">Resultado</th>
                <th className="px-3 py-2 text-right font-medium">Valor</th>
                <th className="px-3 py-2 font-medium">Motivo / observação</th>
              </tr>
            </thead>
            <tbody>
              {atendimentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-perola-texto-2">Nenhum atendimento com esses filtros.</td>
                </tr>
              ) : (
                atendimentosFiltrados.map((l) => (
                  <tr key={l.id} className="border-b border-perola-divisor last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-perola-texto-2">{dataBR(l.data)}</td>
                    <td className="px-3 py-2 font-medium text-perola-texto">{l.clienteNome}</td>
                    <td className="px-3 py-2 text-perola-texto-2">{l.vendedorNome}</td>
                    <td className="px-3 py-2"><Selo resultado={l.resultado} /></td>
                    <td className="px-3 py-2 text-right tabular-nums text-perola-texto-2">
                      {l.valor > 0 ? formatBRL(l.valor) : l.valorOrcamento > 0 ? `orç. ${formatBRL(l.valorOrcamento)}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-perola-texto-2">{[l.motivo, l.observacoes].filter(Boolean).join(" · ") || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
