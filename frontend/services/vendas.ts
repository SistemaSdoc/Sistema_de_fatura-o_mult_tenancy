// src/services/vendas.ts

import api from "./axios";
import { AxiosError } from "axios";

/* ================== HELPERS ================== */
function handleAxiosError(err: unknown, prefix: string) {
    if (err instanceof AxiosError) {
        const msg = err.response?.data?.message || err.message || "Erro desconhecido";
        console.error(`${prefix}:`, msg);
    } else {
        console.error(`${prefix}:`, err);
    }
}

/* ================== TIPOS ================== */

/* -------- Paginacao Genérica -------- */
export interface Paginacao<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

/* -------- Usuário -------- */
export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'operador' | 'contabilista';
    ativo: boolean;
    ultimo_login?: string | null;
}

/* -------- Tipos de Documento Fiscal -------- */
// TODOS os tipos de documento
export type TipoDocumentoFiscal =
    | 'FT'   // Fatura - VENDA
    | 'FR'   // Fatura-Recibo - VENDA
    | 'FP'   // Fatura Proforma - NÃO VENDA (pré-documento)
    | 'RC'   // Recibo - VENDA (pagamento)
    | 'NC'   // Nota de Crédito - NÃO VENDA
    | 'ND'   // Nota de Débito - NÃO VENDA
    | 'FA'   // Fatura de Adiantamento - NÃO VENDA (vira venda com recibo)
    | 'FRt'; // Fatura de Retificação - NÃO VENDA

// Nomes dos tipos para exibição
export const NOMES_TIPO_DOCUMENTO: Record<TipoDocumentoFiscal, string> = {
    FT: 'Fatura',
    FR: 'Fatura-Recibo',
    FP: 'Fatura Proforma',
    RC: 'Recibo',
    NC: 'Nota de Crédito',
    ND: 'Nota de Débito',
    FA: 'Fatura de Adiantamento',
    FRt: 'Fatura de Retificação',
};

// Tipos que podem ser criados via venda (FT, FR, FP)
export const TIPOS_DOCUMENTO_VENDA: TipoDocumentoFiscal[] = ['FT', 'FR', 'FP'];

// Tipos que são considerados VENDAS (FT, FR, RC)
export const TIPOS_VENDA: TipoDocumentoFiscal[] = ['FT', 'FR', 'RC'];

/* -------- Estados de Documento Fiscal -------- */
export type EstadoDocumentoFiscal =
    | 'emitido'
    | 'paga'
    | 'parcialmente_paga'
    | 'cancelado'
    | 'expirado';

export type EstadoPagamentoVenda = 'paga' | 'pendente' | 'parcial' | 'cancelada';

/* -------- Item de Venda -------- */
export interface CriarItemVendaPayload {
    produto_id: string;
    quantidade: number;
    preco_venda: number;
    desconto?: number;
    // ✅ NOVO: taxa de retenção para serviços (opcional)
    taxa_retencao?: number;
}

/* -------- Dados de Pagamento -------- */
export interface DadosPagamento {
    metodo: 'transferencia' | 'multibanco' | 'dinheiro' | 'cheque' | 'cartao';
    valor: number;
    referencia?: string;
    data?: string;
}

/* -------- Payload de Criação de Venda -------- */
export interface CriarVendaPayload {
    cliente_id?: string | null;
    cliente_nome?: string;           // Para cliente avulso
    cliente_nif?: string;            // Para cliente avulso (opcional)
    tipo_documento?: TipoDocumentoFiscal; // FT, FR ou FP
    faturar?: boolean;              // false para FP, true para FT/FR
    itens: CriarItemVendaPayload[];
    // Obrigatório para Fatura-Recibo (FR)
    dados_pagamento?: DadosPagamento;
    observacoes?: string;
}

/* -------- Payload para Documento Fiscal (NOVO) -------- */
export interface CriarDocumentoFiscalPayload {
    tipo_documento: TipoDocumentoFiscal; // FT, FR, FP, FA, NC, ND, RC, FRt
    venda_id?: string;
    cliente_id?: string | null;
    cliente_nome?: string;           // Para cliente avulso
    cliente_nif?: string;            // Para cliente avulso (opcional)
    fatura_id?: string;
    itens: Array<{
        produto_id?: string;
        descricao: string;
        quantidade: number;
        preco_unitario: number;
        desconto?: number;
        taxa_iva?: number;
        taxa_retencao?: number;      // ✅ NOVO: taxa de retenção para serviços
    }>;
    dados_pagamento?: DadosPagamento;
    motivo?: string;
    data_vencimento?: string;
    referencia_externa?: string;
}

/* -------- Cliente -------- */
export type TipoCliente = "consumidor_final" | "empresa";

export interface Cliente {
    id: string;
    nome: string;
    nif: string | null;
    tipo: TipoCliente;
    status?: 'ativo' | 'inativo';    // ✅ NOVO
    telefone: string | null;
    email: string | null;
    endereco: string | null;
    data_registro: string;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
}

export interface CriarClienteInput {
    nome: string;
    nif?: string;
    tipo?: TipoCliente;
    status?: 'ativo' | 'inativo';    // ✅ NOVO
    telefone?: string;
    email?: string;
    endereco?: string;
    data_registro?: string;
}

export type AtualizarClienteInput = Partial<CriarClienteInput>

/* -------- Categoria -------- */
export interface Categoria {
    id: string;
    nome: string;
    descricao?: string;
    tipo: 'produto' | 'servico';
    status: 'ativo' | 'inativo';
    user_id: string;
}

export interface CategoriaPayload {
    nome: string;
    descricao?: string;
    tipo?: 'produto' | 'servico';
}

/* -------- Fornecedor -------- */
export interface Fornecedor {
    id: string;
    nome: string;
    tipo: 'nacional' | 'internacional';
    nif?: string;
    telefone?: string | null;
    email?: string | null;
    endereco?: string | null;
    status: 'ativo' | 'inativo';
    user_id: string;
}

/* -------- Produto -------- */
export type TipoProduto = "produto" | "servico";
export type StatusProduto = "ativo" | "inativo";
export type UnidadeMedida = "hora" | "dia" | "semana" | "mes";

export interface Produto {
    id: string;
    categoria_id: string | null;
    categoria?: Categoria;
    fornecedor_id?: string | null;
    fornecedor?: Fornecedor;
    user_id?: string;
    codigo?: string | null;
    nome: string;
    descricao?: string;
    preco_compra: number;
    preco_venda: number;
    custo_medio?: number;
    taxa_iva: number;
    sujeito_iva?: boolean;
    estoque_atual: number;
    estoque_minimo: number;
    status: StatusProduto;
    tipo: TipoProduto;
    // Campos de serviço
    retencao?: number;
    duracao_estimada?: string;
    unidade_medida?: UnidadeMedida;
    // Campos calculados
    valor_retencao?: number;
    preco_liquido?: number;
    // Soft delete
    deleted_at?: string | null;
    created_at?: string;
    updated_at?: string;
    // Relacionamentos
    movimentosStock?: MovimentoStock[];
    // Campos adicionais para listagem
    data_exclusao?: string;
    esta_deletado?: boolean;
}

export interface CriarProdutoInput {
    tipo: TipoProduto;
    categoria_id?: string | null;
    fornecedor_id?: string | null;
    codigo?: string | null;
    nome: string;
    descricao?: string;
    preco_venda: number;
    preco_compra?: number;
    taxa_iva?: number;
    sujeito_iva?: boolean;
    estoque_atual?: number;
    estoque_minimo?: number;
    status?: StatusProduto;
    // Campos de serviço
    retencao?: number;
    duracao_estimada?: string;
    unidade_medida?: UnidadeMedida;
}

export type AtualizarProdutoInput = Partial<CriarProdutoInput>;

export interface ListarProdutosParams {
    tipo?: TipoProduto;
    status?: StatusProduto;
    categoria_id?: string;
    busca?: string;
    estoque_baixo?: boolean;
    sem_estoque?: boolean;
    ordenar?: string;
    direcao?: "asc" | "desc";
    paginar?: boolean;
    per_page?: number;
    with_trashed?: boolean;
    // ✅ NOVOS FILTROS
    apenas_servicos?: boolean;
    apenas_produtos?: boolean;
    com_retencao?: boolean;
}

export interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number;
    to?: number;
}

/* -------- Item de Documento Fiscal -------- */
export interface ItemDocumentoFiscal {
    id: string;
    documento_fiscal_id: string;
    produto_id?: string | null;
    produto?: Produto;
    descricao: string;
    referencia?: string;
    quantidade: number;
    unidade: string;
    preco_unitario: number;
    desconto: number;
    base_tributavel: number;
    taxa_iva: number;
    valor_iva: number;
    taxa_retencao: number;
    valor_retencao: number;
    total_linha: number;
    ordem: number;
    item_origem_id?: string | null;
    motivo_alteracao?: string | null;
    observacoes?: string | null;
}

/* -------- Documento Fiscal (atualizado) -------- */
export interface DocumentoFiscal {
    id: string;
    user_id: string;
    venda_id?: string | null;
    cliente_id?: string | null;
    cliente?: Cliente;
    cliente_nome?: string; // Para cliente avulso
    cliente_nif?: string;  // Para cliente avulso
    fatura_id?: string | null;
    documento_origem?: DocumentoFiscal;

    serie: string;
    numero: number;
    numero_documento: string;

    tipo_documento: TipoDocumentoFiscal;
    tipo_documento_nome: string;

    data_emissao: string;
    hora_emissao: string;
    data_vencimento?: string | null;
    data_cancelamento?: string | null;

    base_tributavel: number;
    total_iva: number;
    total_retencao: number; // ✅ Soma das retenções de serviços
    total_liquido: number;

    estado: EstadoDocumentoFiscal;
    motivo?: string | null;
    motivo_cancelamento?: string | null;

    hash_fiscal?: string | null;
    referencia_externa?: string | null;

    // Campos específicos de recibo
    metodo_pagamento?: 'transferencia' | 'multibanco' | 'dinheiro' | 'cheque' | 'cartao' | null;
    referencia_pagamento?: string | null;

    // Relacionamentos
    itens?: ItemDocumentoFiscal[];
    recibos?: DocumentoFiscal[];
    notas_credito?: DocumentoFiscal[];
    notas_debito?: DocumentoFiscal[];
    adiantamentos_vinculados?: DocumentoFiscal[];
    faturas_vinculadas?: DocumentoFiscal[];

