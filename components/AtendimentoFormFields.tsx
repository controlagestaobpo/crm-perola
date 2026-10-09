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
    <label className="cursor-pointer select-none">
      <input
        type="checkbox"
        name={name}
        value={produto.nome}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span
        className={`block select-none rounded-[10px] border-2 border-perola-borda px-3 py-2 text-center text-xs font-medium text-perola-texto-2 peer-checked:text-white ${corCategoria(produto.categoria)}`}
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
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-perola-texto-2" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar produto..."
          className="w-full rounded-[10px] border border-[#DAD8CD] py-2 pl-9 pr-3 text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
        />
      </div>

      {categorias.length === 0 ? (
        <p className="text-sm text-perola-texto-2">Nenhum produto encontrado.</p>
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
    valor?: number | null;
    quantidadeSacos?: number | null;
    valorFrete?: number | null;
    valorNegociacao?: number | null;
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
          <label className="mb-1 block text-[13px] font-semibold text-perola-texto">
            Resultado do contato
          </label>
          <select
            name="resultado"
            required
            value={resultado}
            onChange={(e) => setResultado(e.target.value)}
            className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
          >
            <option value="">-- Selecione --</option>
            <option value="prospeccao">🎯 Prospecção</option>
            <option value="compra">✓ Compra realizada</option>
            <option value="negociacao">⭐ Orçamento em andamento</option>
            <option value="interessado">⊕ Interessado - retornar</option>
            <option value="sem_interesse">⏳ Sem interesse por agora</option>
            <option value="nao_atendeu">☎️ Não atendeu</option>
            <option value="indisponivel">❌ Indisponível</option>
          </select>
        </div>

        {mostrarValorCompra && (
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-perola-texto">
              💰 Valor da compra (R$)
            </label>
            <input
              type="number"
              name="valor"
              step="0.01"
              min="0"
              required
              defaultValue={valoresIniciais?.valor ?? ""}
              className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
            />
          </div>
        )}

        {mostrarValorCompra && (
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-perola-texto">
              🌾 Quantidade de sacos
            </label>
            <input
              type="number"
              name="quantidade_sacos"
              step="1"
              min="0"
              defaultValue={valoresIniciais?.quantidadeSacos ?? ""}
              className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
            />
          </div>
        )}

        {mostrarValorCompra && (
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-perola-texto">
              🚚 Valor do frete (R$)
            </label>
            <input
              type="number"
              name="valor_frete"
              step="0.01"
              min="0"
              defaultValue={valoresIniciais?.valorFrete ?? ""}
              className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
            />
          </div>
        )}

        {mostrarValorNegociacao && (
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-perola-texto">
              📊 Valor TOTAL do orçamento (R$)
            </label>
            <input
              type="number"
              name="valor_negociacao"
              defaultValue={valoresIniciais?.valorNegociacao ?? ""}
              step="0.01"
              min="0"
              placeholder="Ex.: 60 sacos × R$ 85 = 5100"
              className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
            />
            <p className="mt-1 text-xs text-perola-texto-2">
              Some a proposta inteira (quantidade × preço). Não coloque o preço de um saco só.
            </p>
          </div>
        )}

        {mostrarMotivo && (
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-perola-texto">
              Motivo da não compra
            </label>
            <select
              name="motivo"
              defaultValue={valoresIniciais?.motivo ?? ""}
              className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
            >
              <option value="">-- Selecione --</option>
              {MOTIVOS.map((motivo) => (
                <option key={motivo}>{motivo}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-[13px] font-semibold text-perola-texto">
            Próximo contato (data preferencial)
          </label>
          <input
            type="date"
            name="proximo_contato"
            defaultValue={valoresIniciais?.proximoContato ?? ""}
            className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
          />
          <p className="mt-1 text-xs text-perola-texto-2">
            {resultado === "compra"
              ? "Venda fechada: deixe em branco, ou marque quando ligar para oferecer de novo."
              : resultado === "nao_atendeu"
                ? "Quando tentar de novo (pode ser hoje mesmo)."
                : "Dia em que o cliente volta para a agenda. Precisa ser depois do dia do atendimento; em branco, não entra na agenda."}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-[13px] font-semibold text-perola-texto">Produtos oferecidos</label>
        <GradeProdutos
          ref={oferecidosRef}
          produtos={produtos}
          name="produtos_oferecidos"
          selecionados={valoresIniciais?.produtosOferecidos}
        />
      </div>

      {mostrarVendidos && (
        <div className="mt-4 rounded-[14px] border-2 border-perola-tag-pos-texto/30 bg-perola-tag-pos-bg p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <label className="block text-sm font-bold text-perola-tag-pos-texto">
              Produtos VENDIDOS — marque aqui o que o cliente realmente comprou
            </label>
            <button
              type="button"
              onClick={copiarOferecidosParaVendidos}
              className="flex items-center gap-1.5 rounded-lg border border-perola-borda bg-white px-3 py-1.5 text-xs font-medium text-perola-tag-pos-texto hover:bg-perola-tag-pos-bg"
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
        <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Observações</label>
        <textarea
          name="observacoes"
          rows={3}
          defaultValue={valoresIniciais?.observacoes ?? ""}
          placeholder="Notas sobre a ligação, feedback do cliente, contexto para próximo contato..."
          className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
        />
      </div>
    </>
  );
}
