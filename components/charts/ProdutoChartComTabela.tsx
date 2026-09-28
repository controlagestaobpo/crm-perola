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
      <BarChartCard title={`${title} (top 10)`} data={top10} cor={cor} altura="h-[28rem]" />
      {dados.length > 10 && (
        <details className="rounded-[14px] border border-perola-borda bg-white">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-perola-texto">
            Ver todos os {dados.length} produtos
          </summary>
          <div className="max-h-64 overflow-y-auto border-t border-perola-divisor px-5 py-3">
            <table className="w-full text-left text-sm">
              <tbody>
                {dados.map((item) => (
                  <tr key={item.produto} className="border-b border-perola-divisor last:border-0">
                    <td className="py-1.5 text-perola-texto">{item.produto}</td>
                    <td className="py-1.5 text-right text-perola-texto-2">{item.quantidade}x</td>
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
