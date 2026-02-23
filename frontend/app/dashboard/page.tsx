'use client';

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  PieChart, Pie, Cell,
  ResponsiveContainer, Legend, CartesianGrid, Area, AreaChart
} from "recharts";
import {
  TrendingUp, Users, ShoppingCart,
  CreditCard, DollarSign, Package, AlertCircle,
  ArrowUpRight, ArrowDownRight, Receipt
} from "lucide-react";

import MainEmpresa from "@/app/components/MainEmpresa";
import { dashboardService } from "@/services/Dashboard";
import type { DashboardData, AlertasPendentes } from "@/services/Dashboard";

/* ================= CORES DO SISTEMA (APENAS 2) ================= */
const COLORS = {
  primary: "#123859",      // Azul escuro
  secondary: "#F9941F",    // Laranja âmbra
};

// Cores para gráficos usando apenas as duas cores do sistema + variações
const CHART_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  "#0f2b4c",      // Azul mais escuro
  "#ffb347",      // Laranja mais claro
  "#1a4a73",      // Azul médio
];

const PIE_COLORS = [COLORS.primary, COLORS.secondary, "#0f2b4c"];

/* ================= TIPOS AUXILIARES ================= */
interface KPIData {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
}

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ElementType;
}

/* ================= ANIMAÇÕES ================= */
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

/* ================= COMPONENTES ================= */

