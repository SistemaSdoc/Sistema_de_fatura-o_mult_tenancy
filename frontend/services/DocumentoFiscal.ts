// src/services/DocumentoFiscal.ts

import api from "./axios";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ==================== TIPOS ====================

export type TipoDocumento = 'FT' | 'FR' | 'FP' | 'FA' | 'NC' | 'ND' | 'RC' | 'FRt';
export type EstadoDocumento = 'emitido' | 'paga' | 'parcialmente_paga' | 'cancelado' | 'expirado';
export type MetodoPagamento = 'transferencia' | 'multibanco' | 'dinheiro' | 'cheque' | 'cartao';

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
    taxa_retencao?: number;
    valor_retencao?: number;
    total_linha?: number;
    base_tributavel?: number;
    codigo_produto?: string;
    unidade?: string;
    eh_servico?: boolean;
}

export interface DocumentoFiscal {
    total_desconto: number;
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
    faturasAdiantamento?: (DocumentoFiscal & { pivot?: { valor_utilizado: number } })[];
    faturasVinculadas?: DocumentoFiscal[];

    // Campos calculados no frontend
    tem_servicos?: boolean;
    quantidade_servicos?: number;
    total_retencao_servicos?: number;
    percentual_retencao?: number;
}

export interface Cliente {
    id: string;
    nome: string;
    nif?: string | null;
    tipo: 'consumidor_final' | 'empresa';
    status?: 'ativo' | 'inativo';
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
    com_retencao?: boolean;
    tipo_item?: 'produto' | 'servico';
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

export interface DashboardDocumentos {
    faturas_emitidas_mes: number;
    faturas_pendentes: number;
    total_pendente_cobranca: number;
    adiantamentos_pendentes: number;
    proformas_pendentes: number;
    documentos_cancelados_mes: number;
    total_vendas_mes: number;
    total_nao_vendas_mes: number;
    total_retencao_mes?: number;
    documentos_com_retencao?: number;
}

export interface AlertasDocumentos {
    adiantamentos_vencidos: { total: number; items: DocumentoFiscal[] };
    faturas_com_adiantamentos_pendentes: { total: number; items: DocumentoFiscal[] };
    proformas_pendentes: { total: number; items: DocumentoFiscal[] };
    faturas_vencidas?: { total: number; items: DocumentoFiscal[] };
}

export interface EvolucaoDados {
    mes: number;
    ano: number;
    total_vendas: number;
    total_nao_vendas: number;
    total_pendente: number;
    total_retencao?: number;
}

export interface ResumoDashboard {
    user: { id: string; name: string; role: string };
    resumo?: DashboardDocumentos;
    estatisticas?: Record<string, number | string>;
    alertas?: AlertasDocumentos;
    ano?: number;
    evolucao?: EvolucaoDados[];
}

// ==================== SERVICE ====================

class DocumentoFiscalService {
    private baseUrl = '/api/documentos-fiscais';

    // ── Listagem ────────────────────────────────────────────
    async listar(filtros: FiltrosDocumento = {}): Promise<PaginatedResponse<DocumentoFiscal>> {
        const params = new URLSearchParams();
        Object.entries(filtros).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
        });

        const response = await api.get<ApiResponse<PaginatedResponse<DocumentoFiscal>>>(
            `${this.baseUrl}?${params.toString()}`
        );
        if (!response.data.success) throw new Error(response.data.message);

        const documentos = response.data.data;

        // ✅ REMOVIDO O SORT - APENAS ENRIQUECE OS DADOS
        documentos.data = documentos.data
            .map(this._enriquecerDocumento.bind(this));

