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

/* ==================== TIPOS PARA DASHBOARD ==================== */

export interface DashboardDocumentosFiscais {
    total: number;
    total_faturado: number;
    total_notas_credito: number;
    total_liquido: number;
    total_retencao: number;
    total_retencao_mes: number;
}

export interface DashboardVendas {
    total_mes: number;
    valor_mes: number;
}

export interface DashboardClientes {
    total: number;
    novos_mes: number;
}

export interface DashboardProdutos {
    total: number;
    estoque_baixo: number;
    sem_estoque: number;
}

export interface DashboardServicos {
    total: number;
    ativos: number;
    inativos: number;
}

export interface DashboardAlertas {
    documentos_vencidos: number;
    proformas_antigas: number;
    servicos_com_retencao_pendente: number;
}

export interface DashboardPeriodo {
    inicio_mes: string;
    hoje: string;
}

export interface DashboardGeral {
    documentos_fiscais: DashboardDocumentosFiscais;
    vendas: DashboardVendas;
    clientes: DashboardClientes;
    produtos: DashboardProdutos;
    servicos: DashboardServicos;
    alertas: DashboardAlertas;
    periodo: DashboardPeriodo;
}

export interface DashboardResponse {
    success: boolean;
    message: string;
    dashboard: DashboardGeral;
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
    tem_servicos?: boolean;
    dados_servicos?: {
        quantidade: number;
        retencao: number;
    } | null;
}

export interface VendasAgrupado {
    periodo: string;
    quantidade: number;
    total: number;
    base_tributavel: number;
    total_iva: number;
    total_retencao: number;
}

export interface VendasTotais {
    total_vendas: number;
    total_valor: number;
    total_base_tributavel: number;
    total_iva: number;
    total_retencao: number;
    total_servicos: number;
    total_retencao_servicos: number;
    percentual_retencao_media: number;
}

export interface RelatorioVendas {
    periodo: {
        data_inicio: string;
        data_fim: string;
    };
    filtros: Record<string, any>;
    totais: VendasTotais;
    vendas: VendaRelatorioItem[];
    agrupado: VendasAgrupado[];
}

export interface VendasResponse {
    success: boolean;
    message: string;
    data: RelatorioVendas;
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

export interface ComprasResponse {
    success: boolean;
    message: string;
    relatorio: RelatorioCompras;
}

/* ==================== TIPOS PARA RELATÓRIO DE FATURAÇÃO ==================== */

export interface RetencaoDetalhe {
    numero: string;
    data: string;
    cliente: string;
    total: number;
    retencao: number;
    percentual: number;
}

export interface FaturacaoRetencoes {
    total: number;
    quantidade_documentos: number;
    detalhes: RetencaoDetalhe[];
}

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
    retencoes?: FaturacaoRetencoes;
    periodo: {
        data_inicio: string | null;
        data_fim: string | null;
    };
}

export interface FaturacaoResponse {
    success: boolean;
    message: string;
    relatorio: RelatorioFaturacao;
}

/* ==================== TIPOS PARA RELATÓRIO DE STOCK ==================== */

export interface ProdutoStockItem {
    id: string;
    nome: string;
    codigo: string | null;
    categoria: string | null;
    estoque_atual: number;
    estoque_minimo: number;
    preco_venda: number;
    custo_medio: number | null;
    valor_estoque: number;
    status: string;
    em_estoque_baixo: boolean;
}

export interface StockPorCategoria {
    quantidade: number;
    valor: number;
    produtos: number;
}

export interface StockResumo {
    total_produtos: number;
    total_quantidade_estoque: number;
    total_valor_estoque: number;
    produtos_estoque_baixo: number;
    produtos_sem_estoque: number;
}

export interface RelatorioStock {
    resumo: StockResumo;
    por_categoria: Record<string, StockPorCategoria>;
    produtos: ProdutoStockItem[];
}

export interface StockResponse {
    success: boolean;
    message: string;
    data: RelatorioStock;
}

/* ==================== TIPOS PARA RELATÓRIO DE SERVIÇOS ==================== */

export interface ServicoItem {
    id: string;
    nome: string;
    unidade_medida: string;
    taxa_retencao: number | null;
    quantidade: number;
    vendas: number;
    receita: number;
    receita_formatada: string;
    retencao: number;
    retencao_formatada: string;
    percentual_retencao_real: number;
}

