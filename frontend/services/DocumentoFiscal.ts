// src/services/documentoFiscalService.ts

import api from "./axios";

// ==================== TIPOS ====================

export type TipoDocumento = 'FT' | 'FR' | 'FP' | 'FA' | 'NC' | 'ND' | 'RC' | 'FRt';
export type EstadoDocumento = 'emitido' | 'paga' | 'parcialmente_paga' | 'cancelado' | 'expirado';
export type MetodoPagamento = 'transferencia' | 'multibanco' | 'dinheiro' | 'cheque' | 'cartao';

// Constantes para tipos de documento
export const TIPOS_VENDA: TipoDocumento[] = ['FT', 'FR', 'RC'];
export const TIPOS_NAO_VENDA: TipoDocumento[] = ['FP', 'FA', 'NC', 'ND', 'FRt'];
export const TIPOS_DOCUMENTO_VENDA: TipoDocumento[] = ['FT', 'FR', 'FP']; // Tipos que podem ser criados via venda

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
    cliente_nome?: string | null; // Para cliente avulso
    cliente_nif?: string | null;  // Para cliente avulso
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

    // Acessores virtuais (calculados)
    valor_pendente?: number;
    valor_pago?: number;
    nome_cliente?: string;
    tem_cliente_cadastrado?: boolean;
    eh_venda?: boolean;
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
}

export interface FiltrosDocumento {
    tipo?: TipoDocumento;
    estado?: EstadoDocumento;
    cliente_id?: string;
    cliente_nome?: string; // Para cliente avulso
    data_inicio?: string;
    data_fim?: string;
    pendentes?: boolean;
    adiantamentos_pendentes?: boolean;
    proformas_pendentes?: boolean; // NOVO
    apenas_vendas?: boolean; // Filtrar apenas FT, FR, RC
    apenas_nao_vendas?: boolean; // Filtrar FP, FA, NC, ND, FRt
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
    cliente_nome?: string; // Para cliente avulso
    cliente_nif?: string;  // Para cliente avulso
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

export interface ConverterProformaDTO {
    fatura_id?: string;
    dados_pagamento?: DadosPagamento;
}

export interface DashboardDocumentos {
    faturas_emitidas_mes: number;
    faturas_pendentes: number;
    total_pendente_cobranca: number;
    adiantamentos_pendentes: number;
    proformas_pendentes: number; // NOVO
    documentos_cancelados_mes: number;
    total_vendas_mes: number; // NOVO
    total_nao_vendas_mes: number; // NOVO
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
    proformas_pendentes: { // NOVO
        total: number;
        items: DocumentoFiscal[];
    };
}

// ==================== API RESPONSES ====================

interface ApiResponse<T> {
    message: string;
    data: T;
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

// ==================== SERVICE ====================

class DocumentoFiscalService {
    private baseUrl = '/api/documentos-fiscais';

    // ==================== LISTAGEM E CONSULTA ====================

    /**
     * Listar documentos fiscais com filtros
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
        return response.data.data;
    }

    /**
     * Buscar documento específico por ID
     */
    async buscarPorId(id: string): Promise<DocumentoFiscal> {
        const response = await api.get<ApiResponse<DocumentoFiscal>>(`${this.baseUrl}/${id}`);
        return response.data.data.documento || response.data.data;
    }

    /**
     * Buscar documento por número
     */
    async buscarPorNumero(numeroDocumento: string): Promise<DocumentoFiscal> {
        const response = await this.listar({ per_page: 1 });
        const documento = response.data.find(d => d.numero_documento === numeroDocumento);
        if (!documento) throw new Error('Documento não encontrado');
        return documento;
    }

    // ==================== EMISSÃO ====================

