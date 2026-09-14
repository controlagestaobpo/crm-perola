"use client";

import { forwardRef, useMemo, useRef, useState } from "react";
import { Search, Copy } from "lucide-react";
import { corCategoria, corBadgeCategoria } from "@/lib/categoriaCores";
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
      <span
        className={`block rounded-lg border-2 border-stone-200 px-3 py-2 text-center text-xs font-medium text-stone-700 transition-colors peer-checked:text-white ${corCategoria(produto.categoria)}`}
      >
        {produto.nome}
      </span>
    </label>
  );
}

const GradeProdutos = forwardRef<
  HTMLDivElement,
  { produtos: Produto[]; name: string; selecionados?: string[] }
>(function GradeProdutos({ produtos, name, selecionados }, ref) {
  const [busca, setBusca] = useState("");

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return produtos;
    return produtos.filter((p) => p.nome.toLowerCase().includes(termo));
  }, [produtos, busca]);

  const categorias = Array.from(new Set(produtosFiltrados.map((p) => p.categoria)));

  return (
    <div ref={ref} className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -transtone-y-1/2 text-stone-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar produto..."
          className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-sm"
        />
      </div>

      {categorias.length === 0 ? (
        <p className="text-sm text-stone-400">Nenhum produto encontrado.</p>
      ) : (
        categorias.map((categoria) => (
          <div key={categoria}>
            <p className="mb-2">
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${corBadgeCategoria(categoria)}`}
              >
                {categoria}
              </span>
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
});

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
  const oferecidosRef = useRef<HTMLDivElement>(null);
  const vendidosRef = useRef<HTMLDivElement>(null);

  const mostrarValorCompra = resultado === "compra";
  const mostrarValorNegociacao = resultado === "negociacao";
  const mostrarMotivo = ["sem_interesse", "nao_atendeu", "indisponivel"].includes(resultado);
  const mostrarVendidos = resultado === "compra";

  function copiarOferecidosParaVendidos() {
    const oferecidosMarcados = new Set(
      Array.from(oferecidosRef.current?.querySelectorAll<HTMLInputElement>("input[type=checkbox]:checked") ?? []).map(
        (input) => input.value
      )
    );
    vendidosRef.current?.querySelectorAll<HTMLInputElement>("input[type=checkbox]").forEach((input) => {
      input.checked = oferecidosMarcados.has(input.value);
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">
            Resultado do contato
          </label>
          <select
            name="resultado"
            required
            value={resultado}
            onChange={(e) => setResultado(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
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
            <label className="mb-1 block text-sm font-medium text-stone-700">
              💰 Valor da compra (R$)
            </label>
            <input
              type="number"
              name="valor"
              step="0.01"
              min="0"
              required
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        {mostrarValorNegociacao && (
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              📊 Valor em negociação (R$)
            </label>
            <input
              type="number"
              name="valor_negociacao"
              step="0.01"
              min="0"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        {mostrarMotivo && (
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Motivo da não compra
            </label>
            <select
              name="motivo"
              defaultValue={valoresIniciais?.motivo ?? ""}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">-- Selecione --</option>
              {MOTIVOS.map((motivo) => (
                <option key={motivo}>{motivo}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">
            Próximo contato (data preferencial)
          </label>
          <input
            type="date"
            name="proximo_contato"
            defaultValue={valoresIniciais?.proximoContato ?? ""}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-sm font-medium text-stone-700">Produtos oferecidos</label>
        <GradeProdutos
          ref={oferecidosRef}
          produtos={produtos}
          name="produtos_oferecidos"
          selecionados={valoresIniciais?.produtosOferecidos}
        />
      </div>

      {mostrarVendidos && (
        <div className="mt-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/60 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <label className="block text-sm font-bold text-emerald-800">
              ✅ Produtos VENDIDOS — marque aqui o que o cliente realmente comprou
            </label>
            <button
              type="button"
              onClick={copiarOferecidosParaVendidos}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-sm hover:bg-emerald-100"
            >
              <Copy className="h-3.5 w-3.5" />
              Usar os mesmos produtos oferecidos
            </button>
          </div>
          <GradeProdutos
            ref={vendidosRef}
            produtos={produtos}
            name="produtos_vendidos"
            selecionados={valoresIniciais?.produtosVendidos}
          />
        </div>
      )}

      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium text-stone-700">Observações</label>
        <textarea
          name="observacoes"
          rows={3}
          defaultValue={valoresIniciais?.observacoes ?? ""}
          placeholder="Notas sobre a ligação, feedback do cliente, contexto para próximo contato..."
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
      </div>
    </>
  );
}
