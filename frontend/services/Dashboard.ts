// src/services/Dashboard.ts

import api from "./axios";
import { AxiosError } from "axios";

/* ================== HELPERS ================== */
function handleAxiosError(err: unknown, prefix: string): void {
    if (err instanceof AxiosError) {
        const msg = err.response?.data?.message || err.message || "Erro desconhecido";
        console.error(`${prefix}:`, msg);
    } else {
        console.error(`${prefix}:`, err);
    }
}

/* ================== TIPOS ================== */

export type TipoDocumentoFiscal =
    | 'FT' | 'FR' | 'FP' | 'RC'
    | 'NC' | 'ND' | 'FA' | 'FRt';

export type EstadoDocumentoFiscal =
    | 'emitido' | 'paga' | 'parcialmente_paga'
    | 'cancelado' | 'expirado';

export type EstadoPagamentoVenda = 'paga' | 'pendente' | 'parcial' | 'cancelada';

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'operador' | 'contabilista';
    ativo: boolean;
    ultimo_login?: string | null;
}

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
        servicos: {
            total: number;
            ativos: number;
            inativos: number;
            preco_medio: number;
            preco_medio_formatado: string;
        };
        retencoes: {
            periodo: number;
            periodo_formatado: string;
            periodo_anterior: number;
            periodo_anterior_formatado: string;
            variacao: number;
            variacao_sinal: string;
        };
        top_servicos: Array<{
            id: string;
            nome: string;
            quantidade: number;
            receita: number;
            receita_formatada: string;
            retencao: number;
            retencao_formatada: string;
        }>;
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
        por_tipo: Partial<Record<TipoDocumentoFiscal, {
            nome: string;
            quantidade: number;
            valor: number;
            retencao?: number;
        }>>;
        // O backend pode devolver array ou objecto indexado por tipo
        por_estado: Array<{
            tipo: string;
            por_estado: Record<string, { quantidade: number; valor: number; retencao?: number }>;
            total_quantidade: number;
            total_valor: number;
            total_retencao?: number;
        }> | Record<string, unknown>;
        ultimos: Array<{
            id: string;
            tipo: TipoDocumentoFiscal;
            tipo_nome: string;
            numero: string;
            cliente: string;
            total: number;
            total_retencao?: number;
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
    };

    clientes: {
        ativos: number;
        inativos?: number;
        novos_mes: number;
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
    por_tipo: Partial<Record<TipoDocumentoFiscal, {
        nome: string;
        quantidade: number;
        valor_total: number;
        mes_atual: number;
        retencao_total?: number;
    }>>;
    por_estado: Partial<Record<EstadoDocumentoFiscal, number>>;
    periodo: { inicio: string; fim: string };
}

export interface EstatisticasPagamentos {
    recebidos_hoje: number;
    recebidos_mes: number;
    recebidos_ano: number;
    pendentes: number;
    atrasados: {
        quantidade: number;
        valor_total: number;
        documentos: Array<{ id: string; numero: string; cliente?: string; valor: number; dias_atraso: number }>;
    };
    prazo_medio_pagamento: number;
    metodos_pagamento: Record<string, number>;
}

