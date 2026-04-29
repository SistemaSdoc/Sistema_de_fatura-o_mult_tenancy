// src/services/relatorios.ts
import api from "./axios";

/* ==================== TIPOS COMPARTILHADOS ==================== */
export type PeriodoTipo =
    | "hoje"
    | "ontem"
    | "este_mes"
    | "mes_passado"
    | "este_ano"
    | "personalizado";

export interface PeriodoConfig {
    tipo: PeriodoTipo;
    data_inicio: string;
    data_fim: string;
}
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

export interface DashboardStock {
    movimentos_hoje: number;
    entradas_hoje: number;
    saidas_hoje: number;
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
    stock: DashboardStock;
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

/* ==================== TIPOS PARA MOVIMENTOS DE STOCK ==================== */

export type TipoMovimento =
    | "compra"
    | "venda"
    | "ajuste"
    | "nota_credito"
    | "venda_cancelada"
    | "nota_credito_cancelada";

export interface MovimentoStockItem {
    id: string;
    produto_id: string;
    produto_nome: string;
    produto_codigo: string;
    tipo: "entrada" | "saida";
    tipo_movimento: TipoMovimento;
    quantidade: number;
    estoque_anterior: number;
    estoque_novo: number;
    custo_medio: number | null;
    referencia: string | null;
    observacao: string | null;
    user: string;
    data: string;
}

export interface MovimentosPorTipo {
    [tipo: string]: {
        total: number;
        quantidade_total: number;
    };
}

export interface MovimentosPorProduto {
    produto_id: string;
    produto_nome: string;
    total_movimentos: number;
    entradas: number;
    saidas: number;
}

export interface MovimentosPorMes {
    mes: string;
    total: number;
    entradas: number;
    saidas: number;
}

export interface MovimentosAgrupado {
    chave: string;
    label: string;
    entradas: number;
    saidas: number;
    total: number;
}

export interface ResumoMovimentosStock {
    total_movimentos: number;
    total_entradas: number;
    total_saidas: number;
    balanco: number;
    por_tipo_movimento: MovimentosPorTipo;
}

export interface RelatorioMovimentosStock {
    periodo: {
        data_inicio: string;
        data_fim: string;
    };
    filtros: Record<string, any>;
    resumo: ResumoMovimentosStock;
    agrupado: MovimentosAgrupado[];
    movimentos: MovimentoStockItem[];
}

export interface MovimentosStockResponse {
    success: boolean;
    message: string;
    data: RelatorioMovimentosStock;
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
     */
    async getDashboard(): Promise<DashboardGeral> {
        const response = await api.get<DashboardResponse>(`${API_PREFIX}/dashboard`);
        return response.data.dashboard;
    },

    /**
     * Relatório detalhado de vendas
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
     * Relatório de stock (produtos)
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
     * ✅ Relatório de movimentos de stock (entradas, saídas, ajustes)
     * GET /api/relatorios/movimentos-stock
     */
    async getRelatorioMovimentosStock(params?: {
        data_inicio?: string;
        data_fim?: string;
        produto_id?: string;
        tipo?: "entrada" | "saida";
        tipo_movimento?: TipoMovimento;
        agrupar_por?: "dia" | "mes" | "produto" | "tipo_movimento";
        paginar?: boolean;
        per_page?: number;
    }): Promise<RelatorioMovimentosStock> {
        const response = await api.get<MovimentosStockResponse>(
            `${API_PREFIX}/movimentos-stock`,
            { params }
        );
        return response.data.data;
    },

    /**
     * Relatório específico de serviços
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
     */
    async getRelatorioPagamentosPendentes(): Promise<RelatorioPagamentosPendentes> {
        const response = await api.get<PagamentosPendentesResponse>(`${API_PREFIX}/pagamentos-pendentes`);
        return response.data.data;
    },