export interface ServicosTotais {
    total_servicos_vendidos: number;
    total_receita: number;
    total_retencao: number;
    total_quantidade: number;
    percentual_retencao_media: number;
}

export interface RelatorioServicos {
    periodo: {
        data_inicio: string;
        data_fim: string;
    };
    totais: ServicosTotais;
    servicos: ServicoItem[];
}

export interface ServicosResponse {
    success: boolean;
    message: string;
    data: RelatorioServicos;
}

/* ==================== TIPOS PARA RELATÓRIO DE RETENÇÕES ==================== */

export interface RetencaoPorCliente {
    cliente: string;
    total_documentos: number;
    total_base: number;
    total_retencao: number;
}

export interface RetencaoDocumento {
    id: string;
    numero: string;
    data: string;
    cliente: string;
    base: number;
    retencao: number;
    percentual: number;
    servicos: number;
}

export interface RetencoesResumo {
    total_documentos: number;
    total_base: number;
    total_retencao: number;
    percentual_medio: number;
}

export interface RelatorioRetencoes {
    periodo: {
        data_inicio: string;
        data_fim: string;
    };
    resumo: RetencoesResumo;
    por_cliente: RetencaoPorCliente[];
    documentos: RetencaoDocumento[];
}

export interface RetencoesResponse {
    success: boolean;
    message: string;
    data: RelatorioRetencoes;
}

/* ==================== TIPOS PARA DOCUMENTOS FISCAIS ==================== */

export interface DocumentoFiscalEstatisticas {
    total_documentos: number;
    total_valor: number;
    total_base: number;
    total_iva: number;
    total_retencao: number;
    por_tipo: Record<string, {
        quantidade: number;
        valor: number;
        retencao: number;
    }>;
    por_estado: Record<string, number>;
}

export interface DocumentoFiscalItem {
    id: string;
    numero_documento: string;
    tipo_documento: string;
    cliente: string;
    data_emissao: string;
    base_tributavel: number;
    total_iva: number;
    total_liquido: number;
    total_retencao?: number;
    estado: string;
    resumo?: any;
}

export interface RelatorioDocumentosFiscais {
    periodo: {
        data_inicio: string;
        data_fim: string;
    };
    filtros: Record<string, any>;
    estatisticas: DocumentoFiscalEstatisticas;
    documentos: DocumentoFiscalItem[];
}

export interface DocumentosFiscaisResponse {
    success: boolean;
    message: string;
    data: RelatorioDocumentosFiscais;
}

/* ==================== TIPOS PARA PAGAMENTOS PENDENTES ==================== */

export interface PagamentoPendente {
    id: string;
    numero_documento: string;
    cliente: string;
    data_emissao: string;
    data_vencimento: string | null;
    valor_total: number;
    valor_pendente: number;
    retencao?: number;
    dias_atraso: number;
    estado: string;
}

export interface ResumoPagamentosPendentes {
    total_pendente: number;
    total_atrasado: number;
    quantidade_faturas: number;
    quantidade_adiantamentos: number;
    retencao_pendente?: number;
}

export interface RelatorioPagamentosPendentes {
    resumo: ResumoPagamentosPendentes;
    faturas_pendentes: PagamentoPendente[];
    adiantamentos_pendentes: PagamentoPendente[];
}

export interface PagamentosPendentesResponse {
    success: boolean;
    message: string;
    data: RelatorioPagamentosPendentes;
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
    periodo: {
        data_inicio: string;
        data_fim: string;
    };
    total: number;
    valor_total: number;
    proformas: ProformaItem[];
}

