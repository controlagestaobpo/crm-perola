"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { salvarMeta } from "@/lib/actions";
import { ESTADO_INICIAL } from "@/lib/form-state";
import SubmitButton from "@/components/SubmitButton";
import FormMessage from "@/components/FormMessage";
import type { Meta, Perfil } from "@/types/database";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const CAMPO =
  "w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none";
const ROTULO = "mb-1 block text-[13px] font-semibold text-perola-texto";

const QTD_FAIXAS = 3;

export default function MetaForm({
  vendedores,
  ano,
  mes,
  metas,
}: {
  vendedores: Perfil[];
  ano: number;
  mes: number;
  // Metas já salvas do mês mostrado: preenchem o formulário ao escolher a vendedora.
  metas: Meta[];
}) {
  const [state, formAction] = useFormState(salvarMeta, ESTADO_INICIAL);
  const [vendedorId, setVendedorId] = useState(vendedores[0]?.id ?? "");
  const atual = metas.find((m) => m.vendedor_id === vendedorId);
  const faixas = atual?.bonus_vendas_faixas ?? [];
  const valor = (v: number | null | undefined, padrao: number | string = "") => (v === null || v === undefined ? padrao : v);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={ROTULO}>Vendedor(a)</label>
          <select name="vendedor_id" required value={vendedorId} onChange={(e) => setVendedorId(e.target.value)} className={CAMPO}>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>{v.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={ROTULO}>Ano</label>
          <input type="number" name="ano" defaultValue={ano} required className={CAMPO} />
        </div>
        <div>
          <label className={ROTULO}>Mês</label>
          <select name="mes" defaultValue={mes} required className={CAMPO}>
            {MESES.map((nome, index) => (
              <option key={nome} value={index + 1}>{nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* key: ao trocar de vendedora, os campos recarregam com a meta salva dela */}
      <div key={vendedorId} className="space-y-6">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-perola-texto">
            Meta {atual ? <span className="font-normal text-perola-texto-2">(já salva — altere o que precisar)</span> : null}
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <label className={ROTULO}>Meta de vendas (R$)</label>
              <input type="number" name="meta_valor" step="100" min="0" required defaultValue={valor(atual?.meta_valor)} className={CAMPO} />
            </div>
            <div>
              <label className={ROTULO}>Meta de contatos</label>
              <input type="number" name="meta_prospeccoes" step="10" min="0" defaultValue={valor(atual?.meta_prospeccoes, 150)} className={CAMPO} />
            </div>
            <div>
              <label className={ROTULO}>Meta de conversão (%)</label>
              <input type="number" name="meta_conversao" step="0.1" min="0" defaultValue={valor(atual?.meta_conversao, 22)} className={CAMPO} />
            </div>
            <div>
              <label className={ROTULO}>Meta de sacos</label>
              <input type="number" name="meta_sacos" step="10" min="0" defaultValue={valor(atual?.meta_sacos, 0)} className={CAMPO} />
            </div>
            <div>
              <label className={ROTULO}>Comissão (%)</label>
              <input type="number" name="comissao_percentual" step="0.1" min="0" defaultValue={valor(atual?.comissao_percentual, 1)} className={CAMPO} />
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-[12px] border border-perola-borda p-4">
          <legend className="px-1 text-sm font-semibold text-perola-texto">Bônus do mês (opcional)</legend>
          <p className="mb-4 text-xs text-perola-texto-2">
            Vendas: % da meta de vendas → valor do bônus. Ela recebe só o degrau mais alto atingido. Deixe em branco o
            que não tiver.
          </p>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr_1fr]">
            <div>
              <p className="mb-2 text-[13px] font-semibold text-perola-texto">Degraus de vendas</p>
              <div className="space-y-2">
                {Array.from({ length: QTD_FAIXAS }, (_, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      name={`faixa_percentual_${i}`}
                      min="0"
                      step="1"
                      placeholder="% da meta (ex.: 80)"
                      defaultValue={valor(faixas[i]?.percentual)}
                      className={CAMPO}
                    />
                    <input
                      type="number"
                      name={`faixa_valor_${i}`}
                      min="0"
                      step="10"
                      placeholder="Bônus R$ (ex.: 100)"
                      defaultValue={valor(faixas[i]?.valor)}
                      className={CAMPO}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[13px] font-semibold text-perola-texto">Atendimentos</p>
              <input type="number" name="bonus_atendimentos_meta" min="0" placeholder="A partir de (ex.: 220)" defaultValue={valor(atual?.bonus_atendimentos_meta || null)} className={CAMPO} />
              <input type="number" name="bonus_atendimentos_valor" min="0" step="10" placeholder="Bônus R$ (ex.: 150)" defaultValue={valor(atual?.bonus_atendimentos_valor || null)} className={CAMPO} />
            </div>

            <div className="space-y-2">
              <p className="text-[13px] font-semibold text-perola-texto">Clientes diferentes</p>
              <input type="number" name="bonus_clientes_meta" min="0" placeholder="A partir de (ex.: 100)" defaultValue={valor(atual?.bonus_clientes_meta || null)} className={CAMPO} />
              <input type="number" name="bonus_clientes_valor" min="0" step="10" placeholder="Bônus R$ (ex.: 150)" defaultValue={valor(atual?.bonus_clientes_valor || null)} className={CAMPO} />
            </div>
          </div>

          <div className="mt-4 max-w-sm">
            <label className={ROTULO}>Vendas faturadas no mês (R$)</label>
            <input type="number" name="vendas_faturadas" min="0" step="0.01" placeholder="Em branco = usa as vendas do CRM" defaultValue={valor(atual?.vendas_faturadas)} className={CAMPO} />
            <p className="mt-1 text-xs text-perola-texto-2">
              Preencha no fechamento, já com devoluções e cancelamentos descontados. Quando preenchido, o bônus de vendas usa este valor.
            </p>
          </div>
        </fieldset>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>Salvar meta</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
