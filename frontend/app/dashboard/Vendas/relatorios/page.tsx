"use client";

import React, { useEffect, useState } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  FileText,
  ShoppingCart,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Receipt,
  Wallet,
  BarChart3,
  PieChartIcon,
  Activity,
} from "lucide-react";

import { dashboardService, vendaService } from "@/services/vendas";
import type { DashboardResponse, Venda } from "@/services/vendas";

/* 🎨 Paleta FacturaJá */
const COLORS = {
  primary: "#123859",
  accent: "#F9941F",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
  purple: "#8B5CF6",
  gray: "#6B7280",
  lightGray: "#E5E7EB",
  background: "#F9FAFB",
  teal: "#14B8A6",
  pink: "#EC4899",
};

/* ===== COMPONENTE DE SKELETON ===== */
const SkeletonCard = () => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
      <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
    </div>
    <div className="mt-4">
      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
      <div className="h-8 bg-gray-200 rounded w-32"></div>
    </div>
  </div>
);

const SkeletonChart = () => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
    <div className="h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="animate-pulse text-gray-400">Carregando gráfico...</div>
    </div>
  </div>
);

const SkeletonTable = () => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <div className="h-6 bg-gray-200 rounded w-40 mb-6"></div>
    <div className="space-y-4">
      <div className="h-10 bg-gray-100 rounded"></div>
      <div className="h-10 bg-gray-100 rounded"></div>
      <div className="h-10 bg-gray-100 rounded"></div>
      <div className="h-10 bg-gray-100 rounded"></div>
      <div className="h-10 bg-gray-100 rounded"></div>
    </div>
  </div>
);

/* ===== COMPONENTES AUXILIARES ===== */

const StatCard = ({
  icon,
  label,
  value,
  trend,
  color = COLORS.primary
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: { value: number; label: string };
  color?: string;
}) => {
  const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
  const isPositive = trend?.value ? trend.value > 0 : false;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-lg`} style={{ backgroundColor: `${color}15` }}>
          <div style={{ color }}>{icon}</div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
            }`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend.value)}%
            <span className="text-gray-500 ml-1">{trend.label}</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1 truncate">{value}</p>
      </div>
    </div>
  );
};

const ChartCard = ({
  title,
  icon,
  children,
  subtitle,
  action
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
}) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gray-50">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && action}
    </div>
    {children}
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const config = {
    faturada: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Faturada" },
    aberta: { color: "bg-yellow-100 text-yellow-700", icon: Clock, label: "Aberta" },
    cancelada: { color: "bg-red-100 text-red-700", icon: XCircle, label: "Cancelada" },
    paga: { color: "bg-blue-100 text-blue-700", icon: CheckCircle, label: "Paga" },
    pendente: { color: "bg-orange-100 text-orange-700", icon: Clock, label: "Pendente" },
    parcial: { color: "bg-purple-100 text-purple-700", icon: Activity, label: "Parcial" },
  };

  const statusKey = status?.toLowerCase() || "aberta";
  const { color, icon: Icon, label } = config[statusKey as keyof typeof config] || config.aberta;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

const EmptyState = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <div className="h-[300px] flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
    <Icon className="w-12 h-12 mb-3 text-gray-300" />
    <p className="font-medium text-gray-500">{title}</p>
    <p className="text-sm text-gray-400 mt-1">{description}</p>
  </div>
);

/* ===== UTILITÁRIOS ===== */
const formatCurrency = (value: number | string | undefined | null): string => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "AOA",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num).replace("AOA", "Kz");
};

const formatNumber = (value: number | string | undefined | null): string => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("pt-PT").format(num);
};

