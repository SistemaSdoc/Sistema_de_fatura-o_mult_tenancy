"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
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

type EvolucaoItem = {
  mes: string;
  total: number;
};

type DocumentoTipoItem = {
  nome: string;
  quantidade: number;
  valor: number;
};

type EstadoDocumentoItem = {
  estado: string;
  quantidade: number;
};

type ChartValue = number | string | null | undefined;
// use any for formatter input to match Recharts flexible Formatter signature
type ChartFormatter = (value: any) => [string, string];

interface DashboardChartsProps {
  colors: ThemeColors;
  produtosData: ProdutoItem[];
  evolucaoData: EvolucaoItem[];
  documentosPorTipo: DocumentoTipoItem[];
  documentosPorEstado: EstadoDocumentoItem[];
  tooltipStyle: TooltipProps<number, string>["contentStyle"];
  gridStroke: string;
  tickStyle: { fill: string; fontSize: number };
  pieColors: string[];
  formatNumber: (value: number) => string;
  formatCompact: (value: number) => string;
  formatterQuantidade: ChartFormatter;
  formatterValor: ChartFormatter;
  formatterDocsQuantidade: ChartFormatter;
  formatterTotal: ChartFormatter;
}

export function DashboardCharts({
  colors,
  produtosData,
  evolucaoData,
  documentosPorTipo,
  documentosPorEstado,
  tooltipStyle,
  gridStroke,
  tickStyle,
  pieColors,
  formatNumber,
  formatCompact,
  formatterQuantidade,
  formatterValor,
  formatterDocsQuantidade,
  formatterTotal,
}: DashboardChartsProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          className="p-3 sm:p-4 shadow border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <h2 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
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
                    formatter={(value: any, name: string | number | undefined) => {
                      if (name === "quantidade") return formatterQuantidade(value);
                      return formatterValor(value);
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

        <div
          className="p-3 sm:p-4 shadow border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <h2 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
            <TrendingUp style={{ color: colors.secondary }} size={18} />
            Evolução Mensal
          </h2>
          <div className="h-56 sm:h-72 lg:h-80 w-full">
            {evolucaoData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucaoData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="mes" tick={tickStyle} stroke={colors.border} />
                  <YAxis tickFormatter={formatCompact} width={48} tick={tickStyle} stroke={colors.border} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => formatterTotal(value)} />
                  <Area type="monotone" dataKey="total" stroke={colors.secondary} fill="url(#colorTotal)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm" style={{ color: colors.textSecondary }}>
                Sem dados de evolução mensal
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          className="p-3 sm:p-4 shadow border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <h2 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
            <Receipt style={{ color: colors.secondary }} size={18} />
            Docs por Tipo
          </h2>
          <div className="h-52 sm:h-64 w-full">
            {documentosPorTipo.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={documentosPorTipo} margin={{ top: 4, right: 8, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis
                    dataKey="nome"
                    tick={{ ...tickStyle, fontSize: 10 }}
                    stroke={colors.border}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    height={70}
                  />
                  <YAxis yAxisId="left" orientation="left" stroke={colors.primary} tick={tickStyle} width={36} />
                  <YAxis yAxisId="right" orientation="right" stroke={colors.secondary} tick={tickStyle} width={36} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: any, name: string | number | undefined) => {
                      if (name === "quantidade" || name === "Qtd") {
                        return formatterDocsQuantidade(value);
                      }
                      if (name === "valor" || name === "Valor") {
                        return formatterValor(value);
                      }
                      return [String(value ?? 0), name || ""];
                    }}
                  />
                  <Bar yAxisId="left" dataKey="quantidade" fill={colors.primary} name="Qtd" radius={[3, 3, 0, 0]} barSize={12} />
                  <Bar yAxisId="right" dataKey="valor" fill={colors.secondary} name="Valor" radius={[3, 3, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm" style={{ color: colors.textSecondary }}>
                Sem dados de documentos por tipo
              </div>
            )}
          </div>
        </div>

        <div
          className="p-3 sm:p-4 shadow border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <h2 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
            <FileText style={{ color: colors.secondary }} size={18} />
            Docs por Estado
          </h2>
          <div className="h-44 sm:h-52 w-full">
            {documentosPorEstado.length > 0 ? (
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
                    nameKey="estado"
                    label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {documentosPorEstado.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => formatterDocsQuantidade(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm" style={{ color: colors.textSecondary }}>
                Sem dados de documentos por estado
              </div>
            )}
          </div>
          {documentosPorEstado.length > 0 && (
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2 pt-3 border-t" style={{ borderColor: colors.border }}>
              {documentosPorEstado.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
                  <span className="text-xs" style={{ color: colors.textSecondary }}>
                    {item.estado}: {formatNumber(item.quantidade)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
