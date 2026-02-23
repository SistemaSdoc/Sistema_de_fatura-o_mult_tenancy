// src/services/documentoFiscalService.ts

import api from "./axios";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ==================== TIPOS ====================

export type TipoDocumento = 'FT' | 'FR' | 'FP' | 'FA' | 'NC' | 'ND' | 'RC' | 'FRt';
export type EstadoDocumento = 'emitido' | 'paga' | 'parcialmente_paga' | 'cancelado' | 'expirado';
export type MetodoPagamento = 'transferencia' | 'multibanco' | 'dinheiro' | 'cheque' | 'cartao';

// Constantes para tipos de documento
export const TIPOS_VENDA: TipoDocumento[] = ['FT', 'FR', 'RC'];
export const TIPOS_NAO_VENDA: TipoDocumento[] = ['FP', 'FA', 'NC', 'ND', 'FRt'];
export const TIPOS_DOCUMENTO_VENDA: TipoDocumento[] = ['FT', 'FR', 'FP'];

export interface ItemDocumento {
    id?: string;
    produto_id?: string | null;
    descricao: string;
    quantidade: number;
    preco_unitario: number;
    desconto?: number;
    taxa_iva: number;
    valor_iva?: number;
    total_linha?: number;
    codigo_produto?: string;
    unidade?: string;
}

export interface DocumentoFiscal {
    id: string;
    user_id: string;
    venda_id?: string | null;
    cliente_id?: string | null;
    cliente_nome?: string | null;
    cliente_nif?: string | null;
    fatura_id?: string | null;
    serie: string;
    numero: number;
    numero_documento: string;
    tipo_documento: TipoDocumento;
    data_emissao: string;
    hora_emissao: string;
    data_vencimento?: string | null;
    data_cancelamento?: string | null;
    base_tributavel: number;
    total_iva: number;
    total_retencao: number;
    total_liquido: number;
    estado: EstadoDocumento;
    motivo?: string | null;
    motivo_cancelamento?: string | null;
    user_cancelamento_id?: string | null;
    metodo_pagamento?: MetodoPagamento | null;
    referencia_pagamento?: string | null;
    hash_fiscal?: string | null;
    referencia_externa?: string | null;
    observacoes?: string | null;
    created_at: string;
    updated_at: string;

    // Relações
    cliente?: Cliente;
    user?: User;
    itens?: ItemDocumento[];
    documentoOrigem?: DocumentoFiscal;
    documentosDerivados?: DocumentoFiscal[];
    recibos?: DocumentoFiscal[];
    notasCredito?: DocumentoFiscal[];
    notasDebito?: DocumentoFiscal[];
    faturasAdiantamento?: DocumentoFiscal[];
    faturasVinculadas?: DocumentoFiscal[];
}

export interface Cliente {
    id: string;
    nome: string;
    nif?: string | null;
    tipo: 'consumidor_final' | 'empresa';
    telefone?: string;
    email?: string;
    endereco?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role?: string;
}

export interface FiltrosDocumento {
    tipo?: TipoDocumento;
    estado?: EstadoDocumento;
    cliente_id?: string;
    cliente_nome?: string;
    data_inicio?: string;
    data_fim?: string;
    pendentes?: boolean;
    adiantamentos_pendentes?: boolean;
    proformas_pendentes?: boolean;
    apenas_vendas?: boolean;
    apenas_nao_vendas?: boolean;
    per_page?: number;
    page?: number;
    search?: string;
}

export interface DadosPagamento {
    metodo: MetodoPagamento;
    valor: number;
    data?: string;
    referencia?: string;
}

export interface EmitirDocumentoDTO {
    tipo_documento: TipoDocumento;
    cliente_id?: string;
    cliente_nome?: string;
    cliente_nif?: string;
    venda_id?: string;
    fatura_id?: string;
    itens?: ItemDocumento[];
    dados_pagamento?: DadosPagamento;
    motivo?: string;
    data_vencimento?: string;
    referencia_externa?: string;
    observacoes?: string;
}

