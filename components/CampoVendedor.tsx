import type { Perfil } from "@/types/database";

// Quem fez a venda/atendimento. Qualquer pessoa da equipe pode escolher outra
// vendedora (ex.: a Vanessa lançando uma venda que foi do Quércia).
export default function CampoVendedor({
  vendedores,
  defaultValue,
}: {
  vendedores: Pick<Perfil, "id" | "nome">[];
  defaultValue: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[13px] font-semibold text-perola-texto">Vendedor(a)</label>
      <select
        name="vendedor_id"
        required
        defaultValue={vendedores.some((v) => v.id === defaultValue) ? defaultValue : ""}
        className="w-full rounded-[10px] border border-[#DAD8CD] px-3.5 py-[11px] text-sm text-perola-texto focus:border-perola-verde focus:outline-none"
      >
        <option value="" disabled>
          -- Selecione --
        </option>
        {vendedores.map((v) => (
          <option key={v.id} value={v.id}>
            {v.nome}
          </option>
        ))}
      </select>
    </div>
  );
}