    // Acessores virtuais
    valor_pendente?: number;
    valor_pago?: number;
    esta_paga?: boolean;
    pode_ser_cancelada?: boolean;
    pode_ser_paga?: boolean;
    pode_gerar_recibo?: boolean;
    pode_gerar_nota_credito?: boolean;
    pode_gerar_nota_debito?: boolean;
    eh_venda?: boolean;

    user?: User;
    user_cancelamento?: User;

    created_at?: string;
    updated_at?: string;
}

/* -------- Item de Venda (CORRIGIDO - em conformidade com VendaController) -------- */
export interface ItemVenda {
    id: string;
    produto_id: string;
    // ✅ CORRIGIDO: produto é objeto ou null, NÃO boolean
    produto: {
        id: string;
        nome: string;
        codigo?: string;
        tipo: TipoProduto;
    } | null;
    descricao: string;
    quantidade: number;
    preco_venda: number;
    desconto: number;
    base_tributavel: number;
    valor_iva: number;
    valor_retencao: number;      // Valor retido do serviço (calculado)
    taxa_retencao?: number;      // Taxa de retenção aplicada (ex: 6.5)
    subtotal: number;
    subtotal_liquido: number;    // ✅ OBRIGATÓRIO: subtotal - valor_retencao
    eh_servico: boolean;         // ✅ Flag calculada no backend
    codigo_produto?: string;
    unidade?: string;
}

/* -------- Totais por Tipo (NOVO - conforme VendaController) -------- */
export interface TotaisPorTipo {
    produtos: {
        quantidade: number;
        total: number;
    };
    servicos: {
        quantidade: number;
        total: number;
        retencao: number;
    };
}

/* -------- Venda (CORRIGIDO - em conformidade com VendaController) -------- */
export interface Venda {
    id: string;
    // Dados do documento fiscal (se existir)
    numero: string;
    serie: string;
    tipo_documento: TipoDocumentoFiscal | 'venda';
    tipo_documento_nome: string;

    // Cliente
    cliente_id?: string | null;
    cliente?: Cliente | null;
    cliente_nome?: string | null; // Para cliente avulso
    cliente_nif?: string | null;  // Para cliente avulso

    // Usuário
    user_id: string;
    user?: User;

    // Datas
    data_venda: string;
    hora_venda: string;
    created_at?: string;

    // Valores
    total: number;
    base_tributavel: number;
    total_iva: number;
    total_retencao: number;      // Total das retenções

    // ✅ NOVO: Retenção de serviços (conforme VendaController)
    total_retencao_servicos: number;
    tem_servicos: boolean;
    quantidade_servicos: number;

    // Status
    status: 'aberta' | 'faturada' | 'cancelada';
    estado_pagamento: EstadoPagamentoVenda;
    faturado: boolean;
    eh_venda: boolean;           // FT, FR ou RC
    paga: boolean;               // estado_pagamento === 'paga'

    // Documento fiscal completo
    documento_fiscal?: DocumentoFiscal | null;

    // Itens
    itens?: ItemVenda[];

    // ✅ NOVO: Totais por tipo (conforme VendaController)
    totais_por_tipo?: TotaisPorTipo;

    // Campos legados/compatibilidade
    numero_documento?: string;
    tipo_documento_fiscal?: TipoDocumentoFiscal;
    observacoes?: string;
    hash_fiscal?: string;
    pode_receber_pagamento?: boolean;
    deleted_at?: string;
}

/* -------- Compra -------- */
export interface ItemCompra {
    id: string;
    compra_id: string;
    produto_id: string;
    quantidade: number;
    preco_compra: number;
    subtotal: number;
    base_tributavel: number;
    valor_iva: number;
}

export interface Compra {
    id: string;
    user_id: string;
    fornecedor_id: string;
    data: string;
    tipo_documento: 'fatura' | 'nota_credito';
    numero_documento: string;
    data_emissao: string;
    base_tributavel: number;
    total_iva: number;
    total_fatura: number;
    total: number;
    validado_fiscalmente: boolean;
    itens?: ItemCompra[];
}

/* -------- Movimento de Stock -------- */
export interface MovimentoStock {
    id: string;
    produto_id: string;
    user_id: string;
    tipo: 'entrada' | 'saida';
    tipo_movimento: 'compra' | 'venda' | 'ajuste' | 'nota_credito' | 'devolucao';
    quantidade: number;
    custo_medio: number;
    stock_minimo: number;
    referencia?: string;
    observacao?: string;
    created_at?: string;
    updated_at?: string;
    estoque_anterior?: number;
    estoque_novo?: number;
    custo_unitario?: number;
    motivo?: string;
    user?: User;
    produto?: Produto;
}

export interface CriarMovimentoPayload {
    produto_id: string;
    tipo: 'entrada' | 'saida';
    tipo_movimento?: 'compra' | 'venda' | 'ajuste' | 'nota_credito' | 'devolucao';
    quantidade: number;
    custo_medio?: number;
    stock_minimo?: number;
    referencia?: string;
    observacao?: string;
    data?: string;
    motivo?: string;
    custo_unitario?: number;
}

/* -------- Dashboard (atualizado com tipos do dashboard.ts) -------- */
export interface DashboardData {
    user: User;

    kpis: {
        ticketMedio: number;
        crescimentoPercentual: number;
        ivaArrecadado: number;
        totalFaturado: number;
        totalNotasCredito: number;
        totalLiquido: number;
        // ✅ NOVO
        totalRetencao?: number;
        totalRetencaoMes?: number;
    };

    produtos: {
        total: number;
        ativos: number;
        inativos: number;
        stock_baixo: number;
    };

    // ✅ NOVO: estatísticas de serviços
    servicos?: {
        total: number;
        ativos: number;
        inativos: number;
        precoMedio: number;
        comRetencao: number;
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
            };
            data: string;
            // ✅ NOVO
            tem_servicos?: boolean;
            total_retencao?: number;
        }>;
    };

    documentos_fiscais: {
        total: number;
        por_tipo: Record<TipoDocumentoFiscal, {
            nome: string;
            quantidade: number;
            valor: number;
            // ✅ NOVO
            retencao?: number;
        }>;
        por_estado: Array<{
            tipo: string;
            por_estado: Record<string, { quantidade: number; valor: number; retencao?: number }>;
            total_quantidade: number;
            total_valor: number;
            total_retencao?: number;
        }>;
        ultimos: Array<{
            id: string;
            tipo: TipoDocumentoFiscal;
            tipo_nome: string;
            numero: string;
            cliente: string;
            total: number;
            estado: EstadoDocumentoFiscal;
            estado_pagamento: EstadoPagamentoVenda;
            data: string;
            // ✅ NOVO
            retencao?: number;
        }>;
        por_mes: Array<{
            mes: string;
            FT: number;
            FR: number;
            NC: number;
            ND: number;
            total: number;
            // ✅ NOVO
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
        novos_mes: number;
    };

    indicadores: {
        produtosMaisVendidos: Array<{
            produto: string;
            codigo?: string;
            quantidade: number;
            valor_total: number;
        }>;
        // ✅ NOVO: serviços mais vendidos
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
        adiantamentos_pendentes: number;
        proformas_pendentes: number;
        // ✅ NOVO
        servicos_com_retencao_pendente?: number;
    };

    periodo: {
        mes_atual: number;
        ano_atual: number;
        mes_anterior: number;
        ano_anterior: number;
    };
}

export type DashboardResponse = DashboardData;

/* -------- Resumo de Documentos Fiscais -------- */
export interface ResumoDocumentosFiscais {
    total_emitidos: number;
    por_tipo: Record<TipoDocumentoFiscal, {
        nome: string;
        quantidade: number;
        valor_total: number;
        mes_atual: number;
        // ✅ NOVO
        retencao_total?: number;
    }>;
    por_estado: Record<EstadoDocumentoFiscal, number>;
    periodo: {
        inicio: string;
        fim: string;
    };
}

/* -------- Estatísticas de Pagamentos -------- */
export interface EstatisticasPagamentos {
    recebidos_hoje: number;
    recebidos_mes: number;
    recebidos_ano: number;
    pendentes: number;
    atrasados: {
        quantidade: number;
        valor_total: number;
        documentos: Array<{
            id: string;
            numero: string;
            cliente?: string;
            valor: number;
            dias_atraso: number;
        }>;
    };
    prazo_medio_pagamento: number;
    metodos_pagamento: Record<string, number>;
    // ✅ NOVO
    recebidos_com_retencao?: number;
}

/* -------- Alertas Pendentes -------- */
export interface AlertasPendentes {
    vencidos: {
        quantidade: number;
        valor_total: number;
        documentos: Array<{
            id: string;
            tipo: TipoDocumentoFiscal;
            numero: string;
            cliente?: string;
            valor: number;
            valor_pendente: number;
            data_vencimento: string;
            dias_atraso: number;
            // ✅ NOVO
            retencao?: number;
        }>;
    };
    proximos_vencimento: {
        quantidade: number;
        valor_total: number;
        documentos: Array<{
            id: string;
            tipo: TipoDocumentoFiscal;
            numero: string;
            cliente?: string;
            valor: number;
            valor_pendente: number;
            data_vencimento: string;
            dias_ate_vencimento: number;
            // ✅ NOVO
            retencao?: number;
        }>;
    };
    adiantamentos_pendentes: {
        quantidade: number;
        valor_total: number;
        documentos: Array<{
            id: string;
            tipo: TipoDocumentoFiscal;
            numero: string;
            cliente?: string;
            valor: number;
            data_emissao: string;
            dias_pendentes: number;
        }>;
    };
    proformas_pendentes: {
        quantidade: number;
        valor_total: number;
        documentos: Array<{
            id: string;
            tipo: TipoDocumentoFiscal;
            numero: string;
            cliente?: string;
            valor: number;
            data_emissao: string;
            dias_pendentes: number;
        }>;
    };
    // ✅ NOVO
    servicos_com_retencao_proximos?: {
        quantidade: number;
        valor_total: number;
        documentos: Array<{
            id: string;
            numero: string;
            cliente?: string;
            valor: number;
            retencao: number;
            data_vencimento: string;
        }>;
    };
    total_alertas: number;
}

