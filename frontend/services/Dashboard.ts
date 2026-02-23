// src/services/dashboard.ts

import api from "./axios";
import { AxiosError } from "axios";

/* ================== HELPERS ================== */
function handleAxiosError(err: unknown, prefix: string) {
    if (err instanceof AxiosError) {
        const msg = err.response?.data?.message || err.message || "Erro desconhecido";
        console.error(`${prefix}:`, msg);
    } else {
        console.error(`${prefix}:`, err);
    }
}

/* ================== TIPOS ================== */

/* -------- Tipos de Documento Fiscal -------- */
export type TipoDocumentoFiscal =
    | 'FT'   // Fatura - VENDA
    | 'FR'   // Fatura-Recibo - VENDA
    | 'FP'   // Fatura Proforma - NÃO VENDA (pré-documento)
    | 'RC'   // Recibo - VENDA (pagamento)
    | 'NC'   // Nota de Crédito - NÃO VENDA
    | 'ND'   // Nota de Débito - NÃO VENDA
    | 'FA'   // Fatura de Adiantamento - NÃO VENDA (vira venda com recibo)
    | 'FRt'; // Fatura de Retificação - NÃO VENDA

export type EstadoDocumentoFiscal =
    | 'emitido'
    | 'paga'
    | 'parcialmente_paga'
    | 'cancelado'
    | 'expirado';

export type EstadoPagamentoVenda = 'paga' | 'pendente' | 'parcial' | 'cancelada';

/* -------- Usuário -------- */
export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'operador' | 'contabilista';
    ativo: boolean;
    ultimo_login?: string | null;
}

/* -------- Cliente -------- */
export interface Cliente {
    id: string;
    nome: string;
    nif: string | null;
    tipo: 'consumidor_final' | 'empresa';
    telefone: string | null;
    email: string | null;
    endereco: string | null;
    data_registro: string;
}

/* -------- Produto -------- */
export interface Produto {
    id: string;
    nome: string;
    codigo?: string;
    preco_venda: number;
    estoque_atual: number;
    estoque_minimo: number;
}

/* -------- Documento Fiscal (básico para listagens) -------- */
export interface DocumentoFiscal {
    id: string;
    tipo_documento: TipoDocumentoFiscal;
    tipo_documento_nome: string;
    numero_documento: string;
    data_emissao: string;
    total_liquido: number;
    estado: EstadoDocumentoFiscal;
    cliente?: Cliente;
    cliente_nome?: string;
    created_at: string;
}

/* -------- Dashboard Tipos -------- */

export interface DashboardData {
    user: User;

    kpis: {
        ticketMedio: number;
        crescimentoPercentual: number;
        ivaArrecadado: number;
        totalFaturado: number;
        totalNotasCredito: number;
        totalLiquido: number;
    };

    produtos: {
        total: number;
        ativos: number;
        inativos: number;
        stock_baixo: number;
    };

    vendas: {
        total: number;
        abertas: number;
        faturadas: number;
        canceladas: number;
        ultimas: Array<{
            id: string;
            cliente: string;
            total: number;
            status: string;
            estado_pagamento: EstadoPagamentoVenda;
            documento_fiscal?: {
                tipo: TipoDocumentoFiscal;
                numero: string;
                estado: EstadoDocumentoFiscal;
            };
            data: string;
        }>;
    };

    documentos_fiscais: {
        total: number;
        por_tipo: Record<TipoDocumentoFiscal, {
            nome: string;
            quantidade: number;
            valor: number;
        }>;
        por_estado: Array<{
            tipo: string;
            por_estado: Record<string, { quantidade: number; valor: number }>;
            total_quantidade: number;
            total_valor: number;
        }>;
        ultimos: Array<{
            id: string;
            tipo: TipoDocumentoFiscal;
            tipo_nome: string;
            numero: string;
            cliente: string;
            total: number;
            estado: EstadoDocumentoFiscal;
            estado_pagamento: EstadoPagamentoVenda;
            data: string;
        }>;
        por_mes: Array<{
            mes: string;
            FT: number;
            FR: number;
            NC: number;
            ND: number;
            total: number;
        }>;
        por_dia: Array<{
            dia: string;
            total: number;
        }>;
    };

