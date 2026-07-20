"use client";

import { useEffect, useState } from "react";
import { useLandlordAuth } from "@/context/LandlordAuthContext";
import { useThemeColors } from "@/context/ThemeContext"
import { analyticsApi } from "@/services/axios";
import { pagamentoService } from "@/services/pagamentosplanos";
import { DollarSign, RefreshCw, AlertCircle, Award, BarChart3, Coins, } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";

// ============================================================
// TIPOS (alinhados com o controller)
// ============================================================
interface AnalyticsData {
  // Gerais
  total_empresas: number;
  empresas_ativas: number;
  empresas_suspensas: number;

  // Financeiras
  mrr: number;
  receita_total: number;
  ticket_medio: number;
  ltv: number;
  net_new_mrr: number;
  mrr_por_plano: { nome: string; total: number }[];

  // Crescimento
  novos_registos: { mes: string; total: number }[];
  crescimento_percentual: number;
  churn_rate: number;

  // Operacionais
  subscricoes_ativas: number;
  taxa_renovacao: number;
  pagamentos_em_analise: number;
  distribuicao_planos: { nome: string; total: number; percentagem: number }[];

  // Distribuição por regime
  por_regime_fiscal: { regime: string; total: number }[];

  // Pagamentos (últimos 30 dias)
  pagamentos_por_status: {
    em_analise: number;
    aprovado: number;
    rejeitado: number;
  };

  // Top planos
  top_planos: { nome: string; total: number }[];

  // Geográficas
  empresas_por_provincia: { provincia: string; total: number }[];
}

