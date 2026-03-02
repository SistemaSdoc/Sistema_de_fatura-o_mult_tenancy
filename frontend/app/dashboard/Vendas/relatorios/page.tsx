"use client";

import React, { useEffect, useState } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
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
  Receipt,
  Wallet,
} from "lucide-react";

import { dashboardService, vendaService, NOMES_TIPO_DOCUMENTO } from "@/services/vendas";
import type { DashboardResponse, Venda, TipoDocumentoFiscal } from "@/services/vendas";
import { useThemeColors, useTheme } from "@/context/ThemeContext";

/* 🎨 Paleta FacturaJá (fallback caso o tema não carregue) */
const FALLBACK_COLORS = {
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
const SkeletonCard = ({ colors }: { colors: any }) => (
  <div
    className="p-6 rounded-xl shadow-sm border animate-pulse"
    style={{
      backgroundColor: colors.card,
      borderColor: colors.border
    }}
  >
    <div className="flex items-start justify-between">
      <div
        className="w-10 h-10 rounded-lg"
        style={{ backgroundColor: colors.border }}
      ></div>
      <div
        className="w-16 h-6 rounded-full"
        style={{ backgroundColor: colors.border }}
      ></div>
    </div>
    <div className="mt-4">
      <div
        className="h-4 rounded w-24 mb-2"
        style={{ backgroundColor: colors.border }}
      ></div>
      <div
        className="h-8 rounded w-32"
        style={{ backgroundColor: colors.border }}
      ></div>
    </div>
  </div>
);

const SkeletonChart = ({ colors }: { colors: any }) => (
  <div
    className="p-6 rounded-xl shadow-sm border"
    style={{
      backgroundColor: colors.card,
      borderColor: colors.border
    }}
  >
    <div
      className="h-6 rounded w-48 mb-6"
      style={{ backgroundColor: colors.border }}
    ></div>
    <div
      className="h-[300px] rounded-lg flex items-center justify-center"
      style={{ backgroundColor: colors.hover }}
    >
      <div className="animate-pulse" style={{ color: colors.textSecondary }}>Carregando gráfico...</div>
    </div>
  </div>
);

const SkeletonTable = ({ colors }: { colors: any }) => (
  <div
    className="p-6 rounded-xl shadow-sm border"
    style={{
      backgroundColor: colors.card,
      borderColor: colors.border
    }}
  >
    <div
      className="h-6 rounded w-40 mb-6"
      style={{ backgroundColor: colors.border }}
    ></div>
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-10 rounded"
          style={{ backgroundColor: colors.hover }}
        ></div>
      ))}
    </div>
  </div>
);

/* ===== COMPONENTES AUXILIARES ===== */

