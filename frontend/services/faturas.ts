// src/services/faturas.ts

import api from "./axios";

// ===== TIPOS ENUM =====

export type TipoDocumento = "FT" | "FR" | "NC" | "ND";

export type EstadoFatura = "emitido" | "anulado";

// ===== INTERFACES DE ENTIDADES =====

export interface Cliente {
    id: string;
    nome: string;
    email?: string;
    telefone?: string;
    nif?: string;
    morada?: string;
    cidade?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Produto {
    id: string;
    nome: string;
    codigo?: string;
    preco_venda: number;
    taxa_iva?: number;
    tipo?: "produto" | "servico";
    unidade?: string;
    descricao?: string;
}

export interface ItemFatura {
    id: string;
    fatura_id: string;
    produto_id: string;
    produto?: Produto;
    descricao: string;
    quantidade: number;
    preco_unitario: number;
    base_tributavel: number;
    taxa_iva: number;
    valor_iva: number;
    valor_retencao: number;
    desconto: number;
    total_linha: number;
    created_at?: string;
    updated_at?: string;
}

export interface VendaRelacionada {
    id: string;
    data_venda?: string;
    total?: number;
    status?: string;
    cliente_id?: string;
    cliente?: Cliente;
    itens?: Array<{
        produto_id: string;
        quantidade: number;
        preco_unitario: number;
        desconto?: number;
    }>;
}

export interface Fatura {
    id: string;
    user_id?: string;
    venda_id?: string | null;
    venda?: VendaRelacionada | null;
    cliente_id?: string;
    cliente?: Cliente | null;

    // Identificação fiscal
    serie: string;
    numero: number;
    numero_documento: string;
    tipo_documento: TipoDocumento;

    // Datas
    data_emissao: string;
    hora_emissao?: string;
    data_vencimento?: string;

    // Valores monetários
    base_tributavel: number;
    total_iva: number;
    total_retencao: number;
    total_liquido: number;

    // Estado e fiscalidade
    estado: EstadoFatura;
    hash_fiscal?: string | null;
    motivo_anulacao?: string | null;

    // Relacionamentos
    itens?: ItemFatura[];