export interface ProformasResponse {
    success: boolean;
    message: string;
    data: RelatorioProformas;
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
        const response = await api.get<DashboardResponse>(`${API_PREFIX}/dashboard`);
        return response.data.dashboard;
    },

    /**
     * Relatório detalhado de vendas
     * GET /api/relatorios/vendas
     */
    async getRelatorioVendas(params?: {
        data_inicio?: string;
        data_fim?: string;
        apenas_vendas?: boolean;
        cliente_id?: string;
        tipo_documento?: "FT" | "FR" | "FP" | "FA" | "NC" | "ND" | "RC" | "FRt";
        estado_pagamento?: "paga" | "pendente" | "parcial" | "cancelada";
        agrupar_por?: "dia" | "mes" | "ano";
        incluir_servicos?: boolean;
    }): Promise<RelatorioVendas> {
        const response = await api.get<VendasResponse>(`${API_PREFIX}/vendas`, { params });
        return response.data.data;
    },

    /**
     * Relatório detalhado de compras
     * GET /api/relatorios/compras
     */
    async getRelatorioCompras(params?: {
        data_inicio?: string;
        data_fim?: string;
        fornecedor_id?: string;
    }): Promise<RelatorioCompras> {
        const response = await api.get<ComprasResponse>(`${API_PREFIX}/compras`, { params });
        return response.data.relatorio;
    },

    /**
     * Relatório de faturação/documentos fiscais
     * GET /api/relatorios/faturacao
     */
    async getRelatorioFaturacao(params?: {
        data_inicio?: string;
        data_fim?: string;
        tipo?: "FT" | "FR" | "FP" | "FA" | "NC" | "ND" | "RC" | "FRt";
        cliente_id?: string;
        incluir_retencoes?: boolean;
    }): Promise<RelatorioFaturacao> {
        const response = await api.get<FaturacaoResponse>(`${API_PREFIX}/faturacao`, { params });
        return response.data.relatorio;
    },

    /**
     * Relatório de stock
     * GET /api/relatorios/stock
     */
    async getRelatorioStock(params?: {
        estoque_baixo?: boolean;
        sem_estoque?: boolean;
        categoria_id?: string;
        apenas_ativos?: boolean;
    }): Promise<RelatorioStock> {
        const response = await api.get<StockResponse>(`${API_PREFIX}/stock`, { params });
        return response.data.data;
    },

    /**
     * Relatório específico de serviços
     * GET /api/relatorios/servicos
     */
    async getRelatorioServicos(params?: {
        data_inicio?: string;
        data_fim?: string;
        apenas_ativos?: boolean;
        agrupar_por?: "servico" | "categoria";
    }): Promise<RelatorioServicos> {
        const response = await api.get<ServicosResponse>(`${API_PREFIX}/servicos`, { params });
        return response.data.data;
    },

    /**
     * Relatório de retenções
     * GET /api/relatorios/retencoes
     */
    async getRelatorioRetencoes(params?: {
        data_inicio?: string;
        data_fim?: string;
        cliente_id?: string;
    }): Promise<RelatorioRetencoes> {
        const response = await api.get<RetencoesResponse>(`${API_PREFIX}/retencoes`, { params });
        return response.data.data;
    },

    /**
     * Relatório de documentos fiscais (detalhado)
     * GET /api/relatorios/documentos-fiscais
     */
    async getRelatorioDocumentosFiscais(params?: {
        data_inicio?: string;
        data_fim?: string;
        tipo?: "FT" | "FR" | "FP" | "FA" | "NC" | "ND" | "RC" | "FRt";
        cliente_id?: string;
        cliente_nome?: string;
        estado?: "emitido" | "paga" | "parcialmente_paga" | "cancelado" | "expirado";
        apenas_vendas?: boolean;
        apenas_nao_vendas?: boolean;
        com_retencao?: boolean;
    }): Promise<RelatorioDocumentosFiscais> {
        const response = await api.get<DocumentosFiscaisResponse>(`${API_PREFIX}/documentos-fiscais`, { params });
        return response.data.data;
    },

    /**
     * Relatório de pagamentos pendentes
     * GET /api/relatorios/pagamentos-pendentes
     */
    async getRelatorioPagamentosPendentes(): Promise<RelatorioPagamentosPendentes> {
        const response = await api.get<PagamentosPendentesResponse>(`${API_PREFIX}/pagamentos-pendentes`);
        return response.data.data;
    },

    /**
     * Relatório de proformas
     * GET /api/relatorios/proformas
     */
    async getRelatorioProformas(params?: {
        data_inicio?: string;
        data_fim?: string;
        cliente_id?: string;
        pendentes?: boolean;
    }): Promise<RelatorioProformas> {
        const response = await api.get<ProformasResponse>(`${API_PREFIX}/proformas`, { params });
        return response.data.data;
    },
};

