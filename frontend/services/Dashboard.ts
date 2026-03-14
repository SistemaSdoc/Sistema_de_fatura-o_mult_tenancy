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
    status?: 'ativo' | 'inativo';
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
    tipo?: 'produto' | 'servico';
    retencao?: number;
}

/* -------- Documento Fiscal (básico para listagens) -------- */
export interface DocumentoFiscal {
    id: string;
    tipo_documento: TipoDocumentoFiscal;
    tipo_documento_nome: string;
    numero_documento: string;
    data_emissao: string;
    total_liquido: number;
    total_retencao?: number;
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
        totalRetencao?: number;
        totalRetencaoMes?: number;
    };

    produtos: {
        total: number;
        ativos: number;
        inativos: number;
        stock_baixo: number;
        servicos?: {
            total: number;
            ativos: number;
            com_retencao: number;
        };
    };

    servicos?: {
        total: number;
        ativos: number;
        inativos: number;
        precoMedio: number;
        comRetencao: number;
        retencaoMedia: number;
        valorRetencaoTotal: number;
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
                total_retencao?: number;
            };
            data: string;
            tem_servicos?: boolean;
            total_retencao?: number;
        }>;
    };

    documentos_fiscais: {
        total: number;
        por_tipo: Record<TipoDocumentoFiscal, {
            nome: string;
            quantidade: number;
            valor: number;
            retencao?: number;
        }>;
        // ✅ pode ser array OU objecto indexado por tipo — ambos são tratados em prepararDadosGraficos
        por_estado: Array<{
            tipo: string;
            por_estado: Record<string, { quantidade: number; valor: number; retencao?: number }>;
            total_quantidade: number;
            total_valor: number;
            total_retencao?: number;
        }> | Record<string, {
            tipo: string;
            por_estado: Record<string, { quantidade: number; valor: number; retencao?: number }>;
            total_quantidade: number;
            total_valor: number;
            total_retencao?: number;
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
            total_retencao?: number;
        }>;
        por_mes: Array<{
            mes: string;
            FT: number;
            FR: number;
            NC: number;
            ND: number;
            total: number;
            retencao?: number;
        }>;
        por_dia: Array<{
            dia: string;
            total: number;
            retencao?: number;
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
        recebidos_com_retencao?: number;
        valor_retencao_recebido?: number;
    };

    clientes: {
        ativos: number;
        novos_mes: number;
        inativos?: number;
    };

    indicadores: {
        produtosMaisVendidos: Array<{
            produto: string;
            codigo?: string;
            quantidade: number;
            valor_total: number;
        }>;
        servicosMaisVendidos?: Array<{
            produto: string;
            codigo?: string;
            quantidade: number;
            valor_total: number;
            retencao_total: number;
        }>;
    };

    alertas: {
        documentos_vencidos: number;
        documentos_proximo_vencimento: number;
        proformas_antigas: number;
        servicos_com_retencao_pendente?: number;
        valor_retencao_pendente?: number;
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
        retencao_total?: number;
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
    recebidos_com_retencao?: number;
    valor_retencao_recebido?: number;
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
            retencao?: number;
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
            retencao?: number;
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
    servicos_com_retencao_proximos?: {
        quantidade: number;
        valor_total: number;
        valor_retencao: number;
        documentos: Array<{
            id: string;
            numero: string;
            cliente?: string;
            valor: number;
            retencao: number;
            data_vencimento: string;
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
        proformas?: number;
        valor_proformas?: number;
        retencao?: number;
    }>;
}

/* -------- Filtros para Dashboard -------- */
export interface DashboardFiltros {
    data_inicio?: string;
    data_fim?: string;
}

/* ================== DASHBOARD SERVICE ================== */

export const dashboardService = {

    async fetch(filtros?: DashboardFiltros): Promise<DashboardData | null> {
        try {
            const params = new URLSearchParams();
            if (filtros?.data_inicio) params.append('data_inicio', filtros.data_inicio);
            if (filtros?.data_fim) params.append('data_fim', filtros.data_fim);

            const queryString = params.toString();
            const url = `/api/dashboard${queryString ? `?${queryString}` : ''}`;

            const { data } = await api.get<{
                success: boolean;
                message: string;
                data: DashboardData;
            }>(url);

            return data.data;
        } catch (err) {
            handleAxiosError(err, "[DASHBOARD] Erro ao carregar dashboard");
            return null;
        }
    },

    async resumoDocumentosFiscais(filtros?: DashboardFiltros): Promise<ResumoDocumentosFiscais | null> {
        try {
            const params = new URLSearchParams();
            if (filtros?.data_inicio) params.append('data_inicio', filtros.data_inicio);
            if (filtros?.data_fim) params.append('data_fim', filtros.data_fim);

            const queryString = params.toString();
            const url = `/api/dashboard/resumo-documentos-fiscais${queryString ? `?${queryString}` : ''}`;

            const { data } = await api.get<{
                success: boolean;
                message: string;
                data: { resumo: ResumoDocumentosFiscais };
            }>(url);

            return data.data.resumo;
        } catch (err) {
            handleAxiosError(err, "[DASHBOARD] Erro ao obter resumo de documentos fiscais");
            return null;
        }
    },

    async estatisticasPagamentos(filtros?: DashboardFiltros): Promise<EstatisticasPagamentos | null> {
        try {
            const params = new URLSearchParams();
            if (filtros?.data_inicio) params.append('data_inicio', filtros.data_inicio);
            if (filtros?.data_fim) params.append('data_fim', filtros.data_fim);

            const queryString = params.toString();
            const url = `/api/dashboard/estatisticas-pagamentos${queryString ? `?${queryString}` : ''}`;

            const { data } = await api.get<{
                success: boolean;
                message: string;
                data: { estatisticas: EstatisticasPagamentos };
            }>(url);

            return data.data.estatisticas;
        } catch (err) {
            handleAxiosError(err, "[DASHBOARD] Erro ao obter estatísticas de pagamentos");
            return null;
        }
    },

    async alertasPendentes(filtros?: DashboardFiltros): Promise<AlertasPendentes | null> {
        try {
            const params = new URLSearchParams();
            if (filtros?.data_inicio) params.append('data_inicio', filtros.data_inicio);
            if (filtros?.data_fim) params.append('data_fim', filtros.data_fim);

            const queryString = params.toString();
            const url = `/api/dashboard/alertas${queryString ? `?${queryString}` : ''}`;

            const { data } = await api.get<{
                success: boolean;
                message: string;
                data: { alertas: AlertasPendentes };
            }>(url);

            return data.data.alertas;
        } catch (err) {
            handleAxiosError(err, "[DASHBOARD] Erro ao obter alertas pendentes");
            return null;
        }
    },

    async evolucaoMensal(ano?: number, filtros?: DashboardFiltros): Promise<EvolucaoMensal | null> {
        try {
            const params = new URLSearchParams();
            if (ano) params.append('ano', ano.toString());
            if (filtros?.data_inicio) params.append('data_inicio', filtros.data_inicio);
            if (filtros?.data_fim) params.append('data_fim', filtros.data_fim);

            const queryString = params.toString();
            const url = `/api/dashboard/evolucao-mensal${queryString ? `?${queryString}` : ''}`;

            const { data } = await api.get<{
                success: boolean;
                message: string;
                data: { ano: number; evolucao: EvolucaoMensal };
            }>(url);

            return data.data.evolucao;
        } catch (err) {
            handleAxiosError(err, "[DASHBOARD] Erro ao obter evolução mensal");
            return null;
        }
    },

    /* ================== UTILITÁRIOS ================== */

    calcularMetricas(dashboardData: DashboardData | null): {
        totalFaturado: number;
        totalPendente: number;
        totalClientes: number;
        ticketMedio: number;
        crescimento: number;
        produtosEmStockBaixo: number;
        documentosVencidos: number;
        totalServicos: number;
        totalRetencao: number;
        servicosComRetencao: number;
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
                totalServicos: 0,
                totalRetencao: 0,
                servicosComRetencao: 0,
            };
        }

        const totalServicos = dashboardData.produtos?.servicos?.total ||
            dashboardData.servicos?.total || 0;
        const totalRetencao = dashboardData.kpis?.totalRetencao ||
            dashboardData.documentos_fiscais?.por_mes?.reduce((acc, mes) => acc + (mes.retencao || 0), 0) || 0;
        const servicosComRetencao = dashboardData.produtos?.servicos?.com_retencao ||
            (dashboardData.servicos as any)?.comRetencao || 0;

        return {
            totalFaturado: dashboardData.kpis?.totalFaturado || 0,
            totalPendente: dashboardData.pagamentos?.total_pendente || 0,
            totalClientes: dashboardData.clientes?.ativos || 0,
            ticketMedio: dashboardData.kpis?.ticketMedio || 0,
            crescimento: dashboardData.kpis?.crescimentoPercentual || 0,
            produtosEmStockBaixo: dashboardData.produtos?.stock_baixo || 0,
            documentosVencidos: dashboardData.alertas?.documentos_vencidos || 0,
            totalServicos,
            totalRetencao,
            servicosComRetencao,
        };
    },

    calcularEstatisticasServicos(dashboardData: DashboardData | null): {
        totalServicos: number;
        servicosAtivos: number;
        receitaServicos: number;
        retencaoTotal: number;
        percentualRetencao: number;
        topServicos: Array<{ nome: string; quantidade: number; valor: number; retencao: number }>;
    } {
        if (!dashboardData) {
            return {
                totalServicos: 0,
                servicosAtivos: 0,
                receitaServicos: 0,
                retencaoTotal: 0,
                percentualRetencao: 0,
                topServicos: [],
            };
        }

        const servicos = dashboardData.indicadores?.servicosMaisVendidos || [];
        const totalServicos = dashboardData.produtos?.servicos?.total || dashboardData.servicos?.total || 0;
        const servicosAtivos = dashboardData.produtos?.servicos?.ativos || dashboardData.servicos?.ativos || 0;
        const retencaoTotal = dashboardData.kpis?.totalRetencao || 0;
        const receitaServicos = servicos.reduce((acc, s) => acc + s.valor_total, 0);

        return {
            totalServicos,
            servicosAtivos,
            receitaServicos,
            retencaoTotal,
            percentualRetencao: receitaServicos > 0 ? (retencaoTotal / receitaServicos) * 100 : 0,
            topServicos: servicos.slice(0, 5).map(s => ({
                nome: s.produto,
                quantidade: s.quantidade,
                valor: s.valor_total,
                retencao: s.retencao_total || 0,
            })),
        };
    },

    /**
     * Preparar dados para gráficos
     * ✅ CORRIGIDO: por_estado pode vir como objecto (indexado por tipo) ou array.
     *    O Laravel serializa groupBy() como objecto — Object.values() normaliza para array.
     */
    prepararDadosGraficos(dashboardData: DashboardData | null): {
        evolucaoMensal: Array<{
            mes: string;
            Faturas: number;
            'Faturas-Recibo': number;
            'Notas de Crédito': number;
            Total: number;
            Retencao: number;
        }>;
        documentosPorTipo: Array<{
            tipo: string;
            nome: string;
            quantidade: number;
            valor: number;
            retencao?: number;
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
            retencao?: number;
        }>;
        servicosVendidos: Array<{
            nome: string;
            quantidade: number;
            valor: number;
            retencao: number;
        }>;
    } {
        if (!dashboardData) {
            return {
                evolucaoMensal: [],
                documentosPorTipo: [],
                pagamentosPorMetodo: [],
                documentosPorEstado: [],
                servicosVendidos: [],
            };
        }

        const evolucaoMensal = (dashboardData.documentos_fiscais?.por_mes || []).map(item => ({
            mes: item.mes,
            Faturas: item.FT || 0,
            'Faturas-Recibo': item.FR || 0,
            'Notas de Crédito': item.NC || 0,
            Total: item.total || 0,
            Retencao: item.retencao || 0,
        }));

        const documentosPorTipo = Object.entries(dashboardData.documentos_fiscais?.por_tipo || {}).map(([tipo, info]) => ({
            tipo,
            nome: info.nome,
            quantidade: info.quantidade,
            valor: info.valor,
            retencao: info.retencao || 0,
        }));

        const pagamentosPorMetodo = (dashboardData.pagamentos?.metodos || []).map(metodo => ({
            metodo: metodo.metodo_nome,
            quantidade: metodo.quantidade,
            valor: metodo.valor_total,
        }));

        // ✅ CORRIGIDO: normaliza objecto ou array para array antes de iterar
        const documentosPorEstado: Array<{
            tipo: string;
            estado: string;
            quantidade: number;
            valor: number;
            retencao?: number;
        }> = [];

        const porEstadoRaw = dashboardData.documentos_fiscais?.por_estado;
        if (porEstadoRaw) {
            const porEstadoArray: any[] = Array.isArray(porEstadoRaw)
                ? porEstadoRaw
                : Object.values(porEstadoRaw);

            porEstadoArray.forEach((info: any) => {
                if (info && info.por_estado) {
                    Object.entries(info.por_estado as Record<string, any>).forEach(([estado, dados]: [string, any]) => {
                        documentosPorEstado.push({
                            tipo: info.tipo,
                            estado,
                            quantidade: dados.quantidade ?? 0,
                            valor: dados.valor ?? 0,
                            retencao: dados.retencao || 0,
                        });
                    });
                }
            });
        }

        const servicosVendidos = (dashboardData.indicadores?.servicosMaisVendidos || []).map(s => ({
            nome: s.produto,
            quantidade: s.quantidade,
            valor: s.valor_total,
            retencao: s.retencao_total || 0,
        }));

        return {
            evolucaoMensal,
            documentosPorTipo,
            pagamentosPorMetodo,
            documentosPorEstado,
            servicosVendidos,
        };
    },

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

        if (metricas.produtosEmStockBaixo > 0) {
            cards.push({
                titulo: 'Stock Baixo',
                valor: metricas.produtosEmStockBaixo.toString(),
                icone: '📦',
                cor: 'bg-orange-500',
                variacao: null,
            });
        }

        if (metricas.totalRetencao > 0) {
            cards.push({
                titulo: 'Retenções',
                valor: this._formatarMoeda(metricas.totalRetencao),
                icone: '🔖',
                cor: 'bg-amber-500',
                variacao: null,
                variacaoTexto: `${metricas.servicosComRetencao} serviços`,
            });
        }

        return cards;
    },

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
                acao: '/documentos?tipo=FP&estado=emitido',
            });
        }

        if (alertas.servicos_com_retencao_pendente && alertas.servicos_com_retencao_pendente > 0) {
            listaAlertas.push({
                tipo: 'warning',
                titulo: 'Retenções Pendentes',
                mensagem: `${alertas.servicos_com_retencao_pendente} serviço(s) com retenção a vencer (${this._formatarMoeda(alertas.valor_retencao_pendente || 0)})`,
                icone: '🔖',
                acao: '/documentos?com_retencao=true&estado=pendente',
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

    _formatarMoeda(valor: number): string {
        return new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'AOA',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(valor || 0).replace('AOA', 'Kz').trim();
    },

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

    _formatarPercentual(valor: number): string {
        return `${valor.toFixed(1)}%`;
    },

    getTipoDocumentoColor(tipo: TipoDocumentoFiscal): string {
        const colors: Partial<Record<TipoDocumentoFiscal, string>> = {
            FT:  'bg-blue-100 text-blue-800',
            FR:  'bg-green-100 text-green-800',
            FP:  'bg-orange-100 text-orange-800',
            FA:  'bg-purple-100 text-purple-800',
            NC:  'bg-red-100 text-red-800',
            ND:  'bg-amber-100 text-amber-800',
            RC:  'bg-teal-100 text-teal-800',
            FRt: 'bg-pink-100 text-pink-800',
        };
        return colors[tipo] || 'bg-gray-100 text-gray-800';
    },

    getEstadoDocumentoColor(estado: EstadoDocumentoFiscal): string {
        const colors: Record<EstadoDocumentoFiscal, string> = {
            emitido:           'bg-blue-100 text-blue-800',
            paga:              'bg-green-100 text-green-800',
            parcialmente_paga: 'bg-teal-100 text-teal-800',
            cancelado:         'bg-red-100 text-red-800',
            expirado:          'bg-gray-100 text-gray-800',
        };
        return colors[estado] || 'bg-gray-100 text-gray-800';
    },

    getRetencaoColor(percentual: number): string {
        if (percentual > 10) return 'bg-red-100 text-red-800';
        if (percentual > 5)  return 'bg-orange-100 text-orange-800';
        if (percentual > 0)  return 'bg-yellow-100 text-yellow-800';
        return 'bg-gray-100 text-gray-800';
    },

    getNomeTipoDocumento(tipo: TipoDocumentoFiscal): string {
        const nomes: Record<TipoDocumentoFiscal, string> = {
            FT:  'Fatura',
            FR:  'Fatura-Recibo',
            FP:  'Fatura Proforma',
            RC:  'Recibo',
            NC:  'Nota de Crédito',
            ND:  'Nota de Débito',
            FA:  'Fatura de Adiantamento',
            FRt: 'Fatura de Retificação',
        };
        return nomes[tipo] || tipo;
    },

    hasData(dashboardData: DashboardData | null): boolean {
        if (!dashboardData) return false;
        return (
            (dashboardData.kpis?.totalFaturado > 0) ||
            (dashboardData.vendas?.total > 0) ||
            (dashboardData.documentos_fiscais?.total > 0) ||
            (dashboardData.clientes?.ativos > 0) ||
            (dashboardData.produtos?.servicos?.total ? dashboardData.produtos.servicos.total > 0 : false)
        );
    },

    getResumoRapido(dashboardData: DashboardData | null): {
        totalVendas: number;
        totalServicos: number;
        totalClientes: number;
        totalRetencao: number;
        ticketMedio: number;
    } {
        if (!dashboardData) {
            return { totalVendas: 0, totalServicos: 0, totalClientes: 0, totalRetencao: 0, ticketMedio: 0 };
        }
        return {
            totalVendas:    dashboardData.vendas?.total || 0,
            totalServicos:  dashboardData.produtos?.servicos?.total || dashboardData.servicos?.total || 0,
            totalClientes:  dashboardData.clientes?.ativos || 0,
            totalRetencao:  dashboardData.kpis?.totalRetencao || 0,
            ticketMedio:    dashboardData.kpis?.ticketMedio || 0,
        };
    },
};

/* ================== EXPORTAÇÕES LEGADAS ================== */

export async function obterDashboard(filtros?: DashboardFiltros): Promise<DashboardData | null> {
    return dashboardService.fetch(filtros);
}

export async function obterResumoDocumentosFiscais(filtros?: DashboardFiltros): Promise<ResumoDocumentosFiscais | null> {
    return dashboardService.resumoDocumentosFiscais(filtros);
}

export async function obterEstatisticasPagamentos(filtros?: DashboardFiltros): Promise<EstatisticasPagamentos | null> {
    return dashboardService.estatisticasPagamentos(filtros);
}

export async function obterAlertasPendentes(filtros?: DashboardFiltros): Promise<AlertasPendentes | null> {
    return dashboardService.alertasPendentes(filtros);
}

export async function obterEvolucaoMensal(ano?: number, filtros?: DashboardFiltros): Promise<EvolucaoMensal | null> {
    return dashboardService.evolucaoMensal(ano, filtros);
}

export default dashboardService;