/* -------- Evolução Mensal -------- */
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
        proformas: number;
        valor_proformas: number;
        adiantamentos: number;
        valor_adiantamentos: number;
        // ✅ NOVO
        retencao?: number;
    }>;
}

/* ================== SERVIÇOS ================== */

/* -------- Helper para limpar payload de venda -------- */
function criarPayloadVenda(payload: CriarVendaPayload): Record<string, unknown> {
    const cleanPayload: Record<string, unknown> = {
        itens: payload.itens,
    };

    // Para cliente cadastrado, enviar cliente_id
    if (payload.cliente_id) {
        cleanPayload.cliente_id = payload.cliente_id;
    }

    // Para cliente avulso, enviar cliente_nome e opcionalmente cliente_nif
    if (payload.cliente_nome && payload.cliente_nome.trim() !== '') {
        cleanPayload.cliente_nome = payload.cliente_nome.trim();
        if (payload.cliente_nif) {
            cleanPayload.cliente_nif = payload.cliente_nif;
        }
    }

    // Enviar tipo_documento se existir (FT, FR ou FP)
    if (payload.tipo_documento) {
        cleanPayload.tipo_documento = payload.tipo_documento;
    }

    // faturar false para FP, true para FT/FR
    cleanPayload.faturar = payload.tipo_documento !== 'FP';

    // Dados de pagamento apenas para FR
    if (payload.dados_pagamento && payload.tipo_documento === 'FR') {
        cleanPayload.dados_pagamento = payload.dados_pagamento;
    }

    // Observações
    if (payload.observacoes) {
        cleanPayload.observacoes = payload.observacoes;
    }

    return cleanPayload;
}

/* -------- Helper para limpar payload de documento fiscal -------- */
function criarPayloadDocumentoFiscal(payload: CriarDocumentoFiscalPayload): Record<string, unknown> {
    const cleanPayload: Record<string, unknown> = {
        tipo_documento: payload.tipo_documento,
        itens: payload.itens,
    };

    if (payload.venda_id) {
        cleanPayload.venda_id = payload.venda_id;
    }

    // Para cliente cadastrado, enviar cliente_id
    if (payload.cliente_id) {
        cleanPayload.cliente_id = payload.cliente_id;
    }

    // Para cliente avulso, enviar cliente_nome e opcionalmente cliente_nif
    if (payload.cliente_nome && payload.cliente_nome.trim() !== '') {
        cleanPayload.cliente_nome = payload.cliente_nome.trim();
        if (payload.cliente_nif) {
            cleanPayload.cliente_nif = payload.cliente_nif;
        }
    }

    if (payload.fatura_id) {
        cleanPayload.fatura_id = payload.fatura_id;
    }

    if (payload.dados_pagamento) {
        cleanPayload.dados_pagamento = payload.dados_pagamento;
    }

    if (payload.motivo) {
        cleanPayload.motivo = payload.motivo;
    }

    if (payload.data_vencimento) {
        cleanPayload.data_vencimento = payload.data_vencimento;
    }

    if (payload.referencia_externa) {
        cleanPayload.referencia_externa = payload.referencia_externa;
    }

    return cleanPayload;
}

/* -------- Vendas -------- */
export const vendaService = {
    async obterDadosNovaVenda(): Promise<{
        clientes: Cliente[];
        produtos: Produto[];
        estatisticas?: {
            total_produtos: number;
            total_servicos: number;
        };
    }> {
        try {
            const { data } = await api.get("/api/vendas/create");
            return {
                clientes: data.clientes || [],
                produtos: data.produtos || [],
                estatisticas: data.estatisticas,
            };
        } catch (err) {
            handleAxiosError(err, "[VENDA SERVICE] Erro ao obter dados");
            return { clientes: [], produtos: [] };
        }
    },

    async criar(payload: CriarVendaPayload): Promise<{ venda: Venda; message: string } | null> {
        try {
            const cleanPayload = criarPayloadVenda(payload);
            console.log('[VENDA SERVICE] Payload:', cleanPayload);

            const { data } = await api.post("/api/vendas", cleanPayload);
            
            // ✅ Garantir que campos calculados existam na resposta
            if (data.venda) {
                data.venda = this.normalizarVenda(data.venda);
            }
            
            return data;
        } catch (err) {
            handleAxiosError(err, "[VENDA SERVICE] Erro ao criar venda");
            return null;
        }
    },

    async listar(params?: {
        status?: string;
        faturadas?: boolean;
        estado_pagamento?: EstadoPagamentoVenda;
        apenas_vendas?: boolean;  // Filtrar apenas FT, FR, RC
        tipo_documento?: TipoDocumentoFiscal;
        cliente_id?: string;
        data_inicio?: string;
        data_fim?: string;
        // ✅ NOVOS FILTROS
        tipo_item?: 'produto' | 'servico';
        com_retencao?: boolean;
    }): Promise<{ message: string; vendas: Venda[] } | null> {
        try {
            const queryParams = new URLSearchParams();
            if (params?.status) queryParams.append('status', params.status);
            if (params?.faturadas) queryParams.append('faturadas', 'true');
            if (params?.estado_pagamento) queryParams.append('estado_pagamento', params.estado_pagamento);
            if (params?.apenas_vendas) queryParams.append('apenas_vendas', 'true');
            if (params?.tipo_documento) queryParams.append('tipo_documento', params.tipo_documento);
            if (params?.cliente_id) queryParams.append('cliente_id', params.cliente_id);
            if (params?.data_inicio) queryParams.append('data_inicio', params.data_inicio);
            if (params?.data_fim) queryParams.append('data_fim', params.data_fim);
            if (params?.tipo_item) queryParams.append('tipo_item', params.tipo_item);
            if (params?.com_retencao) queryParams.append('com_retencao', 'true');

            const queryString = queryParams.toString();
            const url = `/api/vendas${queryString ? `?${queryString}` : ''}`;

            const { data } = await api.get(url);

            // ✅ Normalizar vendas para garantir conformidade com VendaController
            if (data.vendas) {
                data.vendas = data.vendas.map((venda: Venda) => this.normalizarVenda(venda));
            }

            return data;
        } catch (err) {
            handleAxiosError(err, "[VENDA SERVICE] Erro ao listar vendas");
            return null;
        }
    },

    async obter(id: string): Promise<{ message: string; venda: Venda } | null> {
        try {
            const { data } = await api.get(`/api/vendas/${id}`);
            
            // ✅ Normalizar venda para garantir conformidade
            if (data.venda) {
                data.venda = this.normalizarVenda(data.venda);
            }
            
            return data;
        } catch (err) {
            handleAxiosError(err, "[VENDA SERVICE] Erro ao obter venda");
            return null;
        }
    },

    async cancelar(id: string): Promise<{ message: string; venda: Venda } | null> {
        try {
            const { data } = await api.post(`/api/vendas/${id}/cancelar`);
            
            if (data.venda) {
                data.venda = this.normalizarVenda(data.venda);
            }
            
            return data;
        } catch (err) {
            handleAxiosError(err, "[VENDA SERVICE] Erro ao cancelar venda");
            return null;
        }
    },

    async gerarRecibo(id: string, dadosPagamento: {
        valor: number;
        metodo_pagamento: 'transferencia' | 'multibanco' | 'dinheiro' | 'cheque' | 'cartao';
        data_pagamento?: string;
        referencia?: string;
    }): Promise<{ message: string; venda: Venda; recibo: DocumentoFiscal } | null> {
        try {
            const { data } = await api.post(`/api/vendas/${id}/recibo`, dadosPagamento);
            
            if (data.venda) {
                data.venda = this.normalizarVenda(data.venda);
            }
            
            return data;
        } catch (err) {
            handleAxiosError(err, "[VENDA SERVICE] Erro ao gerar recibo");
            return null;
        }
    },

    // Converter FP para FT
    async converterProformaParaFatura(id: string, dadosPagamento?: {
        valor: number;
        metodo_pagamento: 'transferencia' | 'multibanco' | 'dinheiro' | 'cheque' | 'cartao';
        referencia?: string;
    }): Promise<{ message: string; venda: Venda } | null> {
        try {
            const { data } = await api.post(`/api/vendas/${id}/converter`, dadosPagamento);
            
            if (data.venda) {
                data.venda = this.normalizarVenda(data.venda);
            }
            
            return data;
        } catch (err) {
            handleAxiosError(err, "[VENDA SERVICE] Erro ao converter proforma");
            return null;
        }
    },

    // ✅ NOVO: Helper para normalizar venda e garantir conformidade com VendaController
    normalizarVenda(venda: Venda): Venda {
        // Garantir que itens estejam normalizados
        if (venda.itens) {
            venda.itens = venda.itens.map(item => this.normalizarItemVenda(item));
        }

        // Calcular estatísticas de serviços se não vierem do backend
        if (venda.totais_por_tipo === undefined && venda.itens) {
            const servicos = venda.itens.filter(item => item.eh_servico);
            const produtos = venda.itens.filter(item => !item.eh_servico);

            venda.totais_por_tipo = {
                produtos: {
                    quantidade: produtos.length,
                    total: produtos.reduce((acc, item) => acc + item.subtotal, 0),
                },
                servicos: {
                    quantidade: servicos.length,
                    total: servicos.reduce((acc, item) => acc + item.subtotal, 0),
                    retencao: servicos.reduce((acc, item) => acc + item.valor_retencao, 0),
                },
            };
        }

        // Garantir campos de retenção
        if (venda.total_retencao_servicos === undefined && venda.itens) {
            venda.total_retencao_servicos = venda.itens
                .filter(item => item.eh_servico)
                .reduce((acc, item) => acc + item.valor_retencao, 0);
        }

        if (venda.tem_servicos === undefined && venda.itens) {
            venda.tem_servicos = venda.itens.some(item => item.eh_servico);
        }

        if (venda.quantidade_servicos === undefined && venda.itens) {
            venda.quantidade_servicos = venda.itens.filter(item => item.eh_servico).length;
        }

        // Garantir flags derivadas
        if (venda.paga === undefined) {
            venda.paga = venda.estado_pagamento === 'paga';
        }

        return venda;
    },

    // ✅ NOVO: Helper para normalizar item de venda
    normalizarItemVenda(item: ItemVenda): ItemVenda {
        // Garantir que eh_servico esteja calculado
        if (item.eh_servico === undefined && item.produto) {
            item.eh_servico = item.produto.tipo === 'servico';
        }

        // Garantir subtotal_liquido calculado
        if (item.subtotal_liquido === undefined) {
            item.subtotal_liquido = item.subtotal - (item.valor_retencao ?? 0);
        }

        return item;
    },
};

