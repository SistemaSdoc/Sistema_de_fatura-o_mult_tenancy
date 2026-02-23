// src/services/relatorios.ts
import api from "./axios";

/* ==================== TIPOS COMPARTILHADOS ==================== */

export interface PeriodoFiltro {
    data_inicio?: string;
    data_fim?: string;
}

export interface ClienteInfo {
    id?: string;
    nome?: string;
    nif?: string;
}

export interface DocumentoInfo {
    id: string;
    numero_documento: string;
    tipo_documento: string;
    estado: string;
}

/* ==================== TIPOS PARA RELATÓRIO DE VENDAS ==================== */

export interface VendaRelatorioItem {
    id: string;
    numero_documento: string;
    cliente: string;
    data: string;
    hora: string;
    total: number;
    base_tributavel: number;
    total_iva: number;
    estado_pagamento: string;
    tipo_documento?: string;
}

export interface VendasPorStatus {
    pagas: number;
    pendentes: number;
    canceladas: number;
}

export interface KPIsVendas {
    total_vendas: number;
    quantidade_vendas: number;
    ticket_medio: number;
    clientes_periodo: number;
    produtos_vendidos: number;
    vendas_por_status: VendasPorStatus;
}

export interface RelatorioVendas {
    vendas: VendaRelatorioItem[];
    kpis: KPIsVendas;
    periodo: {
        data_inicio: string | null;
        data_fim: string | null;
    };
}

/* ==================== TIPOS PARA RELATÓRIO DE COMPRAS ==================== */

export interface CompraPorFornecedor {
    fornecedor: string;
    total: number;
    quantidade: number;
}

export interface CompraPorMes {
    mes: string;
    total: number;
    quantidade: number;
}

export interface RelatorioCompras {
    total_compras: number;
    quantidade_compras: number;
    fornecedores_ativos: number;
    compras_por_fornecedor: CompraPorFornecedor[];
    compras_por_mes: CompraPorMes[];
    periodo: {
        data_inicio: string | null;
        data_fim: string | null;
    };
}

/* ==================== TIPOS PARA RELATÓRIO DE FATURAÇÃO ==================== */

export interface FaturacaoPorTipo {
    [tipo: string]: {
        quantidade: number;
        total_liquido: number;
        total_base: number;
        total_iva: number;
    };
}

export interface FaturacaoPorMes {
    mes: string;
    total: number;
    quantidade: number;
}

export interface RelatorioFaturacao {
    faturacao_total: number;
    faturacao_paga: number;
    faturacao_pendente: number;
    faturacao_por_mes: FaturacaoPorMes[];
    por_tipo: FaturacaoPorTipo;
    por_estado: Record<string, number>;
    periodo: {
        data_inicio: string | null;
        data_fim: string | null;
    };
}

/* ==================== TIPOS PARA RELATÓRIO DE STOCK ==================== */

export interface ProdutoItem {
    id: string;
    nome: string;
    codigo?: string;
    categoria_id?: string;
    categoria_nome: string;
    estoque_atual: number;
    estoque_minimo: number;
    preco_compra: number;
    preco_venda: number;
    custo_medio: number;
    status: string;
    margem_lucro: number;
    valor_total_stock: number;
    em_risco: boolean;
}

export interface ProdutoPorCategoria {
    categoria: string;
    quantidade: number;
    valor: number;
    produtos: number;
}

export interface MovimentoRecente {
    id: string;
    produto: string;
    tipo: 'entrada' | 'saida' | 'ajuste';
    quantidade: number;
    motivo?: string;
    data: string;
    user: string;
}

export interface RelatorioStock {
    total_produtos: number;
    valor_stock_total: number;
    produtos_baixo_stock: number;
    produtos_sem_stock: number;
    produtos_por_categoria: ProdutoPorCategoria[];
    movimentos_recentes: MovimentoRecente[];
    produtos?: ProdutoItem[]; // Lista completa opcional
}

/* ==================== TIPOS PARA DASHBOARD GERAL ==================== */

export interface DashboardGeral {
    vendas_hoje: number;
    vendas_mes: number;
    vendas_ano: number;
    documentos_mes: number;
    faturas_pendentes: number;
    total_pendente_cobranca: number;
    adiantamentos_pendentes: number;
    proformas_pendentes: number;
    total_clientes: number;
    total_produtos: number;
    total_fornecedores: number;
    alertas_stock: number;
}

