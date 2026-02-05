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
    Receipt,
    Users,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Hash,
    AlertCircle,
    Ban,
    CheckCircle2,
} from "lucide-react";

import { dashboardService, faturaService } from "@/services/faturas";
import { DashboardFaturasResponse, Fatura, EstadoFatura, TipoDocumento } from "@/services/faturas";

/* 🎨 Paleta FacturaJá */
const COLORS = {
    primary: "#123859",
    accent: "#F9941F",
    success: "#025939",
    danger: "#DC2626",
    warning: "#F59E0B",
    info: "#3B82F6",
    gray: "#6B7280",
};

const STATUS_COLORS: Record<EstadoFatura, string> = {
    emitido: COLORS.success,
    anulado: COLORS.danger,
};

const STATUS_LABELS: Record<EstadoFatura, string> = {
    emitido: "Emitido",
    anulado: "Anulado",
};

const TIPO_COLORS: Record<TipoDocumento, string> = {
    FT: COLORS.primary,
    FR: COLORS.accent,
    NC: COLORS.danger,
    ND: "#7C3AED", // purple-600
};

const TIPO_LABELS: Record<TipoDocumento, string> = {
    FT: "Fatura",
    FR: "Fatura-Recibo",
    NC: "Nota de Crédito",
    ND: "Nota de Débito",
};

/* ===== TIPOS AUXILIARES ===== */
interface KPIData {
    icon: React.ReactNode;
    label: string;
    value: string | number | undefined | null;
    trend?: "up" | "down" | "neutral";
    suffix?: string;
    isCurrency?: boolean;
    isInteger?: boolean;
}

/* ===== COMPONENTES ===== */