/* -------- Documentos Fiscais -------- */
export const documentoFiscalService = {
    async listar(params?: {
        tipo?: TipoDocumentoFiscal;
        estado?: EstadoDocumentoFiscal;
        cliente_id?: string;
        cliente_nome?: string; // Para cliente avulso
        data_inicio?: string;
        data_fim?: string;
        pendentes?: boolean;
        adiantamentos_pendentes?: boolean;
        proformas_pendentes?: boolean;
        apenas_vendas?: boolean; // Filtrar apenas FT, FR, RC
        apenas_nao_vendas?: boolean; // Filtrar FP, FA, NC, ND, FRt
        per_page?: number;
        // ✅ NOVOS FILTROS
        com_retencao?: boolean;
    }): Promise<{ message: string; data: { documentos: DocumentoFiscal[] } } | null> {
        try {
            const queryParams = new URLSearchParams();
            if (params?.tipo) queryParams.append('tipo', params.tipo);
            if (params?.estado) queryParams.append('estado', params.estado);
            if (params?.cliente_id) queryParams.append('cliente_id', params.cliente_id);
            if (params?.cliente_nome) queryParams.append('cliente_nome', params.cliente_nome);
            if (params?.data_inicio) queryParams.append('data_inicio', params.data_inicio);
            if (params?.data_fim) queryParams.append('data_fim', params.data_fim);
            if (params?.pendentes) queryParams.append('pendentes', 'true');
            if (params?.adiantamentos_pendentes) queryParams.append('adiantamentos_pendentes', 'true');
            if (params?.proformas_pendentes) queryParams.append('proformas_pendentes', 'true');
            if (params?.apenas_vendas) queryParams.append('apenas_vendas', 'true');
            if (params?.apenas_nao_vendas) queryParams.append('apenas_nao_vendas', 'true');
            if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
            if (params?.com_retencao) queryParams.append('com_retencao', 'true');

            const queryString = queryParams.toString();
            const url = `/api/documentos-fiscais${queryString ? `?${queryString}` : ''}`;

            const { data } = await api.get(url);
            return data;
        } catch (err) {
            handleAxiosError(err, "[DOCUMENTO FISCAL SERVICE] Erro ao listar");
            return null;
        }
    },

    /**
     * Emitir um documento fiscal (FT, FR, FP, FA, NC, ND, RC, FRt)
     * Para FP (Fatura Proforma): não mexe em stock, não é venda
     */
    async emitir(payload: CriarDocumentoFiscalPayload): Promise<{
        data: unknown; message: string; documento: DocumentoFiscal
    } | null> {
        try {
            const cleanPayload = criarPayloadDocumentoFiscal(payload);

            // Log para debug
            console.log('[DOCUMENTO FISCAL SERVICE] Emitindo documento:', {
                tipo: payload.tipo_documento,
                cliente: payload.cliente_id ? 'cadastrado' : (payload.cliente_nome ? 'avulso' : 'não informado'),
                itens: payload.itens.length,
                tem_retencao: payload.itens.some(i => i.taxa_retencao && i.taxa_retencao > 0)
            });

            const { data } = await api.post("/api/documentos-fiscais/emitir", cleanPayload);
            return data;
        } catch (err) {
            handleAxiosError(err, "[DOCUMENTO FISCAL SERVICE] Erro ao emitir documento");
            return null;
        }
    },

    async obter(id: string): Promise<{ message: string; data: { documento: DocumentoFiscal } } | null> {
        console.log('========== DOCUMENTO FISCAL SERVICE ==========');
        console.log('1. Service obter() chamado com ID:', id);

        if (!id || id.trim() === '') {
            console.error('ERRO: ID inválido no service');
            throw new Error('ID do documento não fornecido');
        }

        try {
            const url = `/api/documentos-fiscais/${id}`;
            const { data } = await api.get(url);
            return data;
        } catch (err) {
            handleAxiosError(err, "[DOCUMENTO FISCAL SERVICE] Erro ao obter");
            return null;
        }
    },

    async gerarRecibo(documentoId: string, dadosPagamento: {
        valor: number;
        metodo_pagamento: 'transferencia' | 'multibanco' | 'dinheiro' | 'cheque' | 'cartao';
        data_pagamento?: string;
        referencia?: string;
    }): Promise<{ message: string; recibo: DocumentoFiscal; documento: DocumentoFiscal } | null> {
        try {
            const { data } = await api.post(`/api/documentos-fiscais/${documentoId}/recibo`, dadosPagamento);
            return data;
        } catch (err) {
            handleAxiosError(err, "[DOCUMENTO FISCAL SERVICE] Erro ao gerar recibo");
            return null;
        }
    },

    async criarNotaCredito(documentoId: string, payload: {
        itens: Array<{
            produto_id?: string;
            descricao: string;
            quantidade: number;
            preco_unitario: number;
            taxa_iva?: number;
            taxa_retencao?: number; // ✅ NOVO
        }>;
        motivo: string;
    }): Promise<{ message: string; documento: DocumentoFiscal } | null> {
        try {
            const { data } = await api.post(`/api/documentos-fiscais/${documentoId}/nota-credito`, payload);
            return data;
        } catch (err) {
            handleAxiosError(err, "[DOCUMENTO FISCAL SERVICE] Erro ao criar nota de crédito");
            return null;
        }
    },

    async criarNotaDebito(documentoId: string, payload: {
        itens: Array<{
            produto_id?: string;
            descricao: string;
            quantidade: number;
            preco_unitario: number;
            taxa_iva?: number;
            taxa_retencao?: number; // ✅ NOVO
        }>;
        motivo?: string;
    }): Promise<{ message: string; documento: DocumentoFiscal; data?: { documento: DocumentoFiscal } } | null> {
        try {
            const url = `/api/documentos-fiscais/${documentoId}/nota-debito`;
            const { data } = await api.post(url, payload);

            const respostaNormalizada = {
                message: data.message || 'Nota de Débito criada',
                documento: data.documento || data.data?.documento || data.data,
                data: data.data || data
            };

            return respostaNormalizada;
        } catch (err) {
            handleAxiosError(err, "[DOCUMENTO FISCAL SERVICE] Erro ao criar nota de débito");
            return null;
        }
    },

    async vincularAdiantamento(adiantamentoId: string, payload: {
        fatura_id: string;
        valor: number;
    }): Promise<{ message: string; data: { adiantamento: DocumentoFiscal; fatura: DocumentoFiscal } } | null> {
        try {
            const { data } = await api.post(`/api/documentos-fiscais/${adiantamentoId}/vincular`, payload);
            return data;
        } catch (err) {
            handleAxiosError(err, "[DOCUMENTO FISCAL SERVICE] Erro ao vincular adiantamento");
            return null;
        }
    },

    async cancelar(id: string, payload: {
        motivo: string;
    }): Promise<{ message: string; documento: DocumentoFiscal } | null> {
        try {
            const { data } = await api.post(`/api/documentos-fiscais/${id}/cancelar`, payload);
            return data;
        } catch (err) {
            handleAxiosError(err, "[DOCUMENTO FISCAL SERVICE] Erro ao cancelar documento");
            return null;
        }
    },

    async listarRecibos(documentoId: string): Promise<{ message: string; data: { recibos: DocumentoFiscal[] } } | null> {
        try {
            const { data } = await api.get(`/api/documentos-fiscais/${documentoId}/recibos`);
            return data;
        } catch (err) {
            handleAxiosError(err, "[DOCUMENTO FISCAL SERVICE] Erro ao listar recibos");
            return null;
        }
    },

    async adiantamentosPendentes(clienteId?: string, clienteNome?: string): Promise<{ message: string; data: { adiantamentos: DocumentoFiscal[] } } | null> {
        try {
            const params = new URLSearchParams();
            if (clienteId) params.append('cliente_id', clienteId);
            if (clienteNome) params.append('cliente_nome', clienteNome);

            const url = `/api/documentos-fiscais/adiantamentos-pendentes${params.toString() ? `?${params.toString()}` : ''}`;
            const { data } = await api.get(url);
            return data;
        } catch (err) {
            handleAxiosError(err, "[DOCUMENTO FISCAL SERVICE] Erro ao listar adiantamentos pendentes");
            return null;
        }
    },

    async proformasPendentes(clienteId?: string, clienteNome?: string): Promise<{ message: string; data: { proformas: DocumentoFiscal[] } } | null> {
        try {
            const params = new URLSearchParams();
            if (clienteId) params.append('cliente_id', clienteId);
            if (clienteNome) params.append('cliente_nome', clienteNome);

            const url = `/api/documentos-fiscais/proformas-pendentes${params.toString() ? `?${params.toString()}` : ''}`;
            const { data } = await api.get(url);
            return data;
        } catch (err) {
            handleAxiosError(err, "[DOCUMENTO FISCAL SERVICE] Erro ao listar proformas pendentes");
            return null;
        }
    },

    async alertas(): Promise<{
        message: string; data: {
            adiantamentos_vencidos: { total: number; items: DocumentoFiscal[] };
            faturas_com_adiantamentos_pendentes: { total: number; items: DocumentoFiscal[] };
            proformas_pendentes: { total: number; items: DocumentoFiscal[] };
            // ✅ NOVO
            servicos_com_retencao_proximos?: { total: number; items: DocumentoFiscal[] };
        }
    } | null> {
        try {
            const { data } = await api.get('/api/documentos-fiscais/alertas');
            return data;
        } catch (err) {
            handleAxiosError(err, "[DOCUMENTO FISCAL SERVICE] Erro ao obter alertas");
            return null;
        }
    },

    async processarExpirados(): Promise<{ message: string; expirados: number } | null> {
        try {
            const { data } = await api.post('/api/documentos-fiscais/processar-expirados');
            return data;
        } catch (err) {
            handleAxiosError(err, "[DOCUMENTO FISCAL SERVICE] Erro ao processar expirados");
            return null;
        }
    },

    async dashboard(): Promise<{
        message: string; data: {
            faturas_emitidas_mes: number;
            faturas_pendentes: number;
            total_pendente_cobranca: number;
            adiantamentos_pendentes: number;
            proformas_pendentes: number;
            documentos_cancelados_mes: number;
            total_vendas_mes: number;
            total_nao_vendas_mes: number;
            // ✅ NOVO
            total_retencao_mes?: number;
            documentos_com_retencao?: number;
        }
    } | null> {
        try {
            const { data } = await api.get('/api/documentos-fiscais/dashboard');
            return data;
        } catch (err) {
            handleAxiosError(err, "[DOCUMENTO FISCAL SERVICE] Erro ao obter dashboard");
            return null;
        }
    },
};