export interface GerarReciboDTO {
    valor: number;
    metodo_pagamento: MetodoPagamento;
    data_pagamento?: string;
    referencia?: string;
}

export interface VincularAdiantamentoDTO {
    fatura_id: string;
    valor: number;
}

export interface CancelarDocumentoDTO {
    motivo: string;
}

// ==================== API RESPONSES ====================

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    error?: string;
    errors?: Record<string, string[]>;
}

interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number;
    to?: number;
}

// Tipos específicos do Dashboard baseados no Controller
export interface DashboardDocumentos {
    faturas_emitidas_mes: number;
    faturas_pendentes: number;
    total_pendente_cobranca: number;
    adiantamentos_pendentes: number;
    proformas_pendentes: number;
    documentos_cancelados_mes: number;
    total_vendas_mes: number;
    total_nao_vendas_mes: number;
}

export interface AlertasDocumentos {
    adiantamentos_vencidos: {
        total: number;
        items: DocumentoFiscal[];
    };
    faturas_com_adiantamentos_pendentes: {
        total: number;
        items: DocumentoFiscal[];
    };
    proformas_pendentes: {
        total: number;
        items: DocumentoFiscal[];
    };
    faturas_vencidas?: {
        total: number;
        items: DocumentoFiscal[];
    };
}

export interface EvolucaoDados {
    mes: number;
    ano: number;
    total_vendas: number;
    total_nao_vendas: number;
    total_pendente: number;
}

export interface ResumoDashboard {
    user: {
        id: string;
        name: string;
        role: string;
    };
    resumo?: DashboardDocumentos;
    estatisticas?: Record<string, number | string>;
    alertas?: AlertasDocumentos;
    ano?: number;
    evolucao?: EvolucaoDados[];
}

// ==================== SERVICE ====================

class DocumentoFiscalService {
    private baseUrl = '/api/documentos-fiscais';

    // ==================== LISTAGEM E CONSULTA ====================