    /**
     * Emitir qualquer tipo de documento fiscal
     */
    async emitir(dados: EmitirDocumentoDTO): Promise<DocumentoFiscal> {
        // Validar cliente avulso
        if (!dados.cliente_id && !dados.cliente_nome && dados.tipo_documento === 'FR') {
            throw new Error('Fatura-Recibo (FR) requer um cliente (cadastrado ou avulso)');
        }

        const response = await api.post<ApiResponse<DocumentoFiscal>>(
            `${this.baseUrl}/emitir`,
            dados
        );
        return response.data.data.documento || response.data.data;
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
    async emitirFaturaRecibo(dados: Omit<EmitirDocumentoDTO, 'tipo_documento'> & { dados_pagamento: DadosPagamento }): Promise<DocumentoFiscal> {
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
     * Emitir Nota de Crédito (NC)
     */
    async emitirNotaCredito(
        documentoOrigemId: string,
        dados: Omit<EmitirDocumentoDTO, 'tipo_documento' | 'fatura_id'>
    ): Promise<DocumentoFiscal> {
        const response = await api.post<ApiResponse<DocumentoFiscal>>(
            `${this.baseUrl}/${documentoOrigemId}/nota-credito`,
            dados
        );
        return response.data.data.documento || response.data.data;
    }

    /**
     * Emitir Nota de Débito (ND)
     */
    async emitirNotaDebito(
        documentoOrigemId: string,
        dados: Omit<EmitirDocumentoDTO, 'tipo_documento' | 'fatura_id'>
    ): Promise<DocumentoFiscal> {
        const response = await api.post<ApiResponse<DocumentoFiscal>>(
            `${this.baseUrl}/${documentoOrigemId}/nota-debito`,
            dados
        );
        return response.data.data.documento || response.data.data;
    }

    // ==================== RECIBOS ====================

    /**
     * Gerar recibo para fatura (FT) ou adiantamento (FA)
     */
    async gerarRecibo(documentoId: string, dados: GerarReciboDTO): Promise<DocumentoFiscal> {
        const response = await api.post<ApiResponse<DocumentoFiscal>>(
            `${this.baseUrl}/${documentoId}/recibo`,
            dados
        );
        return response.data.data.recibo || response.data.data.documento || response.data.data;
    }

    /**
     * Listar recibos de um documento (FT ou FA)
     */
    async listarRecibos(documentoId: string): Promise<DocumentoFiscal[]> {
        const response = await api.get<ApiResponse<DocumentoFiscal[]>>(
            `${this.baseUrl}/${documentoId}/recibos`
        );
        return response.data.data.recibos || response.data.data;
    }

    // ==================== ADIANTAMENTOS ====================

    /**
     * Vincular adiantamento (FA) a fatura (FT)
     */
    async vincularAdiantamento(
        adiantamentoId: string,
        dados: VincularAdiantamentoDTO
    ): Promise<{ adiantamento: DocumentoFiscal; fatura: DocumentoFiscal }> {
        const response = await api.post<ApiResponse<{ adiantamento: DocumentoFiscal; fatura: DocumentoFiscal }>>(
            `${this.baseUrl}/${adiantamentoId}/vincular`,
            dados
        );
        return response.data.data;
    }

    /**
     * Listar adiantamentos pendentes de um cliente
     */
    async listarAdiantamentosPendentes(clienteId?: string, clienteNome?: string): Promise<DocumentoFiscal[]> {
        const params = new URLSearchParams();
        if (clienteId) params.append('cliente_id', clienteId);
        if (clienteNome) params.append('cliente_nome', clienteNome);

        const response = await api.get<ApiResponse<DocumentoFiscal[]>>(
            `${this.baseUrl}/adiantamentos-pendentes${params.toString() ? `?${params.toString()}` : ''}`
        );
        return response.data.data.adiantamentos || response.data.data;
    }

    /**
     * Listar proformas pendentes de um cliente
     */
    async listarProformasPendentes(clienteId?: string, clienteNome?: string): Promise<DocumentoFiscal[]> {
        const params = new URLSearchParams();
        if (clienteId) params.append('cliente_id', clienteId);
        if (clienteNome) params.append('cliente_nome', clienteNome);

        const response = await api.get<ApiResponse<DocumentoFiscal[]>>(
            `${this.baseUrl}/proformas-pendentes${params.toString() ? `?${params.toString()}` : ''}`
        );
        return response.data.data.proformas || response.data.data;
    }

    /**
     * Converter Proforma (FP) para Fatura (FT)
     */
    async converterProformaParaFatura(proformaId: string, dados?: ConverterProformaDTO): Promise<DocumentoFiscal> {
        const response = await api.post<ApiResponse<DocumentoFiscal>>(
            `${this.baseUrl}/${proformaId}/converter`,
            dados
        );
        return response.data.data.documento || response.data.data;
    }

    /**
     * Buscar alertas de documentos (vencidos, pendentes)
     */
    async buscarAlertas(): Promise<AlertasDocumentos> {
        const response = await api.get<ApiResponse<AlertasDocumentos>>(
            `${this.baseUrl}/alertas`
        );
        return response.data.data;
    }

    /**
     * Processar adiantamentos expirados (chamada administrativa)
     */
    async processarExpirados(): Promise<{ expirados: number }> {
        const response = await api.post<ApiResponse<{ expirados: number }>>(
            `${this.baseUrl}/processar-expirados`
        );
        return response.data.data;
    }

    // ==================== CANCELAMENTO ====================

    /**
     * Cancelar documento fiscal
     */
    async cancelar(id: string, dados: CancelarDocumentoDTO): Promise<DocumentoFiscal> {
        const response = await api.post<ApiResponse<DocumentoFiscal>>(
            `${this.baseUrl}/${id}/cancelar`,
            dados
        );
        return response.data.data.documento || response.data.data;
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

        // Para FT, considerar adiantamentos vinculados
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

    // ==================== DASHBOARD ====================

    /**
     * Obter dashboard/resumo de documentos
     */
    async getDashboard(): Promise<DashboardDocumentos> {
        const response = await api.get<ApiResponse<DashboardDocumentos>>(
            `${this.baseUrl}/dashboard`
        );
        return response.data.data;
    }
}

// ==================== HOOKS (React Query) ====================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Criar instância do serviço
export const documentoFiscalService = new DocumentoFiscalService();

// Hooks
export const useDocumentosFiscais = (filtros: FiltrosDocumento = {}) => {
    return useQuery({
        queryKey: ['documentos-fiscais', filtros],
        queryFn: () => documentoFiscalService.listar(filtros),
    });
};

export const useDocumentoFiscal = (id: string) => {
    return useQuery({
        queryKey: ['documento-fiscal', id],
        queryFn: () => documentoFiscalService.buscarPorId(id),
        enabled: !!id,
    });
};

export const useEmitirDocumento = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (dados: EmitirDocumentoDTO) => documentoFiscalService.emitir(dados),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documentos-fiscais'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-documentos'] });
        },
    });
};

