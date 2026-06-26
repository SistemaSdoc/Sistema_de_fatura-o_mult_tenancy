// src/services/DocumentoFiscal.ts

import api from "./axios";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ==================== TIPOS ====================

export type TipoDocumento = 'FT' | 'FR' | 'FP' | 'FA' | 'NC' | 'ND' | 'RC' | 'FRt';
export type EstadoDocumento = 'emitido' | 'paga' | 'parcialmente_paga' | 'cancelado' | 'expirado';
export type MetodoPagamento = 'transferencia' | 'multibanco' | 'dinheiro' | 'cheque' | 'cartao';

export const TIPOS_VENDA: TipoDocumento[] = ['FT', 'FR', 'RC'];
export const TIPOS_NAO_VENDA: TipoDocumento[] = ['FP', 'FA', 'NC', 'ND', 'FRt'];
export const TIPOS_DOCUMENTO_VENDA: TipoDocumento[] = ['FT', 'FR'];
export const TIPOS_ORIGEM_NC: TipoDocumento[] = ['FT', 'FR'];  // Nota de Crédito
export const TIPOS_ORIGEM_ND: TipoDocumento[] = ['FT'];       // Nota de Débito (apenas FT)

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
    produto?: {
        id: string;
        nome: string;
        tipo: 'produto' | 'servico';
        taxa_iva: number;
        taxa_retencao?: number;
    };
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

    // Campos de desconto e pagamento
    desconto_global?: number;
    troco?: number;

    // Relação com Venda (pode vir como objeto ou apenas o ID/número)
    venda?: {
        id?: string | number;
        desconto_global?: number;
        troco?: number;
        // outros campos da tabela vendas se precisares no futuro
    } | number | null;

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
    
    // Campos para validação de crédito/débito
    total_creditado?: number;      // Total de créditos já emitidos
    saldo_disponivel?: number;     // Saldo disponível para crédito
    total_debitos?: number;        // Total de débitos já emitidos
    valor_pago?: number;           // Valor já pago
    saldo_pendente?: number;       // Saldo pendente de pagamento
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

/**
 * DTO para criar Nota de Crédito
 * Requer motivo obrigatório com mínimo de 10 caracteres
 */
export interface CriarNotaCreditoDTO extends Omit<EmitirDocumentoDTO, 'tipo_documento' | 'fatura_id'> {
    motivo: string;  // Obrigatório
    itens: ItemDocumento[];  // Obrigatório
}

/**
 * DTO para criar Nota de Débito
 * Itens devem ser serviços (não produtos físicos)
 */
export interface CriarNotaDebitoDTO extends Omit<EmitirDocumentoDTO, 'tipo_documento' | 'fatura_id'> {
    itens: ItemDocumento[];  // Obrigatório
    motivo?: string;
}

/**
 * Resposta detalhada após emissão de Nota de Crédito
 */
export interface RespostaNotaCredito {
    nota_credito: DocumentoFiscal;
    fatura_original: {
        id: string;
        numero: string;
        valor_total: number;
        creditos_emitidos: number;
        saldo_restante: number;
    };
}

/**
 * Resposta detalhada após emissão de Nota de Débito
 */
export interface RespostaNotaDebito {
    nota_debito: DocumentoFiscal;
    fatura_original: {
        id: string;
        numero: string;
        valor_original: number;
        valor_debito: number;
        novo_valor_total: number;
        valor_pago_anterior: number;
        saldo_pendente_atual: number;
    };
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

/**
 * Dashboard de documentos fiscais
 * 
 * REGRA SEMÂNTICA:
 * - "faturas_pendentes" = apenas FT (dívida real)
 * - "adiantamentos_pendentes" = apenas FA (dívida real)
 * - "proformas_em_aberto" = FP (NÃO é dívida, apenas orçamentos não convertidos)
 * - O campo "proformas_pendentes" está depreciado, usar "proformas_em_aberto"
 */
export interface DashboardDocumentos {
    faturas_emitidas_mes: number;
    faturas_pendentes: number;
    total_pendente_cobranca: number;
    adiantamentos_pendentes: number;
    proformas_em_aberto: number;           // CORRIGIDO: renomeado
    proformas_pendentes?: number;           // Deprecated, mantido para compatibilidade
    documentos_cancelados_mes: number;
    total_vendas_mes: number;
    total_nao_vendas_mes: number;
    total_retencao_mes?: number;
    documentos_com_retencao?: number;
}

/**
 * Alertas de documentos
 * 
 * REGRA SEMÂNTICA:
 * - "adiantamentos_vencidos" e "faturas_vencidas" = apenas FT/FA (dívida real)
 * - "proformas_em_aberto" = FP (alerta INFORMATIVO, NÃO é dívida)
 */
export interface AlertasDocumentos {
    adiantamentos_vencidos: { total: number; items: DocumentoFiscal[] };
    faturas_com_adiantamentos_pendentes: { total: number; items: DocumentoFiscal[] };
    proformas_em_aberto: { total: number; items: DocumentoFiscal[] };  // CORRIGIDO: renomeado
    proformas_pendentes?: { total: number; items: DocumentoFiscal[] }; // Deprecated
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
            throw new Error('Factura-Recibo (FR) requer um cliente (cadastrado ou avulso)');
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