/* -------- Clientes -------- */
const API_PREFIX = "/api";

const noCacheConfig = {
    headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    }
};

export const clienteService = {
    async listar(params?: { status?: 'ativo' | 'inativo' | 'todos' }): Promise<Cliente[]> {
        console.log('[CLIENTE SERVICE] Listar clientes - Iniciando...');
        const timestamp = new Date().getTime();

        let url = `${API_PREFIX}/clientes?t=${timestamp}`;
        if (params?.status && params.status !== 'todos') {
            url += `&status=${params.status}`;
        }

        const response = await api.get(url, noCacheConfig);
        return response.data.clientes || [];
    },

    async listarAtivos(): Promise<Cliente[]> {
        return this.listar({ status: 'ativo' });
    },

    async listarTodos(): Promise<Cliente[]> {
        console.log('[CLIENTE SERVICE] Listar todos clientes - Iniciando...');
        const timestamp = new Date().getTime();
        const response = await api.get(`${API_PREFIX}/clientes/todos?t=${timestamp}`, noCacheConfig);
        return response.data.clientes || [];
    },

    async buscar(id: string): Promise<Cliente | null> {
        console.log('[CLIENTE SERVICE] Buscar cliente - ID:', id);
        const timestamp = new Date().getTime();
        try {
            const response = await api.get(`${API_PREFIX}/clientes/${id}?t=${timestamp}`, noCacheConfig);
            return response.data.cliente;
        } catch (err) {
            handleAxiosError(err, "[CLIENTE] Erro ao buscar cliente");
            return null;
        }
    },

    async criar(dados: CriarClienteInput): Promise<Cliente | null> {
        console.log('[CLIENTE SERVICE] Criar cliente - Dados:', dados);
        try {
            const response = await api.post(`${API_PREFIX}/clientes`, dados);
            return response.data.cliente;
        } catch (err) {
            handleAxiosError(err, "[CLIENTE] Erro ao criar cliente");
            return null;
        }
    },

    async atualizar(id: string, dados: AtualizarClienteInput): Promise<Cliente | null> {
        const url = `${API_PREFIX}/clientes/${id}`;
        try {
            const response = await api.put(url, dados);
            return response.data.cliente;
        } catch (err) {
            handleAxiosError(err, "[CLIENTE] Erro ao atualizar cliente");
            return null;
        }
    },

    async ativar(id: string): Promise<Cliente | null> {
        try {
            const response = await api.post(`${API_PREFIX}/clientes/${id}/ativar`);
            return response.data.cliente;
        } catch (err) {
            handleAxiosError(err, "[CLIENTE] Erro ao ativar cliente");
            return null;
        }
    },

    async inativar(id: string): Promise<Cliente | null> {
        try {
            const response = await api.post(`${API_PREFIX}/clientes/${id}/inativar`);
            return response.data.cliente;
        } catch (err) {
            handleAxiosError(err, "[CLIENTE] Erro ao inativar cliente");
            return null;
        }
    },

    async deletar(id: string): Promise<boolean> {
        try {
            await api.delete(`${API_PREFIX}/clientes/${id}`);
            return true;
        } catch (err) {
            handleAxiosError(err, "[CLIENTE] Erro ao deletar cliente");
            return false;
        }
    },

    async restaurar(id: string): Promise<Cliente | null> {
        try {
            const response = await api.post(`${API_PREFIX}/clientes/${id}/restore`);
            return response.data.cliente;
        } catch (err) {
            handleAxiosError(err, "[CLIENTE] Erro ao restaurar cliente");
            return null;
        }
    },

    async removerPermanentemente(id: string): Promise<boolean> {
        try {
            await api.delete(`${API_PREFIX}/clientes/${id}/force`);
            return true;
        } catch (err) {
            handleAxiosError(err, "[CLIENTE] Erro ao remover cliente permanentemente");
            return false;
        }
    }
};

/* -------- Utilitários de Cliente -------- */
export function formatarNIF(nif: string | null): string {
    if (!nif) return "-";
    if (nif.length === 14) {
        return `${nif.slice(0, 9)} ${nif.slice(9, 11)} ${nif.slice(11)}`;
    }
    return nif;
}

export function getTipoClienteLabel(tipo: TipoCliente): string {
    const labels: Record<TipoCliente, string> = {
        consumidor_final: "Consumidor Final",
        empresa: "Empresa",
    };
    return labels[tipo] || tipo;
}

export function getTipoClienteColor(tipo: TipoCliente): string {
    return tipo === "empresa" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700";
}

// ✅ NOVO: funções para status do cliente
export function getStatusClienteLabel(status: string): string {
    return status === 'ativo' ? 'Ativo' : 'Inativo';
}

export function getStatusClienteColor(status: string): string {
    return status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
}

/* -------- Fornecedores -------- */
export const fornecedorService = {
    listar: async (): Promise<Fornecedor[]> => {
        try {
            const { data } = await api.get<Fornecedor[]>("/api/fornecedores");
            return data;
        } catch (err) {
            handleAxiosError(err, "[FORNECEDOR] Erro ao listar fornecedores");
            return [];
        }
    },

    buscar: async (id: string): Promise<Fornecedor | null> => {
        try {
            const { data } = await api.get<Fornecedor>(`/api/fornecedores/${id}`);
            return data;
        } catch (err) {
            handleAxiosError(err, "[FORNECEDOR] Erro ao buscar fornecedor");
            return null;
        }
    },

    criar: async (payload: Omit<Fornecedor, "id">): Promise<Fornecedor | null> => {
        try {
            const { data } = await api.post<Fornecedor>("/api/fornecedores", payload);
            return data;
        } catch (err) {
            handleAxiosError(err, "[FORNECEDOR] Erro ao criar fornecedor");
            return null;
        }
    },

    atualizar: async (id: string, payload: Partial<Omit<Fornecedor, "id">>): Promise<Fornecedor | null> => {
        try {
            const { data } = await api.put<Fornecedor>(`/api/fornecedores/${id}`, payload);
            return data;
        } catch (err) {
            handleAxiosError(err, "[FORNECEDOR] Erro ao atualizar fornecedor");
            return null;
        }
    },

    deletar: async (id: string): Promise<boolean> => {
        try {
            await api.delete(`/api/fornecedores/${id}`);
            return true;
        } catch (err) {
            handleAxiosError(err, "[FORNECEDOR] Erro ao deletar fornecedor");
            return false;
        }
    }
};