    /**
     * Relatório de proformas
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

export function getHoje(): string {
    return new Date().toISOString().split("T")[0];
}

export function getInicioMes(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export function getInicioAno(): string {
    return `${new Date().getFullYear()}-01-01`;
}

export function getPeriodoPredefinido(tipo: PeriodoTipo): PeriodoConfig {
    const hoje = new Date();

    switch (tipo) {
        case "hoje":
            return { tipo: "hoje", data_inicio: getHoje(), data_fim: getHoje() };

        case "ontem": {
            const ontem = new Date(hoje);
            ontem.setDate(ontem.getDate() - 1);
            const dataOntem = ontem.toISOString().split("T")[0];
            return { tipo: "ontem", data_inicio: dataOntem, data_fim: dataOntem };
        }

        case "este_mes":
            return { tipo: "este_mes", data_inicio: getInicioMes(), data_fim: getHoje() };

        case "mes_passado": {
            const mp = new Date(hoje);
            mp.setMonth(mp.getMonth() - 1);
            const inicio = new Date(mp.getFullYear(), mp.getMonth(), 1);
            const fim = new Date(mp.getFullYear(), mp.getMonth() + 1, 0);
            return {
                tipo: "mes_passado",
                data_inicio: inicio.toISOString().split("T")[0],
                data_fim: fim.toISOString().split("T")[0],
            };
        }

        case "este_ano":
            return { tipo: "este_ano", data_inicio: getInicioAno(), data_fim: getHoje() };

        case "personalizado":
        default:
            return { tipo: "este_mes", data_inicio: getInicioMes(), data_fim: getHoje() };
    }
}

export function getPeriodoLabel(tipo: PeriodoTipo): string {
    const labels: Record<string, string> = {
        hoje: "Hoje", ontem: "Ontem", este_mes: "Este Mês",
        mes_passado: "Mês Passado", este_ano: "Este Ano",
        personalizado: "Período Personalizado",
    };
    return labels[tipo] || tipo;
}

export function formatarData(data: string | null): string {
    if (!data) return "-";
    try {
        const [ano, mes, dia] = data.split("-");
        return `${dia}/${mes}/${ano}`;
    } catch {
        return data;
    }
}

export function formatarDataInput(data: Date): string {
    return data.toISOString().split("T")[0];
}

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

/* ==================== LABELS DE TIPO DE MOVIMENTO ==================== */

export const LABELS_TIPO_MOVIMENTO: Record<string, string> = {
    compra: "Compra",
    venda: "Venda",
    ajuste: "Ajuste Manual",
    nota_credito: "Nota de Crédito",
    venda_cancelada: "Venda Cancelada",
    nota_credito_cancelada: "NC Cancelada",
};

export const COR_TIPO_MOVIMENTO: Record<string, { bg: string; color: string }> = {
    compra:                  { bg: "#dcfce7", color: "#15803d" },
    venda:                   { bg: "#dbeafe", color: "#1d4ed8" },
    ajuste:                  { bg: "#fef9c3", color: "#854d0e" },
    nota_credito:            { bg: "#f3e8ff", color: "#7e22ce" },
    venda_cancelada:         { bg: "#fee2e2", color: "#b91c1c" },
    nota_credito_cancelada:  { bg: "#fee2e2", color: "#b91c1c" },
};

/* ==================== HOOK PARA REACT ==================== */

export const useRelatorios = () => ({
    dashboard: relatoriosService.getDashboard,
    vendas: relatoriosService.getRelatorioVendas,
    compras: relatoriosService.getRelatorioCompras,
    faturacao: relatoriosService.getRelatorioFaturacao,
    stock: relatoriosService.getRelatorioStock,
    movimentosStock: relatoriosService.getRelatorioMovimentosStock,
    servicos: relatoriosService.getRelatorioServicos,
    retencoes: relatoriosService.getRelatorioRetencoes,
    documentosFiscais: relatoriosService.getRelatorioDocumentosFiscais,
    pagamentosPendentes: relatoriosService.getRelatorioPagamentosPendentes,
    proformas: relatoriosService.getRelatorioProformas,
});

export default relatoriosService;