"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  TooltipProps,
} from "recharts";
import { FileText, Package, Receipt, TrendingUp } from "lucide-react";
import type { ThemeColors } from "@/context/ThemeContext";

type ProdutoItem = {
  nome: string;
  quantidade: number;
  valor: number;
};

type ChartValue = number | string | readonly (string | number)[] | null | undefined;
type ScalarChartValue = number | string | null | undefined;
type ChartFormatter = (value: ScalarChartValue) => [string, string];
type GrupoGrafico = { grupo: string; quantidade: number; valor: number; cor: string };

const scalarChartValue = (value: ChartValue): ScalarChartValue => {
  if (typeof value === "number" || typeof value === "string" || value == null) return value;
  return value[0] ?? 0;
};

interface DashboardChartsProps {
  colors: ThemeColors;
  produtosData: ProdutoItem[];
  documentosPorFuncao: GrupoGrafico[];
  impactoFinanceiro: GrupoGrafico[];
  documentosPorEstado: GrupoGrafico[];
  tooltipStyle: TooltipProps<number, string>["contentStyle"];
  gridStroke: string;
  tickStyle: { fill: string; fontSize: number };
  formatCompact: (value: number) => string;
  formatterQuantidade: ChartFormatter;
  formatterValor: ChartFormatter;
  formatterTotal: ChartFormatter;
}

export function DashboardCharts({
  colors,
  produtosData,
  documentosPorFuncao,
  impactoFinanceiro,
  documentosPorEstado,
  tooltipStyle,
  gridStroke,
  tickStyle,
  formatCompact,
  formatterQuantidade,
  formatterValor,
  formatterTotal,
}: DashboardChartsProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4">
        <div
          className="p-3 sm:p-4 shadow border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <h2 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2" style={{ color: colors.blue }}>
            <Package style={{ color: colors.secondary }} size={18} />
            Top Produtos
          </h2>
          <div className="h-56 sm:h-72 lg:h-80 w-full">
            {produtosData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={produtosData} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridStroke} />
                  <XAxis type="number" tick={tickStyle} stroke={colors.border} tickFormatter={formatCompact} />
                  <YAxis type="category" dataKey="nome" width={84} tick={tickStyle} stroke={colors.border} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: ChartValue, name: string | number | undefined) => {
                      if (name === "quantidade") return formatterQuantidade(scalarChartValue(value));
                      return formatterValor(scalarChartValue(value));
                    }}
                  />
                  <Bar dataKey="quantidade" radius={[0, 4, 4, 0]} barSize={16}>
                    {produtosData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={index === 0 ? colors.secondary : `${colors.secondary}${Math.max(50, 95 - index * 15)}`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm" style={{ color: colors.textSecondary }}>
                Sem dados de produtos vendidos
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 gap-4">
        <div
          className="p-3 sm:p-4 shadow border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <h2 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2" style={{ color: colors.blue }}>
            <Receipt style={{ color: colors.secondary }} size={18} />
            Volume de Documentos Emitidos no Mês
          </h2>
          <div className="h-52 sm:h-64 w-full">
            {documentosPorFuncao.some((item) => item.quantidade > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={documentosPorFuncao}
                    dataKey="quantidade"
                    nameKey="grupo"
                    cx="50%"
                    cy="50%"
                    innerRadius="38%"
                    outerRadius="70%"
                    paddingAngle={3}
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {documentosPorFuncao.map((item) => <Cell key={item.grupo} fill={item.cor} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: ChartValue) => [`${Number(scalarChartValue(value) ?? 0)} documentos`, "Quantidade"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm" style={{ color: colors.textSecondary }}>
                Sem documentos emitidos neste mês
              </div>
            )}
          </div>
        </div>

        <div
          className="p-3 sm:p-4 shadow border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <h2 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2" style={{ color: colors.blue }}>
            <TrendingUp style={{ color: colors.secondary }} size={18} />
            Balanço Financeiro (Kz)
          </h2>
          <div className="h-56 sm:h-64 w-full">
            {impactoFinanceiro.some((item) => item.valor > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={impactoFinanceiro} margin={{ top: 8, right: 16, left: 8, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="grupo" tick={{ ...tickStyle, fontSize: 10 }} stroke={colors.border} interval={0} />
                  <YAxis tickFormatter={formatCompact} tick={tickStyle} stroke={colors.border} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: ChartValue) => formatterTotal(scalarChartValue(value))}
                  />
                  <Bar dataKey="valor" name="Valor" radius={[4, 4, 0, 0]}>
                    {impactoFinanceiro.map((item) => <Cell key={item.grupo} fill={item.cor} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm" style={{ color: colors.textSecondary }}>
                Sem movimentos financeiros neste mês
              </div>
            )}
          </div>
        </div>

        <div className="p-3 sm:p-4 shadow border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <h2 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2" style={{ color: colors.blue }}>
            <FileText style={{ color: colors.secondary }} size={18} />
            Estado dos Documentos
          </h2>
          <div className="h-44 sm:h-52 w-full">
            {documentosPorEstado.some((item) => item.quantidade > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={documentosPorEstado}
                    cx="50%"
                    cy="50%"
                    innerRadius="38%"
                    outerRadius="68%"
                    paddingAngle={4}
                    dataKey="quantidade"
                    nameKey="grupo"
                    label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {documentosPorEstado.map((item) => <Cell key={item.grupo} fill={item.cor} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: ChartValue) => [`${Number(scalarChartValue(value) ?? 0)} documentos`, "Quantidade"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm" style={{ color: colors.textSecondary }}>
                Sem documentos neste mês
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