    /**
     * Listar documentos fiscais com filtros (GET /api/documentos-fiscais)
     * Suporta todos os tipos: FT, FR, FP, FA, NC, ND, RC, FRt
     */
    async listar(filtros: FiltrosDocumento = {}): Promise<PaginatedResponse<DocumentoFiscal>> {
        const params = new URLSearchParams();

        Object.entries(filtros).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, String(value));
            }
        });

        const response = await api.get<ApiResponse<PaginatedResponse<DocumentoFiscal>>>(
            `${this.baseUrl}?${params.toString()}`
        );

        if (!response.data.success) {
            throw new Error(response.data.message);
        }

        return response.data.data;
    }

    /**
     * Buscar documento específico por ID (GET /api/documentos-fiscais/{id})
     */
    async buscarPorId(id: string): Promise<DocumentoFiscal> {
        const response = await api.get<ApiResponse<{ documento: DocumentoFiscal }>>(`${this.baseUrl}/${id}`);

        if (!response.data.success) {
            throw new Error(response.data.message);
        }

        return response.data.data.documento;
    }

    // ==================== EMISSÃO ====================

    /**
     * Emitir qualquer tipo de documento fiscal (POST /api/documentos-fiscais/emitir)
     * Tipos suportados: FT, FR, FP, FA, NC, ND, RC, FRt
     */
    async emitir(dados: EmitirDocumentoDTO): Promise<DocumentoFiscal> {
        // Validação frontend para FR
        if (!dados.cliente_id && !dados.cliente_nome && dados.tipo_documento === 'FR') {
            throw new Error('Fatura-Recibo (FR) requer um cliente (cadastrado ou avulso)');
        }

        const response = await api.post<ApiResponse<DocumentoFiscal>>(
            `${this.baseUrl}/emitir`,
            dados
        );

        if (!response.data.success) {
            throw new Error(response.data.message);
        }

        return response.data.data;
    }

    /**
     * Emitir Fatura (FT)
     */
    async emitirFatura(dados: Omit<EmitirDocumentoDTO, 'tipo_documento'>): Promise<DocumentoFiscal> {
        return this.emitir({ ...dados, tipo_documento: 'FT' });
    }

    /**
     * Emitir Fatura-Recibo (FR)
     */
    async emitirFaturaRecibo(
        dados: Omit<EmitirDocumentoDTO, 'tipo_documento'> & { dados_pagamento: DadosPagamento }
    ): Promise<DocumentoFiscal> {
        return this.emitir({ ...dados, tipo_documento: 'FR' });
    }

    /**
     * Emitir Fatura Proforma (FP)
     */
    async emitirFaturaProforma(dados: Omit<EmitirDocumentoDTO, 'tipo_documento'>): Promise<DocumentoFiscal> {
        return this.emitir({ ...dados, tipo_documento: 'FP' });
    }

    /**
     * Emitir Fatura de Adiantamento (FA)
     */
    async emitirFaturaAdiantamento(
        dados: Omit<EmitirDocumentoDTO, 'tipo_documento' | 'itens'> & { descricao?: string }
    ): Promise<DocumentoFiscal> {
        return this.emitir({
            ...dados,
            tipo_documento: 'FA',
            itens: dados.descricao ? [{
                descricao: dados.descricao,
                quantidade: 1,
                preco_unitario: dados.dados_pagamento?.valor || 0,
                taxa_iva: 0
            }] : undefined
        });
    }

    /**
     * Emitir Recibo (RC) - geralmente gerado automaticamente, mas disponível manualmente
     */
    async emitirRecibo(
        dados: Omit<EmitirDocumentoDTO, 'tipo_documento'> & { fatura_id: string }
    ): Promise<DocumentoFiscal> {
        return this.emitir({ ...dados, tipo_documento: 'RC' });
    }

    /**
     * Emitir Fatura de Retificação (FRt)
     */
    async emitirFaturaRetificacao(
        dados: Omit<EmitirDocumentoDTO, 'tipo_documento'> & { fatura_id: string; motivo: string }
    ): Promise<DocumentoFiscal> {
        return this.emitir({ ...dados, tipo_documento: 'FRt' });
    }

    // ==================== NOTAS DE CRÉDITO/DÉBITO ====================

    /**
     * Criar Nota de Crédito (POST /api/documentos-fiscais/{id}/nota-credito)
     */
    async criarNotaCredito(
        documentoOrigemId: string,
        dados: Omit<EmitirDocumentoDTO, 'tipo_documento' | 'fatura_id'>
    ): Promise<DocumentoFiscal> {
        const response = await api.post<ApiResponse<DocumentoFiscal>>(
            `${this.baseUrl}/${documentoOrigemId}/nota-credito`,
            dados
        );

        if (!response.data.success) {
            throw new Error(response.data.message);
        }

        return response.data.data;
    }

    /**
     * Criar Nota de Débito (POST /api/documentos-fiscais/{id}/nota-debito)
     */
    async criarNotaDebito(
        documentoOrigemId: string,
        dados: Omit<EmitirDocumentoDTO, 'tipo_documento' | 'fatura_id'>
    ): Promise<DocumentoFiscal> {
        const response = await api.post<ApiResponse<DocumentoFiscal>>(
            `${this.baseUrl}/${documentoOrigemId}/nota-debito`,
            dados
        );

        if (!response.data.success) {
            throw new Error(response.data.message);
        }

        return response.data.data;
    }

    // ==================== RECIBOS ====================

    /**
     * Gerar recibo para fatura (FT) ou adiantamento (FA) (POST /api/documentos-fiscais/{id}/recibo)
     */
    async gerarRecibo(documentoId: string, dados: GerarReciboDTO): Promise<DocumentoFiscal> {
        const response = await api.post<ApiResponse<DocumentoFiscal>>(
            `${this.baseUrl}/${documentoId}/recibo`,
            dados
        );

        if (!response.data.success) {
            throw new Error(response.data.message);
        }

        return response.data.data;
    }

    /**
     * Listar recibos de um documento (GET /api/documentos-fiscais/{id}/recibos)
     */
    async listarRecibos(documentoId: string): Promise<DocumentoFiscal[]> {
        const response = await api.get<ApiResponse<DocumentoFiscal[]>>(
            `${this.baseUrl}/${documentoId}/recibos`
        );

        if (!response.data.success) {
            throw new Error(response.data.message);
        }

        return response.data.data;
    }

    // ==================== ADIANTAMENTOS ====================

    /**
     * Vincular adiantamento (FA) a fatura (FT) (POST /api/documentos-fiscais/{id}/vincular)
     */
    async vincularAdiantamento(
        adiantamentoId: string,
        dados: VincularAdiantamentoDTO
    ): Promise<{ adiantamento: DocumentoFiscal; fatura: DocumentoFiscal }> {
        const response = await api.post<ApiResponse<{ adiantamento: DocumentoFiscal; fatura: DocumentoFiscal }>>(
            `${this.baseUrl}/${adiantamentoId}/vincular`,
            dados
        );

        if (!response.data.success) {
            throw new Error(response.data.message);
        }

        return response.data.data;
    }

    // ==================== CANCELAMENTO ====================

    /**
     * Cancelar documento fiscal (POST /api/documentos-fiscais/{id}/cancelar)
     */
    async cancelar(id: string, dados: CancelarDocumentoDTO): Promise<DocumentoFiscal> {
        const response = await api.post<ApiResponse<DocumentoFiscal>>(
            `${this.baseUrl}/${id}/cancelar`,
            dados
        );

        if (!response.data.success) {
            throw new Error(response.data.message);
        }

        return response.data.data;
    }

    // ==================== DASHBOARD E ESTATÍSTICAS ====================

    /**
     * Obter dashboard completo (GET /api/dashboard)
     */
    async getDashboard(): Promise<ResumoDashboard> {
        const response = await api.get<ApiResponse<ResumoDashboard>>('/api/dashboard');

        if (!response.data.success) {
            throw new Error(response.data.message);
        }

        return response.data.data;
    }

    /**
     * Obter resumo de documentos fiscais (GET /api/dashboard/documentos-fiscais)
     */
    async getResumoDocumentosFiscais(): Promise<DashboardDocumentos> {
        const response = await api.get<ApiResponse<{ resumo: DashboardDocumentos }>>('/api/dashboard/documentos-fiscais');

        if (!response.data.success) {
            throw new Error(response.data.message);
        }

        return response.data.data.resumo;
    }

    /**
     * Obter estatísticas de pagamentos (GET /api/dashboard/estatisticas-pagamentos)
     */
    async getEstatisticasPagamentos(): Promise<Record<string, number | string>> {
        const response = await api.get<ApiResponse<{ estatisticas: Record<string, number | string> }>>('/api/dashboard/estatisticas-pagamentos');

        if (!response.data.success) {
            throw new Error(response.data.message);
        }

        return response.data.data.estatisticas;
    }

    /**
     * Obter alertas de documentos pendentes (GET /api/dashboard/alertas-pendentes)
     */
    async getAlertasPendentes(): Promise<AlertasDocumentos> {
        const response = await api.get<ApiResponse<{ alertas: AlertasDocumentos }>>('/api/dashboard/alertas-pendentes');

        if (!response.data.success) {
            throw new Error(response.data.message);
        }

        return response.data.data.alertas;
    }

    /**
     * Obter evolução mensal (GET /api/dashboard/evolucao-mensal)
     * CORRIGIDO: Usa 'meses' em vez de 'evolucao' conforme retorno do backend
     */
    async getEvolucaoMensal(ano?: number): Promise<EvolucaoDados[]> {
        const params = ano ? `?ano=${ano}` : '';
        const response = await api.get<ApiResponse<{ ano: number; meses: EvolucaoDados[] }>>(
            `/api/dashboard/evolucao-mensal${params}`
        );

        if (!response.data.success) {
            console.error('Erro ao carregar evolução mensal:', response.data.message);
            return [];
        }

        // CORREÇÃO: Usa 'meses' em vez de 'evolucao'
        const meses = response.data.data?.meses;

        if (!Array.isArray(meses)) {
            console.warn('Dados de evolução não são um array:', meses);
            return [];
        }

        return meses;
    }

    // ==================== UTILITÁRIOS ====================

    /**
     * Calcular valor pendente de uma fatura ou adiantamento
     */
    calcularValorPendente(documento: DocumentoFiscal): number {
        if (!['FT', 'FA'].includes(documento.tipo_documento)) return 0;

        const totalPago = documento.recibos?.reduce((sum, r) =>
            r.estado !== 'cancelado' ? sum + r.total_liquido : sum, 0
        ) || 0;

        if (documento.tipo_documento === 'FA') {
            return Math.max(0, documento.total_liquido - totalPago);
        }

        const totalAdiantamentos = documento.faturasAdiantamento?.reduce((sum, a) =>
            sum + (a.total_liquido || 0), 0
        ) || 0;

        return Math.max(0, documento.total_liquido - totalPago - totalAdiantamentos);
    }

    /**
     * Calcular valor já pago
     */
    calcularValorPago(documento: DocumentoFiscal): number {
        if (['FR', 'RC'].includes(documento.tipo_documento)) {
            return documento.total_liquido;
        }

        if (documento.tipo_documento === 'FP') {
            return 0;
        }

        return documento.recibos?.reduce((sum, r) =>
            r.estado !== 'cancelado' ? sum + r.total_liquido : sum, 0
        ) || 0;
    }

    /**
     * Verificar se documento pode ser cancelado
     */
    podeCancelar(documento: DocumentoFiscal): boolean {
        return !['cancelado', 'expirado'].includes(documento.estado);
    }

    /**
     * Verificar se fatura pode gerar recibo
     */
    podeGerarRecibo(documento: DocumentoFiscal): boolean {
        return ['FT', 'FA'].includes(documento.tipo_documento) &&
            ['emitido', 'parcialmente_paga'].includes(documento.estado);
    }

    /**
     * Verificar se documento pode gerar NC/ND
     */
    podeGerarNotaCorrecao(documento: DocumentoFiscal): boolean {
        return ['FT', 'FR'].includes(documento.tipo_documento) &&
            !['cancelado'].includes(documento.estado);
    }

    /**
     * Verificar se é venda (FT, FR, RC)
     */
    ehVenda(documento: DocumentoFiscal): boolean {
        return TIPOS_VENDA.includes(documento.tipo_documento);
    }

    /**
     * Verificar se é proforma (FP)
     */
    ehProforma(documento: DocumentoFiscal): boolean {
        return documento.tipo_documento === 'FP';
    }

    /**
     * Verificar se é adiantamento (FA)
     */
    ehAdiantamento(documento: DocumentoFiscal): boolean {
        return documento.tipo_documento === 'FA';
    }

    /**
     * Verificar se é nota de crédito (NC)
     */
    ehNotaCredito(documento: DocumentoFiscal): boolean {
        return documento.tipo_documento === 'NC';
    }

    /**
     * Verificar se é nota de débito (ND)
     */
    ehNotaDebito(documento: DocumentoFiscal): boolean {
        return documento.tipo_documento === 'ND';
    }

    /**
     * Verificar se é fatura de retificação (FRt)
     */
    ehFaturaRetificacao(documento: DocumentoFiscal): boolean {
        return documento.tipo_documento === 'FRt';
    }

    /**
     * Obter nome do cliente (para exibição)
     */
    getNomeCliente(documento: DocumentoFiscal): string {
        if (documento.cliente) {
            return documento.cliente.nome;
        }
        if (documento.cliente_nome) {
            return documento.cliente_nome;
        }
        return 'Consumidor Final';
    }

    /**
     * Obter NIF do cliente (para exibição)
     */
    getNifCliente(documento: DocumentoFiscal): string | null {
        if (documento.cliente) {
            return documento.cliente.nif || null;
        }
        return documento.cliente_nif || null;
    }

    /**
     * Obter nome amigável do tipo de documento
     */
    getTipoDocumentoNome(tipo: TipoDocumento): string {
        const nomes: Record<TipoDocumento, string> = {
            'FT': 'Fatura',
            'FR': 'Fatura-Recibo',
            'FP': 'Fatura Proforma',
            'FA': 'Fatura de Adiantamento',
            'NC': 'Nota de Crédito',
            'ND': 'Nota de Débito',
            'RC': 'Recibo',
            'FRt': 'Fatura de Retificação'
        };
        return nomes[tipo] || tipo;
    }

    /**
     * Obter cor do tipo para UI
     */
    getTipoCor(tipo: TipoDocumento): string {
        const cores: Record<TipoDocumento, string> = {
            'FT': 'blue',
            'FR': 'green',
            'FP': 'orange',
            'FA': 'purple',
            'NC': 'red',
            'ND': 'amber',
            'RC': 'teal',
            'FRt': 'pink'
        };
        return cores[tipo] || 'gray';
    }

    /**
     * Obter cor do estado para UI
     */
    getEstadoCor(estado: EstadoDocumento): string {
        const cores: Record<EstadoDocumento, string> = {
            'emitido': 'yellow',
            'paga': 'green',
            'parcialmente_paga': 'orange',
            'cancelado': 'red',
            'expirado': 'gray'
        };
        return cores[estado] || 'gray';
    }

    /**
     * Obter label do estado para UI
     */
    getEstadoLabel(estado: EstadoDocumento): string {
        const labels: Record<EstadoDocumento, string> = {
            'emitido': 'Emitido',
            'paga': 'Pago',
            'parcialmente_paga': 'Parcial',
            'cancelado': 'Cancelado',
            'expirado': 'Expirado'
        };
        return labels[estado] || estado;
    }

    /**
     * Formatar número do documento para exibição
     */
    formatarNumeroDocumento(documento: DocumentoFiscal): string {
        return documento.numero_documento || `${documento.serie}-${String(documento.numero).padStart(5, '0')}`;
    }

    /**
     * Verificar se documento afeta stock
     */
    afetaStock(documento: DocumentoFiscal): boolean {
        return ['FT', 'FR', 'FP', 'NC'].includes(documento.tipo_documento);
    }
}

