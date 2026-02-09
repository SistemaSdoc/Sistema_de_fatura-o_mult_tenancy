// src/services/relatorios.ts
import api from "./axios";

export interface PeriodoFiltro {
    data_inicio?: string;
    data_fim?: string;
}

export interface VendaRelatorio {
    id: number;
    cliente: string;
    data: string;
    total: number;
    status: "paga" | "pendente" | string;
}

export interface KPIs {
    totalVendas: number;
    ticketMedio: number;
    clientesPeriodo: number;
    produtos: number;
    fornecedores: number;
}

export interface RelatorioVendas {
    kpis: KPIs;
    vendas: VendaRelatorio[];
    total_periodo: number;
    quantidade_vendas: number;
}

export interface RelatorioCompras {
    total_compras: number;
    quantidade_compras: number;
    fornecedores_ativos: number;
    compras_por_fornecedor: Array<{
        fornecedor: string;
        total: number;
        quantidade: number;
    }>;
}

export interface RelatorioFaturacao {
    faturacao_total: number;
    faturacao_paga: number;
    faturacao_pendente: number;
    faturacao_por_mes: Array<{
        mes: string;
        total: number;
    }>;
}

export interface RelatorioStock {
    total_produtos: number;
    valor_stock_total: number;
    produtos_baixo_stock: number;
    produtos_sem_stock: number;
    produtos_por_categoria: Array<{
        categoria: string;
        quantidade: number;
        valor: number;
    }>;
}

export interface DashboardGeral {
    vendas_hoje: number;
    vendas_mes: number;
    vendas_ano: number;
    total_clientes: number;
    total_produtos: number;
    total_fornecedores: number;
    alertas_stock: number;
}

const API_PREFIX = "/api/relatorios";

export const relatoriosService = {
    // Dashboard geral - CORRIGIDO endpoint

    async getRelatorioVendas(filtro?: PeriodoFiltro): Promise<RelatorioVendas> {
        console.log('[FRONTEND] Enviando requisição vendas:', filtro);
        const response = await api.get(`${API_PREFIX}/vendas`, { params: filtro });
        console.log('[FRONTEND] Resposta vendas:', response.data);
        return response.data.relatorio;
    },

    async getDashboard(): Promise<DashboardGeral> {
        console.log('[FRONTEND] Enviando requisição dashboard');
        const response = await api.get(`${API_PREFIX}/dashboard`);
        console.log('[FRONTEND] Resposta dashboard:', response.data);
        return response.data.dashboard;
    },
    // Relatório de compras com filtro de período
    async getRelatorioCompras(filtro?: PeriodoFiltro): Promise<RelatorioCompras> {
        console.log('[RELATÓRIOS] Buscando compras:', filtro);
        const response = await api.get(`${API_PREFIX}/compras`, { params: filtro });
        return response.data.relatorio;
    },

    // Relatório de faturação com filtro de período - CORRIGIDO endpoint
    async getRelatorioFaturacao(filtro?: PeriodoFiltro): Promise<RelatorioFaturacao> {
        console.log('[RELATÓRIOS] Buscando faturação:', filtro);
        const response = await api.get(`${API_PREFIX}/faturacao`, { params: filtro }); // CORRIGIDO: faturacao não faturamento
        return response.data.relatorio;
    },

    // Relatório de stock (sem filtro de data)
    async getRelatorioStock(): Promise<RelatorioStock> {
        console.log('[RELATÓRIOS] Buscando stock');
        const response = await api.get(`${API_PREFIX}/stock`);
        return response.data.relatorio;
    },
};

// Funções auxiliares para datas
export function getHoje(): string {
    return new Date().toISOString().split('T')[0];
}

export function getInicioMes(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

export function getInicioAno(): string {
    return `${new Date().getFullYear()}-01-01`;
}

export function getPeriodoLabel(tipo: 'diario' | 'mensal' | 'anual' | 'personalizado'): string {
    const labels = {
        diario: 'Hoje',
        mensal: 'Este Mês',
        anual: 'Este Ano',
        personalizado: 'Período Personalizado'
    };
    return labels[tipo];
}

export default relatoriosService;