// ============================================================
// CORES
// ============================================================
const CORES_PIZZA = ["#123859", "#F9941F", "#22c55e", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function AnalyticsPage() {
  const { user, loading: authLoading } = useLandlordAuth();
  const colors = useThemeColors();

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await analyticsApi.resumo();
      setData(response.data.data);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao carregar dados de analytics");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const response = await pagamentoService.listar({ status: "em_analise" });
      setPendingCount(response.pagamentos?.length || 0);
    } catch {
      setPendingCount(0); // evita ficar em "..." para sempre em caso de erro
    }
  };

  useEffect(() => {
    if (user) {
      fetchAnalytics();
      fetchPendingCount();
    }
  }, [user]);

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 }).format(valor);

  const formatarPercentagem = (valor: number) =>
    new Intl.NumberFormat("pt-AO", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(valor / 100);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="text-center">
          <RefreshCw className="animate-spin w-10 h-10 mx-auto mb-4" style={{ color: colors.primary }} />
          <p style={{ color: colors.textSecondary }}>A carregar informações...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="rounded-xl" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <AlertCircle className="text-red-500 shrink-0" size={24} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold mb-1" style={{ color: colors.text }}>
                Não foi possível carregar as informações
              </p>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                {error || "Sem dados disponíveis"}
              </p>
            </div>
            <Button
              onClick={fetchAnalytics}
              className="w-full sm:w-auto shrink-0"
              style={{ backgroundColor: colors.primary, color: "#fff" }}>
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Preparar dados para gráficos
  const pagamentosData = [
    { name: "Aprovados", value: data.pagamentos_por_status.aprovado, color: colors.primary },
    { name: "Pendentes", value: data.pagamentos_por_status.em_analise, color: colors.warning },
    { name: "Rejeitados", value: data.pagamentos_por_status.rejeitado, color: colors.secondary },
  ];

  const mrrPorPlanoData = data.mrr_por_plano?.length ? data.mrr_por_plano : [{ nome: "Sem dados", total: 0 }];

  const distribuicaoPlanosData = data.distribuicao_planos?.length
    ? data.distribuicao_planos
    : [{ nome: "Sem dados", total: 0, percentagem: 0 }];

  return (
    <div className="space-y-5 sm:space-y-6 max-w-[1600px] mx-auto">
      {/* ============================================================
                CABEÇALHO
                ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight" style={{ color: colors.secondary }}>
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm lg:text-base mt-1" style={{ color: colors.textSecondary }}>
            Visão geral do desempenho da plataforma
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchAnalytics}
          className="rounded-lg w-full sm:w-auto shrink-0"
          style={{ borderColor: colors.border, color: colors.blue }}>
          <RefreshCw size={16} className="mr-2" />
          Atualizar
        </Button>
      </div>

      {/* ============================================================
                CARDS DE MÉTRICAS FINANCEIRAS
                ============================================================ */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Receita Recorrente Mensal (MRR) */}
        <div
          className="relative overflow-hidden cursor-help"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
          title="Receita Recorrente Mensal – soma dos valores mensais dos planos ativos no mês atual">
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: colors.secondary }} />
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-medium truncate" style={{ color: colors.textSecondary }}>
                  Receita Recorrente Mensal
                </p>
                <p className="text-base sm:text-lg font-bold mt-0.5 truncate" style={{ color: colors.secondary }}>
                  {formatarMoeda(data.mrr)}
                </p>
                {/* evolocao
                <div className="flex items-center gap-1 mt-0.5">
                  {data.net_new_mrr >= 0 ? (
                    <TrendingUp size={11} className="shrink-0" style={{ color: colors.success }} />
                  ) : (
                    <TrendingDown size={11} className="shrink-0" style={{ color: colors.danger }} />
                  )}
                  <span
                    className="text-[10px] sm:text-[11px] font-medium truncate"
                    style={{ color: data.net_new_mrr >= 0 ? colors.success : colors.danger }}>
                    {formatarMoeda(data.net_new_mrr)}
                  </span>
                </div>*/}
              </div>
              <div className="p-2 rounded-full shrink-0" style={{ backgroundColor: `${colors.secondary}15` }}>
                <DollarSign size={18} style={{ color: colors.secondary }} />
              </div>
            </div>
          </div>
        </div>

        {/* Receita Total (YTD) */}
        <div
          className="relative overflow-hidden cursor-help"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
          title="Receita total acumulada desde o início do ano">
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: colors.primary }} />
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-medium truncate" style={{ color: colors.textSecondary }}>
                  Receita Acumulada no Ano
                </p>
                <p className="text-base sm:text-lg font-bold mt-0.5 truncate" style={{ color: colors.primary }}>
                  {formatarMoeda(data.receita_total)}
                </p>
              </div>
              <div className="p-2 rounded-full shrink-0" style={{ backgroundColor: `${colors.primary}20` }}>
                <Coins size={18} style={{ color: colors.primary }} />
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Médio */}
        <div
          className="relative overflow-hidden cursor-help"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
          title="Valor médio de cada pagamento confirmado">
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: colors.secondary }} />
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-medium truncate" style={{ color: colors.textSecondary }}>
                  Valor Médio por Pagamento
                </p>
                <p className="text-base sm:text-lg font-bold mt-0.5 truncate" style={{ color: colors.secondary }}>
                  {formatarMoeda(data.ticket_medio)}
                </p>
              </div>
              <div className="p-2 rounded-full shrink-0" style={{ backgroundColor: `${colors.secondary}20` }}>
                <BarChart3 size={18} style={{ color: colors.secondary }} />
              </div>
            </div>
          </div>
        </div>

        {/* Valor do Cliente ao Longo do Tempo (LTV) */}
        <div
          className="relative overflow-hidden cursor-help"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
          title="Valor médio que cada empresa gera para a plataforma ao longo de todo o tempo em que permanece cliente">
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: colors.primary }} />
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-medium truncate" style={{ color: colors.textSecondary }}>
                  Valor do Cliente no Tempo
                </p>
                <p className="text-base sm:text-lg font-bold mt-0.5 truncate" style={{ color: colors.primary }}>
                  {formatarMoeda(data.ltv)}
                </p>
              </div>
              <div className="p-2 rounded-full shrink-0" style={{ backgroundColor: `${colors.primary}20` }}>
                <Award size={18} style={{ color: colors.primary }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Segunda linha de cards operacionais (com tooltips) */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div
          className=" p-3 sm:p-4 cursor-help"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
          title="Número total de subscrições atualmente ativas">
          <p className="text-[11px] sm:text-xs font-medium truncate" style={{ color: colors.textSecondary }}>
            Subscrições Ativas
          </p>
          <p className="text-lg sm:text-xl font-bold mt-0.5" style={{ color: colors.blue }}>
            {data.subscricoes_ativas}
          </p>
        </div>

        <div
          className=" p-3 sm:p-4 cursor-help"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
          title="Percentagem de subscrições ativas com renovação automática ativada">
          <p className="text-[11px] sm:text-xs font-medium truncate" style={{ color: colors.textSecondary }}>
            Renovação Automática
          </p>
          <p className="text-lg sm:text-xl font-bold mt-0.5" style={{ color: colors.blue }}>
            {data.taxa_renovacao}%
          </p>
        </div>

        <div
          className=" p-3 sm:p-4 cursor-help xs:col-span-2 lg:col-span-1"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
          title="Percentagem de empresas que cancelaram a subscrição no último mês">
          <p className="text-[11px] sm:text-xs font-medium truncate" style={{ color: colors.textSecondary }}>
            Taxa de Cancelamento (mensal)
          </p>
          <p className="text-lg sm:text-xl font-bold mt-0.5" style={{ color: colors.secondary }}>
            {formatarPercentagem(data.churn_rate)}
          </p>
        </div>

        <div
          className=" p-3 sm:p-4 cursor-help xs:col-span-2 lg:col-span-1"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
          title="Número de pagamentos pendentes de aprovação (em análise) ">
          <div>
            <p className="text-[11px] sm:text-xs font-medium truncate" style={{ color: colors.textSecondary }}>
              Pendentes
            </p>
            <p className="text-lg sm:text-xl font-bold mt-0.5" style={{ color: colors.secondary }}>
              {pendingCount !== null ? pendingCount : "..."}
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================
                GRÁFICOS (3 colunas)
                ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {/* Novos Registos */}
        <Card className=" shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <CardContent className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold mb-4" style={{ color: colors.blue }}>
              Novas Empresas Registadas (últimos 6 meses)
            </h2>
            <div className="w-full h-52 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.novos_registos} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: colors.textSecondary }} />
                  <YAxis tick={{ fontSize: 11, fill: colors.textSecondary }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: 8,
                      fontSize: 12,
                      color: colors.blue,
                    }}
                  />
                  <Area type="monotone" dataKey="total" stroke={colors.blue} fill={colors.primary} fillOpacity={0.15} name="Empresas" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Receita Recorrente por Plano */}
        <Card className=" shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <CardContent className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold mb-4" style={{ color: colors.blue }}>
              Receita Recorrente por Plano
            </h2>
            <div className="w-full h-52 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mrrPorPlanoData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: colors.textSecondary }} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: colors.textSecondary }} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: 8, fontSize: 12 }}
                    formatter={(value: any) => formatarMoeda(value)}
                  />
                  <Bar dataKey="total" fill={colors.secondary} radius={[0, 6, 6, 0]} name="Receita mensal" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================
                SEGUNDA LINHA DE GRÁFICOS (2 colunas)
                ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {/* Pagamentos por status */}
        <Card className=" shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <CardContent className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold mb-4" style={{ color: colors.blue }}>
              Pagamentos (últimos 30 dias)
            </h2>
            <div className="w-full h-60 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pagamentosData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    label={({ percent }) => (typeof percent === "number" && percent > 0 ? `${(percent * 100).toFixed(0)}%` : "")}
                    labelLine={false}>
                    {pagamentosData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: 8, fontSize: 12 }}
                    formatter={(value: any, name: any) => [value, name ?? ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Empresas por Regime Fiscal */}
        <Card className=" shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <CardContent className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold mb-4" style={{ color: colors.blue }}>
              Empresas por Regime Fiscal
            </h2>
            <div className="w-full h-60 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.por_regime_fiscal} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                  <XAxis dataKey="regime" tick={{ fontSize: 11, fill: colors.textSecondary }} />
                  <YAxis tick={{ fontSize: 12, fill: colors.textSecondary }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="total" fill={colors.secondary} radius={[6, 6, 0, 0]} name="Empresas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================
                TERCEIRA LINHA: Top Planos + Províncias
             ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {/* PLANOS MAIS SUBSCRITOS */}
        <Card className=" shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Award size={18} style={{ color: colors.blue }} />
              <h2 className="text-sm font-semibold" style={{ color: colors.blue }}>
                Planos Mais Subscritos
              </h2>
            </div>
            {data.top_planos.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: colors.textSecondary }}>
                Sem subscrições ainda
              </p>
            ) : (
              <div className="w-full h-60 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.top_planos} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: colors.textSecondary }} />
                    <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: colors.textSecondary }} width={80} />
                    <Tooltip contentStyle={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="total" fill={colors.primary} radius={[0, 6, 6, 0]} name="Subscrições" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className=" shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <CardContent className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold mb-4" style={{ color: colors.blue }}>
              Distribuição de Planos
            </h2>
            <div className="w-full h-52 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribuicaoPlanosData}
                    dataKey="total"
                    nameKey="nome"
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    label={({ percent }) => (typeof percent === "number" && percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : "")}
                    labelLine={false}>
                    {distribuicaoPlanosData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CORES_PIZZA[index % CORES_PIZZA.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: 8, fontSize: 12 }}
                    formatter={(value: any, name: any, props: any) => [`${value} (${props.payload.percentagem}%)`, name ?? ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