// ==================== INSTÂNCIA ÚNICA ====================

export const documentoFiscalService = new DocumentoFiscalService();

// ==================== HOOKS REACT QUERY ====================

// Query Keys
const QUERY_KEYS = {
    documentos: 'documentos-fiscais',
    documento: 'documento-fiscal',
    dashboard: 'dashboard',
    resumo: 'resumo-documentos',
    estatisticas: 'estatisticas-pagamentos',
    alertas: 'alertas-pendentes',
    evolucao: 'evolucao-mensal',
    recibos: 'recibos-documento',
} as const;

/**
 * Hook para listar documentos fiscais com filtros
 * Mostra todos os tipos: FT, FR, FP, FA, NC, ND, RC, FRt
 */
export const useDocumentosFiscais = (filtros: FiltrosDocumento = {}) => {
    return useQuery({
        queryKey: [QUERY_KEYS.documentos, filtros],
        queryFn: () => documentoFiscalService.listar(filtros),
        staleTime: 30 * 1000,
    });
};

/**
 * Hook para buscar documento específico
 */
export const useDocumentoFiscal = (id: string | null) => {
    return useQuery({
        queryKey: [QUERY_KEYS.documento, id],
        queryFn: () => {
            if (!id) throw new Error('ID não fornecido');
            return documentoFiscalService.buscarPorId(id);
        },
        enabled: !!id,
        staleTime: 60 * 1000,
    });
};