        return documentos;
    }

    async buscarPorId(id: string): Promise<DocumentoFiscal> {
        const response = await api.get<ApiResponse<{ documento: DocumentoFiscal }>>(
            `${this.baseUrl}/${id}`
        );
        if (!response.data.success) throw new Error(response.data.message);
        return this._enriquecerDocumento(response.data.data.documento);
    }

    // ── Emissão ─────────────────────────────────────────────
    async emitir(dados: EmitirDocumentoDTO): Promise<DocumentoFiscal> {
        if (!dados.cliente_id && !dados.cliente_nome && dados.tipo_documento === 'FR') {
            throw new Error('Fatura-Recibo (FR) requer um cliente (cadastrado ou avulso)');
        }
        const response = await api.post<ApiResponse<DocumentoFiscal>>(`${this.baseUrl}/emitir`, dados);
        if (!response.data.success) throw new Error(response.data.message);
        return this._enriquecerDocumento(response.data.data);
    }

    async emitirFatura(dados: Omit<EmitirDocumentoDTO, 'tipo_documento'>): Promise<DocumentoFiscal> {
        return this.emitir({ ...dados, tipo_documento: 'FT' });
    }

    async emitirFaturaRecibo(
        dados: Omit<EmitirDocumentoDTO, 'tipo_documento'> & { dados_pagamento: DadosPagamento }
    ): Promise<DocumentoFiscal> {
        return this.emitir({ ...dados, tipo_documento: 'FR' });
    }

    async emitirFaturaProforma(dados: Omit<EmitirDocumentoDTO, 'tipo_documento'>): Promise<DocumentoFiscal> {
        return this.emitir({ ...dados, tipo_documento: 'FP' });
    }

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
                taxa_iva: 0,
            }] : undefined,
        });
    }

    async emitirRecibo(
        dados: Omit<EmitirDocumentoDTO, 'tipo_documento'> & { fatura_id: string }
    ): Promise<DocumentoFiscal> {
        return this.emitir({ ...dados, tipo_documento: 'RC' });
    }

    async emitirFaturaRetificacao(
        dados: Omit<EmitirDocumentoDTO, 'tipo_documento'> & { fatura_id: string; motivo: string }
    ): Promise<DocumentoFiscal> {
        return this.emitir({ ...dados, tipo_documento: 'FRt' });
    }

    // ── Notas de Crédito / Débito ────────────────────────────
    async criarNotaCredito(
        documentoOrigemId: string,
        dados: Omit<EmitirDocumentoDTO, 'tipo_documento' | 'fatura_id'>
    ): Promise<DocumentoFiscal> {
        const response = await api.post<ApiResponse<DocumentoFiscal>>(
            `${this.baseUrl}/${documentoOrigemId}/nota-credito`, dados
        );
        if (!response.data.success) throw new Error(response.data.message);
        return this._enriquecerDocumento(response.data.data);
    }

    async criarNotaDebito(
        documentoOrigemId: string,
        dados: Omit<EmitirDocumentoDTO, 'tipo_documento' | 'fatura_id'>
    ): Promise<DocumentoFiscal> {
        const response = await api.post<ApiResponse<DocumentoFiscal>>(
            `${this.baseUrl}/${documentoOrigemId}/nota-debito`, dados
        );
        if (!response.data.success) throw new Error(response.data.message);
        return this._enriquecerDocumento(response.data.data);
    }

    // ── Recibos ──────────────────────────────────────────────
    async gerarRecibo(documentoId: string, dados: GerarReciboDTO): Promise<DocumentoFiscal> {
        const response = await api.post<ApiResponse<DocumentoFiscal>>(
            `${this.baseUrl}/${documentoId}/recibo`, dados
        );
        if (!response.data.success) throw new Error(response.data.message);
        return this._enriquecerDocumento(response.data.data);
    }

    async listarRecibos(documentoId: string): Promise<DocumentoFiscal[]> {
        const response = await api.get<ApiResponse<DocumentoFiscal[]>>(
            `${this.baseUrl}/${documentoId}/recibos`
        );
        if (!response.data.success) throw new Error(response.data.message);
        return response.data.data.map(this._enriquecerDocumento.bind(this));
    }

    // ── Adiantamentos ────────────────────────────────────────
    async vincularAdiantamento(
        adiantamentoId: string,
        dados: VincularAdiantamentoDTO
    ): Promise<{ adiantamento: DocumentoFiscal; fatura: DocumentoFiscal }> {
        const response = await api.post<ApiResponse<{ adiantamento: DocumentoFiscal; fatura: DocumentoFiscal }>>(
            `${this.baseUrl}/${adiantamentoId}/vincular-adiantamento`, dados
        );
        if (!response.data.success) throw new Error(response.data.message);
        return {
            adiantamento: this._enriquecerDocumento(response.data.data.adiantamento),
            fatura: this._enriquecerDocumento(response.data.data.fatura),
        };
    }

    // ── Cancelamento ─────────────────────────────────────────
    async cancelar(id: string, dados: CancelarDocumentoDTO): Promise<DocumentoFiscal> {
        const response = await api.post<ApiResponse<DocumentoFiscal>>(
            `${this.baseUrl}/${id}/cancelar`, dados
        );
        if (!response.data.success) throw new Error(response.data.message);
        return this._enriquecerDocumento(response.data.data);
    }

    // ── Dashboard ────────────────────────────────────────────
    async getDashboard(): Promise<ResumoDashboard> {
        const response = await api.get<ApiResponse<ResumoDashboard>>('/api/dashboard');
        if (!response.data.success) throw new Error(response.data.message);
        return response.data.data;
    }

    async getResumoDocumentosFiscais(): Promise<DashboardDocumentos> {
        const response = await api.get<ApiResponse<{ resumo: DashboardDocumentos }>>(
            '/api/dashboard/documentos-fiscais'
        );
        if (!response.data.success) throw new Error(response.data.message);
        return response.data.data.resumo;
    }

    async getEstatisticasPagamentos(): Promise<Record<string, number | string>> {
        const response = await api.get<ApiResponse<{ estatisticas: Record<string, number | string> }>>(
            '/api/dashboard/estatisticas-pagamentos'
        );
        if (!response.data.success) throw new Error(response.data.message);
        return response.data.data.estatisticas;
    }

    async getAlertasPendentes(): Promise<AlertasDocumentos> {
        const response = await api.get<ApiResponse<{ alertas: AlertasDocumentos }>>(
            '/api/dashboard/alertas-pendentes'
        );
        if (!response.data.success) throw new Error(response.data.message);
        return response.data.data.alertas;
    }

    async getEvolucaoMensal(ano?: number): Promise<EvolucaoDados[]> {
        const params = ano ? `?ano=${ano}` : '';
        const response = await api.get<ApiResponse<{ ano: number; evolucao: EvolucaoDados[] }>>(
            `/api/dashboard/evolucao-mensal${params}`
        );
        if (!response.data.success) {
            console.error('Erro ao carregar evolução mensal:', response.data.message);
            return [];
        }
        const evolucao = response.data.data?.evolucao;
        if (!Array.isArray(evolucao)) {
            console.warn('Dados de evolução não são um array:', evolucao);
            return [];
        }
        return evolucao;
    }

    // ── PDF / Excel ──────────────────────────────────────────

    /**
     * Abre o template de impressão Laravel numa nova tab.
     * Com auto=true (padrão) chama window.print() imediatamente.
     */
    abrirImpressao(id: string, auto = true): void {
        const base = typeof window !== 'undefined'
            ? (process.env.NEXT_PUBLIC_API_URL ?? '')
            : '';
        const url = `${base}/api/documentos-fiscais/${id}/print${auto ? '?auto=1' : ''}`;
        window.open(url, '_blank');
    }

    /**
     * Download do PDF gerado pelo backend (DomPDF).
     */
    async downloadPdf(id: string, nomeArquivo?: string): Promise<void> {
        const response = await api.get(`${this.baseUrl}/${id}/pdf/download`, {
            responseType: 'blob',
        });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nomeArquivo ?? `documento-${id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }

    /**
     * Exporta lista de documentos para Excel (.xlsx).
     */
    async exportarExcel(filtros: FiltrosDocumento = {}): Promise<void> {
        const params = new URLSearchParams();
        Object.entries(filtros).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
        });

        const response = await api.get(
            `${this.baseUrl}/exportar-excel?${params.toString()}`,
            { responseType: 'blob' }
        );

        const blob = new Blob(
            [response.data],
            { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `documentos-fiscais-${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }

    // ── Utilitários ──────────────────────────────────────────

    calcularValorPendente(documento: DocumentoFiscal): number {
        if (!['FT', 'FA'].includes(documento.tipo_documento)) return 0;
        const totalPago = documento.recibos?.reduce(
            (sum, r) => r.estado !== 'cancelado' ? sum + Number(r.total_liquido) : sum, 0
        ) ?? 0;
        if (documento.tipo_documento === 'FA') {
            return Math.max(0, Number(documento.total_liquido) - totalPago);
        }
        const totalAdiantamentos = documento.faturasAdiantamento?.reduce(
            (sum, a) => sum + Number(a.pivot?.valor_utilizado ?? 0), 0
        ) ?? 0;
        return Math.max(0, Number(documento.total_liquido) - totalPago - totalAdiantamentos);
    }

    calcularValorPago(documento: DocumentoFiscal): number {
        if (['FR', 'RC'].includes(documento.tipo_documento)) return Number(documento.total_liquido);
        if (documento.tipo_documento === 'FP') return 0;
        return documento.recibos?.reduce(
            (sum, r) => r.estado !== 'cancelado' ? sum + Number(r.total_liquido) : sum, 0
        ) ?? 0;
    }

    calcularRetencaoTotal(documento: DocumentoFiscal): number {
        return documento.itens?.reduce((sum, item) => sum + (item.valor_retencao ?? 0), 0) ?? 0;
    }

    temServicosComRetencao(documento: DocumentoFiscal): boolean {
        return documento.itens?.some(item => (item.valor_retencao ?? 0) > 0) ?? false;
    }

    podeCancelar(documento: DocumentoFiscal): boolean {
        return !['cancelado', 'expirado'].includes(documento.estado);
    }

    podeGerarRecibo(documento: DocumentoFiscal): boolean {
        return ['FT', 'FA'].includes(documento.tipo_documento)
            && ['emitido', 'parcialmente_paga'].includes(documento.estado);
    }

    podeGerarNotaCorrecao(documento: DocumentoFiscal): boolean {
        return ['FT', 'FR'].includes(documento.tipo_documento)
            && documento.estado !== 'cancelado';
    }

    ehVenda(documento: DocumentoFiscal): boolean { return TIPOS_VENDA.includes(documento.tipo_documento); }
    ehProforma(documento: DocumentoFiscal): boolean { return documento.tipo_documento === 'FP'; }
    ehAdiantamento(documento: DocumentoFiscal): boolean { return documento.tipo_documento === 'FA'; }
    ehNotaCredito(documento: DocumentoFiscal): boolean { return documento.tipo_documento === 'NC'; }
    ehNotaDebito(documento: DocumentoFiscal): boolean { return documento.tipo_documento === 'ND'; }
    ehFaturaRetificacao(documento: DocumentoFiscal): boolean { return documento.tipo_documento === 'FRt'; }

    getNomeCliente(documento: DocumentoFiscal): string {
        return documento.cliente?.nome ?? documento.cliente_nome ?? 'Consumidor Final';
    }

    getNifCliente(documento: DocumentoFiscal): string | null {
        return documento.cliente?.nif ?? documento.cliente_nif ?? null;
    }

    getTipoDocumentoNome(tipo: TipoDocumento): string {
        const nomes: Record<TipoDocumento, string> = {
            FT: 'Fatura', FR: 'Fatura-Recibo', FP: 'Fatura Proforma',
            FA: 'Fatura de Adiantamento', NC: 'Nota de Crédito',
            ND: 'Nota de Débito', RC: 'Recibo', FRt: 'Fatura de Retificação',
        };
        return nomes[tipo] ?? tipo;
    }

    getTipoCor(tipo: TipoDocumento): string {
        const cores: Record<TipoDocumento, string> = {
            FT: 'blue', FR: 'green', FP: 'orange', FA: 'purple',
            NC: 'red', ND: 'amber', RC: 'teal', FRt: 'pink',
        };
        return cores[tipo] ?? 'gray';
    }

    getRetencaoCor(percentual?: number): string {
        if (!percentual) return 'gray';
        if (percentual > 10) return 'red';
        if (percentual > 5) return 'orange';
        return 'yellow';
    }

    getEstadoCor(estado: EstadoDocumento): string {
        const cores: Record<EstadoDocumento, string> = {
            emitido: 'yellow', paga: 'green', parcialmente_paga: 'orange',
            cancelado: 'red', expirado: 'gray',
        };
        return cores[estado] ?? 'gray';
    }

    getEstadoLabel(estado: EstadoDocumento): string {
        const labels: Record<EstadoDocumento, string> = {
            emitido: 'Emitido', paga: 'Pago', parcialmente_paga: 'Parcial',
            cancelado: 'Cancelado', expirado: 'Expirado',
        };
        return labels[estado] ?? estado;
    }

    formatarNumeroDocumento(documento: DocumentoFiscal): string {
        return documento.numero_documento
            || `${documento.serie}-${String(documento.numero).padStart(5, '0')}`;
    }

    afetaStock(documento: DocumentoFiscal): boolean {
        return ['FT', 'FR', 'NC'].includes(documento.tipo_documento);
    }

    formatarRetencao(valor: number): string {
        return valor.toLocaleString('pt-PT', {
            style: 'currency', currency: 'AOA', minimumFractionDigits: 2,
        }).replace('AOA', 'Kz');
    }

    // ── Privado ──────────────────────────────────────────────

    private _enriquecerDocumento(doc: DocumentoFiscal): DocumentoFiscal {
        const servicos = doc.itens?.filter(item => item.eh_servico) ?? [];
        return {
            ...doc,
            tem_servicos: servicos.length > 0,
            quantidade_servicos: servicos.length,
            total_retencao_servicos: servicos.reduce((acc, item) => acc + (item.valor_retencao ?? 0), 0),
            percentual_retencao: Number(doc.base_tributavel) > 0
                ? Math.round((Number(doc.total_retencao) / Number(doc.base_tributavel)) * 100 * 100) / 100
                : 0,
        };
    }
}