    pagamentos: {
        hoje: number;
        total_pendente: number;
        total_atrasado: number;
        metodos: Array<{
            metodo: string;
            metodo_nome: string;
            quantidade: number;
            valor_total: number;
        }>;
    };

    clientes: {
        ativos: number;
        novos_mes: number;
    };

    indicadores: {
        produtosMaisVendidos: Array<{
            produto: string;
            codigo?: string;
            quantidade: number;
            valor_total: number;
        }>;
    };

    alertas: {
        documentos_vencidos: number;
        documentos_proximo_vencimento: number;
        proformas_antigas: number;
    };

    periodo: {
        mes_atual: number;
        ano_atual: number;
        mes_anterior: number;
        ano_anterior: number;
    };
}

export interface ResumoDocumentosFiscais {
    total_emitidos: number;
    por_tipo: Record<TipoDocumentoFiscal, {
        nome: string;
        quantidade: number;
        valor_total: number;
        mes_atual: number;
    }>;
    por_estado: Record<EstadoDocumentoFiscal, number>;
    periodo: {
        inicio: string;
        fim: string;
    };
}

export interface EstatisticasPagamentos {
    recebidos_hoje: number;
    recebidos_mes: number;
    recebidos_ano: number;
    pendentes: number;
    atrasados: {
        quantidade: number;
        valor_total: number;
        documentos: Array<{
            id: string;
            numero: string;
            cliente?: string;
            valor: number;
            dias_atraso: number;
        }>;
    };
    prazo_medio_pagamento: number;
    metodos_pagamento: Record<string, number>;
}

export interface AlertasPendentes {
    vencidos: {
        quantidade: number;
        valor_total: number;
        documentos: Array<{
            id: string;
            tipo: TipoDocumentoFiscal;
            numero: string;
            cliente?: string;
            valor: number;
            valor_pendente: number;
            data_vencimento: string;
            dias_atraso: number;
        }>;
    };
    proximos_vencimento: {
        quantidade: number;
        valor_total: number;
        documentos: Array<{
            id: string;
            tipo: TipoDocumentoFiscal;
            numero: string;
            cliente?: string;
            valor: number;
            valor_pendente: number;
            data_vencimento: string;
            dias_ate_vencimento: number;
        }>;
    };
    proformas_pendentes: {
        quantidade: number;
        valor_total: number;
        documentos: Array<{
            id: string;
            tipo: TipoDocumentoFiscal;
            numero: string;
            cliente?: string;
            valor: number;
            data_emissao: string;
            dias_pendentes: number;
        }>;
    };
    total_alertas: number;
}

export interface EvolucaoMensal {
    ano: number;
    meses: Array<{
        mes: number;
        nome: string;
        faturas_emitidas: number;
        valor_faturado: number;
        valor_pago: number;
        valor_pendente: number;
        notas_credito: number;
        valor_notas_credito: number;
    }>;
}

/* ================== DASHBOARD SERVICE ================== */