export interface AlertasPendentes {
    vencidos: {
        quantidade: number;
        valor_total: number;
        documentos: Array<{ id: string; tipo: TipoDocumentoFiscal; numero: string; cliente?: string; valor: number; valor_pendente: number; data_vencimento: string; dias_atraso: number; retencao?: number }>;
    };
    proximos_vencimento: {
        quantidade: number;
        valor_total: number;
        documentos: Array<{ id: string; tipo: TipoDocumentoFiscal; numero: string; cliente?: string; valor: number; valor_pendente: number; data_vencimento: string; dias_ate_vencimento: number; retencao?: number }>;
    };
    proformas_pendentes: {
        quantidade: number;
        valor_total: number;
        documentos: Array<{ id: string; tipo: TipoDocumentoFiscal; numero: string; cliente?: string; valor: number; data_emissao: string; dias_pendentes: number }>;
    };
    servicos_com_retencao_proximos?: {
        quantidade: number;
        valor_total: number;
        valor_retencao: number;
        documentos: Array<{ id: string; numero: string; cliente?: string; valor: number; retencao: number; data_vencimento: string }>;
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

/* ================== SERVICE ================== */

export const dashboardService = {

    async fetch(): Promise<DashboardData | null> {
        try {
            const { data } = await api.get<{ success: boolean; message: string; data: DashboardData }>(
                '/api/dashboard'
            );
            if (!data.success) throw new Error(data.message);
            return data.data;
        } catch (err) {
            handleAxiosError(err, "[DASHBOARD] Erro ao carregar dashboard");
            return null;
        }
    },

    async resumoDocumentosFiscais(): Promise<ResumoDocumentosFiscais | null> {
        try {
            const { data } = await api.get('/api/dashboard/resumo-documentos-fiscais');
            if (!data.success) throw new Error(data.message);
            return data.data.resumo;
        } catch (err) {
            handleAxiosError(err, "[DASHBOARD] resumoDocumentosFiscais");
            return null;
        }
    },

    async estatisticasPagamentos(): Promise<EstatisticasPagamentos | null> {
        try {
            const { data } = await api.get('/api/dashboard/estatisticas-pagamentos');
            if (!data.success) throw new Error(data.message);
            return data.data.estatisticas;
        } catch (err) {
            handleAxiosError(err, "[DASHBOARD] estatisticasPagamentos");
            return null;
        }
    },

    async alertasPendentes(): Promise<AlertasPendentes | null> {
        try {
            const { data } = await api.get('/api/dashboard/alertas');
            if (!data.success) throw new Error(data.message);
            return data.data.alertas;
        } catch (err) {
            handleAxiosError(err, "[DASHBOARD] alertasPendentes");
            return null;
        }
    },

    async evolucaoMensal(ano?: number): Promise<EvolucaoMensal | null> {
        try {
            const { data } = await api.get(`/api/dashboard/evolucao-mensal${ano ? `?ano=${ano}` : ''}`);
            if (!data.success) throw new Error(data.message);
            return data.data.evolucao;
        } catch (err) {
            handleAxiosError(err, "[DASHBOARD] evolucaoMensal");
            return null;
        }
    },

    /* ── Utilitários ────────────────────────────────────────────────────── */

    calcularMetricas(d: DashboardData | null) {
        if (!d) return {
            totalFaturado: 0, totalPendente: 0, totalClientes: 0,
            ticketMedio: 0, crescimento: 0, produtosEmStockBaixo: 0,
            documentosVencidos: 0, totalServicos: 0, totalRetencao: 0, servicosComRetencao: 0,
        };

        return {
            totalFaturado:       d.kpis?.totalFaturado || 0,
            totalPendente:       d.pagamentos?.total_pendente || 0,
            totalClientes:       d.clientes?.ativos || 0,
            ticketMedio:         d.kpis?.ticketMedio || 0,
            crescimento:         d.kpis?.crescimentoPercentual || 0,
            produtosEmStockBaixo: d.produtos?.stock_baixo || 0,
            documentosVencidos:  d.alertas?.documentos_vencidos || 0,
            totalServicos:       d.produtos?.servicos?.total || d.servicos?.servicos?.total || 0,
            totalRetencao:       d.kpis?.totalRetencao || 0,
            servicosComRetencao: d.produtos?.servicos?.com_retencao || 0,
        };
    },

    /**
     * Prepara dados para gráficos.
     * por_estado pode vir como array ou objecto do Laravel (groupBy) — normalizado aqui.
     */
    prepararDadosGraficos(d: DashboardData | null) {
        if (!d) return {
            evolucaoMensal: [], documentosPorTipo: [],
            pagamentosPorMetodo: [], documentosPorEstado: [], servicosVendidos: [],
        };

        const evolucaoMensal = (d.documentos_fiscais?.por_mes || []).map(item => ({
            mes:            item.mes,
            Faturas:        item.FT || 0,
            'Faturas-Recibo': item.FR || 0,
            'Notas de Crédito': item.NC || 0,
            Total:          item.total || 0,
            Retencao:       item.retencao || 0,
        }));

        const documentosPorTipo = Object.entries(d.documentos_fiscais?.por_tipo || {}).map(([tipo, info]) => ({
            tipo,
            nome:       info.nome,
            quantidade: info.quantidade,
            valor:      info.valor,
            retencao:   info.retencao || 0,
        }));

        const pagamentosPorMetodo = (d.pagamentos?.metodos || []).map(m => ({
            metodo:    m.metodo_nome,
            quantidade: m.quantidade,
            valor:     m.valor_total,
        }));

        // Normaliza array ou objecto para array plano de {tipo, estado, quantidade, valor}
        const documentosPorEstado: Array<{ tipo: string; estado: string; quantidade: number; valor: number; retencao?: number }> = [];
        const porEstadoRaw = d.documentos_fiscais?.por_estado;
        if (porEstadoRaw) {
            const arr: any[] = Array.isArray(porEstadoRaw) ? porEstadoRaw : Object.values(porEstadoRaw);
            arr.forEach((info: any) => {
                if (info?.por_estado) {
                    Object.entries(info.por_estado as Record<string, any>).forEach(([estado, dados]: [string, any]) => {
                        documentosPorEstado.push({
                            tipo:       info.tipo,
                            estado,
                            quantidade: dados.quantidade ?? 0,
                            valor:      dados.valor ?? 0,
                            retencao:   dados.retencao || 0,
                        });
                    });
                }
            });
        }

        const servicosVendidos = (d.indicadores?.servicosMaisVendidos || []).map(s => ({
            nome:       s.produto,
            quantidade: s.quantidade,
            valor:      s.valor_total,
            retencao:   s.retencao_total || 0,
        }));

        return { evolucaoMensal, documentosPorTipo, pagamentosPorMetodo, documentosPorEstado, servicosVendidos };
    },

    getKPIsCards(d: DashboardData | null): Array<{
        titulo: string; valor: string; icone: string; cor: string;
        variacao: number | null; variacaoTexto?: string;
    }> {
        const m = this.calcularMetricas(d);

        const cards: Array<{
            titulo: string; valor: string; icone: string; cor: string;
            variacao: number | null; variacaoTexto?: string;
        }> = [
            { titulo: 'Total Faturado', valor: this._formatarMoeda(m.totalFaturado), icone: '💰', cor: 'bg-green-500', variacao: m.crescimento, variacaoTexto: `${m.crescimento > 0 ? '+' : ''}${m.crescimento}%` },
            { titulo: 'Pendente', valor: this._formatarMoeda(m.totalPendente), icone: '⏳', cor: 'bg-yellow-500', variacao: null },
            { titulo: 'Clientes Ativos', valor: String(m.totalClientes), icone: '👥', cor: 'bg-blue-500', variacao: d?.clientes?.novos_mes || 0, variacaoTexto: `+${d?.clientes?.novos_mes || 0} este mês` },
            { titulo: 'Ticket Médio', valor: this._formatarMoeda(m.ticketMedio), icone: '🎫', cor: 'bg-purple-500', variacao: null },
        ];

        if (m.produtosEmStockBaixo > 0) {
            cards.push({ titulo: 'Stock Baixo', valor: String(m.produtosEmStockBaixo), icone: '📦', cor: 'bg-orange-500', variacao: null });
        }
        if (m.totalRetencao > 0) {
            cards.push({ titulo: 'Retenções', valor: this._formatarMoeda(m.totalRetencao), icone: '🔖', cor: 'bg-amber-500', variacao: null, variacaoTexto: `${m.servicosComRetencao} serviços` });
        }

        return cards;
    },

    getAlertasFormatados(d: DashboardData | null): Array<{
        tipo: 'danger' | 'warning' | 'info';
        titulo: string;
        mensagem: string;
        icone: string;
        acao?: string;
    }> {
        if (!d) return [];
        const alertas = d.alertas || {};
        const lista: ReturnType<typeof this.getAlertasFormatados> = [];

        if (alertas.documentos_vencidos > 0)
            lista.push({ tipo: 'danger', titulo: 'Documentos Vencidos', mensagem: `${alertas.documentos_vencidos} documento(s) com pagamento em atraso`, icone: '⚠️', acao: '/documentos?estado=vencido' });

        if (alertas.documentos_proximo_vencimento > 0)
            lista.push({ tipo: 'warning', titulo: 'Próximos do Vencimento', mensagem: `${alertas.documentos_proximo_vencimento} documento(s) vencem nos próximos 3 dias`, icone: '⏰', acao: '/documentos?estado=proximo-vencimento' });

        if (alertas.proformas_antigas > 0)
            lista.push({ tipo: 'info', titulo: 'Proformas Pendentes', mensagem: `${alertas.proformas_antigas} proforma(s) com mais de 7 dias`, icone: '📄', acao: '/documentos?tipo=FP&estado=emitido' });

        if (alertas.servicos_com_retencao_pendente && alertas.servicos_com_retencao_pendente > 0)
            lista.push({ tipo: 'warning', titulo: 'Retenções Pendentes', mensagem: `${alertas.servicos_com_retencao_pendente} serviço(s) com retenção a vencer (${this._formatarMoeda(alertas.valor_retencao_pendente || 0)})`, icone: '🔖', acao: '/documentos?com_retencao=true&estado=pendente' });

        if ((d.produtos?.stock_baixo || 0) > 0)
            lista.push({ tipo: 'warning', titulo: 'Stock Baixo', mensagem: `${d.produtos.stock_baixo} produto(s) com stock abaixo do mínimo`, icone: '📦', acao: '/produtos?stock=baixo' });

        return lista;
    },

    getNomeTipoDocumento(tipo: TipoDocumentoFiscal): string {
        const nomes: Record<TipoDocumentoFiscal, string> = {
            FT: 'Fatura', FR: 'Fatura-Recibo', FP: 'Fatura Proforma',
            RC: 'Recibo', NC: 'Nota de Crédito', ND: 'Nota de Débito',
            FA: 'Fatura de Adiantamento', FRt: 'Fatura de Retificação',
        };
        return nomes[tipo] || tipo;
    },

    getTipoDocumentoColor(tipo: TipoDocumentoFiscal): string {
        return ({
            FT: 'bg-blue-100 text-blue-800', FR: 'bg-green-100 text-green-800',
            FP: 'bg-orange-100 text-orange-800', FA: 'bg-purple-100 text-purple-800',
            NC: 'bg-red-100 text-red-800', ND: 'bg-amber-100 text-amber-800',
            RC: 'bg-teal-100 text-teal-800', FRt: 'bg-pink-100 text-pink-800',
        } as Record<TipoDocumentoFiscal, string>)[tipo] || 'bg-gray-100 text-gray-800';
    },

    getEstadoDocumentoColor(estado: EstadoDocumentoFiscal): string {
        return ({
            emitido: 'bg-blue-100 text-blue-800', paga: 'bg-green-100 text-green-800',
            parcialmente_paga: 'bg-teal-100 text-teal-800', cancelado: 'bg-red-100 text-red-800',
            expirado: 'bg-gray-100 text-gray-800',
        } as Record<EstadoDocumentoFiscal, string>)[estado] || 'bg-gray-100 text-gray-800';
    },

    hasData(d: DashboardData | null): boolean {
        if (!d) return false;
        return (d.kpis?.totalFaturado > 0)
            || (d.vendas?.total > 0)
            || (d.documentos_fiscais?.total > 0)
            || (d.clientes?.ativos > 0);
    },

    _formatarMoeda(valor: number): string {
        return new Intl.NumberFormat('pt-PT', {
            style: 'currency', currency: 'AOA',
            minimumFractionDigits: 2, maximumFractionDigits: 2,
        }).format(valor || 0).replace('AOA', 'Kz').trim();
    },
};

/* ================== EXPORTAÇÕES LEGADAS ================== */
export async function obterDashboard() { return dashboardService.fetch(); }
export async function obterResumoDocumentosFiscais() { return dashboardService.resumoDocumentosFiscais(); }
export async function obterEstatisticasPagamentos() { return dashboardService.estatisticasPagamentos(); }
export async function obterAlertasPendentes() { return dashboardService.alertasPendentes(); }
export async function obterEvolucaoMensal(ano?: number) { return dashboardService.evolucaoMensal(ano); }

export default dashboardService;
