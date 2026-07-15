"use client";

import { useEffect, useState } from "react";
import { useLandlordAuth } from "@/context/LandlordAuthContext";
import { useThemeColors } from "@/context/ThemeContext";
import { analyticsApi } from "@/services/axios";
import {
    TrendingUp,
    TrendingDown,
    Building2,
    CheckCircle,
    XCircle,
    DollarSign,
    RefreshCw,
    AlertCircle,
    Award,
    Users,
    Clock,
    PieChart as PieChartIcon,
    BarChart3,
    Calendar,
    Coins,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    LineChart,
    Line,
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

    // Utilização
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

    useEffect(() => {
        if (user) fetchAnalytics();
    }, [user]);

    const formatarMoeda = (valor: number) =>
        new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 }).format(valor);

    const formatarPercentagem = (valor: number) =>
        new Intl.NumberFormat("pt-AO", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(valor / 100);

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[70vh]">
                <div className="text-center">
                    <RefreshCw className="animate-spin w-10 h-10 mx-auto mb-4" style={{ color: colors.primary }} />
                    <p style={{ color: colors.textSecondary }}>A carregar analytics...</p>
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
                        <div className="flex-1">
                            <p className="font-semibold mb-1" style={{ color: colors.text }}>
                                Erro ao carregar analytics
                            </p>
                            <p className="text-sm" style={{ color: colors.textSecondary }}>
                                {error || "Sem dados disponíveis"}
                            </p>
                        </div>
                        <Button onClick={fetchAnalytics} style={{ backgroundColor: colors.primary, color: "#fff" }}>
                            Tentar novamente
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Preparar dados para gráficos
    const pagamentosData = [
        { name: "Aprovados", value: data.pagamentos_por_status.aprovado, color: colors.success },
        { name: "Pendentes", value: data.pagamentos_por_status.em_analise, color: colors.warning || "#f59e0b" },
        { name: "Rejeitados", value: data.pagamentos_por_status.rejeitado, color: colors.danger },
    ];

    const mrrPorPlanoData = data.mrr_por_plano?.length
        ? data.mrr_por_plano
        : [{ nome: "Sem dados", total: 0 }];

    const distribuicaoPlanosData = data.distribuicao_planos?.length
        ? data.distribuicao_planos
        : [{ nome: "Sem dados", total: 0, percentagem: 0 }];

    return (
        <div className="space-y-6">
            {/* ============================================================
                CABEÇALHO
                ============================================================ */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: colors.secondary }}>
                        Analytics
                    </h1>
                    <p className="text-sm sm:text-base mt-1" style={{ color: colors.textSecondary }}>
                        Visão geral do desempenho da plataforma
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={fetchAnalytics}
                    className="rounded-lg w-full sm:w-auto"
                    style={{ borderColor: colors.border, color: colors.text }}
                >
                    <RefreshCw size={16} className="mr-2" />
                    Atualizar
                </Button>
            </div>

            {/* ============================================================
                CARDS DE MÉTRICAS FINANCEIRAS E OPERACIONAIS
                (removidos: Total Empresas, Ativas, Suspensas, Pagamentos em Análise)
                ============================================================ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* MRR */}
                <div
                    className="relative rounded-xl overflow-hidden cursor-help"
                    style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
                    title="Receita Mensal Recorrente – soma dos valores mensais dos planos ativos no mês atual"
                >
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: colors.secondary }} />
                    <div className="p-4 sm:p-5">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0">
                                <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>MRR (mês atual)</p>
                                <p className="text-2xl font-bold mt-1 truncate" style={{ color: colors.secondary }}>
                                    {formatarMoeda(data.mrr)}
                                </p>
                                <div className="flex items-center gap-1 mt-1">
                                    {data.net_new_mrr >= 0 ? (
                                        <TrendingUp size={12} style={{ color: colors.success }} />
                                    ) : (
                                        <TrendingDown size={12} style={{ color: colors.danger }} />
                                    )}
                                    <span
                                        className="text-xs font-medium"
                                        style={{ color: data.net_new_mrr >= 0 ? colors.success : colors.danger }}
                                    >
                                        Net New {formatarMoeda(data.net_new_mrr)}
                                    </span>
                                </div>
                            </div>
                            <div className="p-3 rounded-full shrink-0" style={{ backgroundColor: `${colors.secondary}15` }}>
                                <DollarSign size={24} style={{ color: colors.secondary }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Receita Total */}
                <div
                    className="relative rounded-xl overflow-hidden cursor-help"
                    style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
                    title="Receita total acumulada desde o início do ano (Year‑to‑Date)"
                >
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: "#8b5cf6" }} />
                    <div className="p-4 sm:p-5">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0">
                                <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>Receita Total (YTD)</p>
                                <p className="text-2xl font-bold mt-1 truncate" style={{ color: "#8b5cf6" }}>
                                    {formatarMoeda(data.receita_total)}
                                </p>
                            </div>
                            <div className="p-3 rounded-full shrink-0" style={{ backgroundColor: "#8b5cf620" }}>
                                <Coins size={24} style={{ color: "#8b5cf6" }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ticket Médio */}
                <div
                    className="relative rounded-xl overflow-hidden cursor-help"
                    style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
                    title="Valor médio de cada pagamento confirmado"
                >
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: "#06b6d4" }} />
                    <div className="p-4 sm:p-5">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0">
                                <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>Ticket Médio</p>
                                <p className="text-2xl font-bold mt-1 truncate" style={{ color: "#06b6d4" }}>
                                    {formatarMoeda(data.ticket_medio)}
                                </p>
                            </div>
                            <div className="p-3 rounded-full shrink-0" style={{ backgroundColor: "#06b6d420" }}>
                                <BarChart3 size={24} style={{ color: "#06b6d4" }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* LTV */}
                <div
                    className="relative rounded-xl overflow-hidden cursor-help"
                    style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
                    title="Lifetime Value – receita média gerada por cada empresa ao longo de todo o ciclo"
                >
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: "#ec4899" }} />
                    <div className="p-4 sm:p-5">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0">
                                <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>LTV (Lifetime Value)</p>
                                <p className="text-2xl font-bold mt-1 truncate" style={{ color: "#ec4899" }}>
                                    {formatarMoeda(data.ltv)}
                                </p>
                            </div>
                            <div className="p-3 rounded-full shrink-0" style={{ backgroundColor: "#ec489920" }}>
                                <Award size={24} style={{ color: "#ec4899" }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Segunda linha de cards operacionais (com tooltips) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div
                    className="rounded-xl p-4 sm:p-5 cursor-help"
                    style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
                    title="Número total de subscrições com status 'ativa'"
                >
                    <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>Subscrições Ativas</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: colors.text }}>{data.subscricoes_ativas}</p>
                </div>
                <div
                    className="rounded-xl p-4 sm:p-5 cursor-help"
                    style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
                    title="Percentagem de subscrições ativas com renovação automática ativada"
                >
                    <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>Taxa de Renovação Automática</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: colors.text }}>{data.taxa_renovacao}%</p>
                </div>
              
                <div
                    className="rounded-xl p-4 sm:p-5 cursor-help"
                    style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
                    title="Churn Rate – percentagem de empresas que cancelaram a subscrição no último mês"
                >
                    <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>Churn Rate (mensal)</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: colors.warning || "#f59e0b" }}>
                        {formatarPercentagem(data.churn_rate)}
                    </p>
                </div>
            </div>

            {/* ============================================================
                GRÁFICOS (3 colunas)
                ============================================================ */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {/* Novos Registos */}
                <Card className="rounded-xl shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <CardContent className="p-4 sm:p-5">
                        <h2 className="text-sm font-semibold mb-4" style={{ color: colors.text }}>
                            Novos Registos (últimos 6 meses)
                        </h2>
                        <div className="w-full h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.novos_registos} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: colors.textSecondary }} />
                                    <YAxis tick={{ fontSize: 11, fill: colors.textSecondary }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: 8, fontSize: 12 }}
                                    />
                                    <Area type="monotone" dataKey="total" stroke={colors.primary} fill={colors.primary} fillOpacity={0.15} name="Empresas" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* MRR por Plano */}
                <Card className="rounded-xl shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <CardContent className="p-4 sm:p-5">
                        <h2 className="text-sm font-semibold mb-4" style={{ color: colors.text }}>
                            MRR por Plano
                        </h2>
                        <div className="w-full h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={mrrPorPlanoData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                                    <XAxis type="number" tick={{ fontSize: 11, fill: colors.textSecondary }} />
                                    <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: colors.textSecondary }} width={80} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: 8, fontSize: 12 }}
                                        formatter={(value: any) => formatarMoeda(value)}
                                    />
                                    <Bar dataKey="total" fill={colors.secondary} radius={[0, 6, 6, 0]} name="MRR" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Distribuição de Planos */}
                <Card className="rounded-xl shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <CardContent className="p-4 sm:p-5">
                        <h2 className="text-sm font-semibold mb-4" style={{ color: colors.text }}>
                            Distribuição de Planos
                        </h2>
                        <div className="w-full h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={distribuicaoPlanosData}
                                        dataKey="total"
                                        nameKey="nome"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={70}
                                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                    >
                                        {distribuicaoPlanosData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={CORES_PIZZA[index % CORES_PIZZA.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: 8, fontSize: 12 }}
                                        formatter={(value: any, name: string, props: any) => [
                                            `${value} (${props.payload.percentagem}%)`,
                                            name,
                                        ]}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ============================================================
                SEGUNDA LINHA DE GRÁFICOS (2 colunas)
                ============================================================ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Pagamentos por status */}
                <Card className="rounded-xl shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <CardContent className="p-4 sm:p-5">
                        <h2 className="text-sm font-semibold mb-4" style={{ color: colors.text }}>
                            Pagamentos (últimos 30 dias)
                        </h2>
                        <div className="w-full h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pagamentosData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ name, value }) => `${name}: ${value}`}
                                    >
                                        {pagamentosData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: 8, fontSize: 12 }} />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Empresas por Regime Fiscal */}
                <Card className="rounded-xl shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <CardContent className="p-4 sm:p-5">
                        <h2 className="text-sm font-semibold mb-4" style={{ color: colors.text }}>
                            Empresas por Regime Fiscal
                        </h2>
                        <div className="w-full h-64">
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
                TERCEIRA LINHA: Top Planos (gráfico de barras horizontais) + Províncias
                ============================================================ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* TOP PLANOS - GRÁFICO DE BARRAS HORIZONTAIS (novo) */}
                <Card className="rounded-xl shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Award size={18} style={{ color: colors.primary }} />
                            <h2 className="text-sm font-semibold" style={{ color: colors.text }}>
                                Planos Mais Subscritos
                            </h2>
                        </div>
                        {data.top_planos.length === 0 ? (
                            <p className="text-sm py-8 text-center" style={{ color: colors.textSecondary }}>
                                Sem subscrições ainda
                            </p>
                        ) : (
                            <div className="w-full h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={data.top_planos}
                                        layout="vertical"
                                        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                                        <XAxis type="number" tick={{ fontSize: 11, fill: colors.textSecondary }} />
                                        <YAxis
                                            type="category"
                                            dataKey="nome"
                                            tick={{ fontSize: 11, fill: colors.textSecondary }}
                                            width={80}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: 8, fontSize: 12 }}
                                        />
                                        <Bar
                                            dataKey="total"
                                            fill={colors.primary}
                                            radius={[0, 6, 6, 0]}
                                            name="Subscrições"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Empresas por Província (se houver dados) */}
                {data.empresas_por_provincia && data.empresas_por_provincia.length > 0 && (
                    <Card className="rounded-xl shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <PieChartIcon size={18} style={{ color: colors.secondary }} />
                                <h2 className="text-sm font-semibold" style={{ color: colors.text }}>
                                    Empresas por Província
                                </h2>
                            </div>
                            <div className="w-full h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data.empresas_por_provincia}
                                            dataKey="total"
                                            nameKey="provincia"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {data.empresas_por_provincia.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={CORES_PIZZA[index % CORES_PIZZA.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: 8, fontSize: 12 }} />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}