const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/* ===== PÁGINA PRINCIPAL ===== */
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
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="border-b border-gray-200 pb-6">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
            <div className="h-5 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>

          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>

          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonChart />
            <SkeletonChart />
          </div>

          {/* Table Skeleton */}
          <SkeletonTable />
        </div>
      </MainEmpresa>
    );
  }

  if (error || !dashboard) {
    return (
      <MainEmpresa>
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar dados</h3>
            <p className="text-gray-500 mb-6">{error || "Não foi possível carregar os dados do relatório"}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-[#123859] text-white rounded-lg hover:bg-[#1a4d7a] transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </MainEmpresa>
    );
  }

  /* ===== PROCESSAMENTO DE DADOS ===== */
  const safeNumber = (value: any, defaultValue = 0): number => {
    if (value === undefined || value === null) return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  };

  // Dados para os cards
  const statsData = [
    {
      icon: <DollarSign className="w-5 h-5" />,
      label: "Total Faturado",
      value: formatCurrency(dashboard.kpis?.totalFaturado),
      trend: dashboard.kpis?.crescimentoPercentual ? { value: dashboard.kpis.crescimentoPercentual, label: "vs mês anterior" } : undefined,
      color: COLORS.primary,
    },
    {
      icon: <ShoppingCart className="w-5 h-5" />,
      label: "Total de Vendas",
      value: formatNumber(dashboard.vendas?.total),
      color: COLORS.accent,
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: "Clientes Ativos",
      value: formatNumber(dashboard.clientes?.ativos),
      color: COLORS.success,
    },
    {
      icon: <Receipt className="w-5 h-5" />,
      label: "Ticket Médio",
      value: formatCurrency(dashboard.kpis?.ticketMedio),
      color: COLORS.info,
    },
  ];

  // ===== GRÁFICO 1: Evolução Mensal =====
  let evolucaoMensalData: Array<{ mes: string; valor: number; quantidade: number }> = [];

  if (dashboard.documentos_fiscais?.por_mes && dashboard.documentos_fiscais.por_mes.length > 0) {
    evolucaoMensalData = dashboard.documentos_fiscais.por_mes.slice(-6).map(item => ({
      mes: item.mes,
      valor: safeNumber(item.total),
      quantidade: safeNumber(item.FT) + safeNumber(item.FR),
    }));
  } else if (vendas.length > 0) {
    const vendasPorMes = vendas.reduce((acc, venda) => {
      const date = new Date(venda.data_venda);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[key]) acc[key] = { valor: 0, quantidade: 0 };
      acc[key].valor += safeNumber(venda.total);
      acc[key].quantidade += 1;
      return acc;
    }, {} as Record<string, { valor: number; quantidade: number }>);

    evolucaoMensalData = Object.entries(vendasPorMes)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([mes, data]) => ({
        mes,
        valor: data.valor,
        quantidade: data.quantidade,
      }));
  }

  // ===== GRÁFICO 2: Distribuição por Status (PieChart) =====
  // Forçar sempre ter dados para o gráfico de pizza aparecer
  let statusData = [
    { name: "Faturadas", value: safeNumber(dashboard.vendas?.faturadas), color: COLORS.success },
    { name: "Abertas", value: safeNumber(dashboard.vendas?.abertas), color: COLORS.warning },
  ];

  // Se todos os valores forem 0, calcular das vendas
  const totalStatus = statusData.reduce((sum, item) => sum + item.value, 0);

  if (totalStatus === 0 && vendas.length > 0) {
    const counts = vendas.reduce((acc, v) => {
      const status = (v.status || 'aberta').toLowerCase();
      if (status === 'faturada' || status === 'paga' || status === 'faturado') acc.faturadas++;
      else if (status === 'cancelada' || status === 'cancelado') acc.canceladas++;
      else acc.abertas++; // tudo que não é faturada ou cancelada é aberta
      return acc;
    }, { faturadas: 0, abertas: 0, canceladas: 0 });

    statusData = [
      { name: "Faturadas", value: counts.faturadas, color: COLORS.success },
      { name: "Abertas", value: counts.abertas, color: COLORS.warning },
    ];
  }

  // Se ainda for tudo zero, criar dados de exemplo para mostrar o gráfico
  const finalStatusData = statusData.every(s => s.value === 0)
    ? [
      { name: "Faturadas", value: 1, color: COLORS.success },
      { name: "Abertas", value: 0, color: COLORS.warning },
    ]
    : statusData;

  // ===== GRÁFICO 3: Documentos por Tipo =====
  let documentosPorTipo: Array<{ tipo: string; quantidade: number; valor: number }> = [];

  if (dashboard.documentos_fiscais?.por_tipo) {
    documentosPorTipo = Object.entries(dashboard.documentos_fiscais.por_tipo)
      .map(([tipo, data]) => ({
        tipo: data.nome || tipo,
        quantidade: safeNumber(data.quantidade),
        valor: safeNumber(data.valor),
      }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }

  if (documentosPorTipo.length === 0 && vendas.length > 0) {
    const docs = vendas.reduce((acc, v) => {
      const tipoKey = v.tipo_documento_fiscal || v.tipo_documento || "VENDA";
      if (!acc[tipoKey]) acc[tipoKey] = { nome: tipoKey, quantidade: 0, valor: 0 };
      acc[tipoKey].quantidade++;
      acc[tipoKey].valor += safeNumber(v.total);
      return acc;
    }, {} as Record<string, { nome: string; quantidade: number; valor: number }>);

    documentosPorTipo = Object.values(docs)
      .map(d => ({
        tipo: d.nome,
        quantidade: d.quantidade,
        valor: d.valor
      }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }

  // ===== GRÁFICO 4: Produtos Mais Vendidos =====
  const produtosMaisVendidos = dashboard.indicadores?.produtosMaisVendidos?.slice(0, 5) || [];

  return (
    <MainEmpresa>
      <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
        {/* ===== CABEÇALHO ===== */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#123859]">
                Relatório de Vendas
              </h1>
              <p className="text-gray-500 mt-1 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Período atual: {new Date().toLocaleDateString("pt-PT", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-4 py-2 rounded-lg">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Dados atualizados em tempo real
            </div>
          </div>
        </div>

        {/* ===== CARDS DE ESTATÍSTICAS ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* ===== GRÁFICOS PRINCIPAIS - LINHA 1 ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Evolução Mensal */}
          <ChartCard
            title="Evolução das Vendas"
            icon={<TrendingUp className="w-5 h-5 text-[#123859]" />}
            subtitle="Últimos 6 meses"
          >
            {evolucaoMensalData.length > 0 && evolucaoMensalData.some(d => d.valor > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={evolucaoMensalData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.accent} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.lightGray} vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: COLORS.gray, fontSize: 12 }}
                    axisLine={{ stroke: COLORS.lightGray }}
                  />
                  <YAxis
                    tick={{ fill: COLORS.gray, fontSize: 12 }}
                    axisLine={{ stroke: COLORS.lightGray }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Valor"]}
                    labelFormatter={(label) => `Mês: ${label}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: `1px solid ${COLORS.lightGray}`,
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke={COLORS.accent}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValor)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="Sem dados de evolução"
                description="Nenhuma venda registrada nos últimos meses"
              />
            )}
          </ChartCard>

          {/* Gráfico de Status das Vendas - PIZZA */}
          <ChartCard
            title="Distribuição por Status"
            icon={<PieChartIcon className="w-5 h-5 text-[#123859]" />}
            subtitle="Quantidade de vendas por status"
          >
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={finalStatusData}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={true}
                  >
                    {finalStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [formatNumber(value), name]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: `1px solid ${COLORS.lightGray}`,
                      borderRadius: '8px',
                    }}
                  />
                  <Legend verticalAlign="bottom" align="center" height={36} />
                </PieChart>
              </ResponsiveContainer>

              {/* Resumo numérico abaixo do gráfico */}
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-100">
                {finalStatusData.map((item) => (
                  <div key={item.name} className="text-center">
                    <div className="text-xl font-bold" style={{ color: item.color }}>
                      {formatNumber(item.value)}
                    </div>
                    <div className="text-xs text-gray-500">{item.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>

        {/* ===== GRÁFICOS SECUNDÁRIOS - LINHA 2 ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Documentos por Tipo */}
          <ChartCard
            title="Documentos por Tipo"
            icon={<FileText className="w-5 h-5 text-[#123859]" />}
            subtitle="Top 5 tipos mais utilizados"
          >
            {documentosPorTipo.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={documentosPorTipo} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.lightGray} horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="tipo"
                    type="category"
                    tick={{ fontSize: 11 }}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === "quantidade") return [value, "Quantidade"];
                      return [formatCurrency(value), "Valor"];
                    }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: `1px solid ${COLORS.lightGray}`,
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="quantidade" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={20} name="Quantidade" />
                  <Bar dataKey="valor" fill={COLORS.accent} radius={[0, 4, 4, 0]} barSize={20} name="Valor" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={FileText}
                title="Sem dados de documentos"
                description="Nenhum documento fiscal emitido"
              />
            )}
          </ChartCard>

          {/* Gráfico de Produtos Mais Vendidos */}
          <ChartCard
            title="Top Produtos"
            icon={<Package className="w-5 h-5 text-[#123859]" />}
            subtitle="Produtos mais vendidos"
          >
            {produtosMaisVendidos.length > 0 ? (
              <div className="space-y-3">
                {produtosMaisVendidos.map((produto, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold
                        ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-gray-300'}
                      `}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{produto.produto}</p>
                        <p className="text-xs text-gray-500">{produto.codigo || 'Sem código'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#123859] text-sm">
                        {formatCurrency(produto.valor_total)}
                      </p>
                      <p className="text-xs text-gray-500">{produto.quantidade} unid.</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Package}
                title="Sem dados de produtos"
                description="Nenhum produto vendido no período"
              />
            )}
          </ChartCard>
        </div>

        {/* ===== TABELA DE VENDAS RECENTES ===== */}
        <ChartCard
          title="Vendas Recentes"
          icon={<ShoppingCart className="w-5 h-5 text-[#123859]" />}
          subtitle={`Últimas ${Math.min(vendas.length, 10)} vendas`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="py-4 px-4 text-left font-semibold text-gray-700">Data</th>
                  <th className="py-4 px-4 text-left font-semibold text-gray-700">Cliente</th>
                  <th className="py-4 px-4 text-left font-semibold text-gray-700">Documento</th>
                  <th className="py-4 px-4 text-right font-semibold text-gray-700">Total</th>
                  <th className="py-4 px-4 text-center font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vendas.slice(0, 10).map((venda) => (
                  <tr key={venda.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
                      {formatDate(venda.data_venda)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">
                        {venda.cliente?.nome || venda.cliente_nome || "Consumidor Final"}
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
                <p>Nenhuma venda registrada recentemente</p>
              </div>
            )}
          </div>
        </ChartCard>

        {/* ===== ALERTAS E INDICADORES ===== */}
        {(dashboard.alertas && Object.values(dashboard.alertas).some(v => safeNumber(v) > 0)) && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {dashboard.alertas.documentos_vencidos > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="font-semibold text-red-900">{dashboard.alertas.documentos_vencidos}</p>
                  <p className="text-sm text-red-700">Documentos vencidos</p>
                </div>
              </div>
            )}
            {dashboard.alertas.documentos_proximo_vencimento > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="font-semibold text-yellow-900">{dashboard.alertas.documentos_proximo_vencimento}</p>
                  <p className="text-sm text-yellow-700">Próximos do vencimento</p>
                </div>
              </div>
            )}
            {dashboard.alertas.adiantamentos_pendentes > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                <Wallet className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-semibold text-blue-900">{dashboard.alertas.adiantamentos_pendentes}</p>
                  <p className="text-sm text-blue-700">Adiantamentos pendentes</p>
                </div>
              </div>
            )}
            {dashboard.alertas.proformas_pendentes > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center gap-3">
                <FileText className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="font-semibold text-purple-900">{dashboard.alertas.proformas_pendentes}</p>
                  <p className="text-sm text-purple-700">Proformas pendentes</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainEmpresa>
  );
}