export default function RelatorioFaturas() {
    const [dashboard, setDashboard] = useState<DashboardFaturasResponse | null>(null);
    const [faturas, setFaturas] = useState<Fatura[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function carregarDados() {
            try {
                setLoading(true);
                setError(null);

                const [dashData, faturasData] = await Promise.all([
                    dashboardService.fetch(),
                    faturaService.listarFaturas(),
                ]);

                setDashboard(dashData);
                setFaturas(faturasData);
            } catch (err) {
                console.error("Erro ao carregar dados:", err);
                setError(err instanceof Error ? err.message : "Erro ao carregar relatório de faturas");
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
                        <p className="text-gray-500">Carregando relatório de faturas...</p>
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
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                        <div className="text-red-500 text-xl font-semibold">Erro ao carregar dados</div>
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

    /* ===== DADOS PROCESSADOS ===== */
    const safeNumber = (value: any, defaultValue = 0): number => {
        if (value === undefined || value === null) return defaultValue;
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
    };

    const formatDate = (dateString: string | undefined): string => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString("pt-PT");
    };

    // Dados para gráficos baseados no estado real do backend
    const statusFaturas = [
        {
            name: STATUS_LABELS.emitido,
            value: safeNumber(dashboard.faturas?.emitidas),
            estado: "emitido" as EstadoFatura,
            color: STATUS_COLORS.emitido
        },
        {
            name: STATUS_LABELS.anulado,
            value: safeNumber(dashboard.faturas?.anuladas),
            estado: "anulado" as EstadoFatura,
            color: STATUS_COLORS.anulado
        },
    ].filter(item => item.value > 0);

    const tiposDocumento = [
        {
            name: TIPO_LABELS.FT,
            key: "ft" as const,
            quantidade: safeNumber(dashboard.porTipo?.ft?.quantidade),
            total: safeNumber(dashboard.porTipo?.ft?.total)
        },
        {
            name: TIPO_LABELS.FR,
            key: "fr" as const,
            quantidade: safeNumber(dashboard.porTipo?.fr?.quantidade),
            total: safeNumber(dashboard.porTipo?.fr?.total)
        },
        {
            name: TIPO_LABELS.NC,
            key: "nc" as const,
            quantidade: safeNumber(dashboard.porTipo?.nc?.quantidade),
            total: safeNumber(dashboard.porTipo?.nc?.total)
        },
        {
            name: TIPO_LABELS.ND,
            key: "nd" as const,
            quantidade: safeNumber(dashboard.porTipo?.nd?.quantidade),
            total: safeNumber(dashboard.porTipo?.nd?.total)
        },
    ].filter(item => item.quantidade > 0);

    const faturasPorMes = dashboard.faturas?.porMes || [];

    const comparativoTributario = [
        {
            name: "Base Tributável",
            valor: safeNumber(dashboard.totais?.baseTributavel),
            fill: COLORS.primary,
        },
        {
            name: "Total IVA",
            valor: safeNumber(dashboard.totais?.totalIva),
            fill: COLORS.info,
        },
        {
            name: "Retenção",
            valor: safeNumber(dashboard.totais?.totalRetencao),
            fill: COLORS.warning,
        },
    ];

    const kpiCards: KPIData[] = [
        {
            icon: <Receipt className="w-5 h-5" />,
            label: "Total Faturado",
            value: dashboard.totais?.totalLiquido,
            isCurrency: true,
            trend: safeNumber(dashboard.kpis?.crescimentoPercentual) >= 0 ? "up" : "down",
        },
        {
            icon: <FileText className="w-5 h-5" />,
            label: "Total de Faturas",
            value: safeNumber(dashboard.faturas?.total),
            isInteger: true,
        },
        {
            icon: <DollarSign className="w-5 h-5" />,
            label: "Base Tributável",
            value: dashboard.totais?.baseTributavel,
            isCurrency: true,
        },
        {
            icon: <Percent className="w-5 h-5" />,
            label: "IVA Arrecadado",
            value: dashboard.totais?.totalIva,
            isCurrency: true,
        },
        {
            icon: <TrendingUp className="w-5 h-5" />,
            label: "Crescimento",
            value: Math.abs(safeNumber(dashboard.kpis?.crescimentoPercentual)),
            suffix: "%",
            trend: safeNumber(dashboard.kpis?.crescimentoPercentual) >= 0 ? "up" : "down",
        },
        {
            icon: <Users className="w-5 h-5" />,
            label: "Clientes Faturados",
            value: safeNumber(dashboard.clientesFaturados),
            isInteger: true,
        },
    ];

    return (
        <MainEmpresa>
            <div className="space-y-8 max-w-7xl mx-auto">
                {/* ===== CABEÇALHO ===== */}
                <header className="border-b border-gray-200 pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-[#123859]">
                                Relatório de Faturas
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
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                Dados em tempo real
                            </div>
                            <button className="px-4 py-2 bg-[#F9941F] text-white rounded-lg hover:bg-[#e08516] transition-colors text-sm font-medium">
                                Exportar PDF
                            </button>
                        </div>
                    </div>
                </header>

                {/* ===== KPIs ===== */}
                <section>
                    <h2 className="text-lg font-semibold text-[#123859] mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Indicadores de Faturação
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        {kpiCards.map((kpi, index) => (
                            <KPICard key={index} {...kpi} />
                        ))}
                    </div>
                </section>

                {/* ===== GRÁFICOS PRINCIPAIS ===== */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Evolução mensal */}
                    <Card title="Evolução da Faturação Mensal" icon={<TrendingUp className="w-4 h-4" />}>
                        {faturasPorMes.length > 0 ? (
                            <ResponsiveContainer width="100%" height={320}>
                                <LineChart data={faturasPorMes} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorFaturas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.1} />
                                            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                                    <XAxis
                                        dataKey="mes"
                                        tick={{ fill: '#6B7280', fontSize: 12 }}
                                        axisLine={{ stroke: '#E5E7EB' }}
                                    />
                                    <YAxis
                                        tick={{ fill: '#6B7280', fontSize: 12 }}
                                        axisLine={{ stroke: '#E5E7EB' }}
                                        tickFormatter={(value) => `AOA ${(value / 1000).toFixed(0)}k`}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [formatCurrency(value), "Total Faturado"]}
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
                                Sem dados de faturação mensal
                            </div>
                        )}
                    </Card>

                    {/* Status das faturas - apenas emitido/anulado */}
                    <Card title="Distribuição por Estado" icon={<CheckCircle2 className="w-4 h-4" />}>
                        {statusFaturas.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={statusFaturas}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={100}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {statusFaturas.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
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
                                <div className="flex justify-center gap-6 mt-2">
                                    {statusFaturas.map((item) => (
                                        <div key={item.estado} className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            <span className="text-sm text-gray-600">{item.name}</span>
                                            <span className="text-sm font-semibold text-gray-900">({item.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="h-[320px] flex items-center justify-center text-gray-400">
                                Sem dados de estado
                            </div>
                        )}
                    </Card>
                </section>

                {/* ===== TIPOS DE DOCUMENTO ===== */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Faturação por Tipo de Documento" icon={<Receipt className="w-4 h-4" />}>
                        {tiposDocumento.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={tiposDocumento} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fill: '#6B7280', fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                            interval={0}
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            tick={{ fill: '#6B7280', fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            tick={{ fill: '#6B7280', fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(value) => `AOA ${(value / 1000).toFixed(0)}k`}
                                        />
                                        <Tooltip
                                            formatter={(value: number, name: string) => {
                                                if (name === "total") return [formatCurrency(value), "Total Faturado"];
                                                return [value, "Quantidade"];
                                            }}
                                            contentStyle={{
                                                backgroundColor: 'white',
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '8px'
                                            }}
                                        />
                                        <Bar yAxisId="left" dataKey="quantidade" name="Quantidade" fill={COLORS.primary} radius={[8, 8, 0, 0]} barSize={40} />
                                        <Bar yAxisId="right" dataKey="total" name="Total" fill={COLORS.accent} radius={[8, 8, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>

                                {/* Legenda de tipos */}
                                <div className="flex justify-center gap-4 mt-4 flex-wrap">
                                    {tiposDocumento.map((item) => (
                                        <div key={item.key} className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded"
                                                style={{ backgroundColor: TIPO_COLORS[item.key.toUpperCase() as TipoDocumento] }}
                                            />
                                            <span className="text-sm text-gray-600">{item.name}</span>
                                            <span className="text-xs text-gray-400">({item.quantidade})</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="h-[280px] flex items-center justify-center text-gray-400">
                                Sem dados por tipo de documento
                            </div>
                        )}
                    </Card>

                    {/* Composição do Total */}
                    <Card title="Composição do Valor Total" icon={<DollarSign className="w-4 h-4" />}>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={comparativoTributario} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                                <XAxis
                                    type="number"
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) => `AOA ${(value / 1000).toFixed(0)}k`}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={120}
                                />
                                <Tooltip
                                    formatter={(value: number) => [formatCurrency(value), "Valor"]}
                                    cursor={{ fill: '#F3F4F6' }}
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Bar dataKey="valor" radius={[0, 8, 8, 0]} barSize={40}>
                                    {comparativoTributario.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>

                        <div className="mt-4 grid grid-cols-3 gap-3">
                            <div className="bg-[#123859]/5 p-3 rounded-lg border border-[#123859]/10">
                                <p className="text-xs text-[#123859]/70 font-medium uppercase">Base</p>
                                <p className="text-sm font-bold text-[#123859]">{formatCurrency(dashboard.totais?.baseTributavel)}</p>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <p className="text-xs text-blue-600 font-medium uppercase">IVA</p>
                                <p className="text-sm font-bold text-blue-900">{formatCurrency(dashboard.totais?.totalIva)}</p>
                            </div>
                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                                <p className="text-xs text-amber-600 font-medium uppercase">Retenção</p>
                                <p className="text-sm font-bold text-amber-900">{formatCurrency(dashboard.totais?.totalRetencao)}</p>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* ===== TABELA DE FATURAS ===== */}
                <section>
                    <Card title="Faturas Recentes" icon={<FileText className="w-4 h-4" />}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="py-4 px-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Nº Documento</th>
                                        <th className="py-4 px-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Data Emissão</th>
                                        <th className="py-4 px-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Cliente</th>
                                        <th className="py-4 px-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Tipo</th>
                                        <th className="py-4 px-4 text-right font-semibold text-gray-700 uppercase tracking-wider text-xs">Base</th>
                                        <th className="py-4 px-4 text-right font-semibold text-gray-700 uppercase tracking-wider text-xs">IVA</th>
                                        <th className="py-4 px-4 text-right font-semibold text-gray-700 uppercase tracking-wider text-xs">Total</th>
                                        <th className="py-4 px-4 text-center font-semibold text-gray-700 uppercase tracking-wider text-xs">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {faturas.slice(0, 10).map((fatura) => (
                                        <tr key={fatura.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    <Hash className="w-4 h-4 text-gray-400" />
                                                    <span className="font-mono font-medium text-[#123859]">
                                                        {fatura.numero_documento}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
                                                {formatDate(fatura.data_emissao)}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="font-medium text-gray-900">
                                                    {fatura.cliente?.nome ?? "Consumidor Final"}
                                                </div>
                                                {fatura.cliente?.nif && (
                                                    <div className="text-xs text-gray-500">NIF: {fatura.cliente.nif}</div>
                                                )}
                                            </td>
                                            <td className="py-4 px-4">
                                                <TipoDocumentoBadge tipo={fatura.tipo_documento} />
                                            </td>
                                            <td className="py-4 px-4 text-right font-medium text-gray-700">
                                                {formatCurrency(fatura.base_tributavel)}
                                            </td>
                                            <td className="py-4 px-4 text-right text-gray-600">
                                                {formatCurrency(fatura.total_iva)}
                                            </td>
                                            <td className="py-4 px-4 text-right font-bold text-[#123859]">
                                                {formatCurrency(fatura.total_liquido)}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <StatusBadge status={fatura.estado} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {faturas.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                    Nenhuma fatura emitida recentemente
                                </div>
                            )}

                            {faturas.length > 10 && (
                                <div className="mt-4 text-center">
                                    <button className="text-[#123859] hover:text-[#F9941F] text-sm font-medium transition-colors">
                                        Ver todas as faturas →
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

function KPICard({ icon, label, value, trend, suffix, isCurrency, isInteger }: KPIData) {
    const numericValue = safeNumber(value);

    const displayValue = isCurrency
        ? formatCurrency(numericValue)
        : isInteger
            ? Math.round(numericValue).toLocaleString("pt-PT")
            : `${numericValue}${suffix || ''}`;

    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between">
                <div className="p-2.5 bg-[#123859]/10 text-[#123859] rounded-lg group-hover:bg-[#123859] group-hover:text-white transition-colors">
                    {icon}
                </div>
                {trend && trend !== "neutral" && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${trend === "up" ? "text-green-600" : "text-red-600"
                        }`}>
                        {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {trend === "up" ? "+" : "-"}{Math.abs(safeNumber(value) * 0.12).toFixed(1)}%
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

function StatusBadge({ status }: { status: EstadoFatura | undefined }) {
    if (!status) return null;

    const isAnulado = status === "anulado";

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold capitalize border ${isAnulado
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}>
            {isAnulado ? <Ban className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
            {STATUS_LABELS[status] || status}
        </span>
    );
}

function TipoDocumentoBadge({ tipo }: { tipo: TipoDocumento | undefined }) {
    const safeTipo = tipo || "FT";
    const color = TIPO_COLORS[safeTipo];
    const label = TIPO_LABELS[safeTipo];

    return (
        <span
            className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase text-white"
            style={{ backgroundColor: color }}
        >
            {safeTipo}
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