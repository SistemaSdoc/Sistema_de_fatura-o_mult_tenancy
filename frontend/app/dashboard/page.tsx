'use client';

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  TrendingUp, Users, CreditCard, DollarSign,
  Package, Receipt, FileText, AlertTriangle,
  RefreshCw, ShoppingCart, Clock
} from "lucide-react";
import Link from "next/link";

import MainEmpresa from "@/app/components/MainEmpresa";
import { dashboardService } from "@/services/Dashboard";
import { useThemeColors, useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";

/* ==================== HELPERS ==================== */
const formatKz = (v: number | string): string => {
  const num = Number(v) || 0;
  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num).replace("AOA", "Kz");
};

const formatNumber = (value: number): string =>
  new Intl.NumberFormat("pt-PT").format(value || 0);

const formatCompact = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return formatNumber(value);
};

const shortText = (text: string, maxLength: number): string =>
  text.length <= maxLength ? text : `${text.slice(0, Math.max(maxLength - 3, 1))}...`;

const formatDate = (value?: string): string => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-PT");
};

/* ==================== SKELETONS ==================== */
const SkeletonCard = ({ colors }: { colors: any }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="p-3 sm:p-4 rounded-xl shadow border animate-pulse"
    style={{ backgroundColor: colors.card, borderColor: colors.border } as any}
  >
    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg mb-2 sm:mb-3" style={{ background: colors.border }} />
    <div className="h-3 sm:h-4 rounded w-16 sm:w-20 mb-1 sm:mb-2" style={{ background: colors.border }} />
    <div className="h-4 sm:h-6 rounded w-20 sm:w-24" style={{ background: colors.border }} />
  </motion.div>
);

const SkeletonChart = ({ colors, tall }: { colors: any; tall?: boolean }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="p-3 sm:p-4 rounded-xl shadow border animate-pulse"
    style={{ backgroundColor: colors.card, borderColor: colors.border } as any}
  >
    <div className="h-5 sm:h-6 rounded w-32 sm:w-40 mb-3 sm:mb-4" style={{ backgroundColor: colors.border }} />
    <div
      className={`rounded ${tall ? "h-56 sm:h-72" : "h-48 sm:h-60"}`}
      style={{ background: colors.hover }}
    />
  </motion.div>
);

const SkeletonTable = ({ colors }: { colors: any }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="p-3 sm:p-4 rounded-xl shadow border animate-pulse"
    style={{ backgroundColor: colors.card, borderColor: colors.border } as any}
  >
    <div className="h-5 sm:h-6 rounded w-24 sm:w-32 mb-3 sm:mb-4" style={{ backgroundColor: colors.border }} />
    <div className="space-y-2 sm:space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-6 sm:h-8 rounded" style={{ background: colors.hover }} />
      ))}
    </div>
  </motion.div>
);

/* ==================== STATUS BADGE ==================== */
type BadgeVariant = "green" | "yellow" | "blue" | "red" | "orange" | "gray";

const badgeClasses: Record<BadgeVariant, { dark: string; light: string }> = {
  green: { dark: "bg-green-900/50 text-green-300", light: "bg-green-100 text-green-700" },
  yellow: { dark: "bg-yellow-900/50 text-yellow-300", light: "bg-yellow-100 text-yellow-700" },
  blue: { dark: "bg-blue-900/50 text-blue-300", light: "bg-blue-100 text-blue-700" },
  red: { dark: "bg-red-900/50 text-red-300", light: "bg-red-100 text-red-700" },
  orange: { dark: "bg-orange-900/50 text-orange-300", light: "bg-orange-100 text-orange-700" },
  gray: { dark: "bg-gray-800 text-gray-300", light: "bg-gray-100 text-gray-600" },
};

const statusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  faturada: { label: "Faturada", variant: "green" },
  pendente: { label: "Pendente", variant: "yellow" },
  paga: { label: "Pago", variant: "green" },
  emitido: { label: "Emitido", variant: "blue" },
  cancelado: { label: "Cancelado", variant: "red" },
  cancelada: { label: "Cancelada", variant: "red" },
  parcialmente_paga: { label: "Parcial", variant: "orange" },
  parcial: { label: "Parcial", variant: "orange" },
};