const SkeletonCard: React.FC = () => (
  <motion.div
    className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-[#E5E5E5]"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <div className="animate-pulse space-y-3 md:space-y-4">
      <div className="h-3 md:h-4 bg-[#123859]/10 rounded w-1/3"></div>
      <div className="h-6 md:h-8 bg-[#123859]/10 rounded w-2/3"></div>
      <div className="h-16 md:h-20 bg-[#123859]/10 rounded"></div>
    </div>
  </motion.div>
);

const AlertBanner: React.FC<{ alertas: AlertasPendentes | null }> = ({ alertas }) => {
  if (!alertas || alertas.total_alertas === 0) return null;

  return (
    <motion.div
      variants={itemVariants}
      className="bg-[#F9941F]/10 border border-[#F9941F] rounded-2xl p-4 mb-6"
    >
      <div className="flex items-center gap-3 mb-3">
        <AlertCircle size={20} className="text-[#F9941F]" />
        <h3 className="font-semibold text-[#123859]">Alertas do Sistema</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {alertas.vencidos?.quantidade > 0 && (
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <p className="text-xs text-[#123859]/60 mb-1">Vencidos</p>
            <p className="text-lg font-bold text-red-600">{alertas.vencidos.quantidade}</p>
            <p className="text-xs text-[#123859]/60">{dashboardService._formatarMoeda(alertas.vencidos.valor_total || 0)}</p>
          </div>
        )}

        {alertas.proximos_vencimento?.quantidade > 0 && (
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <p className="text-xs text-[#123859]/60 mb-1">Próximos (3 dias)</p>
            <p className="text-lg font-bold text-yellow-600">{alertas.proximos_vencimento.quantidade}</p>
            <p className="text-xs text-[#123859]/60">{dashboardService._formatarMoeda(alertas.proximos_vencimento.valor_total || 0)}</p>
          </div>
        )}

        {alertas.proformas_pendentes?.quantidade > 0 && (
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <p className="text-xs text-[#123859]/60 mb-1">Proformas Antigas</p>
            <p className="text-lg font-bold text-orange-600">{alertas.proformas_pendentes.quantidade}</p>
            <p className="text-xs text-[#123859]/60">{dashboardService._formatarMoeda(alertas.proformas_pendentes.valor_total || 0)}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const KPICard: React.FC<KPIData> = ({ title, value, change, icon: Icon }) => {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-[#E5E5E5] relative overflow-hidden group cursor-pointer"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-[#123859] transition-opacity duration-300" />

      <div className="flex items-start justify-between mb-2 md:mb-4">
        <div className="p-2 md:p-3 rounded-xl bg-[#123859]/10">
          <Icon size={20} className="text-[#123859] md:w-6 md:h-6" />
        </div>

        {change !== undefined && (
          <motion.div
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isPositive ? "bg-[#123859] text-white" :
                isNegative ? "bg-[#F9941F] text-white" : "bg-[#E5E5E5] text-[#123859]"
              }`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
          >
            {isPositive ? <ArrowUpRight size={12} /> :
              isNegative ? <ArrowDownRight size={12} /> : null}
            {Math.abs(change || 0)}%
          </motion.div>
        )}
      </div>

      <h3 className="text-[#123859]/60 text-xs md:text-sm font-medium mb-1">{title}</h3>
      <motion.p
        className="text-lg md:text-2xl font-bold text-[#123859] truncate"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        {value}
      </motion.p>
    </motion.div>
  );
};

const ChartCard: React.FC<ChartCardProps> = ({ title, children, className = "", icon: Icon }) => (
  <motion.div
    variants={itemVariants}
    className={`bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-[#E5E5E5] ${className}`}
    whileHover={{ boxShadow: "0 20px 25px -5px rgba(18, 56, 89, 0.1)" }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-center gap-2 mb-4 md:mb-6">
      {Icon && <Icon size={18} className="text-[#F9941F] md:w-5 md:h-5" />}
      <h3 className="font-semibold text-[#123859] text-base md:text-lg">{title}</h3>
    </div>
    {children}
  </motion.div>
);

const DataTable: React.FC<{
  title: string;
  columns: string[];
  data: (string | number)[][];
  maxRows?: number;
}> = ({ title, columns, data, maxRows = 5 }) => {
  const safeData = Array.isArray(data) ? data : [];
  const displayData = safeData.slice(0, maxRows);

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-[#E5E5E5] overflow-hidden"
      whileHover={{ y: -2 }}
    >
      <h3 className="font-semibold text-[#123859] mb-4 flex items-center gap-2 text-sm md:text-base">
        <Receipt size={16} className="text-[#F9941F] md:w-[18px] md:h-[18px]" />
        {title}
      </h3>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <table className="w-full text-xs md:text-sm min-w-[350px]">
          <thead>
            <tr className="border-b border-[#123859]/10">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="text-left p-2 md:p-3 font-medium text-[#123859]/60 uppercase text-[10px] md:text-xs tracking-wider"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {displayData.length > 0 ? (
                displayData.map((row, rowIdx) => (
                  <motion.tr
                    key={rowIdx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: rowIdx * 0.05 }}
                    className="border-b border-[#123859]/5 hover:bg-[#123859]/5 transition-colors"
                  >
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="p-2 md:p-3 text-[#123859]">
                        {cellIdx === 2 && typeof cell === 'string' ? (
                          <span className={`px-2 py-1 rounded-full text-[10px] md:text-xs font-medium ${cell.toLowerCase().includes('paga') ||
                              cell.toLowerCase().includes('faturada') ||
                              (cell.toLowerCase().includes('emitida') && cell.toLowerCase().includes('paga'))
                              ? 'bg-green-100 text-green-700' :
                              cell.toLowerCase().includes('pendente') ||
                                cell.toLowerCase().includes('emitida') ||
                                cell.toLowerCase().includes('aberta')
                                ? 'bg-[#F9941F] text-white' :
                                cell.toLowerCase().includes('cancelada') ||
                                  cell.toLowerCase().includes('anulado')
                                  ? 'bg-[#E5E5E5] text-[#123859]'
                                  : 'bg-[#E5E5E5] text-[#123859]'
                            }`}>
                            {cell}
                          </span>
                        ) : (
                          <span className="truncate block max-w-[100px] md:max-w-none">{cell}</span>
                        )}
                      </td>
                    ))}
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="p-6 md:p-8 text-center text-[#123859]/40">
                    Nenhum dado disponível
                  </td>
                </tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>

        {safeData.length > maxRows && (
          <motion.div
            className="text-center mt-4 text-xs md:text-sm text-[#F9941F] cursor-pointer hover:underline font-medium"
            whileHover={{ scale: 1.05 }}
          >
            Ver mais {safeData.length - maxRows} registros
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

/* ================= PÁGINA PRINCIPAL ================= */
export default function DashboardPage(): React.ReactElement {
  const [data, setData] = useState<DashboardData | null>(null);
  const [alertas, setAlertas] = useState<AlertasPendentes | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        // Buscar dados principais do dashboard
        const dashboardResponse = await dashboardService.fetch();

        if (dashboardResponse) {
          setData(dashboardResponse);
        } else {
          setError("Não foi possível carregar os dados do dashboard");
        }

        // Buscar alertas separadamente - não bloqueante
        try {
          const alertasResponse = await dashboardService.alertasPendentes();
          if (alertasResponse) {
            setAlertas(alertasResponse);
          }
        } catch (alertError) {
          console.warn("[DASHBOARD] Não foi possível carregar alertas:", alertError);
          // Não definir erro principal, apenas ignorar alertas
        }
      } catch (err) {
        setError("Erro ao conectar com o servidor");
        console.error("[DASHBOARD] Erro:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const processedData = useMemo(() => {
    if (!data) return null;

    const metricas = dashboardService.calcularMetricas(data);
    const graficos = dashboardService.prepararDadosGraficos(data);
    const kpisCards = dashboardService.getKPIsCards(data);

    return {
      metricas,
      graficos,
      kpisCards,
    };
  }, [data]);

  const formatKz = (v: number | string): string => {
    const num = Number(v) || 0;
    return new Intl.NumberFormat("pt-AO", {
      style: "currency",
      currency: "AOA",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num).replace("AOA", "Kz");
  };

  const formatDate = (d: string): string => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleDateString("pt-AO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const formatNumber = (n: number): string =>
    new Intl.NumberFormat("pt-AO").format(n || 0);

  // Formatter seguro para o Recharts
  const formatTooltipValue = (value: number): string => formatKz(value);

  const formatYAxisTick = (value: number): string => `Kz ${(Number(value) / 1000).toFixed(0)}k`;

  if (loading) {
    return (
      <MainEmpresa>
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {[...Array(5)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </MainEmpresa>
    );
  }

  if (error || !processedData || !data) {
    return (
      <MainEmpresa>
        <motion.div
          className="flex flex-col items-center justify-center min-h-[60vh] p-4 md:p-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="bg-white p-6 rounded-2xl text-center max-w-md shadow-sm border border-[#E5E5E5]">
            <AlertCircle size={48} className="text-[#F9941F] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#123859] mb-2">Erro ao carregar dashboard</h3>
            <p className="text-[#123859]/60 mb-4">{error || "Dados indisponíveis"}</p>
            <motion.button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#123859] text-white rounded-lg font-medium hover:bg-[#0f2b4c] transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Tentar novamente
            </motion.button>
          </div>
        </motion.div>
      </MainEmpresa>
    );
  }

  const { kpisCards } = processedData;

  return (
    <MainEmpresa>
      <motion.div
        className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-[1600px] mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#F9941F]">Dashboard</h1>
            <p className="text-[#123859]/60 mt-1 text-sm md:text-base">Visão geral do sistema em tempo real</p>
          </div>
          <motion.div
            className="flex items-center gap-2 px-3 py-2 bg-white rounded-full shadow-sm border border-[#E5E5E5] text-xs md:text-sm text-[#123859] w-fit"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Sistema Online
          </motion.div>
        </motion.div>

        {/* Alertas */}
        <AlertBanner alertas={alertas} />

        {/* KPIs Grid - Responsivo */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {kpisCards.map((kpi, index) => (
            <KPICard
              key={index}
              title={kpi.titulo}
              value={kpi.valor}
              change={kpi.variacao !== null ? kpi.variacao : undefined}
              icon={kpi.titulo === 'Total Faturado' ? DollarSign :
                kpi.titulo === 'Pendente' ? CreditCard :
                  kpi.titulo === 'Clientes Ativos' ? Users :
                    kpi.titulo === 'Ticket Médio' ? ShoppingCart :
                      Receipt}
            />
          ))}
        </div>

        {/* Gráfico Principal - Evolução Mensal */}
        <ChartCard
          title="Evolução Mensal"
          className="w-full"
          icon={TrendingUp}
        >
          <div className="h-[250px] md:h-[300px] lg:h-[400px] w-full min-w-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={processedData.graficos.evolucaoMensal}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#12385920" vertical={false} />
                <XAxis
                  dataKey="mes"
                  stroke="#12385960"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#12385960"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatYAxisTick}
                  width={60}
                />
                <RechartsTooltip
                  formatter={(value: number | undefined) => [formatTooltipValue(value || 0), "Total"]}
                  contentStyle={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    border: "1px solid #E5E5E5",
                    boxShadow: "0 10px 15px -3px rgba(18, 56, 89, 0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Total"
                  stroke={COLORS.primary}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Grid Secundário */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Pagamentos - Pie Chart */}
          <ChartCard title="Métodos de Pagamento" icon={CreditCard}>
            <div className="h-[250px] md:h-[300px] w-full min-w-[300px]">
              {processedData.graficos.pagamentosPorMetodo.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={processedData.graficos.pagamentosPorMetodo}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="valor"
                      nameKey="metodo"
                    >
                      {processedData.graficos.pagamentosPorMetodo.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number | undefined) => formatTooltipValue(value || 0)}
                      contentStyle={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        border: "1px solid #E5E5E5",
                        boxShadow: "0 10px 15px -3px rgba(18, 56, 89, 0.1)",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      formatter={(value: string) => (
                        <span className="text-[#123859] text-xs md:text-sm">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-[#123859]/40">
                  Sem dados de pagamento
                </div>
              )}
            </div>

            {/* Resumo numérico abaixo do gráfico */}
            {processedData.graficos.pagamentosPorMetodo.length > 0 && (
              <div className="grid grid-cols-3 gap-2 md:gap-4 mt-4 pt-4 border-t border-[#123859]/10">
                {processedData.graficos.pagamentosPorMetodo.map((item, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-[10px] md:text-xs text-[#123859]/60 mb-1">{item.metodo}</p>
                    <p className="font-semibold text-[#123859] text-xs md:text-base">{formatKz(item.valor)}</p>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>

          {/* Produtos Mais Vendidos - Bar Chart */}
          <ChartCard title="Top Produtos Mais Vendidos" icon={Package}>
            <div className="h-[250px] md:h-[300px] w-full min-w-[300px]">
              {data.indicadores.produtosMaisVendidos.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.indicadores.produtosMaisVendidos.slice(0, 5)}
                    layout="vertical"
                    margin={{ left: 10, right: 20, top: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#12385920" />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="produto"
                      type="category"
                      width={80}
                      tick={{ fontSize: 10, fill: COLORS.primary }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip
                      cursor={{ fill: "transparent" }}
                      contentStyle={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        border: "1px solid #E5E5E5",
                        boxShadow: "0 10px 15px -3px rgba(18, 56, 89, 0.1)",
                      }}
                      formatter={(value: number | undefined, name?: string) => {
                        if (name === 'quantidade') return [value, 'Quantidade'];
                        return [formatKz(value || 0), 'Valor'];
                      }}
                    />
                    <Bar
                      dataKey="quantidade"
                      fill={COLORS.secondary}
                      radius={[0, 6, 6, 0]}
                      barSize={24}
                    >
                      {data.indicadores.produtosMaisVendidos.slice(0, 5).map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === 0 ? COLORS.secondary : `${COLORS.secondary}${Math.max(40, 90 - index * 15)}`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-[#123859]/40">
                  Sem dados de produtos
                </div>
              )}
            </div>
          </ChartCard>
        </div>

        {/* Tabelas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <DataTable
            title="Últimas Vendas"
            columns={["Cliente", "Total", "Status", "Data"]}
            data={data.vendas.ultimas.map(v => [
              v?.cliente || "-",
              formatKz(v?.total || 0),
              v?.status || "-",
              v?.data || "-",
            ])}
          />

          <DataTable
            title="Últimos Documentos"
            columns={["Tipo", "Nº Documento", "Total", "Estado"]}
            data={data.documentos_fiscais.ultimos.map(d => [
              d?.tipo_nome || "-",
              d?.numero || "-",
              formatKz(d?.total || 0),
              d?.estado || "-",
            ])}
          />
        </div>
      </motion.div>
    </MainEmpresa>
  );
}