/* ==================== FUNÇÕES AUXILIARES PARA DATAS ==================== */

/**
 * Obter data de hoje no formato YYYY-MM-DD
 */
export function getHoje(): string {
    return new Date().toISOString().split("T")[0];
}

/**
 * Obter primeiro dia do mês atual no formato YYYY-MM-DD
 */
export function getInicioMes(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Obter primeiro dia do ano atual no formato YYYY-MM-DD
 */
export function getInicioAno(): string {
    return `${new Date().getFullYear()}-01-01`;
}

/**
 * Obter período pré-definido
 */
export function getPeriodoPredefinido(
    tipo: "hoje" | "ontem" | "este_mes" | "mes_passado" | "este_ano"
): { data_inicio: string; data_fim: string; tipo: string } {
    const hoje = new Date();

    switch (tipo) {
        case "hoje":
            return {
                tipo: "hoje",
                data_inicio: getHoje(),
                data_fim: getHoje(),
            };

        case "ontem": {
            const ontem = new Date(hoje);
            ontem.setDate(ontem.getDate() - 1);
            const dataOntem = ontem.toISOString().split("T")[0];
            return {
                tipo: "ontem",
                data_inicio: dataOntem,
                data_fim: dataOntem,
            };
        }

        case "este_mes":
            return {
                tipo: "este_mes",
                data_inicio: getInicioMes(),
                data_fim: getHoje(),
            };

        case "mes_passado": {
            const mesPassado = new Date(hoje);
            mesPassado.setMonth(mesPassado.getMonth() - 1);
            const inicioMesPassado = new Date(mesPassado.getFullYear(), mesPassado.getMonth(), 1);
            const fimMesPassado = new Date(mesPassado.getFullYear(), mesPassado.getMonth() + 1, 0);
            return {
                tipo: "mes_passado",
                data_inicio: inicioMesPassado.toISOString().split("T")[0],
                data_fim: fimMesPassado.toISOString().split("T")[0],
            };
        }

        case "este_ano":
            return {
                tipo: "este_ano",
                data_inicio: getInicioAno(),
                data_fim: getHoje(),
            };

        default:
            return {
                tipo: "este_mes",
                data_inicio: getInicioMes(),
                data_fim: getHoje(),
            };
    }
}

/**
 * Obter label para período selecionado
 */
export function getPeriodoLabel(
    tipo: "hoje" | "ontem" | "este_mes" | "mes_passado" | "este_ano" | "personalizado"
): string {
    const labels: Record<string, string> = {
        hoje: "Hoje",
        ontem: "Ontem",
        este_mes: "Este Mês",
        mes_passado: "Mês Passado",
        este_ano: "Este Ano",
        personalizado: "Período Personalizado",
    };
    return labels[tipo] || tipo;
}

/**
 * Formatar data para exibição
 */
export function formatarData(data: string | null): string {
    if (!data) return "-";
    try {
        return new Date(data).toLocaleDateString("pt-PT");
    } catch {
        return data;
    }
}

/**
 * Formatar valor em Kwanzas
 */
export function formatarKwanza(valor: number): string {
    return new Intl.NumberFormat("pt-AO", {
        style: "currency",
        currency: "AOA",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
        .format(valor || 0)
        .replace("AOA", "Kz");
}

/* ==================== HOOK PARA REACT ==================== */

/**
 * Hook personalizado para usar relatórios em componentes React
 */
export const useRelatorios = () => {
    return {
        dashboard: relatoriosService.getDashboard,
        vendas: relatoriosService.getRelatorioVendas,
        compras: relatoriosService.getRelatorioCompras,
        faturacao: relatoriosService.getRelatorioFaturacao,
        stock: relatoriosService.getRelatorioStock,
        servicos: relatoriosService.getRelatorioServicos,
        retencoes: relatoriosService.getRelatorioRetencoes,
        documentosFiscais: relatoriosService.getRelatorioDocumentosFiscais,
        pagamentosPendentes: relatoriosService.getRelatorioPagamentosPendentes,
        proformas: relatoriosService.getRelatorioProformas,
    };
};

export default relatoriosService;