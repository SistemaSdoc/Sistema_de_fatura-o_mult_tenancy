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
    Receipt,
    Users,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Hash,
    AlertCircle,
    Ban,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Wallet,
    CreditCard,
} from "lucide-react";

import { documentoFiscalService } from "@/services/DocumentoFiscal";
import type { 
    DocumentoFiscal, 
    TipoDocumento, 
    EstadoDocumento,
    DashboardDocumentos,
    AlertasDocumentos,
    EvolucaoDados
} from "@/services/DocumentoFiscal";

/* ==================== CONSTANTES ==================== */
const COLORS = {
    primary: "#123859",      // FT - Fatura
    accent: "#F9941F",       // FR - Fatura-Recibo
    orange: "#F97316",       // FP - Fatura Proforma
    purple: "#9333EA",       // FA - Fatura de Adiantamento
    danger: "#DC2626",       // NC - Nota de Crédito
    amber: "#F59E0B",        // ND - Nota de Débito
    teal: "#14B8A6",         // RC - Recibo
    pink: "#EC4899",         // FRt - Fatura de Retificação
    success: "#10B981",      // paga
    warning: "#F59E0B",      // emitido/parcial
    gray: "#6B7280",         // expirado
    background: "#F2F2F2",
};

// Tipos que são considerados VENDAS (FT, FR, RC)
const TIPOS_VENDA: TipoDocumento[] = ['FT', 'FR', 'RC'];

// Tipos que são considerados NÃO-VENDAS (FP, FA, NC, ND, FRt)
const TIPOS_NAO_VENDA: TipoDocumento[] = ['FP', 'FA', 'NC', 'ND', 'FRt'];

// Cores por tipo
const TIPO_COLORS: Record<TipoDocumento, string> = {
    FT: COLORS.primary,
    FR: COLORS.accent,
    FP: COLORS.orange,
    FA: COLORS.purple,
    NC: COLORS.danger,
    ND: COLORS.amber,
    RC: COLORS.teal,
    FRt: COLORS.pink,
};

// Labels por tipo
const TIPO_LABELS: Record<TipoDocumento, string> = {
    FT: "Fatura",
    FR: "Fatura-Recibo",
    FP: "Fatura Proforma",
    FA: "Fatura de Adiantamento",
    NC: "Nota de Crédito",
    ND: "Nota de Débito",
    RC: "Recibo",
    FRt: "Fatura de Retificação",
};

// Cores por estado
const ESTADO_COLORS: Record<EstadoDocumento, string> = {
    emitido: COLORS.warning,
    paga: COLORS.success,
    parcialmente_paga: COLORS.orange,
    cancelado: COLORS.danger,
    expirado: COLORS.gray,
};

// Labels por estado
const ESTADO_LABELS: Record<EstadoDocumento, string> = {
    emitido: "Emitido",
    paga: "Pago",
    parcialmente_paga: "Parcial",
    cancelado: "Cancelado",
    expirado: "Expirado",
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
    color?: string;
}

