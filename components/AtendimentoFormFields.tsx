"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Produto, ResultadoAtendimento } from "@/types/database";

const MOTIVOS = [
  "Preço acima do esperado",
  "Falta de necessidade no momento",
  "Cliente já tem estoque",
  "Comprou de concorrente",
  "Condições comerciais não aceitáveis",
  "Falta de orçamento",
  "Produto indisponível",
  "Cliente pediu retorno depois",
  "Prazo de entrega não atende",
  "Outro motivo",
];

function ProdutoCheckbox({
  produto,
  name,
  defaultChecked,
}: {
  produto: Produto;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="checkbox"
        name={name}
        value={produto.nome}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="block rounded-lg border-2 border-slate-200 px-3 py-2 text-center text-xs font-medium text-slate-700 transition-colors peer-checked:border-violet-600 peer-checked:bg-violet-600 peer-checked:text-white">
        {produto.nome}
      </span>
    </label>
  );
}

function GradeProdutos({
  produtos,
  name,
  selecionados,
}: {
  produtos: Produto[];
  name: string;
  selecionados?: string[];
}) {
  const [busca, setBusca] = useState("");

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return produtos;
    return produtos.filter((p) => p.nome.toLowerCase().includes(termo));
  }, [produtos, busca]);

  const categorias = Array.from(new Set(produtosFiltrados.map((p) => p.categoria)));

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar produto..."
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
        />
      </div>

      {categorias.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum produto encontrado.</p>
      ) : (
        categorias.map((categoria) => (
          <div key={categoria}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {categoria}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {produtosFiltrados
                .filter((p) => p.categoria === categoria)
                .map((produto) => (
                  <ProdutoCheckbox
                    key={produto.id}
                    produto={produto}
                    name={name}
                    defaultChecked={selecionados?.includes(produto.nome)}
                  />
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

interface AtendimentoFormFieldsProps {
  produtos: Produto[];
  valoresIniciais?: {
    resultado?: ResultadoAtendimento;
    motivo?: string | null;
    proximoContato?: string | null;
    observacoes?: string | null;
    produtosOferecidos?: string[];
    produtosVendidos?: string[];
  };
}

export default function AtendimentoFormFields({ produtos, valoresIniciais }: AtendimentoFormFieldsProps) {
  const [resultado, setResultado] = useState(valoresIniciais?.resultado ?? "");

  const mostrarValorCompra = resultado === "compra";
  const mostrarValorNegociacao = resultado === "negociacao";
  const mostrarMotivo = ["sem_interesse", "nao_atendeu", "indisponivel"].includes(resultado);
  const mostrarVendidos = resultado === "compra";

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Resultado do contato
          </label>
          <select
            name="resultado"
            required
            value={resultado}
            onChange={(e) => setResultado(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">-- Selecione --</option>
            <option value="compra">✓ Compra realizada</option>
            <option value="negociacao">⭐ Negociação em andamento</option>
            <option value="interessado">⊕ Interessado - retornar</option>
            <option value="sem_interesse">⏳ Sem interesse por agora</option>
            <option value="nao_atendeu">☎️ Não atendeu</option>
            <option value="indisponivel">❌ Indisponível</option>
          </select>
        </div>

        {mostrarValorCompra && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              💰 Valor da compra (R$)
            </label>
            <input
              type="number"
              name="valor"
              step="0.01"
              min="0"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        {mostrarValorNegociacao && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              📊 Valor em negociação (R$)
            </label>
            <input
              type="number"
              name="valor_negociacao"
              step="0.01"
              min="0"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        {mostrarMotivo && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Motivo da não compra
            </label>
            <select
              name="motivo"
              defaultValue={valoresIniciais?.motivo ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">-- Selecione --</option>
              {MOTIVOS.map((motivo) => (
                <option key={motivo}>{motivo}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Próximo contato (data preferencial)
          </label>
          <input
            type="date"
            name="proximo_contato"
            defaultValue={valoresIniciais?.proximoContato ?? ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">Produtos oferecidos</label>
        <GradeProdutos
          produtos={produtos}
          name="produtos_oferecidos"
          selecionados={valoresIniciais?.produtosOferecidos}
        />
      </div>

      {mostrarVendidos && (
        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">Produtos vendidos</label>
          <GradeProdutos
            produtos={produtos}
            name="produtos_vendidos"
            selecionados={valoresIniciais?.produtosVendidos}
          />
        </div>
      )}

      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium text-slate-700">Observações</label>
        <textarea
          name="observacoes"
          rows={3}
          defaultValue={valoresIniciais?.observacoes ?? ""}
          placeholder="Notas sobre a ligação, feedback do cliente, contexto para próximo contato..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
    </>
  );
}