const StatCard = ({
  icon,
  label,
  value,
  trend,
  colors
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: { value: number; label: string };
  colors: any;
}) => {
  const isPositive = trend?.value ? trend.value > 0 : false;

  return (
    <div
      className="p-6 rounded-xl shadow-sm border hover:shadow-md transition-all duration-200"
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border
      }}
    >
      <div className="flex items-start justify-between">
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: `${colors.primary}15` }}
        >
          <div style={{ color: colors.primary }}>{icon}</div>
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium`}
            style={{
              backgroundColor: isPositive ? `${colors.success}20` : `${colors.danger}20`,
              color: isPositive ? colors.success : colors.danger
            }}
          >
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend.value)}%
            <span style={{ color: colors.textSecondary }} className="ml-1">{trend.label}</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>{label}</p>
        <p className="text-2xl font-bold mt-1 truncate" style={{ color: colors.text }}>{value}</p>
      </div>
    </div>
  );
};

const ChartCard = ({
  title,
  icon,
  children,
  subtitle,
  colors
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  subtitle?: string;
  colors: any;
}) => (
  <div
    className="p-6 rounded-xl shadow-sm border h-full"
    style={{
      backgroundColor: colors.card,
      borderColor: colors.border
    }}
  >
    <div className="flex items-center gap-3 mb-6">
      <div
        className="p-2 rounded-lg"
        style={{ backgroundColor: colors.hover }}
      >
        {icon}
      </div>
      <div>
        <h3 className="font-semibold" style={{ color: colors.text }}>{title}</h3>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

const StatusBadge = ({ status, colors }: { status: string; colors: any }) => {
  const config = {
    faturada: { bg: `${colors.success}20`, text: colors.success, icon: CheckCircle, label: "Faturada" },
    aberta: { bg: `${colors.warning}20`, text: colors.warning, icon: Clock, label: "Aberta" },
    cancelada: { bg: `${colors.danger}20`, text: colors.danger, icon: XCircle, label: "Cancelada" },
    paga: { bg: `${colors.success}20`, text: colors.success, icon: CheckCircle, label: "Paga" },
    pendente: { bg: `${colors.warning}20`, text: colors.warning, icon: Clock, label: "Pendente" },
    parcial: { bg: `${colors.purple}20`, text: colors.purple, icon: AlertCircle, label: "Parcial" },
  };

  const statusKey = status?.toLowerCase() || "aberta";
  const { bg, text, icon: Icon, label } = config[statusKey as keyof typeof config] || config.aberta;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium`}
      style={{ backgroundColor: bg, color: text }}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

