import BarChartCard from "@/components/charts/BarChartCard";

interface ProdutoChartComTabelaProps {
  title: string;
  dados: { produto: string; quantidade: number }[];
  cor?: string;
}

export default function ProdutoChartComTabela({ title, dados, cor }: ProdutoChartComTabelaProps) {
  const top10 = dados.slice(0, 10);

  return (
    <div className="space-y-2">
      <BarChartCard title={`${title} (top 10)`} data={top10} cor={cor} />
      {dados.length > 10 && (
        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-violet-700">
            Ver todos os {dados.length} produtos
          </summary>
          <div className="max-h-64 overflow-y-auto border-t border-slate-100 px-5 py-3">
            <table className="w-full text-left text-sm">
              <tbody>
                {dados.map((item) => (
                  <tr key={item.produto} className="border-b border-slate-50 last:border-0">
                    <td className="py-1.5 text-slate-700">{item.produto}</td>
                    <td className="py-1.5 text-right text-slate-500">{item.quantidade}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
