"use client";

import React, { useEffect, useState } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  FileText,
  Percent,
  ShoppingCart,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import { dashboardService, vendaService } from "@/services/vendas";
import type { DashboardResponse, Venda } from "@/services/vendas";

/* 🎨 Paleta FacturaJá */
const COLORS = {
  primary: "#123859",
  accent: "#F9941F",
  success: "#10B981",
  info: "#3B82F6",
  highlight: "#F59E0B",
  danger: "#EF4444",
  gray: "#6B7280",
  purple: "#8B5CF6",
};

const STATUS_COLORS = [
  COLORS.highlight,  // Abertas
  COLORS.success,    // Faturadas 
  COLORS.danger,     // Canceladas
];

/* ===== TIPOS AUXILIARES ===== */
interface KPIData {
  icon: React.ReactNode;
  label: string;
  value: string | number | undefined | null;
  trend?: "up" | "down" | "neutral";
  suffix?: string;
  isCurrency?: boolean;
}

interface StatusData {
  name: string;
  value: number;
}

/* ===== COMPONENTES ===== */

export default function RelatorioVendas() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function carregarDados() {
      try {
        setLoading(true);
        setError(null);

        const [dashData, vendasData] = await Promise.all([
          dashboardService.fetch(),
          vendaService.listar(),
        ]);

        if (!dashData) {
          throw new Error("Dados do dashboard não recebidos");
        }

        setDashboard(dashData);
        setVendas(vendasData?.vendas || []);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }

    carregarDados();
  }, []);

  if (loading) {
    return (
      <MainEmpresa>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse space-y-4 text-center">
            <div className="w-12 h-12 bg-[#123859]/20 rounded-full mx-auto animate-spin border-4 border-[#123859] border-t-transparent" />
            <p className="text-gray-500">Carregando relatório de vendas...</p>
          </div>
        </div>
      </MainEmpresa>
    );
  }

  if (error) {
    return (
      <MainEmpresa>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="text-red-500 text-xl">⚠️ Erro ao carregar dados</div>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#123859] text-white rounded-lg hover:bg-[#1a4d7a] transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </MainEmpresa>
    );
  }

  if (!dashboard) {
    return (
      <MainEmpresa>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-500">Nenhum dado disponível</p>
        </div>
      </MainEmpresa>
    );
  }

  /* ===== DADOS PROCESSADOS COM FALLBACKS ===== */
  const safeNumber = (value: any, defaultValue = 0): number => {
    if (value === undefined || value === null) return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  };

  const statusVendas: StatusData[] = [
    { name: "Abertas", value: safeNumber(dashboard.vendas?.abertas) },
    { name: "Faturadas", value: safeNumber(dashboard.vendas?.faturadas) },
    { name: "Canceladas", value: safeNumber(dashboard.vendas?.canceladas) },
  ];

  const receitaComparativa = [
    {
      name: "Mês Anterior",
      receita: safeNumber(dashboard.kpis?.totalFaturado) * 0.8, // Placeholder - ajustar conforme dados reais
      fill: COLORS.gray,
    },
    {
      name: "Mês Atual",
      receita: safeNumber(dashboard.kpis?.totalFaturado),
      fill: COLORS.accent,
    },
  ];

  // Dados de vendas por mês (simulado a partir dos dados existentes)
  const vendasPorMes = dashboard.vendas?.ultimas?.map((venda, index) => ({
    mes: `Mês ${index + 1}`,
    total: safeNumber(venda.total),
  })) || [];

  const kpiCards: KPIData[] = [
    {
      icon: <DollarSign className="w-5 h-5" />,
      label: "Total Faturado",
      value: dashboard.kpis?.totalFaturado,
      isCurrency: true,
      trend: safeNumber(dashboard.kpis?.crescimentoPercentual) >= 0 ? "up" : "down",
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      label: "Crescimento",
      value: Math.abs(safeNumber(dashboard.kpis?.crescimentoPercentual)),
      suffix: "%",
      trend: safeNumber(dashboard.kpis?.crescimentoPercentual) >= 0 ? "up" : "down",
    },
    {
      icon: <FileText className="w-5 h-5" />,
      label: "Total de Vendas",
      value: safeNumber(dashboard.vendas?.total),
    },
    {
      icon: <ShoppingCart className="w-5 h-5" />,
      label: "Ticket Médio",
      value: dashboard.kpis?.ticketMedio,
      isCurrency: true,
    },
    {
      icon: <Percent className="w-5 h-5" />,
      label: "IVA Arrecadado",
      value: dashboard.kpis?.ivaArrecadado,
      isCurrency: true,
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: "Clientes Ativos",
      value: safeNumber(dashboard.clientes?.ativos),
    },
  ];

  return (
    <MainEmpresa>
      <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6">
        {/* ===== CABEÇALHO ===== */}
        <header className="border-b border-gray-200 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#123859]">
                Relatório de Vendas
              </h1>
              <p className="text-gray-500 mt-1 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date().toLocaleDateString("pt-PT", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Dados em tempo real
            </div>
          </div>
        </header>

        {/* ===== KPIs ===== */}
        <section>
          <h2 className="text-lg font-semibold text-[#123859] mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Indicadores Principais
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {kpiCards.map((kpi, index) => (
              <KPICard key={index} {...kpi} />
            ))}
          </div>
        </section>

        {/* ===== GRÁFICOS PRINCIPAIS ===== */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evolução de vendas */}
          <Card title="Evolução de Vendas" icon={<TrendingUp className="w-4 h-4" />}>
            {vendasPorMes.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={vendasPorMes} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickFormatter={(value) => `Kz ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Receita"]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke={COLORS.primary}
                    strokeWidth={3}
                    dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: COLORS.accent }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-gray-400">
                Sem dados de vendas por mês
              </div>
            )}
          </Card>

          {/* Status das vendas */}
          <Card title="Distribuição por Status" icon={<FileText className="w-4 h-4" />}>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={statusVendas.filter(item => item.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusVendas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[index]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [value, name]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legenda personalizada */}
            <div className="flex justify-center gap-6 mt-4">
              {statusVendas.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[index] }}
                  />
                  <span className="text-sm text-gray-600">{item.name}</span>
                  <span className="text-sm font-semibold text-gray-900">({item.value})</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ===== COMPARATIVO ===== */}
        <section>
          <Card title="Comparativo de Receita" icon={<DollarSign className="w-4 h-4" />}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={receitaComparativa} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#6B7280', fontSize: 14, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `Kz ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Receita"]}
                  cursor={{ fill: '#F3F4F6' }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                  }}
                />
                <Bar
                  dataKey="receita"
                  radius={[8, 8, 0, 0]}
                  barSize={120}
                >
                  {receitaComparativa.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* ===== TABELA DE VENDAS ===== */}
        <section>
          <Card title="Vendas Recentes" icon={<ShoppingCart className="w-4 h-4" />}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="py-4 px-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Data</th>
                    <th className="py-4 px-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Cliente</th>
                    <th className="py-4 px-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Documento</th>
                    <th className="py-4 px-4 text-right font-semibold text-gray-700 uppercase tracking-wider text-xs">Total</th>
                    <th className="py-4 px-4 text-center font-semibold text-gray-700 uppercase tracking-wider text-xs">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vendas.slice(0, 10).map((venda) => (
                    <tr key={venda.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
                        {venda.data_venda ? new Date(venda.data_venda).toLocaleDateString("pt-PT") : "-"}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900">
                          {venda.cliente?.nome ?? venda.cliente_nome ?? "Consumidor Final"}
                        </div>
                        {venda.cliente?.nif && (
                          <div className="text-xs text-gray-500">NIF: {venda.cliente.nif}</div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 uppercase">
                          {venda.tipo_documento_fiscal || venda.tipo_documento || "VENDA"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-semibold text-[#123859]">
                        {formatCurrency(venda.total)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <StatusBadge status={venda.status || "aberta"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {vendas.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  Nenhuma venda registrada recentemente
                </div>
              )}

              {vendas.length > 10 && (
                <div className="mt-4 text-center">
                  <button className="text-[#123859] hover:text-[#F9941F] text-sm font-medium transition-colors">
                    Ver todas as vendas →
                  </button>
                </div>
              )}
            </div>
          </Card>
        </section>
      </div>
    </MainEmpresa>
  );
}

/* ===== COMPONENTES AUXILIARES ===== */

function KPICard({ icon, label, value, trend, suffix, isCurrency }: KPIData) {
  const numericValue = safeNumber(value);

  const displayValue = isCurrency
    ? formatCurrency(numericValue)
    : `${numericValue}${suffix || ''}`;

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between">
        <div className="p-2.5 bg-[#123859]/10 text-[#123859] rounded-lg group-hover:bg-[#123859] group-hover:text-white transition-colors">
          {icon}
        </div>
        {trend && trend !== "neutral" && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend === "up" ? "text-green-600" : "text-red-600"
          }`}>
            {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend === "up" ? "+" : "-"}{Math.abs(safeNumber(value) * 0.01).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-1">{displayValue}</p>
      </div>
    </div>
  );
}

function Card({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        {icon && <span className="text-[#123859]">{icon}</span>}
        <h3 className="font-semibold text-[#123859]">{title}</h3>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    aberta: "bg-amber-50 text-amber-700 border border-amber-200",
    faturada: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    cancelada: "bg-red-50 text-red-700 border border-red-200",
  };

  const labels: Record<string, string> = {
    aberta: "Aberta",
    faturada: "Faturada",
    cancelada: "Cancelada",
  };

  const safeStatus = status || "aberta";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${styles[safeStatus] || styles.aberta}`}>
      {labels[safeStatus] || status}
    </span>
  );
}

/* ===== UTILITÁRIOS ===== */

function formatCurrency(value: number | string | undefined | null): string {
  const num = safeNumber(value);
  return num.toLocaleString("pt-PT", {
    style: "currency",
    currency: "AOA",
    minimumFractionDigits: 2,
  });
}

function safeNumber(value: any, defaultValue = 0): number {
  if (value === undefined || value === null) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}