/**
 * Hook para emitir documento (qualquer tipo)
 */
export const useEmitirDocumento = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (dados: EmitirDocumentoDTO) => documentoFiscalService.emitir(dados),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.resumo] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.alertas] });
        },
    });
};

/**
 * Hook para criar Nota de Crédito
 */
export const useCriarNotaCredito = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            documentoOrigemId,
            dados
        }: {
            documentoOrigemId: string;
            dados: Omit<EmitirDocumentoDTO, 'tipo_documento' | 'fatura_id'>
        }) => documentoFiscalService.criarNotaCredito(documentoOrigemId, dados),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.resumo] });
        },
    });
};

/**
 * Hook para criar Nota de Débito
 */
export const useCriarNotaDebito = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            documentoOrigemId,
            dados
        }: {
            documentoOrigemId: string;
            dados: Omit<EmitirDocumentoDTO, 'tipo_documento' | 'fatura_id'>
        }) => documentoFiscalService.criarNotaDebito(documentoOrigemId, dados),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.resumo] });
        },
    });
};

/**
 * Hook para gerar recibo
 */
export const useGerarRecibo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            documentoId,
            dados
        }: {
            documentoId: string;
            dados: GerarReciboDTO
        }) => documentoFiscalService.gerarRecibo(documentoId, dados),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documento, variables.documentoId] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.resumo] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.recibos, variables.documentoId] });
        },
    });
};