/* ==================== TIPOS PARA PAGAMENTOS PENDENTES ==================== */

export interface PagamentoPendente {
    id: string;
    numero_documento: string;
    cliente: string;
    data_emissao: string;
    data_vencimento?: string;
    valor_total: number;
    valor_pendente: number;
    dias_atraso: number;
    estado: string;
}

export interface ResumoPagamentosPendentes {
    total_pendente: number;
    total_atrasado: number;
    quantidade_faturas: number;
    quantidade_adiantamentos: number;
}

export interface RelatorioPagamentosPendentes {
    resumo: ResumoPagamentosPendentes;
    faturas_pendentes: PagamentoPendente[];
    adiantamentos_pendentes: PagamentoPendente[];
}

/* ==================== TIPOS PARA PROFORMAS ==================== */

export interface ProformaItem {
    id: string;
    numero_documento: string;
    cliente: string;
    data_emissao: string;
    total_liquido: number;
    estado: string;
}

export interface RelatorioProformas {
    total: number;
    valor_total: number;
    proformas: ProformaItem[];
}

/* ==================== TIPOS PARA DOCUMENTOS FISCAIS ==================== */

export interface DocumentoFiscalRelatorio {
    id: string;
    numero_documento: string;
    tipo_documento: string;
    cliente: string;
    data_emissao: string;
    base_tributavel: number;
    total_iva: number;
    total_liquido: number;
    estado: string;
}

export interface RelatorioDocumentosFiscais {
    periodo: {
        data_inicio: string | null;
        data_fim: string | null;
    };
    filtros: Record<string, any>;
    estatisticas: {
        total_documentos: number;
        total_valor: number;
        total_base: number;
        total_iva: number;
        por_tipo: Record<string, { quantidade: number; valor: number }>;
        por_estado: Record<string, number>;
    };
    documentos: DocumentoFiscalRelatorio[];
}

/* ==================== CONSTANTES ==================== */

const API_PREFIX = "/api/relatorios";

/* ==================== SERVIÇO PRINCIPAL ==================== */