    // ── Notas de Crédito / Débito (CORRIGIDO) ──────────────

    /**
     * Cria uma Nota de Crédito (NC) para uma fatura
     * 
     * REGRAS (Angola):
     * - Apenas FT ou FR podem originar NC
     * - Motivo é OBRIGATÓRIO e deve ter pelo menos 10 caracteres
     * - Valor da NC não pode ultrapassar o saldo da fatura
     * - Não pode ser emitida para fatura cancelada ou expirada
     * 
     * @param documentoOrigemId - ID da fatura original (FT ou FR)
     * @param dados - Dados da NC (motivo, itens, etc.)
     * @returns Resposta com detalhes da NC e saldo da fatura
     */
    async criarNotaCredito(
        documentoOrigemId: string,
        dados: CriarNotaCreditoDTO
    ): Promise<RespostaNotaCredito> {
        // === VALIDAÇÕES FRONTEND ===
        
        // 1. Validar motivo
        if (!dados.motivo || dados.motivo.trim().length === 0) {
            throw new Error(
                'O motivo da Nota de Crédito é obrigatório. ' +
                'Informe o motivo da correção (ex: devolução de mercadoria, erro de valor, etc.)'
            );
        }
        
        if (dados.motivo.trim().length < 10) {
            throw new Error(
                'O motivo da Nota de Crédito deve ter pelo menos 10 caracteres. ' +
                'Forneça uma descrição detalhada da correção.'
            );
        }

        // 2. Validar itens
        if (!dados.itens || dados.itens.length === 0) {
            throw new Error('A Nota de Crédito deve conter pelo menos um item.');
        }

        // 3. Validar valores dos itens (não podem ser negativos)
        for (const item of dados.itens) {
            if (item.quantidade <= 0) {
                throw new Error(`A quantidade do item "${item.descricao}" deve ser maior que zero.`);
            }
            if (item.preco_unitario < 0) {
                throw new Error(`O preço unitário do item "${item.descricao}" não pode ser negativo.`);
            }
        }

        // 4. Buscar a fatura original para validações adicionais
        const fatura = await this.buscarPorId(documentoOrigemId);
        
        // 5. Validar tipo de documento origem
        if (!TIPOS_ORIGEM_NC.includes(fatura.tipo_documento)) {
            throw new Error(
                `Nota de Crédito só pode ser emitida a partir de Fatura (FT) ou Fatura-Recibo (FR). ` +
                `Tipo atual: ${fatura.tipo_documento}`
            );
        }

        // 6. Validar se a fatura não está cancelada ou expirada
        if (fatura.estado === 'cancelado') {
            throw new Error(
                `Não é possível emitir Nota de Crédito para a fatura cancelada: ${fatura.numero_documento}`
            );
        }
        
        if (fatura.estado === 'expirado') {
            throw new Error(
                `Não é possível emitir Nota de Crédito para a fatura expirada: ${fatura.numero_documento}`
            );
        }

        // 7. Validar saldo disponível
        const saldoDisponivel = this.calcularSaldoDisponivel(fatura);
        if (saldoDisponivel <= 0.01) {
            throw new Error(
                `Não é possível emitir Nota de Crédito para uma fatura sem saldo disponível. ` +
                `Fatura: ${fatura.numero_documento}. ` +
                `Considere emitir uma Nota de Débito para ajustes.`
            );
        }

        // 8. Calcular valor total da NC
        const valorNC = dados.itens.reduce((sum, item) => {
            const subtotal = item.quantidade * item.preco_unitario;
            const iva = subtotal * ((item.taxa_iva || 0) / 100);
            const desconto = item.desconto || 0;
            return sum + subtotal + iva - desconto;
        }, 0);

        // 9. Verificar se o valor da NC não ultrapassa o saldo disponível
        if (valorNC > saldoDisponivel) {
            throw new Error(
                `O valor total da Nota de Crédito (${valorNC.toFixed(2)} Kz) ` +
                `excede o saldo disponível da fatura (${saldoDisponivel.toFixed(2)} Kz).\n` +
                `Total da fatura: ${fatura.total_liquido} Kz\n` +
                `Créditos já emitidos: ${(fatura.total_creditado || 0).toFixed(2)} Kz\n` +
                `Saldo disponível: ${saldoDisponivel.toFixed(2)} Kz`
            );
        }

        // 10. Enviar requisição para o backend
        const response = await api.post<ApiResponse<RespostaNotaCredito>>(
            `${this.baseUrl}/${documentoOrigemId}/nota-credito`,
            {
                motivo: dados.motivo.trim(),
                itens: dados.itens,
                cliente_id: dados.cliente_id,
                cliente_nome: dados.cliente_nome,
                cliente_nif: dados.cliente_nif,
                referencia_externa: dados.referencia_externa,
                observacoes: dados.observacoes,
            }
        );
        
        if (!response.data.success) throw new Error(response.data.message);
        
        // Enriquecer a nota de crédito na resposta
        if (response.data.data.nota_credito) {
            response.data.data.nota_credito = this._enriquecerDocumento(
                response.data.data.nota_credito
            );
        }
        
        return response.data.data;
    }