export const useGerarRecibo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ documentoId, dados }: { documentoId: string; dados: GerarReciboDTO }) =>
            documentoFiscalService.gerarRecibo(documentoId, dados),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['documento-fiscal', variables.documentoId] });
            queryClient.invalidateQueries({ queryKey: ['documentos-fiscais'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-documentos'] });
        },
    });
};

export const useCancelarDocumento = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, dados }: { id: string; dados: CancelarDocumentoDTO }) =>
            documentoFiscalService.cancelar(id, dados),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['documento-fiscal', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['documentos-fiscais'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-documentos'] });
        },
    });
};

export const useVincularAdiantamento = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ adiantamentoId, dados }: { adiantamentoId: string; dados: VincularAdiantamentoDTO }) =>
            documentoFiscalService.vincularAdiantamento(adiantamentoId, dados),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documentos-fiscais'] });
            queryClient.invalidateQueries({ queryKey: ['adiantamentos-pendentes'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-documentos'] });
        },
    });
};

export const useConverterProforma = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ proformaId, dados }: { proformaId: string; dados?: ConverterProformaDTO }) =>
            documentoFiscalService.converterProformaParaFatura(proformaId, dados),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['documento-fiscal', variables.proformaId] });
            queryClient.invalidateQueries({ queryKey: ['documentos-fiscais'] });
            queryClient.invalidateQueries({ queryKey: ['proformas-pendentes'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-documentos'] });
        },
    });
};

export const useDashboardDocumentos = () => {
    return useQuery({
        queryKey: ['dashboard-documentos'],
        queryFn: () => documentoFiscalService.getDashboard(),
        refetchInterval: 5 * 60 * 1000, // Refetch a cada 5 minutos
    });
};

export const useAlertasDocumentos = () => {
    return useQuery({
        queryKey: ['alertas-documentos'],
        queryFn: () => documentoFiscalService.buscarAlertas(),
        refetchInterval: 5 * 60 * 1000, // Refetch a cada 5 minutos
    });
};

export const useAdiantamentosPendentes = (clienteId?: string, clienteNome?: string) => {
    return useQuery({
        queryKey: ['adiantamentos-pendentes', { clienteId, clienteNome }],
        queryFn: () => documentoFiscalService.listarAdiantamentosPendentes(clienteId, clienteNome),
        enabled: !!(clienteId || clienteNome),
    });
};

export const useProformasPendentes = (clienteId?: string, clienteNome?: string) => {
    return useQuery({
        queryKey: ['proformas-pendentes', { clienteId, clienteNome }],
        queryFn: () => documentoFiscalService.listarProformasPendentes(clienteId, clienteNome),
        enabled: !!(clienteId || clienteNome),
    });
};

// ==================== EXPORT DEFAULT ====================

export default documentoFiscalService;