export const relatoriosService = {
    /**
     * Dashboard geral com indicadores principais
     * GET /api/relatorios/dashboard
     */
    async getDashboard(): Promise<DashboardGeral> {
        console.log('[RELATÓRIOS] Buscando dashboard');
        try {
            const response = await api.get(`${API_PREFIX}/dashboard`);
            console.log('[RELATÓRIOS] Resposta dashboard:', response.data);
            
            // A API pode retornar em diferentes formatos
            return response.data.dashboard || response.data.data || response.data;
        } catch (error) {
            console.error('[RELATÓRIOS] Erro ao buscar dashboard:', error);
            throw error;
        }
    },

    /**
     * Relatório detalhado de vendas
     * GET /api/relatorios/vendas
     */
    async getRelatorioVendas(filtro?: PeriodoFiltro & {
        cliente_id?: string;
        apenas_vendas?: boolean;
        estado_pagamento?: 'paga' | 'pendente' | 'parcial' | 'cancelada';
    }): Promise<RelatorioVendas> {
        console.log('[RELATÓRIOS] Buscando vendas:', filtro);
        try {
            const response = await api.get(`${API_PREFIX}/vendas`, { params: filtro });
            
            // A API pode retornar em diferentes formatos
            return response.data.data || response.data.relatorio || response.data;
        } catch (error) {
            console.error('[RELATÓRIOS] Erro ao buscar vendas:', error);
            throw error;
        }
    },

    /**
     * Relatório detalhado de compras
     * GET /api/relatorios/compras
     */
    async getRelatorioCompras(filtro?: PeriodoFiltro & {
        fornecedor_id?: string;
    }): Promise<RelatorioCompras> {
        console.log('[RELATÓRIOS] Buscando compras:', filtro);
        try {
            const response = await api.get(`${API_PREFIX}/compras`, { params: filtro });
            
            return response.data.relatorio || response.data.data || response.data;
        } catch (error) {
            console.error('[RELATÓRIOS] Erro ao buscar compras:', error);
            throw error;
        }
    },

    /**
     * Relatório de faturação/documentos fiscais
     * GET /api/relatorios/faturacao
     */
    async getRelatorioFaturacao(filtro?: PeriodoFiltro & {
        tipo?: string;
        cliente_id?: string;
        estado?: string;
    }): Promise<RelatorioFaturacao> {
        console.log('[RELATÓRIOS] Buscando faturação:', filtro);
        try {
            const response = await api.get(`${API_PREFIX}/faturacao`, { params: filtro });
            
            return response.data.relatorio || response.data.data || response.data;
        } catch (error) {
            console.error('[RELATÓRIOS] Erro ao buscar faturação:', error);
            throw error;
        }
    },

    /**
     * Relatório de stock
     * GET /api/relatorios/stock
     */
    async getRelatorioStock(filtro?: {
        categoria_id?: string;
        apenas_ativos?: boolean;
        estoque_baixo?: boolean;
        sem_estoque?: boolean;
    }): Promise<RelatorioStock> {
        console.log('[RELATÓRIOS] Buscando stock');
        try {
            const response = await api.get(`${API_PREFIX}/stock`, { params: filtro });
            
            // A API pode retornar em diferentes formatos
            const data = response.data.data || response.data.relatorio || response.data;
            
            // Garantir que os dados tenham a estrutura esperada
            return {
                total_produtos: data.total_produtos || 0,
                valor_stock_total: data.valor_stock_total || 0,
                produtos_baixo_stock: data.produtos_baixo_stock || 0,
                produtos_sem_stock: data.produtos_sem_stock || 0,
                produtos_por_categoria: data.produtos_por_categoria || [],
                movimentos_recentes: data.movimentos_recentes || [],
                produtos: data.produtos || []
            };
        } catch (error) {
            console.error('[RELATÓRIOS] Erro ao buscar stock:', error);
            throw error;
        }
    },

    /**
     * Relatório de documentos fiscais (detalhado)
     * GET /api/relatorios/documentos-fiscais
     */
    async getRelatorioDocumentosFiscais(filtro?: PeriodoFiltro & {
        tipo?: string;
        cliente_id?: string;
        cliente_nome?: string;
        estado?: string;
        apenas_vendas?: boolean;
        apenas_nao_vendas?: boolean;
    }): Promise<RelatorioDocumentosFiscais> {
        console.log('[RELATÓRIOS] Buscando documentos fiscais:', filtro);
        try {
            const response = await api.get(`${API_PREFIX}/documentos-fiscais`, { params: filtro });
            
            return response.data.data || response.data;
        } catch (error) {
            console.error('[RELATÓRIOS] Erro ao buscar documentos fiscais:', error);
            throw error;
        }
    },

    /**
     * Relatório de pagamentos pendentes
     * GET /api/relatorios/pagamentos-pendentes
     */
    async getRelatorioPagamentosPendentes(): Promise<RelatorioPagamentosPendentes> {
        console.log('[RELATÓRIOS] Buscando pagamentos pendentes');
        try {
            const response = await api.get(`${API_PREFIX}/pagamentos-pendentes`);
            
            const data = response.data.data || response.data;
            
            // Garantir estrutura
            return {
                resumo: data.resumo || {
                    total_pendente: 0,
                    total_atrasado: 0,
                    quantidade_faturas: 0,
                    quantidade_adiantamentos: 0
                },
                faturas_pendentes: data.faturas_pendentes || [],
                adiantamentos_pendentes: data.adiantamentos_pendentes || []
            };
        } catch (error) {
            console.error('[RELATÓRIOS] Erro ao buscar pagamentos pendentes:', error);
            throw error;
        }
    },

    /**
     * Relatório de proformas
     * GET /api/relatorios/proformas
     */
    async getRelatorioProformas(filtro?: PeriodoFiltro & {
        cliente_id?: string;
        pendentes?: boolean;
    }): Promise<RelatorioProformas> {
        console.log('[RELATÓRIOS] Buscando proformas:', filtro);
        try {
            const response = await api.get(`${API_PREFIX}/proformas`, { params: filtro });
            
            const data = response.data.data || response.data;
            
            return {
                total: data.total || 0,
                valor_total: data.valor_total || 0,
                proformas: data.proformas || []
            };
        } catch (error) {
            console.error('[RELATÓRIOS] Erro ao buscar proformas:', error);
            throw error;
        }
    },

    /**
     * Exportar relatório para Excel
     * GET /api/relatorios/exportar/{tipo}
     */
    async exportarRelatorioExcel(
        tipo: 'vendas' | 'compras' | 'faturacao' | 'documentos' | 'stock' | 'proformas',
        filtro?: PeriodoFiltro
    ): Promise<Blob> {
        console.log('[RELATÓRIOS] Exportando Excel:', tipo, filtro);
        try {
            const response = await api.get(`${API_PREFIX}/exportar/${tipo}`, {
                params: filtro,
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error('[RELATÓRIOS] Erro ao exportar Excel:', error);
            throw error;
        }
    }
};

/* ==================== FUNÇÕES AUXILIARES PARA DATAS ==================== */

/**
 * Obter data de hoje no formato YYYY-MM-DD
 */
export function getHoje(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Obter primeiro dia do mês atual no formato YYYY-MM-DD
 */
export function getInicioMes(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Obter primeiro dia do ano atual no formato YYYY-MM-DD
 */
export function getInicioAno(): string {
    return `${new Date().getFullYear()}-01-01`;
}

/**
 * Obter label para período selecionado
 */
export function getPeriodoLabel(tipo: 'hoje' | 'ontem' | 'este_mes' | 'mes_passado' | 'este_ano' | 'personalizado'): string {
    const labels: Record<string, string> = {
        hoje: 'Hoje',
        ontem: 'Ontem',
        este_mes: 'Este Mês',
        mes_passado: 'Mês Passado',
        este_ano: 'Este Ano',
        personalizado: 'Período Personalizado'
    };
    return labels[tipo] || tipo;
}

/**
 * Obter período pré-definido
 */
export function getPeriodoPredefinido(
    tipo: 'hoje' | 'ontem' | 'este_mes' | 'mes_passado' | 'este_ano'
): { data_inicio: string; data_fim: string; tipo: string } {
    const hoje = new Date();

    switch (tipo) {
        case 'hoje':
            return {
                tipo: 'hoje',
                data_inicio: getHoje(),
                data_fim: getHoje()
            };

        case 'ontem':
            const ontem = new Date(hoje);
            ontem.setDate(ontem.getDate() - 1);
            return {
                tipo: 'ontem',
                data_inicio: ontem.toISOString().split('T')[0],
                data_fim: ontem.toISOString().split('T')[0]
            };

        case 'este_mes':
            return {
                tipo: 'este_mes',
                data_inicio: getInicioMes(),
                data_fim: getHoje()
            };

        case 'mes_passado':
            const mesPassado = new Date(hoje);
            mesPassado.setMonth(mesPassado.getMonth() - 1);
            const inicioMesPassado = new Date(mesPassado.getFullYear(), mesPassado.getMonth(), 1);
            const fimMesPassado = new Date(mesPassado.getFullYear(), mesPassado.getMonth() + 1, 0);
            return {
                tipo: 'mes_passado',
                data_inicio: inicioMesPassado.toISOString().split('T')[0],
                data_fim: fimMesPassado.toISOString().split('T')[0]
            };

        case 'este_ano':
            return {
                tipo: 'este_ano',
                data_inicio: getInicioAno(),
                data_fim: getHoje()
            };

        default:
            return {
                tipo: 'este_mes',
                data_inicio: getInicioMes(),
                data_fim: getHoje()
            };
    }
}

/**
 * Formatar data para exibição
 */
export function formatarData(data: string): string {
    if (!data) return '-';
    try {
        return new Date(data).toLocaleDateString('pt-PT');
    } catch {
        return data;
    }
}

/**
 * Formatar valor em Kwanzas
 */
export function formatarKwanza(valor: number): string {
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(valor || 0);
}

/* ==================== HOOKS PARA REACT ==================== */

/**
 * Hook personalizado para usar relatórios em componentes React
 */
export const useRelatorios = () => {
    return {
        vendas: relatoriosService.getRelatorioVendas,
        compras: relatoriosService.getRelatorioCompras,
        faturacao: relatoriosService.getRelatorioFaturacao,
        stock: relatoriosService.getRelatorioStock,
        documentos: relatoriosService.getRelatorioDocumentosFiscais,
        pagamentosPendentes: relatoriosService.getRelatorioPagamentosPendentes,
        proformas: relatoriosService.getRelatorioProformas,
        dashboard: relatoriosService.getDashboard,
        exportar: relatoriosService.exportarRelatorioExcel,
    };
};

export default relatoriosService;