    /**
     * Cria uma Nota de Débito (ND) para uma fatura
     * 
     * REGRAS (Angola):
     * - Apenas FT pode originar ND (NÃO FR ou FP)
     * - Itens devem ser SERVIÇOS (não produtos físicos)
     * - Prazo máximo de 30 dias após emissão da fatura
     * - Se fatura já paga, deve ser para juros ou multas
     * - Descrição detalhada obrigatória para cada item
     * 
     * @param documentoOrigemId - ID da fatura original (apenas FT)
     * @param dados - Dados da ND (itens, motivo, etc.)
     * @returns Resposta com detalhes da ND e novo valor da fatura
     */
    async criarNotaDebito(
        documentoOrigemId: string,
        dados: CriarNotaDebitoDTO
    ): Promise<RespostaNotaDebito> {
        // === VALIDAÇÕES FRONTEND ===

        // 1. Validar itens
        if (!dados.itens || dados.itens.length === 0) {
            throw new Error(
                'A Nota de Débito deve conter pelo menos um item. ' +
                'Os itens devem descrever serviços adicionais, juros ou multas.'
            );
        }

        // 2. Validar cada item
        let temServico = false;
        let temJurosOuMulta = false;

        for (const item of dados.itens) {
            // 2.1 Descrição detalhada
            if (!item.descricao || item.descricao.trim().length < 5) {
                throw new Error(
                    `Cada item da Nota de Débito deve ter uma descrição detalhada ` +
                    `do serviço adicional ou motivo do débito. Item: "${item.descricao || 'sem descrição'}"`
                );
            }

            // 2.2 Quantidade e preço válidos
            if (item.quantidade <= 0) {
                throw new Error(`A quantidade do item "${item.descricao}" deve ser maior que zero.`);
            }
            if (item.preco_unitario <= 0) {
                throw new Error(`O preço unitário do item "${item.descricao}" deve ser maior que zero.`);
            }

            // 2.3 CORRIGIDO: Verificar se é serviço usando o campo eh_servico ou produto.tipo
            // Prioriza o campo eh_servico que vem do backend
            const isServico = item.eh_servico === true || 
                (item.produto && item.produto.tipo === 'servico');

            // Se não for serviço E tem produto_id, é inválido
            if (!isServico && item.produto_id) {
                throw new Error(
                    `Nota de Débito não pode ser usada para produtos físicos. ` +
                    `Item "${item.descricao}" está cadastrado como produto. ` +
                    `Use Nota de Débito apenas para serviços adicionais, juros ou multas.`
                );
            }

            // Se não tem produto_id, valida pela descrição (para itens avulsos)
            if (!item.produto_id && !isServico) {
                const descricaoLower = item.descricao.toLowerCase();
                const palavrasServico = [
                    'serviço', 'servico', 'consulta', 'consultoria', 'manutenção',
                    'manutencao', 'instalação', 'instalacao', 'juro', 'juros',
                    'multa', 'penalidade', 'taxa', 'comissão', 'comissao'
                ];
                const found = palavrasServico.some(term => descricaoLower.includes(term));
                if (!found) {
                    throw new Error(
                        `Nota de Débito só pode ser usada para serviços. ` +
                        `Item "${item.descricao}" não parece ser um serviço. ` +
                        `Use Nota de Débito apenas para serviços adicionais, juros ou multas.`
                    );
                }
            }

            temServico = true;

            // 2.4 Verificar se é juros ou multa (para fatura paga)
            const descricaoLower = item.descricao.toLowerCase();
            if (descricaoLower.includes('juro') || descricaoLower.includes('juros') ||
                descricaoLower.includes('multa') || descricaoLower.includes('penalidade')) {
                temJurosOuMulta = true;
            }
        }

        if (!temServico) {
            throw new Error(
                'A Nota de Débito deve conter pelo menos um serviço. ' +
                'Os itens devem descrever serviços adicionais, juros ou multas.'
            );
        }

        // 3. Buscar a fatura original
        const fatura = await this.buscarPorId(documentoOrigemId);

        // 4. Validar tipo de documento origem (apenas FT)
        if (!TIPOS_ORIGEM_ND.includes(fatura.tipo_documento)) {
            throw new Error(
                `Nota de Débito só pode ser emitida a partir de Fatura (FT). ` +
                `Tipo atual: ${fatura.tipo_documento}. ` +
                `Motivo: Nota de Débito serve para acrescentar serviços adicionais, ` +
                `juros ou multas a uma fatura, NÃO a uma Fatura-Recibo ou Proforma.`
            );
        }

        // 5. Validar se a fatura não está cancelada ou expirada
        if (fatura.estado === 'cancelado') {
            throw new Error(
                `Não é possível emitir Nota de Débito para a fatura cancelada: ${fatura.numero_documento}`
            );
        }
        
        if (fatura.estado === 'expirado') {
            throw new Error(
                `Não é possível emitir Nota de Débito para a fatura expirada: ${fatura.numero_documento}`
            );
        }

        // 6. Validar prazo de 30 dias para débito
        const dataEmissao = new Date(fatura.data_emissao);
        const prazoMaximo = new Date(dataEmissao);
        prazoMaximo.setDate(prazoMaximo.getDate() + 30);
        const hoje = new Date();

        if (hoje > prazoMaximo) {
            throw new Error(
                `O prazo para emitir Nota de Débito é de até 30 dias após a emissão da fatura.\n` +
                `Fatura emitida em: ${dataEmissao.toLocaleDateString('pt-PT')}\n` +
                `Prazo máximo: ${prazoMaximo.toLocaleDateString('pt-PT')}\n` +
                `Hoje: ${hoje.toLocaleDateString('pt-PT')}`
            );
        }

        // 7. Validar se a fatura já foi paga - então precisa ser juros/multa
        if (fatura.estado === 'paga' && !temJurosOuMulta) {
            throw new Error(
                `A fatura já está paga. Nota de Débito para fatura paga deve ser ` +
                `exclusivamente para cobrança de juros de mora ou multas contratuais.\n` +
                `Inclua "juros" ou "multa" na descrição dos itens.`
            );
        }

        // 8. Calcular valor total do débito
        const valorND = dados.itens.reduce((sum, item) => {
            const subtotal = item.quantidade * item.preco_unitario;
            const iva = subtotal * ((item.taxa_iva || 0) / 100);
            const desconto = item.desconto || 0;
            return sum + subtotal + iva - desconto;
        }, 0);

        if (valorND <= 0) {
            throw new Error('O valor total da Nota de Débito deve ser maior que zero.');
        }

        // 9. Enviar requisição para o backend
        const response = await api.post<ApiResponse<RespostaNotaDebito>>(
            `${this.baseUrl}/${documentoOrigemId}/nota-debito`,
            {
                itens: dados.itens,
                motivo: dados.motivo || `Débito adicional referente à ${fatura.numero_documento}`,
                cliente_id: dados.cliente_id,
                cliente_nome: dados.cliente_nome,
                cliente_nif: dados.cliente_nif,
                referencia_externa: dados.referencia_externa,
                observacoes: dados.observacoes,
            }
        );
        
        if (!response.data.success) throw new Error(response.data.message);
        
        // Enriquecer a nota de débito na resposta
        if (response.data.data.nota_debito) {
            response.data.data.nota_debito = this._enriquecerDocumento(
                response.data.data.nota_debito
            );
        }
        
        return response.data.data;
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
    async abrirImpressao(id: string, auto = true): Promise<void> {
        const url = `/api/documentos-fiscais/${id}/pdf-viewer${auto ? '?auto=1' : ''}`;
        const response = await api.get(url, { responseType: 'text' });
        const blob = new Blob([response.data], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
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

    // ── Utilitários (CORRIGIDO) ─────────────────────────────

    calcularValorPendente(documento: DocumentoFiscal): number {
        // Apenas FT e FA têm valor pendente real
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
        // Proformas (FP) NÃO têm valor pago real - são orçamentos
        if (documento.tipo_documento === 'FP') return 0;
        return documento.recibos?.reduce(
            (sum, r) => r.estado !== 'cancelado' ? sum + Number(r.total_liquido) : sum, 0
        ) ?? 0;
    }

    /**
     * Calcula o saldo disponível para crédito em uma fatura
     * Útil para validar se uma NC pode ser emitida
     */
    calcularSaldoDisponivel(documento: DocumentoFiscal): number {
        if (!['FT', 'FR'].includes(documento.tipo_documento)) return 0;
        
        const totalCreditado = documento.notasCredito?.reduce(
            (sum, nc) => nc.estado !== 'cancelado' ? sum + Number(nc.total_liquido) : sum, 0
        ) ?? 0;
        
        return Math.max(0, Number(documento.total_liquido) - totalCreditado);
    }

    /**
     * Verifica se pode emitir Nota de Crédito para este documento
     */
    podeEmitirNotaCredito(documento: DocumentoFiscal): { pode: boolean; motivo?: string } {
        // 1. Tipo de documento
        if (!TIPOS_ORIGEM_NC.includes(documento.tipo_documento)) {
            return { 
                pode: false, 
                motivo: `Apenas Fatura (FT) ou Fatura-Recibo (FR) podem originar Nota de Crédito. Tipo atual: ${documento.tipo_documento}` 
            };
        }

        // 2. Estado
        if (documento.estado === 'cancelado') {
            return { pode: false, motivo: 'Não é possível emitir Nota de Crédito para uma fatura cancelada.' };
        }
        if (documento.estado === 'expirado') {
            return { pode: false, motivo: 'Não é possível emitir Nota de Crédito para uma fatura expirada.' };
        }

        // 3. Saldo disponível
        const saldo = this.calcularSaldoDisponivel(documento);
        if (saldo <= 0.01) {
            return { 
                pode: false, 
                motivo: 'Esta fatura não possui saldo disponível para crédito.' 
            };
        }

        return { pode: true };
    }

    /**
     * CORRIGIDO: Verifica se pode emitir Nota de Débito para este documento
     * Apenas FT pode originar ND
     */
    podeEmitirNotaDebito(documento: DocumentoFiscal): { pode: boolean; motivo?: string } {
        // 1. Tipo de documento (apenas FT)
        if (!TIPOS_ORIGEM_ND.includes(documento.tipo_documento)) {
            return { 
                pode: false, 
                motivo: `Apenas Fatura (FT) pode originar Nota de Débito. Tipo atual: ${documento.tipo_documento}` 
            };
        }

        // 2. Estado
        if (documento.estado === 'cancelado') {
            return { pode: false, motivo: 'Não é possível emitir Nota de Débito para uma fatura cancelada.' };
        }
        if (documento.estado === 'expirado') {
            return { pode: false, motivo: 'Não é possível emitir Nota de Débito para uma fatura expirada.' };
        }

        // 3. Prazo de 30 dias
        const dataEmissao = new Date(documento.data_emissao);
        const prazoMaximo = new Date(dataEmissao);
        prazoMaximo.setDate(prazoMaximo.getDate() + 30);
        const hoje = new Date();

        if (hoje > prazoMaximo) {
            return { 
                pode: false, 
                motivo: `O prazo para emitir Nota de Débito é de até 30 dias após a emissão da fatura.\n` +
                        `Fatura emitida em: ${dataEmissao.toLocaleDateString('pt-PT')}\n` +
                        `Prazo máximo: ${prazoMaximo.toLocaleDateString('pt-PT')}` 
            };
        }

        return { pode: true };
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

    /**
     * CORRIGIDO: Verifica se pode gerar recibo
     * FT, FA e FP podem gerar recibos
     */
    podeGerarRecibo(documento: DocumentoFiscal): boolean {
        // FT, FA e FP podem gerar recibos
        // Nota: FP pode receber sinal/adiantamento, mas NÃO altera estado
        return ['FT', 'FA', 'FP'].includes(documento.tipo_documento)
            && ['emitido', 'parcialmente_paga'].includes(documento.estado);
    }

    /**
     * CORRIGIDO: Verifica se pode gerar Nota de Correção (NC ou ND)
     * Separado em dois métodos específicos
     */
    podeGerarNotaCredito(documento: DocumentoFiscal): boolean {
        return this.podeEmitirNotaCredito(documento).pode;
    }

    podeGerarNotaDebito(documento: DocumentoFiscal): boolean {
        return this.podeEmitirNotaDebito(documento).pode;
    }

    ehVenda(documento: DocumentoFiscal): boolean { return TIPOS_VENDA.includes(documento.tipo_documento); }
    
    /**
     * Verifica se é uma Proforma (FP)
     * Proformas NÃO são vendas, NÃO são dívidas - são orçamentos
     */
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
            FT: 'Factura', FR: 'Factura-Recibo', FP: 'Factura Proforma',
            FA: 'Factura de Adiantamento', NC: 'Nota de Crédito',
            ND: 'Nota de Débito', RC: 'Recibo', FRt: 'Factura de Retificação',
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
        const servicos = doc.itens?.filter(item => item.eh_servico === true || item.produto?.tipo === 'servico') ?? [];
        const totalCreditado = doc.notasCredito?.reduce(
            (sum, nc) => nc.estado !== 'cancelado' ? sum + Number(nc.total_liquido) : sum, 0
        ) ?? 0;
        const totalDebitos = doc.notasDebito?.reduce(
            (sum, nd) => nd.estado !== 'cancelado' ? sum + Number(nd.total_liquido) : sum, 0
        ) ?? 0;
        const valorPago = this.calcularValorPago(doc);

        return {
            ...doc,
            tem_servicos: servicos.length > 0,
            quantidade_servicos: servicos.length,
            total_retencao_servicos: servicos.reduce((acc, item) => acc + (item.valor_retencao ?? 0), 0),
            percentual_retencao: Number(doc.base_tributavel) > 0
                ? Math.round((Number(doc.total_retencao) / Number(doc.base_tributavel)) * 100 * 100) / 100
                : 0,
            // Campos adicionais para validação
            total_creditado: totalCreditado,
            total_debitos: totalDebitos,
            valor_pago: valorPago,
            saldo_disponivel: this.calcularSaldoDisponivel(doc),
            saldo_pendente: this.calcularValorPendente(doc),
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
            dados: CriarNotaCreditoDTO;
        }) => documentoFiscalService.criarNotaCredito(documentoOrigemId, dados),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.resumo] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.alertas] });
        },
    });
};

export const useCriarNotaDebito = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ documentoOrigemId, dados }: {
            documentoOrigemId: string;
            dados: CriarNotaDebitoDTO;
        }) => documentoFiscalService.criarNotaDebito(documentoOrigemId, dados),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.resumo] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.alertas] });
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