// ==================== INSTÂNCIA GLOBAL ====================

export const documentoFiscalService = new DocumentoFiscalService();

// ==================== QUERY KEYS ====================

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

// ==================== HOOKS ====================

export const useDocumentosFiscais = (filtros: FiltrosDocumento = {}) =>
    useQuery({
        queryKey: [QUERY_KEYS.documentos, filtros],
        queryFn: () => documentoFiscalService.listar(filtros),
        staleTime: 30 * 1000,
    });

export const useDocumentoFiscal = (id: string | null) =>
    useQuery({
        queryKey: [QUERY_KEYS.documento, id],
        queryFn: () => {
            if (!id) throw new Error('ID não fornecido');
            return documentoFiscalService.buscarPorId(id);
        },
        enabled: !!id,
        staleTime: 60 * 1000,
    });

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

export const useCriarNotaCredito = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ documentoOrigemId, dados }: {
            documentoOrigemId: string;
            dados: Omit<EmitirDocumentoDTO, 'tipo_documento' | 'fatura_id'>;
        }) => documentoFiscalService.criarNotaCredito(documentoOrigemId, dados),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.resumo] });
        },
    });
};

export const useCriarNotaDebito = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ documentoOrigemId, dados }: {
            documentoOrigemId: string;
            dados: Omit<EmitirDocumentoDTO, 'tipo_documento' | 'fatura_id'>;
        }) => documentoFiscalService.criarNotaDebito(documentoOrigemId, dados),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.resumo] });
        },
    });
};