/**
 * Hook para listar recibos
 */
export const useListarRecibos = (documentoId: string | null) => {
    return useQuery({
        queryKey: [QUERY_KEYS.recibos, documentoId],
        queryFn: () => {
            if (!documentoId) throw new Error('ID não fornecido');
            return documentoFiscalService.listarRecibos(documentoId);
        },
        enabled: !!documentoId,
    });
};

/**
 * Hook para cancelar documento
 */
export const useCancelarDocumento = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            dados
        }: {
            id: string;
            dados: CancelarDocumentoDTO
        }) => documentoFiscalService.cancelar(id, dados),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documento, variables.id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.resumo] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.alertas] });
        },
    });
};

/**
 * Hook para vincular adiantamento
 */
export const useVincularAdiantamento = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            adiantamentoId,
            dados
        }: {
            adiantamentoId: string;
            dados: VincularAdiantamentoDTO
        }) => documentoFiscalService.vincularAdiantamento(adiantamentoId, dados),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.resumo] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.alertas] });
        },
    });
};

/**
 * Hook para dashboard completo
 */
export const useDashboard = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.dashboard],
        queryFn: () => documentoFiscalService.getDashboard(),
        refetchInterval: 5 * 60 * 1000,
        staleTime: 2 * 60 * 1000,
    });
};

/**
 * Hook para resumo de documentos fiscais
 */
export const useResumoDocumentosFiscais = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.resumo],
        queryFn: () => documentoFiscalService.getResumoDocumentosFiscais(),
        refetchInterval: 5 * 60 * 1000,
        staleTime: 2 * 60 * 1000,
    });
};

/**
 * Hook para estatísticas de pagamentos
 */
export const useEstatisticasPagamentos = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.estatisticas],
        queryFn: () => documentoFiscalService.getEstatisticasPagamentos(),
        refetchInterval: 5 * 60 * 1000,
        staleTime: 2 * 60 * 1000,
    });
};

/**
 * Hook para alertas pendentes
 */
export const useAlertasPendentes = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.alertas],
        queryFn: () => documentoFiscalService.getAlertasPendentes(),
        refetchInterval: 5 * 60 * 1000,
        staleTime: 2 * 60 * 1000,
    });
};

/**
 * Hook para evolução mensal
 */
export const useEvolucaoMensal = (ano?: number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.evolucao, ano],
        queryFn: () => documentoFiscalService.getEvolucaoMensal(ano),
        staleTime: 5 * 60 * 1000,
        placeholderData: [],
    });
};

// ==================== EXPORT DEFAULT ====================

export default documentoFiscalService;