const StatusBadge = ({ status, theme }: { status: string; theme: string }) => {
  const entry = statusMap[status] ?? { label: status || "-", variant: "gray" as BadgeVariant };
  const cls = badgeClasses[entry.variant as BadgeVariant];
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${theme === "dark" ? cls.dark : cls.light}`}>
      {entry.label}
    </span>
  );
};

/* ==================== MAIN COMPONENT ==================== */
export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState("-");

  const router = useRouter();
  const colors = useThemeColors();
  const { theme } = useTheme();

  const carregarDashboard = async () => {
    setError(null);
    setRefreshing(true);
    try {
      const dashboard = await dashboardService.fetch();
      if (!dashboard) {
        setData(null);
        setError("Não foi possível carregar o dashboard.");
        return;
      }
      setData(dashboard);
      setLastUpdate(new Date().toLocaleString("pt-PT"));
    } catch (err: any) {
      setError(err?.message ?? "Erro desconhecido");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    carregarDashboard();
  }, []);

    if (loading) {
    return (
      <MainEmpresa>
        <div className="space-y-4 sm:space-y-6 pb-8">
          <motion.h1
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl sm:text-2xl font-bold"
            style={{ color: colors.secondary } as any}
          >
            Dashboard
          </motion.h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} colors={colors} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SkeletonChart colors={colors} tall />
            <SkeletonChart colors={colors} tall />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SkeletonChart colors={colors} />
            <SkeletonChart colors={colors} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SkeletonTable colors={colors} />
            <SkeletonTable colors={colors} />
          </div>
        </div>
      </MainEmpresa>
    );
  }
  /* ---- Error state ---- */
  if (error || !data) {
    return (
      <MainEmpresa>
        <div className="flex flex-col items-center justify-center py-16 gap-4" style={{ color: "#EF4444" }}>
          <AlertTriangle size={32} color="#EF4444" />
          <p className="text-sm sm:text-base">Erro: {error || "Sem dados"}</p>
          <button
            onClick={carregarDashboard}
            className="px-4 py-2 text-sm rounded-lg text-white flex items-center gap-2"
            style={{ background: colors.primary }}
          >
            <RefreshCw size={14} /> Tentar novamente
          </button>
        </div>
      </MainEmpresa>
    );
  }

  /* ---- Prepare data usando dashboardService ---- */
  const metricas = dashboardService.calcularMetricas(data);
  const graficos = dashboardService.prepararDadosGraficos(data);
  const alertas = dashboardService.getAlertasFormatados(data);

  const produtosData = (data.indicadores?.produtosMaisVendidos as any[] | undefined)
    ?.slice(0, 5)
    .map((p: any) => ({
      nome: shortText(String(p.produto ?? "Produto"), 14),
      quantidade: Number(p.quantidade) || 0,
      valor: Number(p.valor_total) || 0,
    })) ?? [];

  const evolucaoData = (graficos.evolucaoMensal as any[]).map((item: any) => ({
    mes: shortText(String(item.mes), 3),
    total: Number(item.Total) || 0,
  }));

  // CORREÇÃO: NÃO truncar o nome dos documentos por tipo
  const documentosPorTipo = (graficos.documentosPorTipo as any[]).map((item: any) => ({
    nome: String(item.nome), // Nome completo, sem truncamento
    quantidade: Number(item.quantidade),
    valor: Number(item.valor),
  }));

  const estadoLabel: Record<string, string> = {
    paga: "Pago", emitido: "Emitido", cancelado: "Cancelado",
    cancelada: "Cancelada", parcialmente_paga: "Parcial",
  };

  const documentosPorEstado: { estado: string; quantidade: number }[] = Object.values(
    (graficos.documentosPorEstado as any[]).reduce(
      (acc: Record<string, { estado: string; quantidade: number }>, item: any) => {
        const key = String(item.estado);
        if (!acc[key]) acc[key] = { estado: estadoLabel[key] ?? key, quantidade: 0 };
        acc[key].quantidade += Number(item.quantidade);
        return acc;
      },
      {}
    )
  );

  const displayProdutos = produtosData;
  const displayEvolucao = evolucaoData;
  const displayDocumentosTipo = documentosPorTipo;
  const displayDocumentosEstado = documentosPorEstado;

  /* ---- Shared chart config ---- */
  const tooltipStyle = {
    contentStyle: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      color: colors.secondary,
      fontSize: "11px",
      borderRadius: "8px",
    },
  };
  const gridStroke = theme === "dark" ? "#404040" : "#E5E7EB";
  const tickStyle = { fill: colors.textSecondary, fontSize: 11 };
  const pieColors = [colors.primary, colors.secondary, "#95a5a6", "#f39c12", "#e74c3c"];

  /* ---- KPI cards ---- */
  const kpiCards = [
    { href: "/dashboard/Vendas/relatorios", icon: DollarSign, label: "Total Faturado", value: formatKz(metricas.totalFaturado), helper: `${metricas.crescimento >= 0 ? "+" : ""}${metricas.crescimento.toFixed(1)}% vs mês anterior` },
    { href: "/dashboard/Clientes/Novo_cliente", icon: Users, label: "Clientes Ativos", value: formatNumber(metricas.totalClientes), helper: `+${data.clientes?.novos_mes || 0} no mês` },
    { href: "/dashboard/relatorios", icon: Clock, label: "Pendente", value: formatKz(metricas.totalPendente), helper: `${formatKz(data.pagamentos?.total_atrasado || 0)} em atraso` },
    { href: "/dashboard/Produtos_servicos/Stock", icon: Package, label: "Stock Baixo", value: formatNumber(metricas.produtosEmStockBaixo), helper: `${formatNumber(data.produtos?.ativos || 0)} produtos e serviços ativos` },
  ];

  /* ---- Render ---- */
  return (
    <MainEmpresa>
      <div className="space-y-4 sm:space-y-6 pb-8 transition-colors duration-300">
        {/* ---- KPI Cards com animações ---- */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: colors.secondary } as any}>
            Dashboard
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => router.push("/dashboard/Vendas/Nova_venda")}
              className="px-3 py-2 text-sm text-white flex items-center gap-2 transition-opacity cursor-pointer hover:opacity-80"
              style={{ backgroundColor: colors.secondary  }}
            >
              <ShoppingCart size={14} /> Nova Venda
            </button>
            <button
              onClick={() => router.push("/dashboard/Faturas/Fatura_Normal")}
              className="px-3 py-2 text-sm text-white flex items-center gap-2 transition-opacity cursor-pointer "
              style={{ backgroundColor: colors.primary }}
            >
              <FileText size={14} /> Nova Fatura
            </button>
            <button
              onClick={() => router.push("/dashboard/Faturas/Faturas_Proforma")}
              className="px-3 py-2 text-sm text-white flex items-center gap-2 transition-opacity cursor-pointer "
              style={{ backgroundColor: colors.fp }}
            >
              <FileText size={14} /> Nova Proforma
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpiCards.map(({ href, icon: Icon, label, value, helper }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href={href}
                className="p-3 sm:p-4 border block"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
              >
                <div className="flex items-center gap-3 sm:block">
                  <Icon style={{ color: theme === "dark" ? colors.secondary : colors.primary }} size={20} className="flex-shrink-0 sm:mb-2" />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm truncate" style={{ color: colors.textSecondary }}>{label}</div>
                    <div className="text-sm sm:text-xl font-bold truncate" style={{ color: colors.text }}>{value}</div>
                    {helper && <div className="text-[10px] mt-0.5 truncate" style={{ color: colors.textSecondary }}>{helper}</div>}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* ---- Row 1: Top Produtos + Evolução Mensal ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-3 sm:p-4 shadow border"
            style={{ backgroundColor: colors.card, borderColor: colors.border } as any}
          >
            <h2 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
              <Package style={{ color: colors.secondary }} size={18} />
              Top Produtos
            </h2>
            <div className="h-56 sm:h-72 lg:h-80 w-full">
              {displayProdutos.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayProdutos} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridStroke} />
                    <XAxis type="number" tick={tickStyle} stroke={colors.border} tickFormatter={formatCompact} />
                    <YAxis type="category" dataKey="nome" width={84} tick={tickStyle} stroke={colors.border} />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(value: any, name?: string | number) => (
                        (name || "") === "quantidade" ? [`${formatNumber(value)} unid.`, "Qtd"] : [formatKz(value), "Valor"]
                      )}
                    />
                    <Bar dataKey="quantidade" radius={[0, 4, 4, 0]} barSize={16}>
                      {displayProdutos.map((_: any, index: number) => (
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-3 sm:p-4 shadow border"
            style={{ backgroundColor: colors.card, borderColor: colors.border } as any}
          >
            <h2 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
              <TrendingUp style={{ color: colors.secondary }} size={18} />
              Evolução Mensal
            </h2>
            <div className="h-56 sm:h-72 lg:h-80 w-full">
              {displayEvolucao.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={displayEvolucao} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="mes" tick={tickStyle} stroke={colors.border} />
                    <YAxis
                      tickFormatter={(v: number) => formatCompact(v)}
                      width={48}
                      tick={tickStyle}
                      stroke={colors.border}
                    />
                    <Tooltip {...tooltipStyle} formatter={(v: any) => [formatKz(Number(v)), "Total"]} />
                    <Area type="monotone" dataKey="total" stroke={colors.secondary} fill="url(#colorTotal)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm" style={{ color: colors.textSecondary }}>
                  Sem dados de evolução mensal
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ---- Row 2: Docs por Tipo + Estado ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="p-3 sm:p-4 shadow border"
            style={{ backgroundColor: colors.card, borderColor: colors.border } as any}
          >
            <h2 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
              <Receipt style={{ color: colors.secondary }} size={18} />
              Docs por Tipo
            </h2>
            <div className="h-52 sm:h-64 w-full">
              {displayDocumentosTipo.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayDocumentosTipo} margin={{ top: 4, right: 8, left: 0, bottom: 60 }}>
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
                      {...tooltipStyle}
                      formatter={(value: any, name?: string | number) => (
                        (name || "") === "quantidade" ? [formatNumber(value), "Qtd"] : [formatKz(value), "Valor"]
                      )}
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="p-3 sm:p-4 shadow border"
            style={{ backgroundColor: colors.card, borderColor: colors.border } as any}
          >
            <h2 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
              <FileText style={{ color: colors.secondary }} size={18} />
              Docs por Estado
            </h2>
            <div className="h-44 sm:h-52 w-full">
              {displayDocumentosEstado.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={displayDocumentosEstado}
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
                      {displayDocumentosEstado.map((_: any, i: number) => (
                        <Cell key={i} fill={pieColors[i % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(value: any) => [`${formatNumber(value)} docs`, "Quantidade"]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm" style={{ color: colors.textSecondary }}>
                  Sem dados de documentos por estado
                </div>
              )}
            </div>
            {displayDocumentosEstado.length > 0 && (
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2 pt-3 border-t" style={{ borderColor: colors.border }}>
                {displayDocumentosEstado.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
                    <span className="text-xs" style={{ color: colors.textSecondary }}>
                      {item.estado}: {formatNumber(item.quantidade)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* ---- Row 3: Tabelas ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Últimas Vendas */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-3 sm:p-4 shadow border overflow-hidden"
            style={{ backgroundColor: colors.card, borderColor: colors.border } as any}
          >
            <h2 className="text-sm sm:text-base font-semibold mb-3" style={{ color: colors.text }}>Últimas Vendas</h2>
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[280px]">
                <thead>
                  <tr className="border-b" style={{ borderColor: colors.border }}>
                    {["Cliente", "Total", "Status", "Data"].map((h) => (
                      <th key={h} className="text-left px-2 py-1.5 text-xs font-medium whitespace-nowrap" style={{ color: colors.textSecondary }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.vendas?.ultimas as any[] | undefined)?.slice(0, 5).map((v: any, i: number) => (
                    <tr
                      key={i}
                      className="border-b last:border-0 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                      style={{ borderColor: colors.border }}
                    >
                      <td className="px-2 py-2 text-xs truncate max-w-[90px]" style={{ color: colors.text }} title={v.cliente ?? "-"}>
                        {shortText(String(v.cliente ?? "-"), 14)}
                      </td>
                      <td className="px-2 py-2 text-xs whitespace-nowrap" style={{ color: colors.text }}>
                        {formatKz(v.total ?? 0)}
                      </td>
                      <td className="px-2 py-2">
                        <StatusBadge status={v.status ?? ""} theme={theme} />
                      </td>
                      <td className="px-2 py-2 text-xs whitespace-nowrap" style={{ color: colors.textSecondary }}>
                        {formatDate(v.data)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link href="/dashboard/relatorios" className="block text-center mt-4 text-xs hover:underline" style={{ color: colors.secondary }}>
              Ver mais →
            </Link>
          </motion.div>

          {/* Últimos Documentos */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="p-3 sm:p-4 shadow border overflow-hidden"
            style={{ backgroundColor: colors.card, borderColor: colors.border } as any}
          >
            <h2 className="text-sm sm:text-base font-semibold mb-3" style={{ color: colors.text }}>Últimos Documentos</h2>
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[280px]">
                <thead>
                  <tr className="border-b" style={{ borderColor: colors.border }}>
                    {["Tipo", "Nº", "Total", "Estado"].map((h) => (
                      <th key={h} className="text-left px-2 py-1.5 text-xs font-medium whitespace-nowrap" style={{ color: colors.textSecondary }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.documentos_fiscais?.ultimos as any[] | undefined)?.slice(0, 5).map((d: any, i: number) => (
                    <tr
                      key={i}
                      className="border-b last:border-0 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                      style={{ borderColor: colors.border }}
                    >
                      <td className="px-2 py-2 text-xs truncate max-w-[80px]" style={{ color: colors.text }} title={d.tipo_nome ?? "-"}>
                        {shortText(String(d.tipo_nome ?? "-"), 12)}
                      </td>
                      <td className="px-2 py-2 text-xs whitespace-nowrap" style={{ color: colors.text }}>
                        {d.numero ?? "-"}
                      </td>
                      <td className="px-2 py-2 text-xs whitespace-nowrap" style={{ color: colors.text }}>
                        {formatKz(d.total ?? 0)}
                      </td>
                      <td className="px-2 py-2">
                        <StatusBadge status={d.estado ?? ""} theme={theme} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link href="/dashboard/Faturas/Faturas" className="block text-center mt-4 text-xs hover:underline" style={{ color: colors.secondary }}>
              Ver mais →
            </Link>
          </motion.div>
        </div>

      </div>
    </MainEmpresa>
  );
}