/* -------- Produtos -------- */
export const produtoService = {
    async listar(params: ListarProdutosParams = {}): Promise<{ message: string; produtos: Produto[] | PaginatedResponse<Produto> }> {
        try {
            const queryParams = new URLSearchParams();

            if (params.tipo) queryParams.append("tipo", params.tipo);
            if (params.status) queryParams.append("status", params.status);
            if (params.categoria_id) queryParams.append("categoria_id", params.categoria_id);
            if (params.busca) queryParams.append("busca", params.busca);
            if (params.estoque_baixo) queryParams.append("estoque_baixo", "true");
            if (params.sem_estoque) queryParams.append("sem_estoque", "true");
            if (params.ordenar) queryParams.append("ordenar", params.ordenar);
            if (params.direcao) queryParams.append("direcao", params.direcao);
            if (params.paginar) queryParams.append("paginar", "true");
            if (params.per_page) queryParams.append("per_page", params.per_page.toString());
            if (params.apenas_servicos) queryParams.append("apenas_servicos", "true");
            if (params.apenas_produtos) queryParams.append("apenas_produtos", "true");
            if (params.com_retencao) queryParams.append("com_retencao", "true");

            const queryString = queryParams.toString();
            const url = `${API_PREFIX}/produtos${queryString ? `?${queryString}` : ""}`;

            const response = await api.get(url);
            return response.data;
        } catch (err) {
            handleAxiosError(err, "[PRODUTO] Erro ao listar produtos");
            return { message: "Erro", produtos: [] };
        }
    },

    async listarTodos(params: Omit<ListarProdutosParams, "with_trashed" | "status" | "estoque_baixo" | "sem_estoque"> = {}): Promise<{
        message: string;
        produtos: Produto[];
        total: number;
        ativos: number;
        deletados: number;
        produtos_fisicos: number;
        servicos: number;
    }> {
        try {
            const queryParams = new URLSearchParams();
            if (params.tipo) queryParams.append("tipo", params.tipo);
            if (params.busca) queryParams.append("busca", params.busca);

            const queryString = queryParams.toString();
            const url = `${API_PREFIX}/produtos/all${queryString ? `?${queryString}` : ""}`;

            const response = await api.get(url);
            return response.data;
        } catch (err) {
            handleAxiosError(err, "[PRODUTO] Erro ao listar todos produtos");
            return { message: "Erro", produtos: [], total: 0, ativos: 0, deletados: 0, produtos_fisicos: 0, servicos: 0 };
        }
    },

    async listarDeletados(params: Omit<ListarProdutosParams, "with_trashed" | "status" | "estoque_baixo" | "sem_estoque" | "categoria_id"> = {}): Promise<{
        message: string;
        produtos: Produto[] | PaginatedResponse<Produto>;
        total_deletados: number;
    }> {
        try {
            const queryParams = new URLSearchParams();
            if (params.busca) queryParams.append("busca", params.busca);
            if (params.paginar) queryParams.append("paginar", "true");
            if (params.per_page) queryParams.append("per_page", params.per_page.toString());

            const queryString = queryParams.toString();
            const url = `${API_PREFIX}/produtos/trashed${queryString ? `?${queryString}` : ""}`;

            const response = await api.get(url);
            return response.data;
        } catch (err) {
            handleAxiosError(err, "[PRODUTO] Erro ao listar produtos deletados");
            return { message: "Erro", produtos: [], total_deletados: 0 };
        }
    },

    async buscar(id: string): Promise<Produto | null> {
        try {
            const response = await api.get(`${API_PREFIX}/produtos/${id}`);
            return response.data.produto;
        } catch (err) {
            handleAxiosError(err, "[PRODUTO] Erro ao buscar produto");
            return null;
        }
    },

    async criar(dados: CriarProdutoInput): Promise<Produto | null> {
        try {
            console.log('[PRODUTO SERVICE] Criando item:', { tipo: dados.tipo, nome: dados.nome, retencao: dados.retencao });
            const response = await api.post(`${API_PREFIX}/produtos`, dados);
            return response.data.produto;
        } catch (err) {
            handleAxiosError(err, "[PRODUTO] Erro ao criar produto");
            return null;
        }
    },

    async atualizar(id: string, dados: AtualizarProdutoInput): Promise<Produto | null> {
        try {
            const response = await api.put(`${API_PREFIX}/produtos/${id}`, dados);
            return response.data.produto;
        } catch (err) {
            handleAxiosError(err, "[PRODUTO] Erro ao atualizar produto");
            return null;
        }
    },

    async alterarStatus(id: string, status: StatusProduto): Promise<Produto | null> {
        try {
            const response = await api.post(`${API_PREFIX}/produtos/${id}/status`, { status });
            return response.data.produto;
        } catch (err) {
            handleAxiosError(err, "[PRODUTO] Erro ao alterar status");
            return null;
        }
    },

    async moverParaLixeira(id: string): Promise<{ message: string; soft_deleted: boolean; id: string; deleted_at?: string } | null> {
        try {
            const response = await api.delete(`${API_PREFIX}/produtos/${id}`);
            return response.data;
        } catch (err) {
            handleAxiosError(err, "[PRODUTO] Erro ao mover para lixeira");
            return null;
        }
    },

    async restaurar(id: string): Promise<Produto | null> {
        try {
            const response = await api.post(`${API_PREFIX}/produtos/${id}/restore`);
            return response.data.produto;
        } catch (err) {
            handleAxiosError(err, "[PRODUTO] Erro ao restaurar produto");
            return null;
        }
    },

    async deletarPermanentemente(id: string): Promise<{ message: string; id: string } | null> {
        try {
            const response = await api.delete(`${API_PREFIX}/produtos/${id}/force`);
            return response.data;
        } catch (err) {
            handleAxiosError(err, "[PRODUTO] Erro ao deletar permanentemente");
            return null;
        }
    },

    async listarCategorias(params?: { tipo?: 'produto' | 'servico' }): Promise<Categoria[]> {
        try {
            let url = `${API_PREFIX}/categorias`;
            if (params?.tipo) {
                url += `?tipo=${params.tipo}`;
            }
            const response = await api.get(url);
            return response.data.categorias || [];
        } catch (err) {
            handleAxiosError(err, "[PRODUTO] Erro ao listar categorias");
            return [];
        }
    },

    async listarServicos(params: Omit<ListarProdutosParams, 'tipo'> = {}): Promise<{ message: string; produtos: Produto[] }> {
        return this.listar({ ...params, tipo: 'servico' }) as Promise<{ message: string; produtos: Produto[] }>;
    },

    async listarApenasProdutos(params: Omit<ListarProdutosParams, 'tipo'> = {}): Promise<{ message: string; produtos: Produto[] }> {
        return this.listar({ ...params, tipo: 'produto' }) as Promise<{ message: string; produtos: Produto[] }>;
    },

    async verificarStatus(id: string): Promise<{ existe: boolean; deletado: boolean; produto?: Produto }> {
        try {
            const produto = await this.buscar(id);
            return {
                existe: !!produto,
                deletado: !!produto?.deleted_at,
                produto: produto || undefined
            };
        } catch (error) {
            return { existe: false, deletado: false };
        }
    },

    listarPaginado: async (page = 1): Promise<Paginacao<Produto>> => {
        try {
            const { data } = await api.get<Paginacao<Produto>>(`/api/produtos?page=${page}`);
            return data;
        } catch (err) {
            handleAxiosError(err, "[PRODUTO] Erro ao listar produtos paginados");
            return { data: [], current_page: 1, last_page: 1, per_page: 0, total: 0 };
        }
    },

    deletar: async (id: string): Promise<boolean> => {
        try {
            await api.delete(`/api/produtos/${id}`);
            return true;
        } catch (err) {
            handleAxiosError(err, "[PRODUTO] Erro ao deletar produto");
            return false;
        }
    }
};

/* -------- Utilitários de Produto -------- */
export function formatarPreco(valor: number): string {
    return valor.toLocaleString("pt-PT", {
        style: "currency",
        currency: "AOA",
        minimumFractionDigits: 2,
    }).replace('AOA', 'Kz').trim();
}

export function calcularMargemLucro(precoCompra: number, precoVenda: number): number {
    if (!precoCompra || precoCompra <= 0) return 0;
    return ((precoVenda - precoCompra) / precoCompra) * 100;
}

export function calcularValorEstoque(produto: Produto): number {
    return produto.estoque_atual * (produto.custo_medio || produto.preco_compra || 0);
}

export function estaEstoqueBaixo(produto: Produto): boolean {
    return produto.estoque_atual > 0 && produto.estoque_atual <= produto.estoque_minimo;
}

export function estaSemEstoque(produto: Produto): boolean {
    return produto.estoque_atual === 0;
}

export function formatarData(data: string | null): string {
    if (!data) return "-";
    try {
        return new Date(data).toLocaleDateString("pt-PT");
    } catch {
        return data;
    }
}

export function formatarDataHora(data: string | null): string {
    if (!data) return "-";
    try {
        return new Date(data).toLocaleString("pt-PT");
    } catch {
        return data;
    }
}

export function estaNaLixeira(produto: Produto): boolean {
    return !!produto.deleted_at;
}

export function isServico(produto: Produto): boolean {
    return produto.tipo === "servico";
}

export function isProduto(produto: Produto): boolean {
    return produto.tipo === "produto";
}

// ✅ NOVO: calcular retenção
export function calcularRetencao(produto: Produto, quantidade = 1): number {
    if (!isServico(produto) || !produto.retencao) return 0;
    return (produto.preco_venda * quantidade * produto.retencao) / 100;
}

// ✅ NOVO: calcular preço líquido após retenção
export function calcularPrecoLiquido(produto: Produto, quantidade = 1): number {
    const total = produto.preco_venda * quantidade;
    if (!isServico(produto) || !produto.retencao) return total;
    return total - (total * produto.retencao) / 100;
}

export function getStatusBadge(produto: Produto): { texto: string; cor: string } {
    if (produto.deleted_at) {
        return { texto: "Na Lixeira", cor: "bg-red-100 text-red-800" };
    }
    if (produto.status === "inativo") {
        return { texto: "Inativo", cor: "bg-gray-100 text-gray-800" };
    }
    return { texto: "Ativo", cor: "bg-green-100 text-green-800" };
}

export function getTipoBadge(tipo: TipoProduto): { texto: string; cor: string } {
    if (tipo === "servico") {
        return { texto: "Serviço", cor: "bg-blue-100 text-blue-800" };
    }
    return { texto: "Produto", cor: "bg-purple-100 text-purple-800" };
}

export function getRetencaoBadge(retencao?: number): { texto: string; cor: string } | null {
    if (!retencao) return null;
    return {
        texto: `Retenção ${retencao}%`,
        cor: "bg-orange-100 text-orange-800"
    };
}

export function formatarUnidadeMedida(unidade: UnidadeMedida | undefined): string {
    if (!unidade) return "-";
    const map: Record<UnidadeMedida, string> = {
        hora: "Hora(s)",
        dia: "Dia(s)",
        semana: "Semana(s)",
        mes: "Mês(es)",
    };
    return map[unidade] || unidade;
}

/* -------- Categorias -------- */
export const categoriaService = {
    listar: async (params?: { tipo?: 'produto' | 'servico' }): Promise<Categoria[]> => {
        try {
            let url = "/api/categorias";
            if (params?.tipo) {
                url += `?tipo=${params.tipo}`;
            }
            const { data } = await api.get<Categoria[]>(url);
            return data;
        } catch (err) {
            handleAxiosError(err, "[CATEGORIA] Erro ao listar categorias");
            return [];
        }
    },

    criar: async (payload: CategoriaPayload): Promise<Categoria | null> => {
        try {
            const { data } = await api.post<Categoria>("/api/categorias", payload);
            return data;
        } catch (err) {
            handleAxiosError(err, "[CATEGORIA] Erro ao criar categoria");
            return null;
        }
    },

    atualizar: async (id: string, payload: Partial<CategoriaPayload>): Promise<Categoria | null> => {
        try {
            const { data } = await api.put<Categoria>(`/api/categorias/${id}`, payload);
            return data;
        } catch (err) {
            handleAxiosError(err, "[CATEGORIA] Erro ao atualizar categoria");
            return null;
        }
    },

    deletar: async (id: string): Promise<boolean> => {
        try {
            await api.delete(`/api/categorias/${id}`);
            return true;
        } catch (err) {
            handleAxiosError(err, "[CATEGORIA] Erro ao deletar categoria");
            return false;
        }
    },

    buscar: async (id: string): Promise<Categoria | null> => {
        try {
            const { data } = await api.get<Categoria>(`/api/categorias/${id}`);
            return data;
        } catch (err) {
            handleAxiosError(err, "[CATEGORIA] Erro ao buscar categoria");
            return null;
        }
    }
};