    // Timestamps
    created_at?: string;
    updated_at?: string;
}

// ===== INTERFACES DO DASHBOARD =====

export interface FaturasPorMes {
    mes: string;
    total: number;
    quantidade: number;
    ano: number;
    mes_numero: number;
}

export interface DadosPorTipo {
    quantidade: number;
    total: number;
}

export interface PorTipoDocumento {
    ft: DadosPorTipo;
    fr: DadosPorTipo;
    nc: DadosPorTipo;
    nd: DadosPorTipo;
}

export interface ContagemFaturas {
    total: number;
    emitidas: number;
    anuladas: number;
    porMes: FaturasPorMes[];
}

export interface TotaisFaturacao {
    baseTributavel: number;
    totalIva: number;
    totalRetencao: number;
    totalLiquido: number;
}

export interface KPIsFaturas {
    crescimentoPercentual: number;
    ticketMedio: number;
    mediaItensPorFatura: number;
}

export interface DashboardFaturasResponse {
    faturas: ContagemFaturas;
    porTipo: PorTipoDocumento;
    totais: TotaisFaturacao;
    kpis: KPIsFaturas;
    clientesFaturados: number;
    periodo: {
        inicio: string;
        fim: string;
    };
}

// ===== INTERFACES PARA REQUISIÇÕES =====

export interface GerarFaturaInput {
    venda_id: string;
    tipo_documento?: TipoDocumento;
}

export interface AnularFaturaInput {
    motivo: string;
}

// ===== RESPOSTAS DA API =====

export interface ApiResponse<T> {
    message: string;
    fatura?: T;
    faturas?: T[];
    data?: T;
}

// ===== SERVIÇOS =====

export const faturaService = {
    /**
     * Listar todas as faturas
     * GET /api/faturas
     */
    async listarFaturas(): Promise<Fatura[]> {
        try {
            console.log("[FaturaService] Buscando faturas em:", `${API_PREFIX}/faturas`);
            const response = await api.get(`${API_PREFIX}/faturas`);
            console.log("[FaturaService] Resposta:", response.data);

            // O backend retorna em 'faturas'
            const faturas = response.data.faturas || [];
            console.log("[FaturaService] Faturas encontradas:", faturas.length);

            // Debug: verificar se numero_documento existe
            if (faturas.length > 0) {
                console.log("[FaturaService] Primeira fatura:", {
                    id: faturas[0].id,
                    numero_documento: faturas[0].numero_documento,
                    tipo_documento: faturas[0].tipo_documento,
                    estado: faturas[0].estado,
                });
            }

            return faturas;
        } catch (error: any) {
            console.error("[FaturaService] Erro ao listar faturas:", error.response?.status, error.response?.data);
            throw new Error(error.response?.data?.message || "Erro ao carregar faturas");
        }
    },

    /**
     * Buscar fatura por ID
     * GET /api/faturas/{fatura}
     */
    async buscarFatura(faturaId: string): Promise<Fatura> {
        const response = await api.get(`${API_PREFIX}/faturas/${faturaId}`);
        return response.data.fatura;
    },

    /**
     * Gerar nova fatura a partir de uma venda
     * POST /api/faturas/gerar
     */
    async gerarFatura(dados: GerarFaturaInput): Promise<Fatura> {
        const response = await api.post(`${API_PREFIX}/faturas/gerar`, dados);
        return response.data.fatura;
    },

    /**
     * Anular fatura
     * POST /api/faturas/{fatura}/anular
     */
    async anularFatura(faturaId: string, dados: AnularFaturaInput): Promise<Fatura> {
        const response = await api.post(`${API_PREFIX}/faturas/${faturaId}/anular`, dados);
        return response.data.fatura;
    },
};

// ===== SERVIÇO DE DASHBOARD =====

export const dashboardService = {
    /**
     * Obter dashboard completo de faturas
     * SEMPRE constrói a partir da listagem de faturas para garantir dados atualizados
     */
    async fetch(): Promise<DashboardFaturasResponse> {
        try {
            console.log("[DashboardService] Construindo dashboard a partir de faturas...");

            // SEMPRE buscar faturas primeiro para ter dados reais
            const faturas = await faturaService.listarFaturas();
            console.log("[DashboardService] Total de faturas para dashboard:", faturas.length);

            if (faturas.length === 0) {
                console.warn("[DashboardService] Nenhuma fatura encontrada, retornando dashboard vazio");
                return this.getDashboardVazio();
            }

            return this.calcularDashboard(faturas);
        } catch (error: any) {
            console.error("[DashboardService] Erro ao construir dashboard:", error.message);
            return this.getDashboardVazio();
        }
    },

    /**
     * Calcular dashboard a partir de uma lista de faturas
     */
    calcularDashboard(faturas: Fatura[]): DashboardFaturasResponse {
        console.log("[DashboardService] Calculando dashboard com", faturas.length, "faturas");

        // Calcular totais
        const totais = faturas.reduce(
            (acc, f) => ({
                baseTributavel: acc.baseTributavel + (Number(f.base_tributavel) || 0),
                totalIva: acc.totalIva + (Number(f.total_iva) || 0),
                totalRetencao: acc.totalRetencao + (Number(f.total_retencao) || 0),
                totalLiquido: acc.totalLiquido + (Number(f.total_liquido) || 0),
            }),
            {
                baseTributavel: 0,
                totalIva: 0,
                totalRetencao: 0,
                totalLiquido: 0,
            }
        );

        console.log("[DashboardService] Totais calculados:", totais);

        // Contar por estado
        const emitidas = faturas.filter((f) => f.estado === "emitido").length;
        const anuladas = faturas.filter((f) => f.estado === "anulado").length;

        console.log("[DashboardService] Por estado - Emitidas:", emitidas, "Anuladas:", anuladas);

        // Agrupar por tipo de documento
        const porTipo: PorTipoDocumento = {
            ft: { quantidade: 0, total: 0 },
            fr: { quantidade: 0, total: 0 },
            nc: { quantidade: 0, total: 0 },
            nd: { quantidade: 0, total: 0 },
        };

        faturas.forEach((f) => {
            const tipo = (f.tipo_documento || "FT").toLowerCase() as keyof PorTipoDocumento;
            const valor = Number(f.total_liquido) || 0;

            if (porTipo[tipo]) {
                porTipo[tipo].quantidade++;
                porTipo[tipo].total += valor;
            } else {
                // Se não encontrar o tipo, jogar em ft como padrão
                porTipo.ft.quantidade++;
                porTipo.ft.total += valor;
            }
        });

        console.log("[DashboardService] Por tipo:", porTipo);

        // Agrupar por mês (últimos 12 meses)
        const porMes: FaturasPorMes[] = [];
        const hoje = new Date();

        // Criar mapa de meses existentes
        const mesesMap = new Map<string, { total: number; quantidade: number }>();

        faturas.forEach((f) => {
            if (!f.data_emissao) return;

            const data = new Date(f.data_emissao);
            const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
            const valor = Number(f.total_liquido) || 0;

            if (!mesesMap.has(chave)) {
                mesesMap.set(chave, { total: 0, quantidade: 0 });
            }

            const atual = mesesMap.get(chave)!;
            atual.total += valor;
            atual.quantidade++;
        });

        // Preencher últimos 12 meses
        for (let i = 11; i >= 0; i--) {
            const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
            const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
            const dadosMes = mesesMap.get(chave) || { total: 0, quantidade: 0 };

            porMes.push({
                mes: data.toLocaleDateString("pt-PT", { month: "short", year: "numeric" }),
                total: dadosMes.total,
                quantidade: dadosMes.quantidade,
                ano: data.getFullYear(),
                mes_numero: data.getMonth() + 1,
            });
        }

        console.log("[DashboardService] Por mes:", porMes);

        const dashboard: DashboardFaturasResponse = {
            faturas: {
                total: faturas.length,
                emitidas,
                anuladas,
                porMes,
            },
            porTipo,
            totais,
            kpis: {
                crescimentoPercentual: 0,
                ticketMedio: faturas.length > 0 ? totais.totalLiquido / faturas.length : 0,
                mediaItensPorFatura: 0,
            },
            clientesFaturados: new Set(faturas.map((f) => f.cliente_id).filter(Boolean)).size,
            periodo: {
                inicio: new Date(new Date().getFullYear(), 0, 1).toISOString(),
                fim: new Date().toISOString(),
            },
        };

        console.log("[DashboardService] Dashboard completo:", dashboard);
        return dashboard;
    },

    /**
     * Retornar dashboard vazio (fallback)
     */
    getDashboardVazio(): DashboardFaturasResponse {
        return {
            faturas: {
                total: 0,
                emitidas: 0,
                anuladas: 0,
                porMes: [],
            },
            porTipo: {
                ft: { quantidade: 0, total: 0 },
                fr: { quantidade: 0, total: 0 },
                nc: { quantidade: 0, total: 0 },
                nd: { quantidade: 0, total: 0 },
            },
            totais: {
                baseTributavel: 0,
                totalIva: 0,
                totalRetencao: 0,
                totalLiquido: 0,
            },
            kpis: {
                crescimentoPercentual: 0,
                ticketMedio: 0,
                mediaItensPorFatura: 0,
            },
            clientesFaturados: 0,
            periodo: {
                inicio: new Date().toISOString(),
                fim: new Date().toISOString(),
            },
        };
    },

    /**
     * Obter resumo rápido (KPIs apenas)
     */
    async resumo(): Promise<{
        faturas: { total: number; anuladas: number };
        totais: { totalLiquido: number };
        kpis: { crescimentoPercentual: number };
    }> {
        const dashboard = await this.fetch();
        return {
            faturas: {
                total: dashboard.faturas.total,
                anuladas: dashboard.faturas.anuladas,
            },
            totais: {
                totalLiquido: dashboard.totais.totalLiquido,
            },
            kpis: {
                crescimentoPercentual: dashboard.kpis.crescimentoPercentual,
            },
        };
    },
};

// ===== CONFIGURAÇÃO =====

// Detectar automaticamente o prefixo da API
const getApiPrefix = () => {
    // Se estiver em ambiente Next.js, pode usar variável de ambiente
    if (typeof window !== 'undefined') {
        // Verificar se a API responde em /api ou na raiz
        return "/api";
    }
    return "/api";
};

const API_PREFIX = getApiPrefix();

// ===== UTILITÁRIOS =====

export function formatarNumeroDocumento(numero: string): string {
    if (!numero) return "-";
    return numero.replace(/(\w{2})-(\d{5})/, "$1 $2");
}

export function extrairSerieInfo(numeroDocumento: string): {
    serie: string;
    ano: number;
    numero: number;
} {
    if (!numeroDocumento) return { serie: "", ano: 0, numero: 0 };

    const match = numeroDocumento.match(/^([A-Z]+(\d{4}))-(\d{5})$/);
    if (!match) {
        return { serie: "", ano: 0, numero: 0 };
    }
    return {
        serie: match[1],
        ano: parseInt(match[2]),
        numero: parseInt(match[3]),
    };
}

export function gerarPreviewNumero(serie: string, ultimoNumero: number): string {
    const proximo = ultimoNumero + 1;
    return `${serie}-${proximo.toString().padStart(5, "0")}`;
}

export function calcularTotais(faturas: Fatura[]): TotaisFaturacao {
    return faturas.reduce(
        (acc, fatura) => ({
            baseTributavel: acc.baseTributavel + (Number(fatura.base_tributavel) || 0),
            totalIva: acc.totalIva + (Number(fatura.total_iva) || 0),
            totalRetencao: acc.totalRetencao + (Number(fatura.total_retencao) || 0),
            totalLiquido: acc.totalLiquido + (Number(fatura.total_liquido) || 0),
        }),
        {
            baseTributavel: 0,
            totalIva: 0,
            totalRetencao: 0,
            totalLiquido: 0,
        }
    );
}

export function podeSerAnulada(fatura: Fatura): boolean {
    return fatura.estado === "emitido";
}

export function getTipoDocumentoLabel(tipo: TipoDocumento): string {
    const labels: Record<TipoDocumento, string> = {
        FT: "Fatura",
        FR: "Fatura-Recibo",
        NC: "Nota de Crédito",
        ND: "Nota de Débito",
    };
    return labels[tipo] || tipo;
}

export function getEstadoLabel(estado: EstadoFatura): string {
    const labels: Record<EstadoFatura, string> = {
        emitido: "Emitido",
        anulado: "Anulado",
    };
    return labels[estado] || estado;
}

export function getEstadoColor(estado: EstadoFatura): string {
    const colors: Record<EstadoFatura, string> = {
        emitido: "#025939",
        anulado: "#DC2626",
    };
    return colors[estado] || "#6B7280";
}

export default {
    faturaService,
    dashboardService,
};