export const useGerarRecibo = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ documentoId, dados }: { documentoId: string; dados: GerarReciboDTO }) =>
            documentoFiscalService.gerarRecibo(documentoId, dados),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documento, variables.documentoId] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.resumo] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.recibos, variables.documentoId] });
        },
    });
};

export const useListarRecibos = (documentoId: string | null) =>
    useQuery({
        queryKey: [QUERY_KEYS.recibos, documentoId],
        queryFn: () => {
            if (!documentoId) throw new Error('ID não fornecido');
            return documentoFiscalService.listarRecibos(documentoId);
        },
        enabled: !!documentoId,
    });

export const useCancelarDocumento = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dados }: { id: string; dados: CancelarDocumentoDTO }) =>
            documentoFiscalService.cancelar(id, dados),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documento, variables.id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.resumo] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.alertas] });
        },
    });
};

export const useVincularAdiantamento = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ adiantamentoId, dados }: {
            adiantamentoId: string;
            dados: VincularAdiantamentoDTO;
        }) => documentoFiscalService.vincularAdiantamento(adiantamentoId, dados),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.resumo] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.alertas] });
        },
    });
};

export const useDashboard = () =>
    useQuery({
        queryKey: [QUERY_KEYS.dashboard],
        queryFn: () => documentoFiscalService.getDashboard(),
        refetchInterval: 5 * 60 * 1000,
        staleTime: 2 * 60 * 1000,
    });

export const useResumoDocumentosFiscais = () =>
    useQuery({
        queryKey: [QUERY_KEYS.resumo],
        queryFn: () => documentoFiscalService.getResumoDocumentosFiscais(),
        refetchInterval: 5 * 60 * 1000,
        staleTime: 2 * 60 * 1000,
    });

export const useEstatisticasPagamentos = () =>
    useQuery({
        queryKey: [QUERY_KEYS.estatisticas],
        queryFn: () => documentoFiscalService.getEstatisticasPagamentos(),
        refetchInterval: 5 * 60 * 1000,
        staleTime: 2 * 60 * 1000,
    });

export const useAlertasPendentes = () =>
    useQuery({
        queryKey: [QUERY_KEYS.alertas],
        queryFn: () => documentoFiscalService.getAlertasPendentes(),
        refetchInterval: 5 * 60 * 1000,
        staleTime: 2 * 60 * 1000,
    });

export const useEvolucaoMensal = (ano?: number) =>
    useQuery({
        queryKey: [QUERY_KEYS.evolucao, ano],
        queryFn: () => documentoFiscalService.getEvolucaoMensal(ano),
        staleTime: 5 * 60 * 1000,
        placeholderData: [],
    });

export default documentoFiscalService;