/* -------- Movimentos de Stock -------- */
export const stockService = {
    async listar(params: {
        produto_id?: string;
        tipo?: "entrada" | "saida";
        tipo_movimento?: string;
        data_inicio?: string;
        data_fim?: string;
        paginar?: boolean;
        per_page?: number;
    } = {}): Promise<MovimentoStock[]> {
        try {
            const queryParams = new URLSearchParams();

            if (params.produto_id) queryParams.append("produto_id", params.produto_id);
            if (params.tipo) queryParams.append("tipo", params.tipo);
            if (params.tipo_movimento) queryParams.append("tipo_movimento", params.tipo_movimento);
            if (params.data_inicio) queryParams.append("data_inicio", params.data_inicio);
            if (params.data_fim) queryParams.append("data_fim", params.data_fim);
            if (params.paginar) queryParams.append("paginar", "true");
            if (params.per_page) queryParams.append("per_page", params.per_page.toString());

            const queryString = queryParams.toString();
            const url = `${API_PREFIX}/movimentos-stock${queryString ? `?${queryString}` : ""}`;

            const response = await api.get(url);
            return response.data.movimentos || [];
        } catch (err) {
            handleAxiosError(err, "[STOCK] Erro ao listar movimentos");
            return [];
        }
    },

    async resumo(): Promise<{
        totalProdutos: number;
        produtosAtivos: number;
        produtosEstoqueBaixo: number;
        produtosSemEstoque: number;
        valorTotalEstoque: number;
        movimentacoesHoje: number;
        entradasHoje: number;
        saidasHoje: number;
        produtos_criticos: Produto[];
    }> {
        try {
            const response = await api.get(`${API_PREFIX}/movimentos-stock/resumo`);
            return response.data;
        } catch (err) {
            handleAxiosError(err, "[STOCK] Erro ao obter resumo");
            return {
                totalProdutos: 0,
                produtosAtivos: 0,
                produtosEstoqueBaixo: 0,
                produtosSemEstoque: 0,
                valorTotalEstoque: 0,
                movimentacoesHoje: 0,
                entradasHoje: 0,
                saidasHoje: 0,
                produtos_criticos: []
            };
        }
    },

    async historicoProduto(produtoId: string, page = 1): Promise<{
        message: string;
        produto: { id: string; nome: string; estoque_atual: number };
        movimentos: PaginatedResponse<MovimentoStock>;
    }> {
        try {
            const response = await api.get(`${API_PREFIX}/movimentos-stock/produto/${produtoId}?page=${page}`);
            return response.data;
        } catch (err) {
            handleAxiosError(err, "[STOCK] Erro ao obter histórico");
            return {
                message: "Erro",
                produto: { id: produtoId, nome: "", estoque_atual: 0 },
                movimentos: { data: [], current_page: 1, last_page: 1, per_page: 20, total: 0 }
            };
        }
    },

    async criar(payload: CriarMovimentoPayload): Promise<MovimentoStock | null> {
        try {
            const response = await api.post(`${API_PREFIX}/movimentos-stock`, {
                produto_id: payload.produto_id,
                tipo: payload.tipo,
                tipo_movimento: payload.tipo_movimento || "ajuste",
                quantidade: Math.abs(payload.quantidade),
                motivo: payload.observacao || payload.motivo,
                referencia: payload.referencia,
                custo_unitario: payload.custo_unitario,
            });
            return response.data.movimento;
        } catch (err) {
            handleAxiosError(err, "[STOCK] Erro ao criar movimento");
            return null;
        }
    },

    async ajuste(produto_id: string, quantidade: number, motivo: string, custo_medio?: number): Promise<{
        message: string;
        movimento?: MovimentoStock;
        ajuste: {
            anterior: number;
            novo: number;
            diferenca: number;
        };
    } | null> {
        try {
            const response = await api.post(`${API_PREFIX}/movimentos-stock/ajuste`, {
                produto_id,
                quantidade,
                motivo,
                custo_medio,
            });
            return response.data;
        } catch (err) {
            handleAxiosError(err, "[STOCK] Erro ao realizar ajuste");
            return null;
        }
    },

    async transferencia(produto_origem_id: string, produto_destino_id: string, quantidade: number, motivo: string): Promise<{
        message: string;
        transferencia: {
            origem: { id: string; nome: string; estoque_anterior: number; estoque_novo: number };
            destino: { id: string; nome: string; estoque_anterior: number; estoque_novo: number };
            quantidade: number;
        };
    } | null> {
        try {
            const response = await api.post(`${API_PREFIX}/movimentos-stock/transferencia`, {
                produto_origem_id,
                produto_destino_id,
                quantidade,
                motivo,
            });
            return response.data;
        } catch (err) {
            handleAxiosError(err, "[STOCK] Erro ao realizar transferência");
            return null;
        }
    },

    async obter(id: string): Promise<MovimentoStock | null> {
        try {
            const response = await api.get(`${API_PREFIX}/movimentos-stock/${id}`);
            return response.data.movimento;
        } catch (err) {
            handleAxiosError(err, "[STOCK] Erro ao obter movimento");
            return null;
        }
    },

    async estatisticas(params: {
        data_inicio?: string;
        data_fim?: string;
        produto_id?: string;
    } = {}): Promise<{
        total_movimentos: number;
        total_entradas: number;
        total_saidas: number;
        por_tipo: Array<{ tipo_movimento: string; total: number }>;
        por_mes: Array<{ mes: string; entradas: number; saidas: number }>;
    } | null> {
        try {
            const queryParams = new URLSearchParams();
            if (params.data_inicio) queryParams.append("data_inicio", params.data_inicio);
            if (params.data_fim) queryParams.append("data_fim", params.data_fim);
            if (params.produto_id) queryParams.append("produto_id", params.produto_id);

            const queryString = queryParams.toString();
            const url = `${API_PREFIX}/movimentos-stock/estatisticas${queryString ? `?${queryString}` : ""}`;

            const response = await api.get(url);
            return response.data.estatisticas;
        } catch (err) {
            handleAxiosError(err, "[STOCK] Erro ao obter estatísticas");
            return null;
        }
    },

    async verificarDisponibilidade(produto_id: string, quantidade: number): Promise<{
        disponivel: boolean;
        estoque_atual: number;
        mensagem?: string;
    }> {
        try {
            const produto = await produtoService.buscar(produto_id);
            if (!produto) throw new Error("Produto não encontrado");

            if (isServico(produto)) {
                return {
                    disponivel: true,
                    estoque_atual: 0,
                    mensagem: "Serviço não possui controle de estoque"
                };
            }

            const disponivel = (produto.estoque_atual || 0) >= quantidade;

            return {
                disponivel,
                estoque_atual: produto.estoque_atual || 0,
                mensagem: disponivel ? undefined : `Estoque insuficiente. Disponível: ${produto.estoque_atual || 0}`
            };
        } catch (err) {
            handleAxiosError(err, "[STOCK] Erro ao verificar disponibilidade");
            throw err;
        }
    },

    atualizar: async (id: string, payload: Partial<CriarMovimentoPayload>): Promise<MovimentoStock | null> => {
        try {
            const { data } = await api.put<MovimentoStock>(`/api/movimentos-stock/${id}`, payload);
            return data;
        } catch (err) {
            handleAxiosError(err, "[STOCK] Erro ao atualizar movimento");
            return null;
        }
    },

    deletar: async (id: string): Promise<boolean> => {
        try {
            await api.delete(`/api/movimentos-stock/${id}`);
            return true;
        } catch (err) {
            handleAxiosError(err, "[STOCK] Erro ao deletar movimento");
            return false;
        }
    },

    calcularStock: async (produto_id: string): Promise<number> => {
        try {
            const movimentos = await stockService.listar({ produto_id });
            const entradas = movimentos
                .filter(m => m.tipo === "entrada")
                .reduce((sum, m) => sum + m.quantidade, 0);
            const saidas = movimentos
                .filter(m => m.tipo === "saida")
                .reduce((sum, m) => sum + Math.abs(m.quantidade), 0);
            return entradas - saidas;
        } catch (err) {
            handleAxiosError(err, "[STOCK] Erro ao calcular stock");
            return 0;
        }
    }
};

/* -------- Dashboard (mesclado com dashboard.ts) -------- */
export const dashboardService = {
    async fetch(): Promise<DashboardResponse | null> {
        try {
            const { data } = await api.get<{
                success: boolean;
                message: string;
                data: DashboardResponse;
            }>("/api/dashboard");
            return data.data;
        } catch (err) {
            handleAxiosError(err, "[DASHBOARD] Erro ao carregar dashboard");
            return null;
        }
    },

    async resumoDocumentosFiscais(): Promise<ResumoDocumentosFiscais | null> {
        try {
            const { data } = await api.get<{
                success: boolean;
                message: string;
                data: {
                    resumo: ResumoDocumentosFiscais;
                };
            }>("/api/dashboard/resumo-documentos-fiscais");
            return data.data.resumo;
        } catch (err) {
            handleAxiosError(err, "[DASHBOARD] Erro ao obter resumo de documentos fiscais");
            return null;
        }
    },

    async estatisticasPagamentos(): Promise<EstatisticasPagamentos | null> {
        try {
            const { data } = await api.get<{
                success: boolean;
                message: string;
                data: {
                    estatisticas: EstatisticasPagamentos;
                };
            }>("/api/dashboard/estatisticas-pagamentos");
            return data.data.estatisticas;
        } catch (err) {
            handleAxiosError(err, "[DASHBOARD] Erro ao obter estatísticas de pagamentos");
            return null;
        }
    },

    async alertasPendentes(): Promise<AlertasPendentes | null> {
        try {
            const { data } = await api.get<{
                success: boolean;
                message: string;
                data: {
                    alertas: AlertasPendentes;
                };
            }>("/api/dashboard/alertas");
            return data.data.alertas;
        } catch (err) {
            handleAxiosError(err, "[DASHBOARD] Erro ao obter alertas pendentes");
            return null;
        }
    },

    async evolucaoMensal(ano?: number): Promise<EvolucaoMensal | null> {
        try {
            const params = ano ? `?ano=${ano}` : '';
            const { data } = await api.get<{
                success: boolean;
                message: string;
                data: {
                    ano: number;
                    evolucao: EvolucaoMensal;
                };
            }>(`/api/dashboard/evolucao-mensal${params}`);
            return data.data.evolucao;
        } catch (err) {
            handleAxiosError(err, "[DASHBOARD] Erro ao obter evolução mensal");
            return null;
        }
    },
};