export const dashboardService = {
    /**
     * Obter dados completos do dashboard
     */
    async fetch(): Promise<DashboardData | null> {
        try {
            const { data } = await api.get<{
                success: boolean;
                message: string;
                data: DashboardData;
            }>("/api/dashboard");

            return data.data;
        } catch (err) {
            handleAxiosError(err, "[DASHBOARD] Erro ao carregar dashboard");
            return null;
        }
    },

    /**
     * Obter resumo de documentos fiscais
     */
    async resumoDocumentosFiscais(): Promise<ResumoDocumentosFiscais | null> {
        try {
            const { data } = await api.get<{
                success: boolean;
                message: string;
                data: {
                    resumo: ResumoDocumentosFiscais;
                };
            }>("/api/dashboard/resumo-documentos-fiscais");

            return data.data.resumo;
        } catch (err) {
            handleAxiosError(err, "[DASHBOARD] Erro ao obter resumo de documentos fiscais");
            return null;
        }
    },

    /**
     * Obter estatísticas de pagamentos
     */
    async estatisticasPagamentos(): Promise<EstatisticasPagamentos | null> {
        try {
            const { data } = await api.get<{
                success: boolean;
                message: string;
                data: {
                    estatisticas: EstatisticasPagamentos;
                };
            }>("/api/dashboard/estatisticas-pagamentos");

            return data.data.estatisticas;
        } catch (err) {
            handleAxiosError(err, "[DASHBOARD] Erro ao obter estatísticas de pagamentos");
            return null;
        }
    },

    /**
     * Obter alertas de documentos pendentes
     */
    async alertasPendentes(): Promise<AlertasPendentes | null> {
        try {
            const { data } = await api.get<{
                success: boolean;
                message: string;
                data: {
                    alertas: AlertasPendentes;
                };
            }>("/api/dashboard/alertas-pendentes");

            return data.data.alertas;
        } catch (err) {
            handleAxiosError(err, "[DASHBOARD] Erro ao obter alertas pendentes");
            return null;
        }
    },

    /**
     * Obter evolução mensal de documentos
     */
    async evolucaoMensal(ano?: number): Promise<EvolucaoMensal | null> {
        try {
            const params = ano ? `?ano=${ano}` : '';
            const { data } = await api.get<{
                success: boolean;
                message: string;
                data: {
                    ano: number;
                    evolucao: EvolucaoMensal;
                };
            }>(`/api/dashboard/evolucao-mensal${params}`);

            return data.data.evolucao;
        } catch (err) {
            handleAxiosError(err, "[DASHBOARD] Erro ao obter evolução mensal");
            return null;
        }
    },

    /* ================== MÉTODOS UTILITÁRIOS ================== */

    /**
     * Calcular totais e métricas a partir dos dados do dashboard
     */
    calcularMetricas(dashboardData: DashboardData | null): {
        totalFaturado: number;
        totalPendente: number;
        totalClientes: number;
        ticketMedio: number;
        crescimento: number;
        produtosEmStockBaixo: number;
        documentosVencidos: number;
    } {
        if (!dashboardData) {
            return {
                totalFaturado: 0,
                totalPendente: 0,
                totalClientes: 0,
                ticketMedio: 0,
                crescimento: 0,
                produtosEmStockBaixo: 0,
                documentosVencidos: 0,
            };
        }

        return {
            totalFaturado: dashboardData.kpis?.totalFaturado || 0,
            totalPendente: dashboardData.pagamentos?.total_pendente || 0,
            totalClientes: dashboardData.clientes?.ativos || 0,
            ticketMedio: dashboardData.kpis?.ticketMedio || 0,
            crescimento: dashboardData.kpis?.crescimentoPercentual || 0,
            produtosEmStockBaixo: dashboardData.produtos?.stock_baixo || 0,
            documentosVencidos: dashboardData.alertas?.documentos_vencidos || 0,
        };
    },

    /**
     * Preparar dados para gráficos
     */
    prepararDadosGraficos(dashboardData: DashboardData | null): {
        evolucaoMensal: Array<{
            mes: string;
            Faturas: number;
            'Faturas-Recibo': number;
            'Notas de Crédito': number;
            Total: number;
        }>;
        documentosPorTipo: Array<{
            tipo: string;
            nome: string;
            quantidade: number;
            valor: number;
        }>;
        pagamentosPorMetodo: Array<{
            metodo: string;
            quantidade: number;
            valor: number;
        }>;
        documentosPorEstado: Array<{
            tipo: string;
            estado: string;
            quantidade: number;
            valor: number;
        }>;
    } {
        if (!dashboardData) {
            return {
                evolucaoMensal: [],
                documentosPorTipo: [],
                pagamentosPorMetodo: [],
                documentosPorEstado: [],
            };
        }

        // Gráfico de evolução mensal
        const evolucaoMensal = (dashboardData.documentos_fiscais?.por_mes || []).map(item => ({
            mes: item.mes,
            Faturas: item.FT || 0,
            'Faturas-Recibo': item.FR || 0,
            'Notas de Crédito': item.NC || 0,
            Total: item.total || 0,
        }));

        // Gráfico de documentos por tipo
        const documentosPorTipo = Object.entries(dashboardData.documentos_fiscais?.por_tipo || {}).map(([tipo, info]) => ({
            tipo,
            nome: info.nome,
            quantidade: info.quantidade,
            valor: info.valor,
        }));

        // Gráfico de pagamentos por método
        const pagamentosPorMetodo = (dashboardData.pagamentos?.metodos || []).map(metodo => ({
            metodo: metodo.metodo_nome,
            quantidade: metodo.quantidade,
            valor: metodo.valor_total,
        }));

        // Gráfico de documentos por estado
        const documentosPorEstado: Array<{ tipo: string; estado: string; quantidade: number; valor: number }> = [];
        if (dashboardData.documentos_fiscais?.por_estado) {
            Object.entries(dashboardData.documentos_fiscais.por_estado).forEach(([tipo, info]) => {
                if (info && info.por_estado) {
                    Object.entries(info.por_estado).forEach(([estado, dados]) => {
                        documentosPorEstado.push({
                            tipo,
                            estado,
                            quantidade: dados.quantidade,
                            valor: dados.valor,
                        });
                    });
                }
            });
        }

        return {
            evolucaoMensal,
            documentosPorTipo,
            pagamentosPorMetodo,
            documentosPorEstado,
        };
    },

    /**
     * Obter KPIs principais para cards do dashboard
     */
    getKPIsCards(dashboardData: DashboardData | null): Array<{
        titulo: string;
        valor: string;
        icone: string;
        cor: string;
        variacao: number | null;
        variacaoTexto?: string;
    }> {
        const metricas = this.calcularMetricas(dashboardData);

        const cards = [
            {
                titulo: 'Total Faturado',
                valor: this._formatarMoeda(metricas.totalFaturado),
                icone: '💰',
                cor: 'bg-green-500',
                variacao: metricas.crescimento,
                variacaoTexto: `${metricas.crescimento > 0 ? '+' : ''}${metricas.crescimento}%`,
            },
            {
                titulo: 'Pendente',
                valor: this._formatarMoeda(metricas.totalPendente),
                icone: '⏳',
                cor: 'bg-yellow-500',
                variacao: null,
            },
            {
                titulo: 'Clientes Ativos',
                valor: metricas.totalClientes.toString(),
                icone: '👥',
                cor: 'bg-blue-500',
                variacao: dashboardData?.clientes?.novos_mes || 0,
                variacaoTexto: `+${dashboardData?.clientes?.novos_mes || 0} este mês`,
            },
            {
                titulo: 'Ticket Médio',
                valor: this._formatarMoeda(metricas.ticketMedio),
                icone: '🎫',
                cor: 'bg-purple-500',
                variacao: null,
            },
        ];

        // Adicionar card de produtos em stock baixo se houver
        if (metricas.produtosEmStockBaixo > 0) {
            cards.push({
                titulo: 'Stock Baixo',
                valor: metricas.produtosEmStockBaixo.toString(),
                icone: '📦',
                cor: 'bg-orange-500',
                variacao: null,
            });
        }

        return cards;
    },

    /**
     * Obter alertas formatados para exibição
     */
    getAlertasFormatados(dashboardData: DashboardData | null): Array<{
        tipo: 'danger' | 'warning' | 'info';
        titulo: string;
        mensagem: string;
        icone: string;
        acao?: string;
    }> {
        if (!dashboardData) return [];

        const alertas = dashboardData.alertas || {};
        const listaAlertas: Array<{
            tipo: 'danger' | 'warning' | 'info';
            titulo: string;
            mensagem: string;
            icone: string;
            acao?: string;
        }> = [];

        if (alertas.documentos_vencidos > 0) {
            listaAlertas.push({
                tipo: 'danger',
                titulo: 'Documentos Vencidos',
                mensagem: `${alertas.documentos_vencidos} documento(s) com pagamento em atraso`,
                icone: '⚠️',
                acao: '/documentos?estado=vencido',
            });
        }

        if (alertas.documentos_proximo_vencimento > 0) {
            listaAlertas.push({
                tipo: 'warning',
                titulo: 'Próximos do Vencimento',
                mensagem: `${alertas.documentos_proximo_vencimento} documento(s) vencem nos próximos 3 dias`,
                icone: '⏰',
                acao: '/documentos?estado=proximo-vencimento',
            });
        }

        if (alertas.proformas_antigas > 0) {
            listaAlertas.push({
                tipo: 'info',
                titulo: 'Proformas Pendentes',
                mensagem: `${alertas.proformas_antigas} proforma(s) com mais de 7 dias`,
                icone: '📄',
                acao: '/documentos?tipo=FP&estado=emitida',
            });
        }

        const produtosStockBaixo = dashboardData.produtos?.stock_baixo || 0;
        if (produtosStockBaixo > 0) {
            listaAlertas.push({
                tipo: 'warning',
                titulo: 'Stock Baixo',
                mensagem: `${produtosStockBaixo} produto(s) com stock abaixo do mínimo`,
                icone: '📦',
                acao: '/produtos?stock=baixo',
            });
        }

        return listaAlertas;
    },

    /**
     * Formatar valor para moeda (AOA)
     */
    _formatarMoeda(valor: number): string {
        return new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'AOA',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(valor || 0).replace('AOA', 'Kz').trim();
    },

    /**
     * Formatar data
     */
    _formatarData(data: string | null, formato: 'short' | 'long' = 'short'): string {
        if (!data) return '-';

        try {
            const date = new Date(data);
            return date.toLocaleDateString('pt-PT', {
                day: '2-digit',
                month: '2-digit',
                year: formato === 'short' ? '2-digit' : 'numeric',
            });
        } catch {
            return data;
        }
    },

    /**
     * Obter cor do badge para tipo de documento
     */
    getTipoDocumentoColor(tipo: TipoDocumentoFiscal): string {
        const colors: Partial<Record<TipoDocumentoFiscal, string>> = {
            FT: 'bg-blue-100 text-blue-800',
            FR: 'bg-green-100 text-green-800',
            FP: 'bg-orange-100 text-orange-800',
            FA: 'bg-purple-100 text-purple-800',
            NC: 'bg-red-100 text-red-800',
            ND: 'bg-amber-100 text-amber-800',
            RC: 'bg-teal-100 text-teal-800',
            FRt: 'bg-pink-100 text-pink-800',
        };
        return colors[tipo] || 'bg-gray-100 text-gray-800';
    },

    /**
     * Obter cor do badge para estado de documento
     */
    getEstadoDocumentoColor(estado: EstadoDocumentoFiscal): string {
        const colors: Record<EstadoDocumentoFiscal, string> = {
            emitido: 'bg-blue-100 text-blue-800',
            paga: 'bg-green-100 text-green-800',
            parcialmente_paga: 'bg-teal-100 text-teal-800',
            cancelado: 'bg-red-100 text-red-800',
            expirado: 'bg-gray-100 text-gray-800',
        };
        return colors[estado] || 'bg-gray-100 text-gray-800';
    },

    /**
     * Obter nome do tipo de documento
     */
    getNomeTipoDocumento(tipo: TipoDocumentoFiscal): string {
        const nomes: Record<TipoDocumentoFiscal, string> = {
            FT: 'Fatura',
            FR: 'Fatura-Recibo',
            FP: 'Fatura Proforma',
            RC: 'Recibo',
            NC: 'Nota de Crédito',
            ND: 'Nota de Débito',
            FA: 'Fatura de Adiantamento',
            FRt: 'Fatura de Retificação',
        };
        return nomes[tipo] || tipo;
    },

    /**
     * Verificar se há dados suficientes para exibir o dashboard
     */
    hasData(dashboardData: DashboardData | null): boolean {
        if (!dashboardData) return false;
        
        return (
            (dashboardData.kpis?.totalFaturado > 0) ||
            (dashboardData.vendas?.total > 0) ||
            (dashboardData.documentos_fiscais?.total > 0) ||
            (dashboardData.clientes?.ativos > 0)
        );
    }
};

/* ================== EXPORTAÇÕES LEGADAS (para compatibilidade) ================== */

export async function obterDashboard(): Promise<DashboardData | null> {
    return dashboardService.fetch();
}

export async function obterResumoDocumentosFiscais(): Promise<ResumoDocumentosFiscais | null> {
    return dashboardService.resumoDocumentosFiscais();
}

export async function obterEstatisticasPagamentos(): Promise<EstatisticasPagamentos | null> {
    return dashboardService.estatisticasPagamentos();
}

export async function obterAlertasPendentes(): Promise<AlertasPendentes | null> {
    return dashboardService.alertasPendentes();
}

export async function obterEvolucaoMensal(ano?: number): Promise<EvolucaoMensal | null> {
    return dashboardService.evolucaoMensal(ano);
}

export default dashboardService;