const EmptyState = ({ icon: Icon, title, description, colors }: { icon: any, title: string, description: string, colors: any }) => (
  <div
    className="h-[250px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg"
    style={{
      borderColor: colors.border,
      backgroundColor: colors.hover
    }}
  >
    <Icon className="w-12 h-12 mb-3" style={{ color: colors.textSecondary }} />
    <p className="font-medium" style={{ color: colors.textSecondary }}>{title}</p>
    <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>{description}</p>
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
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatTimeOnly = (timeString: string) => {
  if (!timeString) return "-";

  let timeStr = timeString;
  if (timeString.includes('T')) {
    timeStr = timeString.split('T')[1];
  }

  const dummyDate = new Date(`2000-01-01T${timeStr}`);
  return dummyDate.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Função para obter nome amigável do tipo de documento
const getNomeTipoDocumento = (tipo: string, colors: any): string => {
  if (!tipo) return "Desconhecido";

  if (NOMES_TIPO_DOCUMENTO && NOMES_TIPO_DOCUMENTO[tipo as TipoDocumentoFiscal]) {
    return NOMES_TIPO_DOCUMENTO[tipo as TipoDocumentoFiscal];
  }

  const mapeamento: Record<string, string> = {
    'VENDA': 'Venda',
    'venda': 'Venda',
    'fatura': 'Fatura',
    'recibo': 'Recibo',
    'proforma': 'Fatura Proforma',
    'nota_credito': 'Nota de Crédito',
    'nota_debito': 'Nota de Débito',
  };

  if (mapeamento[tipo]) {
    return mapeamento[tipo];
  }

  return tipo.replace(/_/g, ' ').replace(/-/g, ' ').toUpperCase();
};

/* ===== PÁGINA PRINCIPAL ===== */
export default function RelatorioVendas() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const colors = useThemeColors();
  const { theme } = useTheme();

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
        <div className="p-6 space-y-6 max-w-7xl mx-auto" style={{ backgroundColor: colors.background }}>
          <div className="border-b pb-6" style={{ borderColor: colors.border }}>
            <div className="h-8 rounded w-64 mb-2 animate-pulse" style={{ backgroundColor: colors.border }}></div>
            <div className="h-5 rounded w-96 animate-pulse" style={{ backgroundColor: colors.border }}></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} colors={colors} />)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonChart colors={colors} />
            <SkeletonChart colors={colors} />
          </div>

          <SkeletonTable colors={colors} />
        </div>
      </MainEmpresa>
    );
  }

  if (error || !dashboard) {
    return (
      <MainEmpresa>
        <div className="flex items-center justify-center min-h-[400px] p-6" style={{ backgroundColor: colors.background }}>
          <div className="text-center max-w-md">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${colors.danger}20` }}
            >
              <AlertCircle className="w-10 h-10" style={{ color: colors.danger }} />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: colors.text }}>Erro ao carregar dados</h3>
            <p className="mb-6" style={{ color: colors.textSecondary }}>{error || "Não foi possível carregar os dados do relatório"}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: colors.primary, color: 'white' }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </MainEmpresa>
    );
  }

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
      trend: dashboard.kpis?.crescimentoPercentual ? {
        value: dashboard.kpis.crescimentoPercentual,
        label: "vs mês anterior"
      } : undefined,
    },
    {
      icon: <ShoppingCart className="w-5 h-5" />,
      label: "Total de Vendas",
      value: formatNumber(dashboard.vendas?.total),
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: "Clientes Ativos",
      value: formatNumber(dashboard.clientes?.ativos),
    },
    {
      icon: <Receipt className="w-5 h-5" />,
      label: "Ticket Médio",
      value: formatCurrency(dashboard.kpis?.ticketMedio),
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

  // ===== GRÁFICO 2: Documentos por Tipo =====
  let documentosPorTipo: Array<{ tipo: string; tipoCode: string; quantidade: number; valor: number }> = [];

  if (dashboard.documentos_fiscais?.por_tipo && Object.keys(dashboard.documentos_fiscais.por_tipo).length > 0) {
    documentosPorTipo = Object.entries(dashboard.documentos_fiscais.por_tipo)
      .map(([tipo, data]) => ({
        tipo: getNomeTipoDocumento(data.nome || tipo, colors),
        tipoCode: tipo,
        quantidade: safeNumber(data.quantidade),
        valor: safeNumber(data.valor),
      }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }

  // ===== GRÁFICO 3: Produtos Mais Vendidos =====
  const produtosMaisVendidos = dashboard.indicadores?.produtosMaisVendidos?.slice(0, 5) || [];

  const produtosCompletos = [...produtosMaisVendidos];
  while (produtosCompletos.length < 5) {
    produtosCompletos.push({
      produto: "Sem dados",
      codigo: "-",
      quantidade: 0,
      valor_total: 0,
    });
  }

  // Cores para os rankings
  const rankingColors = [
    { bg: 'bg-yellow-500', text: 'text-yellow-600' },
    { bg: 'bg-gray-400', text: 'text-gray-600' },
    { bg: 'bg-orange-400', text: 'text-orange-600' },
    { bg: 'bg-blue-400', text: 'text-blue-600' },
    { bg: 'bg-purple-400', text: 'text-purple-600' },
  ];

  return (
    <MainEmpresa>
      <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 transition-colors duration-300" style={{ backgroundColor: colors.background }}>
        {/* ===== CABEÇALHO ===== */}
        <div className="border-b pb-6" style={{ borderColor: colors.border }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: colors.primary }}>
                Relatório de Vendas
              </h1>
              <p className="mt-1 flex items-center gap-2" style={{ color: colors.textSecondary }}>
                <Calendar className="w-4 h-4" />
                Período atual: {new Date().toLocaleDateString("pt-PT", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* ===== CARDS DE ESTATÍSTICAS ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map((stat, index) => (
            <StatCard key={index} {...stat} colors={colors} />
          ))}
        </div>

        {/* ===== GRÁFICO DE EVOLUÇÃO MENSAL ===== */}
        <ChartCard
          title="Evolução das Vendas"
          icon={<TrendingUp className="w-5 h-5" style={{ color: colors.secondary }} />}
          subtitle="Últimos 6 meses"
          colors={colors}
        >
          {evolucaoMensalData.length > 0 && evolucaoMensalData.some(d => d.valor > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={evolucaoMensalData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.secondary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colors.secondary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                <XAxis
                  dataKey="mes"
                  tick={{ fill: colors.textSecondary, fontSize: 12 }}
                  axisLine={{ stroke: colors.border }}
                />
                <YAxis
                  tick={{ fill: colors.textSecondary, fontSize: 12 }}
                  axisLine={{ stroke: colors.border }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Valor"]}
                  labelFormatter={(label) => `Mês: ${label}`}
                  contentStyle={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    color: colors.text
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke={colors.secondary}
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
              colors={colors}
            />
          )}
        </ChartCard>

        {/* ===== GRÁFICOS LADO A LADO: Documentos por Tipo e Top Produtos ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* GRÁFICO DE DOCUMENTOS POR TIPO */}
          <ChartCard
            title="Documentos por Tipo"
            icon={<FileText className="w-5 h-5" style={{ color: colors.secondary }} />}
            subtitle="Top 5 tipos mais utilizados"
            colors={colors}
          >
            {documentosPorTipo.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={documentosPorTipo} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border} horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="tipo"
                    type="category"
                    tick={{ fill: colors.textSecondary, fontSize: 11 }}
                    width={95}
                    interval={0}
                    stroke={colors.border}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === "quantidade") return [formatNumber(value), "Quantidade"];
                      return [formatCurrency(value), "Valor"];
                    }}
                    labelFormatter={(label) => `${label}`}
                    contentStyle={{
                      backgroundColor: colors.card,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      color: colors.text
                    }}
                  />
                  <Bar dataKey="quantidade" fill={colors.primary} radius={[0, 4, 4, 0]} barSize={20} name="Quantidade" />
                  <Bar dataKey="valor" fill={colors.secondary} radius={[0, 4, 4, 0]} barSize={20} name="Valor" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={FileText}
                title="Sem dados de documentos"
                description="Nenhum documento fiscal emitido"
                colors={colors}
              />
            )}
          </ChartCard>

          {/* GRÁFICO DE PRODUTOS MAIS VENDIDOS */}
          <ChartCard
            title="Top Produtos"
            icon={<Package className="w-5 h-5" style={{ color: colors.secondary }} />}
            subtitle="Produtos mais vendidos"
            colors={colors}
          >
            <div className="space-y-3">
              {produtosCompletos.map((produto, index) => {
                const hasData = produto.valor_total > 0;

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg transition-colors"
                    style={{
                      backgroundColor: hasData ? colors.hover : `${colors.hover}50`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold
                        ${hasData ? rankingColors[index].bg : 'bg-gray-300'}
                      `}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: hasData ? colors.text : colors.textSecondary }}>
                          {produto.produto}
                        </p>
                        <p className="text-xs" style={{ color: colors.textSecondary }}>
                          {produto.codigo || 'Sem código'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm" style={{ color: hasData ? colors.primary : colors.textSecondary }}>
                        {hasData ? formatCurrency(produto.valor_total) : '-'}
                      </p>
                      <p className="text-xs" style={{ color: colors.textSecondary }}>
                        {hasData ? `${produto.quantidade} unid.` : '-'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        </div>

        {/* ===== TABELA DE VENDAS RECENTES ===== */}
        <ChartCard
          title="Vendas Recentes"
          icon={<ShoppingCart className="w-5 h-5" style={{ color: colors.secondary }} />}
          subtitle={`Últimas ${Math.min(vendas.length, 10)} vendas`}
          colors={colors}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: colors.border, backgroundColor: colors.hover }}>
                  <th className="py-4 px-4 text-left font-semibold" style={{ color: colors.text }}>Data/Hora</th>
                  <th className="py-4 px-4 text-left font-semibold" style={{ color: colors.text }}>Cliente</th>
                  <th className="py-4 px-4 text-left font-semibold" style={{ color: colors.text }}>Documento</th>
                  <th className="py-4 px-4 text-right font-semibold" style={{ color: colors.text }}>Total</th>
                  <th className="py-4 px-4 text-center font-semibold" style={{ color: colors.text }}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: colors.border }}>
                {vendas.slice(0, 10).map((venda) => (
                  <tr key={venda.id} className="transition-colors hover:bg-opacity-50" style={{ backgroundColor: 'transparent' }}>
                    <td className="py-4 px-4 whitespace-nowrap" style={{ color: colors.textSecondary }}>
                      <div className="flex flex-col">
                        <span>{formatDate(venda.data_venda)}</span>
                        {venda.hora_venda && (
                          <span className="text-xs" style={{ color: colors.textSecondary }}>
                            {formatTimeOnly(venda.hora_venda)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium" style={{ color: colors.text }}>
                        {venda.cliente?.nome || venda.cliente_nome || "Consumidor Final"}
                      </div>
                      {venda.cliente?.nif && (
                        <div className="text-xs" style={{ color: colors.textSecondary }}>NIF: {venda.cliente.nif}</div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase"
                        style={{
                          backgroundColor: `${colors.primary}20`,
                          color: colors.primary
                        }}
                      >
                        {getNomeTipoDocumento(venda.tipo_documento_fiscal || venda.tipo_documento || "VENDA", colors)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-semibold" style={{ color: colors.text }}>
                      {formatCurrency(venda.total)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <StatusBadge status={venda.status || "aberta"} colors={colors} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {vendas.length === 0 && (
              <div className="text-center py-12" style={{ color: colors.textSecondary }}>
                <ShoppingCart className="w-12 h-12 mx-auto mb-3" style={{ color: colors.border }} />
                <p>Nenhuma venda registrada recentemente</p>
              </div>
            )}
          </div>
        </ChartCard>

        {/* ===== ALERTAS E INDICADORES ===== */}
        {dashboard.alertas && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {dashboard.alertas.documentos_vencidos > 0 && (
              <div
                className="border rounded-lg p-4 flex items-center gap-3"
                style={{
                  backgroundColor: `${colors.danger}20`,
                  borderColor: colors.danger
                }}
              >
                <AlertCircle className="w-8 h-8" style={{ color: colors.danger }} />
                <div>
                  <p className="font-semibold" style={{ color: colors.danger }}>{dashboard.alertas.documentos_vencidos}</p>
                  <p className="text-sm" style={{ color: colors.danger }}>Documentos vencidos</p>
                </div>
              </div>
            )}
            {dashboard.alertas.documentos_proximo_vencimento > 0 && (
              <div
                className="border rounded-lg p-4 flex items-center gap-3"
                style={{
                  backgroundColor: `${colors.warning}20`,
                  borderColor: colors.warning
                }}
              >
                <Clock className="w-8 h-8" style={{ color: colors.warning }} />
                <div>
                  <p className="font-semibold" style={{ color: colors.warning }}>{dashboard.alertas.documentos_proximo_vencimento}</p>
                  <p className="text-sm" style={{ color: colors.warning }}>Próximos do vencimento</p>
                </div>
              </div>
            )}
            {dashboard.alertas.adiantamentos_pendentes > 0 && (
              <div
                className="border rounded-lg p-4 flex items-center gap-3"
                style={{
                  backgroundColor: `${colors.info}20`,
                  borderColor: colors.info
                }}
              >
                <Wallet className="w-8 h-8" style={{ color: colors.info }} />
                <div>
                  <p className="font-semibold" style={{ color: colors.info }}>{dashboard.alertas.adiantamentos_pendentes}</p>
                  <p className="text-sm" style={{ color: colors.info }}>Adiantamentos pendentes</p>
                </div>
              </div>
            )}
            {dashboard.alertas.proformas_pendentes > 0 && (
              <div
                className="border rounded-lg p-4 flex items-center gap-3"
                style={{
                  backgroundColor: `${colors.purple}20`,
                  borderColor: colors.purple
                }}
              >
                <FileText className="w-8 h-8" style={{ color: colors.purple }} />
                <div>
                  <p className="font-semibold" style={{ color: colors.purple }}>{dashboard.alertas.proformas_pendentes}</p>
                  <p className="text-sm" style={{ color: colors.purple }}>Proformas pendentes</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainEmpresa>
  );
}