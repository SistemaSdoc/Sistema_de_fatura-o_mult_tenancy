"use client";

import { useEffect, useState } from "react";
import { Users, DollarSign, Package, FileText, AlertTriangle, RefreshCw, Clock } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/authprovider";

import MainEmpresa from "@/app/components/MainEmpresa";
import { dashboardService, DashboardData as ServiceDashboardData } from "@/services/Dashboard";
import { useThemeColors, useTheme } from "@/context/ThemeContext";
import { usePathname, useRouter } from "next/navigation";
import type { TooltipProps } from "recharts";

const DashboardCharts = dynamic(() => import("../components/DashboardCharts").then((mod) => mod.DashboardCharts), {
  ssr: false,
  loading: () => <div className="h-[28rem] animate-pulse rounded border" />,
});

/* ==================== TIPOS LOCAIS ==================== */
interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  danger: string;
  success: string;
  warning: string;
  error: string;
  hover?: string;
  fp: string;
}

// Re-exportar o tipo do serviço para consistência
type DashboardData = ServiceDashboardData;

// Dados para gráficos
interface ProdutoItem {
  nome: string;
  quantidade: number;
  valor: number;
}

interface EvolucaoItem {
  mes: string;
  total: number;
}

interface EstadoDocumento {
  estado: string;
  quantidade: number;
}

// Props para skeletons
interface SkeletonProps {
  colors: ThemeColors;
  tall?: boolean;
}

interface EstadoDocumento extends Record<string, unknown> {
  estado: string;
  quantidade: number;
}

type BadgeVariant = "green" | "yellow" | "blue" | "red" | "orange" | "gray";

/* ==================== HELPERS ==================== */
const formatKz = (v: number | string): string => {
  const num = Number(v) || 0;
  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
    .format(num)
    .replace("AOA", "Kz");
};

const formatNumber = (value: number): string => new Intl.NumberFormat("pt-PT").format(value || 0);

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
const SkeletonCard = ({ colors }: SkeletonProps) => (
  <div className="p-3 sm:p-4 rounded-xl shadow border animate-pulse" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg mb-2 sm:mb-3" style={{ background: colors.border }} />
    <div className="h-3 sm:h-4 rounded w-16 sm:w-20 mb-1 sm:mb-2" style={{ background: colors.border }} />
    <div className="h-4 sm:h-6 rounded w-20 sm:w-24" style={{ background: colors.border }} />
  </div>
);

const SkeletonChart = ({ colors, tall = false }: SkeletonProps) => (
  <div className="p-3 sm:p-4 rounded-xl shadow border animate-pulse" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
    <div className="h-5 sm:h-6 rounded w-32 sm:w-40 mb-3 sm:mb-4" style={{ backgroundColor: colors.border }} />
    <div className={`rounded ${tall ? "h-56 sm:h-72" : "h-48 sm:h-60"}`} style={{ background: colors.hover }} />
  </div>
);

const SkeletonTable = ({ colors }: SkeletonProps) => (
  <div className="p-3 sm:p-4 rounded-xl shadow border animate-pulse" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
    <div className="h-5 sm:h-6 rounded w-24 sm:w-32 mb-3 sm:mb-4" style={{ backgroundColor: colors.border }} />
    <div className="space-y-2 sm:space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-6 sm:h-8 rounded" style={{ background: colors.hover }} />
      ))}
    </div>
  </div>
);

/* ==================== STATUS BADGE ==================== */
const badgeClasses: Record<BadgeVariant, { dark: string; light: string }> = {
  green: { dark: "bg-green-900/50 text-green-300", light: "bg-green-100 text-green-700" },
  yellow: { dark: "bg-yellow-900/50 text-yellow-300", light: "bg-yellow-100 text-yellow-700" },
  blue: { dark: "bg-blue-900/50 text-blue-300", light: "bg-blue-100 text-blue-700" },
  red: { dark: "bg-red-900/50 text-red-300", light: "bg-red-100 text-red-700" },
  orange: { dark: "bg-orange-900/50 text-orange-300", light: "bg-orange-100 text-orange-700" },
  gray: { dark: "bg-gray-800 text-gray-300", light: "bg-gray-100 text-gray-600" },
};

const statusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  faturada: { label: "Facturada", variant: "green" },
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
  const cls = badgeClasses[entry.variant];
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${theme === "dark" ? cls.dark : cls.light}`}>{entry.label}</span>;
};

/* ==================== MAIN COMPONENT ==================== */
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const colors = useThemeColors() as ThemeColors;
  const { theme } = useTheme();
  const { user } = useAuth();
  const userRole = user?.role || "";

  const carregarDashboard = async () => {
    setError(null);
    try {
      const dashboard = await dashboardService.fetch();
      if (!dashboard) {
        setData(null);
        setError("Não foi possível carregar o dashboard.");
        return;
      }
      setData(dashboard);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDashboard();
  }, []);

  useEffect(() => {
    if (!user) return;

    const dashboardAllowedRoles = ["admin", "contablista"];
    if (dashboardAllowedRoles.includes(userRole)) return;

    const redirectTo =
      userRole === "operador" ? "/dashboard/Vendas/Nova_venda" : userRole === "gestor" ? "/dashboard/Produtos_servicos/Stock" : "/login";

    if (userRole !== "admin" && pathname === "/dashboard") {
      router.replace(redirectTo);
    }
  }, [pathname, router, user, userRole]);

  const allowedRoles = ["admin", "gestor", "operador"];
  const canShowButtons = userRole && allowedRoles.includes(userRole);

  if (loading) {
    return (
      <MainEmpresa>
        <div className="space-y-4 sm:space-y-6 pb-8">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: colors.secondary }}>
            Dashboard
          </h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} colors={colors} />
            ))}
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

  if (error || !data) {
    return (
      <MainEmpresa>
        <div className="flex flex-col items-center justify-center py-16 gap-4" style={{ color: "#EF4444" }}>
          <AlertTriangle size={32} color="#EF4444" />
          <p className="text-sm sm:text-base">Erro: {error || "Sem dados"}</p>
          <button
            onClick={carregarDashboard}
            className="px-4 py-2 text-sm rounded-lg text-white flex items-center gap-2"
            style={{ background: colors.primary }}>
            <RefreshCw size={14} /> Tentar novamente
          </button>
        </div>
      </MainEmpresa>
    );
  }

  // Dados preparados pelos serviços
  const metricas = dashboardService.calcularMetricas(data);
  const graficos = dashboardService.prepararDadosGraficos(data);

  const produtosData: ProdutoItem[] = (data.indicadores?.produtosMaisVendidos || []).slice(0, 5).map((p) => ({
    nome: shortText(String(p.produto ?? "Produto"), 14),
    quantidade: Number(p.quantidade) || 0,
    valor: Number(p.valor_total) || 0,
  }));

  const evolucaoData: EvolucaoItem[] = graficos.evolucaoMensal.map((item) => ({
    mes: shortText(String(item.mes), 3),
    total: Number(item.Total) || 0,
  }));

  const documentosPorTipo: { nome: string; quantidade: number; valor: number }[] = graficos.documentosPorTipo.map((item) => ({
    nome: String(item.nome),
    quantidade: Number(item.quantidade),
    valor: Number(item.valor),
  }));

  const estadoLabel: Record<string, string> = {
    paga: "Pago",
    emitido: "Emitido",
    cancelado: "Cancelado",
    cancelada: "Cancelada",
    parcialmente_paga: "Parcial",
  };

  const documentosPorEstado: EstadoDocumento[] = Object.values(
    graficos.documentosPorEstado.reduce<Record<string, EstadoDocumento>>((acc, item) => {
      const key = String(item.estado);
      if (!acc[key]) acc[key] = { estado: estadoLabel[key] ?? key, quantidade: 0 };
      acc[key].quantidade += Number(item.quantidade);
      return acc;
    }, {})
  );

  // ✅ Configuração de tooltip com tipo correto
  const tooltipStyle: TooltipProps<number, string>["contentStyle"] = {
    backgroundColor: colors.card,
    borderColor: colors.border,
    color: colors.secondary,
    fontSize: "11px",
    borderRadius: "8px",
  };

  // ✅ Formatters com assinatura correta para Recharts
  const formatterQuantidade = (value: number | string | null | undefined): [string, string] => {
    const num = Number(value ?? 0);
    return [`${formatNumber(num)} unid.`, "Quantidade"];
  };

  const formatterValor = (value: number | string | null | undefined): [string, string] => {
    const num = Number(value ?? 0);
    return [formatKz(num), "Valor"];
  };

  const formatterDocsQuantidade = (value: number | string | null | undefined): [string, string] => {
    const num = Number(value ?? 0);
    return [`${formatNumber(num)} docs`, "Quantidade"];
  };

  const formatterTotal = (value: number | string | null | undefined): [string, string] => {
    const num = Number(value ?? 0);
    return [formatKz(num), "Total"];
  };

  const gridStroke = theme === "dark" ? "#404040" : "#E5E7EB";
  const tickStyle = { fill: colors.textSecondary, fontSize: 11 };
  const pieColors = [colors.primary, colors.secondary, "#95a5a6", "#f39c12", "#e74c3c"];

  const kpiCards: Array<{
    href: string;
    icon: React.ElementType;
    label: string;
    value: string;
    helper: string;
  }> = [
    {
      href: "/dashboard/relatorios",
      icon: DollarSign,
      label: "Total Facturado",
      value: formatKz(metricas.totalFaturado),
      helper: `${metricas.crescimento >= 0 ? "+" : ""}${metricas.crescimento.toFixed(1)}% vs mês anterior`,
    },
    {
      href: "/dashboard/Clientes/Novo_cliente",
      icon: Users,
      label: "Clientes Ativos",
      value: formatNumber(metricas.totalClientes),
      helper: `+${data.clientes?.novos_mes || 0} no mês`,
    },
    {
      href: "/dashboard/relatorios",
      icon: Clock,
      label: "Pendente",
      value: formatKz(metricas.totalPendente),
      helper: `${formatKz(data.pagamentos?.total_atrasado || 0)} em atraso`,
    },
    {
      href: "/dashboard/Produtos_servicos/Stock",
      icon: Package,
      label: "Stock Baixo",
      value: formatNumber(metricas.produtosEmStockBaixo),
      helper: `${formatNumber(data.produtos?.ativos || 0)} produtos e serviços ativos`,
    },
  ];

  return (
    <MainEmpresa>
      <div className="space-y-4 sm:space-y-6 pb-8 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: colors.secondary }}>
            Dashboard
          </h1>
          {canShowButtons && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => router.push("/dashboard/Vendas/Nova_venda")}
                className="px-3 py-2 text-sm text-white flex items-center gap-2 transition-opacity cursor-pointer hover:opacity-80"
                style={{ backgroundColor: colors.secondary }}>
                <FileText size={14} /> Gerar factura-recibo
              </button>
              <button
                onClick={() => router.push("/dashboard/Faturas/Fatura_Normal")}
                className="px-3 py-2 text-sm text-white flex items-center gap-2 transition-opacity cursor-pointer"
                style={{ backgroundColor: colors.primary }}>
                <FileText size={14} /> Gerar Factura
              </button>
              <button
                onClick={() => router.push("/dashboard/Faturas/Faturas_Proforma")}
                className="px-3 py-2 text-sm text-white flex items-center gap-2 transition-opacity cursor-pointer"
                style={{ backgroundColor: colors.secondary }}>
                <FileText size={14} /> Gerar Proforma
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpiCards.map(({ href, icon: Icon, label, value, helper }, i) => (
            <div
              key={label}
              className="transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ transitionDelay: `${i * 30}ms` }}>
              <Link href={href} className="p-3 sm:p-4 border block" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="flex items-center gap-3 sm:block">
                  <Icon
                    style={{ color: theme === "dark" ? colors.secondary : colors.primary }}
                    size={20}
                    className="flex-shrink-0 sm:mb-2"
                  />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm truncate" style={{ color: colors.textSecondary }}>
                      {label}
                    </div>
                    <div className="text-sm sm:text-xl font-bold truncate" style={{ color: colors.text }}>
                      {value}
                    </div>
                    {helper && (
                      <div className="text-[10px] mt-0.5 truncate" style={{ color: colors.textSecondary }}>
                        {helper}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        <DashboardCharts
          colors={{ ...colors, hover: colors.hover ?? colors.primary }}
          produtosData={produtosData}
          evolucaoData={evolucaoData}
          documentosPorTipo={documentosPorTipo}
          documentosPorEstado={documentosPorEstado}
          tooltipStyle={tooltipStyle}
          gridStroke={gridStroke}
          tickStyle={tickStyle}
          pieColors={pieColors}
          formatNumber={formatNumber}
          formatCompact={formatCompact}
          formatterQuantidade={formatterQuantidade}
          formatterValor={formatterValor}
          formatterDocsQuantidade={formatterDocsQuantidade}
          formatterTotal={formatterTotal}
        />

        {/* Row 3: Tabelas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-3 sm:p-4 shadow border overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <h2 className="text-sm sm:text-base font-semibold mb-3" style={{ color: colors.text }}>
              Últimas Vendas
            </h2>
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[280px]">
                <thead>
                  <tr className="border-b" style={{ borderColor: colors.border }}>
                    <th className="text-left px-2 py-1.5 text-xs font-medium whitespace-nowrap" style={{ color: colors.textSecondary }}>
                      Cliente
                    </th>
                    <th className="text-left px-2 py-1.5 text-xs font-medium whitespace-nowrap" style={{ color: colors.textSecondary }}>
                      Total
                    </th>
                    <th className="text-left px-2 py-1.5 text-xs font-medium whitespace-nowrap" style={{ color: colors.textSecondary }}>
                      Status
                    </th>
                    <th className="text-left px-2 py-1.5 text-xs font-medium whitespace-nowrap" style={{ color: colors.textSecondary }}>
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data.vendas?.ultimas || []).slice(0, 5).map((venda, i) => (
                    <tr
                      key={i}
                      className="border-b last:border-0 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                      style={{ borderColor: colors.border }}>
                      <td className="px-2 py-2 text-xs truncate max-w-[90px]" style={{ color: colors.text }} title={venda.cliente ?? "-"}>
                        {shortText(String(venda.cliente ?? "-"), 14)}
                      </td>
                      <td className="px-2 py-2 text-xs whitespace-nowrap" style={{ color: colors.text }}>
                        {formatKz(venda.total ?? 0)}
                      </td>
                      <td className="px-2 py-2">
                        <StatusBadge status={venda.status ?? ""} theme={theme} />
                      </td>
                      <td className="px-2 py-2 text-xs whitespace-nowrap" style={{ color: colors.textSecondary }}>
                        {formatDate(venda.data)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link
              href="/dashboard/relatorios"
              className="block text-center mt-4 text-xs hover:underline"
              style={{ color: colors.secondary }}>
              Ver mais →
            </Link>
          </div>

          <div className="p-3 sm:p-4 shadow border overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <h2 className="text-sm sm:text-base font-semibold mb-3" style={{ color: colors.text }}>
              Últimos Documentos
            </h2>
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[280px]">
                <thead>
                  <tr className="border-b" style={{ borderColor: colors.border }}>
                    <th className="text-left px-2 py-1.5 text-xs font-medium whitespace-nowrap" style={{ color: colors.textSecondary }}>
                      Tipo
                    </th>
                    <th className="text-left px-2 py-1.5 text-xs font-medium whitespace-nowrap" style={{ color: colors.textSecondary }}>
                      Nº
                    </th>
                    <th className="text-left px-2 py-1.5 text-xs font-medium whitespace-nowrap" style={{ color: colors.textSecondary }}>
                      Total
                    </th>
                    <th className="text-left px-2 py-1.5 text-xs font-medium whitespace-nowrap" style={{ color: colors.textSecondary }}>
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data.documentos_fiscais?.ultimos || []).slice(0, 5).map((doc, i) => (
                    <tr
                      key={i}
                      className="border-b last:border-0 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                      style={{ borderColor: colors.border }}>
                      <td className="px-2 py-2 text-xs truncate max-w-[80px]" style={{ color: colors.text }} title={doc.tipo_nome ?? "-"}>
                        {shortText(String(doc.tipo_nome ?? "-"), 12)}
                      </td>
                      <td className="px-2 py-2 text-xs whitespace-nowrap" style={{ color: colors.text }}>
                        {doc.numero ?? "-"}
                      </td>
                      <td className="px-2 py-2 text-xs whitespace-nowrap" style={{ color: colors.text }}>
                        {formatKz(doc.total ?? 0)}
                      </td>
                      <td className="px-2 py-2">
                        <StatusBadge status={doc.estado ?? ""} theme={theme} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link
              href="/dashboard/Faturas/Faturas"
              className="block text-center mt-4 text-xs hover:underline"
              style={{ color: colors.secondary }}>
              Ver mais →
            </Link>
          </div>
        </div>
      </div>
    </MainEmpresa>
  );
}