/* ===== COMPONENTE PRINCIPAL ===== */
export default function RelatorioDocumentosFiscais() {
    const [documentos, setDocumentos] = useState<DocumentoFiscal[]>([]);
    const [dashboard, setDashboard] = useState<DashboardDocumentos | null>(null);
    const [alertas, setAlertas] = useState<AlertasDocumentos | null>(null);
    const [evolucao, setEvolucao] = useState<EvolucaoDados[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [anoSelecionado, setAnoSelecionado] = useState<number>(new Date().getFullYear());

    useEffect(() => {
        async function carregarDados() {
            try {
                setLoading(true);
                setError(null);

                // Buscar todos os dados em paralelo
                const [dashData, docsData, alertasData, evolucaoData] = await Promise.all([
                    documentoFiscalService.dashboard(),
                    documentoFiscalService.listar({ per_page: 50 }),
                    documentoFiscalService.alertasPendentes(),
                    documentoFiscalService.evolucaoMensal(anoSelecionado),
                ]);

                setDashboard(dashData);
                setDocumentos(docsData?.data?.documentos || []);
                setAlertas(alertasData);
                setEvolucao(evolucaoData || []);
            } catch (err) {
                console.error("Erro ao carregar dados:", err);
                setError(err instanceof Error ? err.message : "Erro ao carregar relatório de documentos fiscais");
            } finally {
                setLoading(false);
            }
        }

        carregarDados();
    }, [anoSelecionado]);

    /* ===== UTILITÁRIOS ===== */
    const safeNumber = (value: any, defaultValue = 0): number => {
        if (value === undefined || value === null) return defaultValue;
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
    };

    const formatCurrency = (value: number | string | undefined | null): string => {
        const num = safeNumber(value);
        return num.toLocaleString("pt-PT", {
            style: "currency",
            currency: "AOA",
            minimumFractionDigits: 2,
        });
    };

    const formatDate = (dateString: string | undefined): string => {
        if (!dateString) return "-";
        try {
            return new Date(dateString).toLocaleDateString("pt-PT");
        } catch {
            return "-";
        }
    };

    /* ===== DADOS PROCESSADOS ===== */
    const getNomeCliente = (doc: DocumentoFiscal): string => {
        return doc.cliente?.nome || doc.cliente_nome || "Consumidor Final";
    };

    const getNifCliente = (doc: DocumentoFiscal): string | null => {
        return doc.cliente?.nif || doc.cliente_nif || null;
    };

    // Processar documentos por tipo
    const documentosPorTipo = [
        { tipo: "FT" as TipoDocumento, quantidade: 0, total: 0 },
        { tipo: "FR" as TipoDocumento, quantidade: 0, total: 0 },
        { tipo: "FP" as TipoDocumento, quantidade: 0, total: 0 },
        { tipo: "FA" as TipoDocumento, quantidade: 0, total: 0 },
        { tipo: "NC" as TipoDocumento, quantidade: 0, total: 0 },
        { tipo: "ND" as TipoDocumento, quantidade: 0, total: 0 },
        { tipo: "RC" as TipoDocumento, quantidade: 0, total: 0 },
        { tipo: "FRt" as TipoDocumento, quantidade: 0, total: 0 },
    ].map(item => {
        const docsDoTipo = documentos.filter(d => d.tipo_documento === item.tipo);
        return {
            ...item,
            quantidade: docsDoTipo.length,
            total: docsDoTipo.reduce((sum, d) => sum + safeNumber(d.total_liquido), 0),
        };
    }).filter(item => item.quantidade > 0);

    // Processar documentos por estado
    const documentosPorEstado = [
        { estado: "emitido" as EstadoDocumento, quantidade: 0 },
        { estado: "paga" as EstadoDocumento, quantidade: 0 },
        { estado: "parcialmente_paga" as EstadoDocumento, quantidade: 0 },
        { estado: "cancelado" as EstadoDocumento, quantidade: 0 },
        { estado: "expirado" as EstadoDocumento, quantidade: 0 },
    ].map(item => ({
        ...item,
        quantidade: documentos.filter(d => d.estado === item.estado).length,
    })).filter(item => item.quantidade > 0);

    // Dados para gráfico de pizza de estados
    const statusData = documentosPorEstado.map(item => ({
        name: ESTADO_LABELS[item.estado],
        value: item.quantidade,
        color: ESTADO_COLORS[item.estado],
    }));

    // Dados de evolução mensal formatados
    const evolucaoMensal = evolucao.map(item => ({
        mes: `${item.mes}/${item.ano}`,
        vendas: safeNumber(item.total_vendas),
        naoVendas: safeNumber(item.total_nao_vendas),
        pendente: safeNumber(item.total_pendente),
    }));

    // Composição do valor total
    const totalVendas = documentos
        .filter(d => TIPOS_VENDA.includes(d.tipo_documento))
        .reduce((sum, d) => sum + safeNumber(d.total_liquido), 0);
    
    const totalNaoVendas = documentos
        .filter(d => TIPOS_NAO_VENDA.includes(d.tipo_documento))
        .reduce((sum, d) => sum + safeNumber(d.total_liquido), 0);

    const composicaoTotal = [
        {
            name: "Vendas (FT, FR, RC)",
            valor: totalVendas,
            fill: COLORS.success,
        },
        {
            name: "Não-Vendas (FP, FA, NC, ND, FRt)",
            valor: totalNaoVendas,
            fill: COLORS.purple,
        },
    ];

    // KPIs baseados no dashboard real
    const kpiCards: KPIData[] = [
        {
            icon: <Receipt className="w-5 h-5" />,
            label: "Faturas Emitidas (Mês)",
            value: dashboard?.faturas_emitidas_mes || 0,
            isInteger: true,
            color: COLORS.primary,
        },
        {
            icon: <Clock className="w-5 h-5" />,
            label: "Faturas Pendentes",
            value: dashboard?.faturas_pendentes || 0,
            isInteger: true,
            color: COLORS.warning,
        },
        {
            icon: <DollarSign className="w-5 h-5" />,
            label: "Total Pendente Cobrança",
            value: dashboard?.total_pendente_cobranca || 0,
            isCurrency: true,
            color: COLORS.danger,
        },
        {
            icon: <Wallet className="w-5 h-5" />,
            label: "Adiantamentos Pendentes",
            value: dashboard?.adiantamentos_pendentes || 0,
            isInteger: true,
            color: COLORS.purple,
        },
        {
            icon: <FileText className="w-5 h-5" />,
            label: "Proformas Pendentes",
            value: dashboard?.proformas_pendentes || 0,
            isInteger: true,
            color: COLORS.orange,
        },
        {
            icon: <Ban className="w-5 h-5" />,
            label: "Documentos Cancelados (Mês)",
            value: dashboard?.documentos_cancelados_mes || 0,
            isInteger: true,
            color: COLORS.gray,
        },
    ];

    // Alertas processados
    const totalAlertas = 
        safeNumber(alertas?.adiantamentos_vencidos?.total) +
        safeNumber(alertas?.faturas_com_adiantamentos_pendentes?.total) +
        safeNumber(alertas?.proformas_pendentes?.total);

    if (loading) {
        return (
            <MainEmpresa>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-pulse space-y-4 text-center">
                        <div className="w-12 h-12 bg-[#123859]/20 rounded-full mx-auto animate-spin border-4 border-[#123859] border-t-transparent" />
                        <p className="text-gray-500">Carregando relatório de documentos fiscais...</p>
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

    return (
        <MainEmpresa>
            <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6">
                {/* ===== CABEÇALHO ===== */}
                <header className="border-b border-gray-200 pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-[#123859]">
                                Relatório de Documentos Fiscais
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
                            <select
                                value={anoSelecionado}
                                onChange={(e) => setAnoSelecionado(Number(e.target.value))}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#123859] focus:border-transparent"
                            >
                                {[2024, 2025, 2026].map(ano => (
                                    <option key={ano} value={ano}>{ano}</option>
                                ))}
                            </select>
                            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                Dados em tempo real
                            </div>
                        </div>
                    </div>
                </header>

                {/* ===== ALERTAS (se houver) ===== */}
                {totalAlertas > 0 && (
                    <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                            <h2 className="font-semibold text-amber-800">Alertas Pendentes</h2>
                            <span className="bg-amber-200 text-amber-800 text-xs font-bold px-2 py-1 rounded-full">
                                {totalAlertas}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {alertas?.adiantamentos_vencidos?.total > 0 && (
                                <div className="bg-white p-3 rounded-lg border border-amber-200">
                                    <p className="text-sm text-amber-800 font-medium">
                                        Adiantamentos Vencidos: {alertas.adiantamentos_vencidos.total}
                                    </p>
                                </div>
                            )}
                            {alertas?.faturas_com_adiantamentos_pendentes?.total > 0 && (
                                <div className="bg-white p-3 rounded-lg border border-amber-200">
                                    <p className="text-sm text-amber-800 font-medium">
                                        Faturas c/ Adiantamentos: {alertas.faturas_com_adiantamentos_pendentes.total}
                                    </p>
                                </div>
                            )}
                            {alertas?.proformas_pendentes?.total > 0 && (
                                <div className="bg-white p-3 rounded-lg border border-amber-200">
                                    <p className="text-sm text-amber-800 font-medium">
                                        Proformas Pendentes: {alertas.proformas_pendentes.total}
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* ===== KPIs ===== */}
                <section>
                    <h2 className="text-lg font-semibold text-[#123859] mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Indicadores do Dashboard
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        {kpiCards.map((kpi, index) => (
                            <KPICard key={index} {...kpi} />
                        ))}
                    </div>
                </section>

                {/* ===== RESUMO FINANCEIRO ===== */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card title="Total de Vendas vs Não-Vendas" icon={<DollarSign className="w-4 h-4" />}>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <p className="text-sm text-green-600 font-medium">Total Vendas (Mês)</p>
                                <p className="text-2xl font-bold text-green-800">
                                    {formatCurrency(dashboard.total_vendas_mes)}
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                    FT, FR, RC
                                </p>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                <p className="text-sm text-purple-600 font-medium">Total Não-Vendas (Mês)</p>
                                <p className="text-2xl font-bold text-purple-800">
                                    {formatCurrency(dashboard.total_nao_vendas_mes)}
                                </p>
                                <p className="text-xs text-purple-600 mt-1">
                                    FP, FA, NC, ND, FRt
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card title="Composição do Valor Total" icon={<TrendingUp className="w-4 h-4" />}>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={composicaoTotal}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="valor"
                                >
                                    {composicaoTotal.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => [formatCurrency(value), "Valor"]}
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '8px'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-6 mt-2">
                            {composicaoTotal.map((item) => (
                                <div key={item.name} className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: item.fill }}
                                    />
                                    <span className="text-sm text-gray-600">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </section>

                {/* ===== GRÁFICOS PRINCIPAIS ===== */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Evolução mensal */}
                    <Card title="Evolução Mensal de Documentos" icon={<TrendingUp className="w-4 h-4" />}>
                        {evolucaoMensal.length > 0 ? (
                            <ResponsiveContainer width="100%" height={320}>
                                <LineChart data={evolucaoMensal} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                                        formatter={(value: number, name: string) => {
                                            const label = name === "vendas" ? "Vendas" : 
                                                         name === "naoVendas" ? "Não-Vendas" : "Pendente";
                                            return [formatCurrency(value), label];
                                        }}
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="vendas"
                                        name="Vendas"
                                        stroke={COLORS.success}
                                        strokeWidth={3}
                                        dot={{ fill: COLORS.success, strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="naoVendas"
                                        name="Não-Vendas"
                                        stroke={COLORS.purple}
                                        strokeWidth={3}
                                        dot={{ fill: COLORS.purple, strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="pendente"
                                        name="Pendente"
                                        stroke={COLORS.warning}
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[320px] flex items-center justify-center text-gray-400">
                                Sem dados de evolução mensal
                            </div>
                        )}
                    </Card>

                    {/* Status dos documentos */}
                    <Card title="Distribuição por Estado" icon={<CheckCircle2 className="w-4 h-4" />}>
                        {statusData.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={100}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {statusData.map((entry, index) => (
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

                                <div className="flex justify-center gap-4 mt-2 flex-wrap">
                                    {statusData.map((item) => (
                                        <div key={item.name} className="flex items-center gap-2">
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
                    <Card title="Documentos por Tipo" icon={<Receipt className="w-4 h-4" />}>
                        {documentosPorTipo.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={documentosPorTipo} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                                        <XAxis
                                            dataKey="tipo"
                                            tick={{ fill: '#6B7280', fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
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
                                            tickFormatter={(value) => `Kz ${(value / 1000).toFixed(0)}k`}
                                        />
                                        <Tooltip
                                            formatter={(value: number, name: string, props: any) => {
                                                const tipo = props?.payload?.tipo as TipoDocumento;
                                                if (name === "total") return [formatCurrency(value), "Total"];
                                                return [value, "Quantidade"];
                                            }}
                                            contentStyle={{
                                                backgroundColor: 'white',
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '8px'
                                            }}
                                        />
                                        <Bar 
                                            yAxisId="left" 
                                            dataKey="quantidade" 
                                            name="Quantidade" 
                                            fill={COLORS.primary} 
                                            radius={[8, 8, 0, 0]} 
                                            barSize={40} 
                                        />
                                        <Bar 
                                            yAxisId="right" 
                                            dataKey="total" 
                                            name="Total" 
                                            fill={COLORS.accent} 
                                            radius={[8, 8, 0, 0]} 
                                            barSize={40} 
                                        />
                                    </BarChart>
                                </ResponsiveContainer>

                                {/* Legenda de tipos */}
                                <div className="flex justify-center gap-3 mt-4 flex-wrap">
                                    {documentosPorTipo.map((item) => (
                                        <div key={item.tipo} className="flex items-center gap-1.5">
                                            <div
                                                className="w-3 h-3 rounded"
                                                style={{ backgroundColor: TIPO_COLORS[item.tipo] }}
                                            />
                                            <span className="text-xs text-gray-600">{TIPO_LABELS[item.tipo]}</span>
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

                    {/* Resumo por Tipo */}
                    <Card title="Resumo por Tipo de Documento" icon={<FileText className="w-4 h-4" />}>
                        <div className="space-y-3 max-h-[320px] overflow-y-auto">
                            {documentosPorTipo.map((item) => (
                                <div 
                                    key={item.tipo} 
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                                            style={{ backgroundColor: TIPO_COLORS[item.tipo] }}
                                        >
                                            {item.tipo}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{TIPO_LABELS[item.tipo]}</p>
                                            <p className="text-xs text-gray-500">{item.quantidade} documento(s)</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-[#123859]">{formatCurrency(item.total)}</p>
                                        <p className="text-xs text-gray-500">
                                            Média: {formatCurrency(item.total / (item.quantidade || 1))}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {documentosPorTipo.length === 0 && (
                                <p className="text-center text-gray-400 py-8">Nenhum documento encontrado</p>
                            )}
                        </div>
                    </Card>
                </section>

                {/* ===== TABELA DE DOCUMENTOS RECENTES ===== */}
                <section>
                    <Card title="Documentos Fiscais Recentes" icon={<FileText className="w-4 h-4" />}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="py-4 px-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Nº Documento</th>
                                        <th className="py-4 px-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Série</th>
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
                                    {documentos.slice(0, 10).map((doc) => (
                                        <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    <Hash className="w-4 h-4 text-gray-400" />
                                                    <span className="font-mono font-medium text-[#123859]">
                                                        {doc.numero_documento}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-gray-600">
                                                {doc.serie}
                                            </td>
                                            <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
                                                {formatDate(doc.data_emissao)}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="font-medium text-gray-900">
                                                    {getNomeCliente(doc)}
                                                </div>
                                                {getNifCliente(doc) && (
                                                    <div className="text-xs text-gray-500">
                                                        NIF: {getNifCliente(doc)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 px-4">
                                                <TipoDocumentoBadge tipo={doc.tipo_documento} />
                                            </td>
                                            <td className="py-4 px-4 text-right font-medium text-gray-700">
                                                {formatCurrency(doc.base_tributavel)}
                                            </td>
                                            <td className="py-4 px-4 text-right text-gray-600">
                                                {formatCurrency(doc.total_iva)}
                                            </td>
                                            <td className="py-4 px-4 text-right font-bold text-[#123859]">
                                                {formatCurrency(doc.total_liquido)}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <EstadoBadge estado={doc.estado} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {documentos.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                    Nenhum documento fiscal emitido recentemente
                                </div>
                            )}

                            {documentos.length > 10 && (
                                <div className="mt-4 text-center">
                                    <button className="text-[#123859] hover:text-[#F9941F] text-sm font-medium transition-colors">
                                        Ver todos os documentos →
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

function KPICard({ icon, label, value, trend, suffix, isCurrency, isInteger, color }: KPIData) {
    const numericValue = typeof value === 'number' ? value : Number(value) || 0;

    const displayValue = isCurrency
        ? formatCurrencyHelper(numericValue)
        : isInteger
            ? Math.round(numericValue).toLocaleString("pt-PT")
            : `${numericValue}${suffix || ''}`;

    return (
        <div 
            className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
            style={{ borderLeftWidth: '4px', borderLeftColor: color || COLORS.primary }}
        >
            <div className="flex items-start justify-between">
                <div 
                    className="p-2.5 rounded-lg transition-colors"
                    style={{ 
                        backgroundColor: `${color}20` || `${COLORS.primary}20`,
                        color: color || COLORS.primary
                    }}
                >
                    {icon}
                </div>
                {trend && trend !== "neutral" && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${
                        trend === "up" ? "text-green-600" : "text-red-600"
                    }`}>
                        {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {trend === "up" ? "+" : "-"}{Math.abs(numericValue * 0.12).toFixed(1)}%
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

function EstadoBadge({ estado }: { estado: EstadoDocumento | undefined }) {
    if (!estado) return null;

    const config = {
        bg: `${ESTADO_COLORS[estado]}20`,
        text: ESTADO_COLORS[estado],
        border: ESTADO_COLORS[estado],
        icon: estado === "paga" ? <CheckCircle2 className="w-3 h-3" /> :
              estado === "cancelado" ? <Ban className="w-3 h-3" /> :
              estado === "expirado" ? <Clock className="w-3 h-3" /> :
              estado === "parcialmente_paga" ? <CreditCard className="w-3 h-3" /> :
              <Clock className="w-3 h-3" />
    };

    return (
        <span 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold capitalize border"
            style={{ 
                backgroundColor: config.bg, 
                color: config.text,
                borderColor: config.border 
            }}
        >
            {config.icon}
            {ESTADO_LABELS[estado]}
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

/* ===== UTILITÁRIOS ADICIONAIS ===== */

function formatCurrencyHelper(value: number): string {
    return value.toLocaleString("pt-PT", {
        style: "currency",
        currency: "AOA",
        minimumFractionDigits: 2,
    });
}