/* -------- Relatórios -------- */
export const relatorioService = {
    async documentosFiscais(params?: {
        data_inicio?: string;
        data_fim?: string;
        tipo?: TipoDocumentoFiscal;
        cliente_id?: string;
        cliente_nome?: string;
        com_retencao?: boolean;
    }): Promise<{ message: string; data: { documentos: DocumentoFiscal[] } } | null> {
        try {
            const queryParams = new URLSearchParams();
            if (params?.data_inicio) queryParams.append('data_inicio', params.data_inicio);
            if (params?.data_fim) queryParams.append('data_fim', params.data_fim);
            if (params?.tipo) queryParams.append('tipo', params.tipo);
            if (params?.cliente_id) queryParams.append('cliente_id', params.cliente_id);
            if (params?.cliente_nome) queryParams.append('cliente_nome', params.cliente_nome);
            if (params?.com_retencao) queryParams.append('com_retencao', 'true');

            const queryString = queryParams.toString();
            const url = `/api/relatorios/documentos-fiscais${queryString ? `?${queryString}` : ''}`;

            const { data } = await api.get(url);
            return data;
        } catch (err) {
            handleAxiosError(err, "[RELATÓRIO] Erro ao obter relatório de documentos fiscais");
            return null;
        }
    },

    async pagamentosPendentes(): Promise<{ message: string; data: EstatisticasPagamentos } | null> {
        try {
            const { data } = await api.get('/api/relatorios/pagamentos-pendentes');
            return data;
        } catch (err) {
            handleAxiosError(err, "[RELATÓRIO] Erro ao obter relatório de pagamentos pendentes");
            return null;
        }
    },

    async vendas(params?: {
        data_inicio?: string;
        data_fim?: string;
        apenas_vendas?: boolean; // FT, FR, RC
        tipo_item?: 'produto' | 'servico';
        com_retencao?: boolean;
    }): Promise<{ message: string; data: { vendas: Venda[] } } | null> {
        try {
            const queryParams = new URLSearchParams();
            if (params?.data_inicio) queryParams.append('data_inicio', params.data_inicio);
            if (params?.data_fim) queryParams.append('data_fim', params.data_fim);
            if (params?.apenas_vendas) queryParams.append('apenas_vendas', 'true');
            if (params?.tipo_item) queryParams.append('tipo_item', params.tipo_item);
            if (params?.com_retencao) queryParams.append('com_retencao', 'true');

            const queryString = queryParams.toString();
            const url = `/api/relatorios/vendas${queryString ? `?${queryString}` : ''}`;

            const { data } = await api.get(url);
            
            // ✅ Normalizar vendas
            if (data.data?.vendas) {
                data.data.vendas = data.data.vendas.map((venda: Venda) => 
                    vendaService.normalizarVenda(venda)
                );
            }
            
            return data;
        } catch (err) {
            handleAxiosError(err, "[RELATÓRIO] Erro ao obter relatório de vendas");
            return null;
        }
    },

    async compras(params?: {
        data_inicio?: string;
        data_fim?: string;
    }): Promise<{ message: string; data: { compras: Compra[] } } | null> {
        try {
            const queryParams = new URLSearchParams();
            if (params?.data_inicio) queryParams.append('data_inicio', params.data_inicio);
            if (params?.data_fim) queryParams.append('data_fim', params.data_fim);

            const queryString = queryParams.toString();
            const url = `/api/relatorios/compras${queryString ? `?${queryString}` : ''}`;

            const { data } = await api.get(url);
            return data;
        } catch (err) {
            handleAxiosError(err, "[RELATÓRIO] Erro ao obter relatório de compras");
            return null;
        }
    },

    async stock(): Promise<{ message: string; data: { produtos: Produto[] } } | null> {
        try {
            const { data } = await api.get('/api/relatorios/stock');
            return data;
        } catch (err) {
            handleAxiosError(err, "[RELATÓRIO] Erro ao obter relatório de stock");
            return null;
        }
    },

    async proformas(params?: {
        data_inicio?: string;
        data_fim?: string;
        cliente_id?: string;
        pendentes?: boolean;
    }): Promise<{ message: string; data: { documentos: DocumentoFiscal[] } } | null> {
        try {
            const queryParams = new URLSearchParams();
            if (params?.data_inicio) queryParams.append('data_inicio', params.data_inicio);
            if (params?.data_fim) queryParams.append('data_fim', params.data_fim);
            if (params?.cliente_id) queryParams.append('cliente_id', params.cliente_id);
            if (params?.pendentes) queryParams.append('pendentes', 'true');

            const queryString = queryParams.toString();
            const url = `/api/relatorios/proformas${queryString ? `?${queryString}` : ''}`;

            const { data } = await api.get(url);
            return data;
        } catch (err) {
            handleAxiosError(err, "[RELATÓRIO] Erro ao obter relatório de proformas");
            return null;
        }
    },

    // ✅ NOVOS RELATÓRIOS
    async servicos(params?: {
        data_inicio?: string;
        data_fim?: string;
        apenas_ativos?: boolean;
    }): Promise<{ message: string; data: any } | null> {
        try {
            const queryParams = new URLSearchParams();
            if (params?.data_inicio) queryParams.append('data_inicio', params.data_inicio);
            if (params?.data_fim) queryParams.append('data_fim', params.data_fim);
            if (params?.apenas_ativos) queryParams.append('apenas_ativos', 'true');

            const queryString = queryParams.toString();
            const url = `/api/relatorios/servicos${queryString ? `?${queryString}` : ''}`;

            const { data } = await api.get(url);
            return data;
        } catch (err) {
            handleAxiosError(err, "[RELATÓRIO] Erro ao obter relatório de serviços");
            return null;
        }
    },

    async retencoes(params?: {
        data_inicio?: string;
        data_fim?: string;
        cliente_id?: string;
    }): Promise<{ message: string; data: any } | null> {
        try {
            const queryParams = new URLSearchParams();
            if (params?.data_inicio) queryParams.append('data_inicio', params.data_inicio);
            if (params?.data_fim) queryParams.append('data_fim', params.data_fim);
            if (params?.cliente_id) queryParams.append('cliente_id', params.cliente_id);

            const queryString = queryParams.toString();
            const url = `/api/relatorios/retencoes${queryString ? `?${queryString}` : ''}`;

            const { data } = await api.get(url);
            return data;
        } catch (err) {
            handleAxiosError(err, "[RELATÓRIO] Erro ao obter relatório de retenções");
            return null;
        }
    },
};

/* -------- Exportações legadas (para compatibilidade) -------- */
export async function obterDadosNovaVenda(): Promise<{
    clientes: Cliente[];
    produtos: Produto[];
}> {
    return vendaService.obterDadosNovaVenda();
}

export async function criarVenda(payload: CriarVendaPayload) {
    return vendaService.criar(payload);
}

// NOVA FUNÇÃO: Criar documento fiscal (FP, FT, FR, etc)
export async function emitirDocumentoFiscal(payload: CriarDocumentoFiscalPayload) {
    return documentoFiscalService.emitir(payload);
}

// Funções utilitárias para documentos fiscais
export function getNomeTipoDocumento(tipo: TipoDocumentoFiscal): string {
    return NOMES_TIPO_DOCUMENTO[tipo] || tipo;
}

export function getEstadoPagamentoColor(estado: EstadoPagamentoVenda): string {
    const colors: Record<EstadoPagamentoVenda, string> = {
        paga: 'bg-green-100 text-green-800',
        pendente: 'bg-yellow-100 text-yellow-800',
        parcial: 'bg-blue-100 text-blue-800',
        cancelada: 'bg-red-100 text-red-800',
    };
    return colors[estado] || 'bg-gray-100 text-gray-800';
}

export function getEstadoDocumentoColor(estado: EstadoDocumentoFiscal): string {
    const colors: Record<EstadoDocumentoFiscal, string> = {
        emitido: 'bg-blue-100 text-blue-800',
        paga: 'bg-green-100 text-green-800',
        parcialmente_paga: 'bg-teal-100 text-teal-800',
        cancelado: 'bg-red-100 text-red-800',
        expirado: 'bg-gray-100 text-gray-800',
    };
    return colors[estado] || 'bg-gray-100 text-gray-800';
}

export function getTipoDocumentoColor(tipo: TipoDocumentoFiscal): string {
    const colors: Partial<Record<TipoDocumentoFiscal, string>> = {
        FT: 'bg-blue-100 text-blue-800',
        FR: 'bg-green-100 text-green-800',
        FP: 'bg-orange-100 text-orange-800',
        FA: 'bg-purple-100 text-purple-800',
        NC: 'bg-red-100 text-red-800',
        ND: 'bg-amber-100 text-amber-800',
        RC: 'bg-teal-100 text-teal-800',
        FRt: 'bg-pink-100 text-pink-800',
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800';
}

export function podeGerarNaVenda(tipo: TipoDocumentoFiscal): boolean {
    return TIPOS_DOCUMENTO_VENDA.includes(tipo);
}

export function ehVenda(tipo: TipoDocumentoFiscal): boolean {
    return TIPOS_VENDA.includes(tipo);
}

export function getMetodoPagamentoNome(metodo?: string): string {
    const nomes: Record<string, string> = {
        transferencia: 'Transferência Bancária',
        multibanco: 'Multibanco',
        dinheiro: 'Dinheiro',
        cartao: 'Cartão',
        cheque: 'Cheque',
    };
    return nomes[metodo || ''] || 'Não especificado';
}

// Função helper para validar payload de venda
export function validarPayloadVenda(payload: CriarVendaPayload): string | null {
    // Validar cliente
    if (!payload.cliente_id && !payload.cliente_nome) {
        return 'É necessário informar um cliente (selecionado ou avulso)';
    }

    // Validações específicas por tipo
    if (payload.tipo_documento === 'FR') {
        if (!payload.dados_pagamento) {
            return 'Fatura-Recibo requer dados de pagamento';
        }
        if (!payload.dados_pagamento.metodo) {
            return 'Método de pagamento é obrigatório para Fatura-Recibo';
        }
        if (!payload.dados_pagamento.valor || payload.dados_pagamento.valor <= 0) {
            return 'Valor de pagamento deve ser maior que zero';
        }
    }

    return null;
}

/* ================== EXPORTAÇÕES LEGADAS DO DASHBOARD ================== */

export async function obterDashboard(): Promise<DashboardData | null> {
    return dashboardService.fetch();
}

export async function obterResumoDocumentosFiscais(): Promise<ResumoDocumentosFiscais | null> {
    return dashboardService.resumoDocumentosFiscais();
}

export async function obterEstatisticasPagamentos(): Promise<EstatisticasPagamentos | null> {
    return dashboardService.estatisticasPagamentos();
}

export async function obterAlertasPendentes(): Promise<AlertasPendentes | null> {
    return dashboardService.alertasPendentes();
}

export async function obterEvolucaoMensal(ano?: number): Promise<EvolucaoMensal | null> {
    return dashboardService.evolucaoMensal(ano);
}

// eslint-disable-next-line import/no-anonymous-default-export
export default {
    vendaService,
    documentoFiscalService,
    clienteService,
    fornecedorService,
    produtoService,
    categoriaService,
    stockService,
    dashboardService,
    relatorioService,
};