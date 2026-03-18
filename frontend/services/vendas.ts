import api from "./axios";
import { AxiosError } from "axios";

/* ================== HELPERS ================== */
function handleAxiosError(err: unknown, prefix: string): void {
    if (err instanceof AxiosError) {
        const msg = err.response?.data?.message || err.message || "Erro desconhecido";
        console.error(`${prefix}:`, msg);
    } else {
        console.error(`${prefix}:`, err);
    }
}

/* ================== TIPOS BASE ================== */

export interface Paginacao<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
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

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'operador' | 'contabilista';
    ativo: boolean;
    ultimo_login?: string | null;
}

export type TipoDocumentoFiscal =
    | 'FT' | 'FR' | 'FP' | 'RC'
    | 'NC' | 'ND' | 'FA' | 'FRt';

export const NOMES_TIPO_DOCUMENTO: Record<TipoDocumentoFiscal, string> = {
    FT: 'Fatura', FR: 'Fatura-Recibo', FP: 'Fatura Proforma',
    RC: 'Recibo', NC: 'Nota de Crédito', ND: 'Nota de Débito',
    FA: 'Fatura de Adiantamento', FRt: 'Fatura de Retificação',
};

export const TIPOS_DOCUMENTO_VENDA: TipoDocumentoFiscal[] = ['FT', 'FR', 'FP'];
export const TIPOS_VENDA: TipoDocumentoFiscal[] = ['FT', 'FR', 'RC'];

export type EstadoDocumentoFiscal = 'emitido' | 'paga' | 'parcialmente_paga' | 'cancelado' | 'expirado';
export type EstadoPagamentoVenda  = 'paga' | 'pendente' | 'parcial' | 'cancelada';
export type TipoProduto   = "produto" | "servico";
export type StatusProduto = "ativo" | "inativo";
export type UnidadeMedida = "hora" | "dia" | "semana" | "mes";
export type TipoCliente   = "consumidor_final" | "empresa";

/* ================== INTERFACES DE ENTIDADES ================== */

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

export interface Cliente {
    id: string;
    nome: string;
    nif: string | null;
    tipo: TipoCliente;
    status?: 'ativo' | 'inativo';
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
    status?: 'ativo' | 'inativo';
    telefone?: string;
    email?: string;
    endereco?: string;
    data_registro?: string;
}

export type AtualizarClienteInput = Partial<CriarClienteInput>;

// venda_cancelada adicionado — alinhado com VendaService::cancelarVenda() PHP
export interface MovimentoStock {
    id: string;
    produto_id: string;
    user_id: string;
    tipo: 'entrada' | 'saida';
    tipo_movimento: 'compra' | 'venda' | 'venda_cancelada' | 'ajuste' | 'nota_credito' | 'devolucao';
    quantidade: number;
    custo_medio?: number;
    stock_minimo?: number;
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
    referencia?: string;
    observacao?: string;
    motivo?: string;
    custo_unitario?: number;
}

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
    // Campos exclusivos de SERVIÇOS
    // Renomeado de 'retencao' para 'taxa_retencao' — alinhado com Model e ProdutoService PHP
    taxa_retencao?: number | null;
    duracao_estimada?: string;
    unidade_medida?: UnidadeMedida;
    deleted_at?: string | null;
    created_at?: string;
    updated_at?: string;
    movimentosStock?: MovimentoStock[];
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
    // Serviços — taxa_retencao (renomeado de retencao)
    taxa_retencao?: number;
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
    apenas_servicos?: boolean;
    apenas_produtos?: boolean;
    com_retencao?: boolean;
}

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

export interface DocumentoFiscal {
    id: string;
    user_id: string;
    venda_id?: string | null;
    cliente_id?: string | null;
    cliente?: Cliente;
    cliente_nome?: string;
    cliente_nif?: string;
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
    total_retencao: number;
    total_liquido: number;
    estado: EstadoDocumentoFiscal;
    motivo?: string | null;
    motivo_cancelamento?: string | null;
    hash_fiscal?: string | null;
    referencia_externa?: string | null;
    metodo_pagamento?: 'transferencia' | 'multibanco' | 'dinheiro' | 'cheque' | 'cartao' | null;
    referencia_pagamento?: string | null;
    itens?: ItemDocumentoFiscal[];
    recibos?: DocumentoFiscal[];
    notas_credito?: DocumentoFiscal[];
    notas_debito?: DocumentoFiscal[];
    adiantamentos_vinculados?: DocumentoFiscal[];
    faturas_vinculadas?: DocumentoFiscal[];
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

export interface ItemVenda {
    id: string;
    produto_id: string;
    produto: { id: string; nome: string; codigo?: string; tipo: TipoProduto } | null;
    descricao: string;
    quantidade: number;
    preco_venda: number;
    desconto: number;
    base_tributavel: number;
    valor_iva: number;
    valor_retencao: number;
    taxa_retencao?: number;
    subtotal: number;
    subtotal_liquido: number;
    eh_servico: boolean;
    codigo_produto?: string;
    unidade?: string;
}

export interface TotaisPorTipo {
    produtos: { quantidade: number; total: number };
    servicos: { quantidade: number; total: number; retencao: number };
}

export interface Venda {
    id: string;
    // Número interno VD-XXXXXX — NÃO é o número fiscal
    numero: string;
    numero_documento?: string;
    tipo_documento: TipoDocumentoFiscal | 'venda';
    tipo_documento_nome: string;
    tipo_documento_fiscal?: TipoDocumentoFiscal;
    cliente_id?: string | null;
    cliente?: Cliente | null;
    cliente_nome?: string | null;
    cliente_nif?: string | null;
    user_id: string;
    user?: User;
    data_venda: string;
    hora_venda: string;
    created_at?: string;
    total: number;
    base_tributavel: number;
    total_iva: number;
    total_retencao: number;
    total_retencao_servicos: number;
    tem_servicos: boolean;
    quantidade_servicos: number;
    status: 'aberta' | 'faturada' | 'cancelada';
    estado_pagamento: EstadoPagamentoVenda;
    faturado: boolean;
    eh_venda: boolean;
    paga: boolean;
    documento_fiscal?: DocumentoFiscal | null;
    itens?: ItemVenda[];
    totais_por_tipo?: TotaisPorTipo;
    observacoes?: string;
    pode_receber_pagamento?: boolean;
    pode_ser_cancelada?: boolean;
    valor_pendente?: number;
    valor_pago?: number;
    deleted_at?: string;
}

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

/* ================== PAYLOADS ================== */

export interface CriarItemVendaPayload {
    produto_id: string;
    quantidade: number;
    preco_venda: number;
    desconto?: number;
    taxa_retencao?: number;
}

export interface DadosPagamento {
    metodo: 'transferencia' | 'multibanco' | 'dinheiro' | 'cheque' | 'cartao';
    valor: number;
    referencia?: string;
    data?: string;
}

export interface CriarVendaPayload {
    cliente_id?: string | null;
    cliente_nome?: string;
    cliente_nif?: string;
    tipo_documento?: TipoDocumentoFiscal;
    faturar?: boolean;
    itens: CriarItemVendaPayload[];
    dados_pagamento?: DadosPagamento;
    observacoes?: string;
}

export interface CriarDocumentoFiscalPayload {
    tipo_documento: TipoDocumentoFiscal;
    venda_id?: string;
    cliente_id?: string | null;
    cliente_nome?: string;
    cliente_nif?: string;
    fatura_id?: string;
    itens: Array<{
        produto_id?: string;
        descricao: string;
        quantidade: number;
        preco_unitario: number;
        desconto?: number;
        taxa_iva?: number;
        taxa_retencao?: number;
    }>;
    dados_pagamento?: DadosPagamento;
    motivo?: string;
    data_vencimento?: string;
    referencia_externa?: string;
}

/* ================== TIPOS DE DASHBOARD ================== */

export interface DashboardData {
    user: User;
    kpis: {
        ticketMedio: number; crescimentoPercentual: number; ivaArrecadado: number;
        totalFaturado: number; totalNotasCredito: number; totalLiquido: number;
        totalRetencao?: number; totalRetencaoMes?: number;
    };
    produtos: { total: number; ativos: number; inativos: number; stock_baixo: number };
    servicos?: { total: number; ativos: number; inativos: number; precoMedio: number; comRetencao: number };
    vendas: {
        total: number; abertas: number; faturadas: number; canceladas: number;
        ultimas: Array<{
            id: string; cliente: string; total: number; status: string;
            estado_pagamento: EstadoPagamentoVenda;
            documento_fiscal?: { tipo: TipoDocumentoFiscal; numero: string; estado: EstadoDocumentoFiscal };
            data: string; tem_servicos?: boolean; total_retencao?: number;
        }>;
    };
    documentos_fiscais: {
        total: number;
        por_tipo: Record<TipoDocumentoFiscal, { nome: string; quantidade: number; valor: number; retencao?: number }>;
        por_estado: Array<{
            tipo: string;
            por_estado: Record<string, { quantidade: number; valor: number; retencao?: number }>;
            total_quantidade: number; total_valor: number; total_retencao?: number;
        }>;
        ultimos: Array<{
            id: string; tipo: TipoDocumentoFiscal; tipo_nome: string; numero: string;
            cliente: string; total: number; estado: EstadoDocumentoFiscal;
            estado_pagamento: EstadoPagamentoVenda; data: string; retencao?: number;
        }>;
        por_mes: Array<{ mes: string; FT: number; FR: number; NC: number; ND: number; total: number; retencao?: number }>;
        por_dia: Array<{ dia: string; total: number; retencao?: number }>;
    };
    pagamentos: {
        hoje: number; total_pendente: number; total_atrasado: number;
        metodos: Array<{ metodo: string; metodo_nome: string; quantidade: number; valor_total: number }>;
    };
    clientes: { ativos: number; novos_mes: number };
    indicadores: {
        produtosMaisVendidos: Array<{ produto: string; codigo?: string; quantidade: number; valor_total: number }>;
        servicosMaisVendidos?: Array<{ produto: string; codigo?: string; quantidade: number; valor_total: number; retencao_total: number }>;
    };
    alertas: {
        documentos_vencidos: number; documentos_proximo_vencimento: number;
        adiantamentos_pendentes: number; proformas_pendentes: number;
        servicos_com_retencao_pendente?: number;
    };
    periodo: { mes_atual: number; ano_atual: number; mes_anterior: number; ano_anterior: number };
}

export type DashboardResponse = DashboardData;

export interface ResumoDocumentosFiscais {
    total_emitidos: number;
    por_tipo: Record<TipoDocumentoFiscal, { nome: string; quantidade: number; valor_total: number; mes_atual: number; retencao_total?: number }>;
    por_estado: Record<EstadoDocumentoFiscal, number>;
    periodo: { inicio: string; fim: string };
}

export interface EstatisticasPagamentos {
    recebidos_hoje: number; recebidos_mes: number; recebidos_ano: number; pendentes: number;
    atrasados: { quantidade: number; valor_total: number; documentos: Array<{ id: string; numero: string; cliente?: string; valor: number; dias_atraso: number }> };
    prazo_medio_pagamento: number;
    metodos_pagamento: Record<string, number>;
    recebidos_com_retencao?: number;
}

export interface AlertasPendentes {
    vencidos: { quantidade: number; valor_total: number; documentos: Array<{ id: string; tipo: TipoDocumentoFiscal; numero: string; cliente?: string; valor: number; valor_pendente: number; data_vencimento: string; dias_atraso: number; retencao?: number }> };
    proximos_vencimento: { quantidade: number; valor_total: number; documentos: Array<{ id: string; tipo: TipoDocumentoFiscal; numero: string; cliente?: string; valor: number; valor_pendente: number; data_vencimento: string; dias_ate_vencimento: number; retencao?: number }> };
    adiantamentos_pendentes: { quantidade: number; valor_total: number; documentos: Array<{ id: string; tipo: TipoDocumentoFiscal; numero: string; cliente?: string; valor: number; data_emissao: string; dias_pendentes: number }> };
    proformas_pendentes: { quantidade: number; valor_total: number; documentos: Array<{ id: string; tipo: TipoDocumentoFiscal; numero: string; cliente?: string; valor: number; data_emissao: string; dias_pendentes: number }> };
    servicos_com_retencao_proximos?: { quantidade: number; valor_total: number; documentos: Array<{ id: string; numero: string; cliente?: string; valor: number; retencao: number; data_vencimento: string }> };
    total_alertas: number;
}

export interface EvolucaoMensal {
    ano: number;
    meses: Array<{
        mes: number; nome: string; faturas_emitidas: number; valor_faturado: number;
        valor_pago: number; valor_pendente: number; notas_credito: number;
        valor_notas_credito: number; proformas: number; valor_proformas: number;
        adiantamentos: number; valor_adiantamentos: number; retencao?: number;
    }>;
}

/* ================== HELPERS DE PAYLOAD ================== */

function criarPayloadVenda(payload: CriarVendaPayload): Record<string, unknown> {
    const out: Record<string, unknown> = { itens: payload.itens };

    if (payload.cliente_id) {
        out.cliente_id = payload.cliente_id;
    } else if (payload.cliente_nome?.trim()) {
        out.cliente_nome = payload.cliente_nome.trim();
        if (payload.cliente_nif) out.cliente_nif = payload.cliente_nif;
    }

    if (payload.tipo_documento) out.tipo_documento = payload.tipo_documento;
    out.faturar = payload.tipo_documento !== 'FP';

    if (payload.tipo_documento === 'FR' && payload.dados_pagamento) {
        out.dados_pagamento = payload.dados_pagamento;
    }

    if (payload.observacoes) out.observacoes = payload.observacoes;

    return out;
}

function criarPayloadDocumentoFiscal(payload: CriarDocumentoFiscalPayload): Record<string, unknown> {
    const out: Record<string, unknown> = {
        tipo_documento: payload.tipo_documento,
        itens: payload.itens,
    };

    if (payload.venda_id)       out.venda_id = payload.venda_id;
    if (payload.cliente_id)     out.cliente_id = payload.cliente_id;
    if (payload.cliente_nome?.trim()) {
        out.cliente_nome = payload.cliente_nome.trim();
        if (payload.cliente_nif) out.cliente_nif = payload.cliente_nif;
    }
    if (payload.fatura_id)          out.fatura_id = payload.fatura_id;
    if (payload.dados_pagamento)    out.dados_pagamento = payload.dados_pagamento;
    if (payload.motivo)             out.motivo = payload.motivo;
    if (payload.data_vencimento)    out.data_vencimento = payload.data_vencimento;
    if (payload.referencia_externa) out.referencia_externa = payload.referencia_externa;

    return out;
}

/* ================== SERVIÇOS ================== */

const API = "/api";

const noCache = {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' },
};

/* -------- Vendas -------- */
export const vendaService = {
    async obterDadosNovaVenda(): Promise<{ clientes: Cliente[]; produtos: Produto[]; estatisticas?: { total_produtos: number; total_servicos: number } }> {
        try {
            const { data } = await api.get(`${API}/vendas/create`);
            return { clientes: data.clientes || [], produtos: data.produtos || [], estatisticas: data.estatisticas };
        } catch (err) {
            handleAxiosError(err, "[VENDA] obterDadosNovaVenda");
            return { clientes: [], produtos: [] };
        }
    },

    async criar(payload: CriarVendaPayload): Promise<{ venda: Venda; message: string } | null> {
        try {
            const { data } = await api.post(`${API}/vendas`, criarPayloadVenda(payload));
            if (data.venda) data.venda = this.normalizar(data.venda);
            return data;
        } catch (err) { handleAxiosError(err, "[VENDA] criar"); return null; }
    },

    async listar(params?: {
        status?: string; faturadas?: boolean; estado_pagamento?: EstadoPagamentoVenda;
        apenas_vendas?: boolean; tipo_documento?: TipoDocumentoFiscal; cliente_id?: string;
        data_inicio?: string; data_fim?: string; tipo_item?: 'produto' | 'servico'; com_retencao?: boolean;
    }): Promise<{ message: string; vendas: Venda[]; pagination?: unknown } | null> {
        try {
            const q = new URLSearchParams();
            if (params?.status)           q.append('status', params.status);
            if (params?.faturadas)        q.append('faturadas', 'true');
            if (params?.estado_pagamento) q.append('estado_pagamento', params.estado_pagamento);
            if (params?.apenas_vendas)    q.append('apenas_vendas', 'true');
            if (params?.tipo_documento)   q.append('tipo_documento', params.tipo_documento);
            if (params?.cliente_id)       q.append('cliente_id', params.cliente_id);
            if (params?.data_inicio)      q.append('data_inicio', params.data_inicio);
            if (params?.data_fim)         q.append('data_fim', params.data_fim);
            if (params?.tipo_item)        q.append('tipo_item', params.tipo_item);
            if (params?.com_retencao)     q.append('com_retencao', 'true');

            const { data } = await api.get(`${API}/vendas${q.toString() ? `?${q}` : ''}`);
            if (data.vendas) data.vendas = data.vendas.map((v: Venda) => this.normalizar(v));
            return data;
        } catch (err) { handleAxiosError(err, "[VENDA] listar"); return null; }
    },

    async obter(id: string): Promise<{ message: string; venda: Venda } | null> {
        try {
            const { data } = await api.get(`${API}/vendas/${id}`);
            if (data.venda) data.venda = this.normalizar(data.venda);
            return data;
        } catch (err) { handleAxiosError(err, "[VENDA] obter"); return null; }
    },

    async cancelar(id: string, motivo = 'Cancelamento manual'): Promise<{ message: string; venda: Venda } | null> {
        try {
            const { data } = await api.post(`${API}/vendas/${id}/cancelar`, { motivo });
            if (data.venda) data.venda = this.normalizar(data.venda);
            return data;
        } catch (err) { handleAxiosError(err, "[VENDA] cancelar"); return null; }
    },

    async gerarRecibo(id: string, dadosPagamento: { valor: number; metodo_pagamento: DadosPagamento['metodo']; data_pagamento?: string; referencia?: string }): Promise<{ message: string; venda: Venda; recibo: DocumentoFiscal } | null> {
        try {
            const { data } = await api.post(`${API}/vendas/${id}/recibo`, dadosPagamento);
            if (data.venda) data.venda = this.normalizar(data.venda);
            return data;
        } catch (err) { handleAxiosError(err, "[VENDA] gerarRecibo"); return null; }
    },

    async converterProformaParaFatura(id: string, dadosPagamento?: { valor: number; metodo_pagamento: DadosPagamento['metodo']; referencia?: string }): Promise<{ message: string; venda: Venda } | null> {
        try {
            const { data } = await api.post(`${API}/vendas/${id}/converter`, dadosPagamento);
            if (data.venda) data.venda = this.normalizar(data.venda);
            return data;
        } catch (err) { handleAxiosError(err, "[VENDA] converterProforma"); return null; }
    },

    async estatisticas(params?: { ano?: number; mes?: number }): Promise<unknown> {
        try {
            const q = new URLSearchParams();
            if (params?.ano) q.append('ano', String(params.ano));
            if (params?.mes) q.append('mes', String(params.mes));
            const { data } = await api.get(`${API}/vendas/estatisticas${q.toString() ? `?${q}` : ''}`);
            return data;
        } catch (err) { handleAxiosError(err, "[VENDA] estatisticas"); return null; }
    },

    async relatorio(params?: { tipo?: 'vendas' | 'proformas' | 'adiantamentos'; data_inicio?: string; data_fim?: string }): Promise<unknown> {
        try {
            const q = new URLSearchParams();
            if (params?.tipo)        q.append('tipo', params.tipo);
            if (params?.data_inicio) q.append('data_inicio', params.data_inicio);
            if (params?.data_fim)    q.append('data_fim', params.data_fim);
            const { data } = await api.get(`${API}/vendas/relatorio${q.toString() ? `?${q}` : ''}`);
            return data;
        } catch (err) { handleAxiosError(err, "[VENDA] relatorio"); return null; }
    },

    normalizar(venda: Venda): Venda {
        if (venda.itens) {
            venda.itens = venda.itens.map(item => {
                if (item.eh_servico === undefined && item.produto) {
                    item.eh_servico = item.produto.tipo === 'servico';
                }
                item.subtotal_liquido ??= item.subtotal - (item.valor_retencao ?? 0);
                return item;
            });

            if (!venda.totais_por_tipo) {
                const servicos = venda.itens.filter(i => i.eh_servico);
                const produtos  = venda.itens.filter(i => !i.eh_servico);
                venda.totais_por_tipo = {
                    produtos: { quantidade: produtos.length, total: produtos.reduce((s, i) => s + i.subtotal, 0) },
                    servicos: { quantidade: servicos.length, total: servicos.reduce((s, i) => s + i.subtotal, 0), retencao: servicos.reduce((s, i) => s + i.valor_retencao, 0) },
                };
            }

            venda.total_retencao_servicos ??= venda.itens.filter(i => i.eh_servico).reduce((s, i) => s + i.valor_retencao, 0);
            venda.tem_servicos      ??= venda.itens.some(i => i.eh_servico);
            venda.quantidade_servicos ??= venda.itens.filter(i => i.eh_servico).length;
        }
        venda.paga ??= venda.estado_pagamento === 'paga';
        return venda;
    },
};

/* -------- Documentos Fiscais -------- */
export const documentoFiscalService = {
    async listar(params?: {
        tipo?: TipoDocumentoFiscal; estado?: EstadoDocumentoFiscal;
        cliente_id?: string; cliente_nome?: string; data_inicio?: string; data_fim?: string;
        pendentes?: boolean; adiantamentos_pendentes?: boolean; proformas_pendentes?: boolean;
        apenas_vendas?: boolean; apenas_nao_vendas?: boolean; per_page?: number; com_retencao?: boolean;
    }): Promise<{ message: string; data: { documentos: DocumentoFiscal[] } } | null> {
        try {
            const q = new URLSearchParams();
            Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null) q.append(k, String(v)); });
            const { data } = await api.get(`${API}/documentos-fiscais${q.toString() ? `?${q}` : ''}`);
            return data;
        } catch (err) { handleAxiosError(err, "[DOCUMENTO] listar"); return null; }
    },

    async emitir(payload: CriarDocumentoFiscalPayload): Promise<{ message: string; documento: DocumentoFiscal } | null> {
        try {
            const { data } = await api.post(`${API}/documentos-fiscais/emitir`, criarPayloadDocumentoFiscal(payload));
            return data;
        } catch (err) { handleAxiosError(err, "[DOCUMENTO] emitir"); return null; }
    },

    async obter(id: string): Promise<{ message: string; data: { documento: DocumentoFiscal } } | null> {
        if (!id?.trim()) throw new Error('ID do documento não fornecido');
        try {
            const { data } = await api.get(`${API}/documentos-fiscais/${id}`);
            return data;
        } catch (err) { handleAxiosError(err, "[DOCUMENTO] obter"); return null; }
    },

    async gerarRecibo(documentoId: string, dadosPagamento: { valor: number; metodo_pagamento: DadosPagamento['metodo']; data_pagamento?: string; referencia?: string }): Promise<{ message: string; recibo: DocumentoFiscal; documento: DocumentoFiscal } | null> {
        try {
            const { data } = await api.post(`${API}/documentos-fiscais/${documentoId}/recibo`, dadosPagamento);
            return data;
        } catch (err) { handleAxiosError(err, "[DOCUMENTO] gerarRecibo"); return null; }
    },

    async criarNotaCredito(documentoId: string, payload: { itens: Array<{ produto_id?: string; descricao: string; quantidade: number; preco_unitario: number; taxa_iva?: number; taxa_retencao?: number }>; motivo: string }): Promise<{ message: string; documento: DocumentoFiscal } | null> {
        try {
            const { data } = await api.post(`${API}/documentos-fiscais/${documentoId}/nota-credito`, payload);
            return data;
        } catch (err) { handleAxiosError(err, "[DOCUMENTO] criarNotaCredito"); return null; }
    },

    async criarNotaDebito(documentoId: string, payload: { itens: Array<{ produto_id?: string; descricao: string; quantidade: number; preco_unitario: number; taxa_iva?: number; taxa_retencao?: number }>; motivo?: string }): Promise<{ message: string; documento: DocumentoFiscal } | null> {
        try {
            const { data } = await api.post(`${API}/documentos-fiscais/${documentoId}/nota-debito`, payload);
            return { message: data.message || 'Nota de Débito criada', documento: data.documento || data.data?.documento || data.data };
        } catch (err) { handleAxiosError(err, "[DOCUMENTO] criarNotaDebito"); return null; }
    },

    async vincularAdiantamento(adiantamentoId: string, payload: { fatura_id: string; valor: number }): Promise<{ message: string; data: { adiantamento: DocumentoFiscal; fatura: DocumentoFiscal } } | null> {
        try {
            const { data } = await api.post(`${API}/documentos-fiscais/${adiantamentoId}/vincular-adiantamento`, payload);
            return data;
        } catch (err) { handleAxiosError(err, "[DOCUMENTO] vincularAdiantamento"); return null; }
    },

    async cancelar(id: string, payload: { motivo: string }): Promise<{ message: string; documento: DocumentoFiscal } | null> {
        try {
            const { data } = await api.post(`${API}/documentos-fiscais/${id}/cancelar`, payload);
            return data;
        } catch (err) { handleAxiosError(err, "[DOCUMENTO] cancelar"); return null; }
    },

    async listarRecibos(documentoId: string): Promise<{ message: string; data: { recibos: DocumentoFiscal[] } } | null> {
        try {
            const { data } = await api.get(`${API}/documentos-fiscais/${documentoId}/recibos`);
            return data;
        } catch (err) { handleAxiosError(err, "[DOCUMENTO] listarRecibos"); return null; }
    },

    async adiantamentosPendentes(clienteId?: string, clienteNome?: string): Promise<{ message: string; data: { adiantamentos: DocumentoFiscal[] } } | null> {
        try {
            const q = new URLSearchParams();
            if (clienteId)   q.append('cliente_id', clienteId);
            if (clienteNome) q.append('cliente_nome', clienteNome);
            const { data } = await api.get(`${API}/documentos-fiscais/adiantamentos-pendentes${q.toString() ? `?${q}` : ''}`);
            return data;
        } catch (err) { handleAxiosError(err, "[DOCUMENTO] adiantamentosPendentes"); return null; }
    },

    async proformasPendentes(clienteId?: string, clienteNome?: string): Promise<{ message: string; data: { proformas: DocumentoFiscal[] } } | null> {
        try {
            const q = new URLSearchParams();
            if (clienteId)   q.append('cliente_id', clienteId);
            if (clienteNome) q.append('cliente_nome', clienteNome);
            const { data } = await api.get(`${API}/documentos-fiscais/proformas-pendentes${q.toString() ? `?${q}` : ''}`);
            return data;
        } catch (err) { handleAxiosError(err, "[DOCUMENTO] proformasPendentes"); return null; }
    },

    async alertas(): Promise<{ message: string; data: unknown } | null> {
        try {
            const { data } = await api.get(`${API}/documentos-fiscais/alertas`);
            return data;
        } catch (err) { handleAxiosError(err, "[DOCUMENTO] alertas"); return null; }
    },

    async processarExpirados(): Promise<{ message: string; expirados: number } | null> {
        try {
            const { data } = await api.post(`${API}/documentos-fiscais/processar-expirados`);
            return data;
        } catch (err) { handleAxiosError(err, "[DOCUMENTO] processarExpirados"); return null; }
    },

    async dashboard(): Promise<{ message: string; data: unknown } | null> {
        try {
            const { data } = await api.get(`${API}/documentos-fiscais/dashboard`);
            return data;
        } catch (err) { handleAxiosError(err, "[DOCUMENTO] dashboard"); return null; }
    },

    async downloadPdf(id: string, nomeArquivo?: string): Promise<void> {
        try {
            const response = await api.get(`${API}/documentos-fiscais/${id}/pdf/download`, { responseType: 'blob' });
            const url  = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = nomeArquivo ?? `documento-${id}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) { handleAxiosError(err, "[DOCUMENTO] downloadPdf"); }
    },
};

/* -------- Clientes -------- */
export const clienteService = {
    async listar(params?: { status?: 'ativo' | 'inativo' | 'todos' }): Promise<Cliente[]> {
        const q = new URLSearchParams({ t: String(Date.now()) });
        if (params?.status && params.status !== 'todos') q.append('status', params.status);
        const { data } = await api.get(`${API}/clientes?${q}`, noCache);
        return data.clientes || [];
    },

    async listarAtivos(): Promise<Cliente[]> { return this.listar({ status: 'ativo' }); },

    async listarTodos(): Promise<Cliente[]> {
        const { data } = await api.get(`${API}/clientes/todos?t=${Date.now()}`, noCache);
        return data.clientes || [];
    },

    async buscar(id: string): Promise<Cliente | null> {
        try {
            const { data } = await api.get(`${API}/clientes/${id}?t=${Date.now()}`, noCache);
            return data.cliente;
        } catch (err) { handleAxiosError(err, "[CLIENTE] buscar"); return null; }
    },

    async criar(dados: CriarClienteInput): Promise<Cliente | null> {
        try {
            const { data } = await api.post(`${API}/clientes`, dados);
            return data.cliente;
        } catch (err) { handleAxiosError(err, "[CLIENTE] criar"); return null; }
    },

    async atualizar(id: string, dados: AtualizarClienteInput): Promise<Cliente | null> {
        try {
            const { data } = await api.put(`${API}/clientes/${id}`, dados);
            return data.cliente;
        } catch (err) { handleAxiosError(err, "[CLIENTE] atualizar"); return null; }
    },

    async ativar(id: string): Promise<Cliente | null> {
        try { const { data } = await api.post(`${API}/clientes/${id}/ativar`); return data.cliente; }
        catch (err) { handleAxiosError(err, "[CLIENTE] ativar"); return null; }
    },

    async inativar(id: string): Promise<Cliente | null> {
        try { const { data } = await api.post(`${API}/clientes/${id}/inativar`); return data.cliente; }
        catch (err) { handleAxiosError(err, "[CLIENTE] inativar"); return null; }
    },

    async deletar(id: string): Promise<boolean> {
        try { await api.delete(`${API}/clientes/${id}`); return true; }
        catch (err) { handleAxiosError(err, "[CLIENTE] deletar"); return false; }
    },

    async restaurar(id: string): Promise<Cliente | null> {
        try { const { data } = await api.post(`${API}/clientes/${id}/restore`); return data.cliente; }
        catch (err) { handleAxiosError(err, "[CLIENTE] restaurar"); return null; }
    },

    async removerPermanentemente(id: string): Promise<boolean> {
        try { await api.delete(`${API}/clientes/${id}/force`); return true; }
        catch (err) { handleAxiosError(err, "[CLIENTE] removerPermanentemente"); return false; }
    },
};

/* -------- Fornecedores -------- */
export const fornecedorService = {
    async listar(): Promise<Fornecedor[]> {
        try { const { data } = await api.get(`${API}/fornecedores`); return data.fornecedores || data || []; }
        catch (err) { handleAxiosError(err, "[FORNECEDOR] listar"); return []; }
    },
    async buscar(id: string): Promise<Fornecedor | null> {
        try { const { data } = await api.get(`${API}/fornecedores/${id}`); return data.fornecedor || data; }
        catch (err) { handleAxiosError(err, "[FORNECEDOR] buscar"); return null; }
    },
    async criar(payload: Omit<Fornecedor, "id">): Promise<Fornecedor | null> {
        try { const { data } = await api.post(`${API}/fornecedores`, payload); return data.fornecedor || data; }
        catch (err) { handleAxiosError(err, "[FORNECEDOR] criar"); return null; }
    },
    async atualizar(id: string, payload: Partial<Omit<Fornecedor, "id">>): Promise<Fornecedor | null> {
        try { const { data } = await api.put(`${API}/fornecedores/${id}`, payload); return data.fornecedor || data; }
        catch (err) { handleAxiosError(err, "[FORNECEDOR] atualizar"); return null; }
    },
    async deletar(id: string): Promise<boolean> {
        try { await api.delete(`${API}/fornecedores/${id}`); return true; }
        catch (err) { handleAxiosError(err, "[FORNECEDOR] deletar"); return false; }
    },
};

/* -------- Produtos -------- */
export const produtoService = {
    async listar(params: ListarProdutosParams = {}): Promise<{ message: string; produtos: Produto[] | PaginatedResponse<Produto> }> {
        try {
            const q = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== false) q.append(k, String(v)); });
            const { data } = await api.get(`${API}/produtos${q.toString() ? `?${q}` : ''}`);
            return data;
        } catch (err) { handleAxiosError(err, "[PRODUTO] listar"); return { message: "Erro", produtos: [] }; }
    },

    async listarTodos(params: Omit<ListarProdutosParams, "status" | "estoque_baixo" | "sem_estoque"> = {}): Promise<{ message: string; produtos: Produto[]; total: number; ativos: number; deletados: number; produtos_fisicos: number; servicos: number }> {
        try {
            const q = new URLSearchParams();
            if (params.tipo)  q.append("tipo", params.tipo);
            if (params.busca) q.append("busca", params.busca);
            const { data } = await api.get(`${API}/produtos/todos${q.toString() ? `?${q}` : ''}`);
            return data;
        } catch (err) { handleAxiosError(err, "[PRODUTO] listarTodos"); return { message: "Erro", produtos: [], total: 0, ativos: 0, deletados: 0, produtos_fisicos: 0, servicos: 0 }; }
    },

    async listarDeletados(params: Omit<ListarProdutosParams, "status" | "estoque_baixo" | "sem_estoque" | "categoria_id"> = {}): Promise<{ message: string; produtos: Produto[] | PaginatedResponse<Produto>; total_deletados: number }> {
        try {
            const q = new URLSearchParams();
            if (params.busca)    q.append("busca", params.busca);
            if (params.paginar)  q.append("paginar", "true");
            if (params.per_page) q.append("per_page", params.per_page.toString());
            const { data } = await api.get(`${API}/produtos/trashed${q.toString() ? `?${q}` : ''}`);
            return data;
        } catch (err) { handleAxiosError(err, "[PRODUTO] listarDeletados"); return { message: "Erro", produtos: [], total_deletados: 0 }; }
    },

    async buscar(id: string): Promise<Produto | null> {
        try { const { data } = await api.get(`${API}/produtos/${id}`); return data.produto; }
        catch (err) { handleAxiosError(err, "[PRODUTO] buscar"); return null; }
    },

    async criar(dados: CriarProdutoInput): Promise<Produto | null> {
        try { const { data } = await api.post(`${API}/produtos`, dados); return data.produto; }
        catch (err) { handleAxiosError(err, "[PRODUTO] criar"); return null; }
    },

    async atualizar(id: string, dados: AtualizarProdutoInput): Promise<Produto | null> {
        try { const { data } = await api.put(`${API}/produtos/${id}`, dados); return data.produto; }
        catch (err) { handleAxiosError(err, "[PRODUTO] atualizar"); return null; }
    },

    async alterarStatus(id: string, status: StatusProduto): Promise<Produto | null> {
        try { const { data } = await api.post(`${API}/produtos/${id}/status`, { status }); return data.produto; }
        catch (err) { handleAxiosError(err, "[PRODUTO] alterarStatus"); return null; }
    },

    async moverParaLixeira(id: string): Promise<{ message: string; soft_deleted: boolean; id: string; deleted_at?: string } | null> {
        try { const { data } = await api.delete(`${API}/produtos/${id}`); return data; }
        catch (err) { handleAxiosError(err, "[PRODUTO] moverParaLixeira"); return null; }
    },

    async restaurar(id: string): Promise<Produto | null> {
        try { const { data } = await api.post(`${API}/produtos/${id}/restore`); return data.produto; }
        catch (err) { handleAxiosError(err, "[PRODUTO] restaurar"); return null; }
    },

    async deletarPermanentemente(id: string): Promise<{ message: string; id: string } | null> {
        try { const { data } = await api.delete(`${API}/produtos/${id}/force`); return data; }
        catch (err) { handleAxiosError(err, "[PRODUTO] deletarPermanentemente"); return null; }
    },

    async listarCategorias(params?: { tipo?: 'produto' | 'servico' }): Promise<Categoria[]> {
        try {
            const url = params?.tipo ? `${API}/categorias?tipo=${params.tipo}` : `${API}/categorias`;
            const { data } = await api.get(url);
            return data.categorias || [];
        } catch (err) { handleAxiosError(err, "[PRODUTO] listarCategorias"); return []; }
    },

    async listarServicos(params: Omit<ListarProdutosParams, 'tipo'> = {}) { return this.listar({ ...params, tipo: 'servico' }); },
    async listarApenasProdutos(params: Omit<ListarProdutosParams, 'tipo'> = {}) { return this.listar({ ...params, tipo: 'produto' }); },

    async verificarStatus(id: string): Promise<{ existe: boolean; deletado: boolean; produto?: Produto }> {
        try {
            const produto = await this.buscar(id);
            return { existe: !!produto, deletado: !!produto?.deleted_at, produto: produto || undefined };
        } catch { return { existe: false, deletado: false }; }
    },
};

/* -------- Categorias -------- */
export const categoriaService = {
    async listar(params?: { tipo?: 'produto' | 'servico' }): Promise<Categoria[]> {
        try {
            const url = params?.tipo ? `${API}/categorias?tipo=${params.tipo}` : `${API}/categorias`;
            const { data } = await api.get(url);
            return data.categorias || data || [];
        } catch (err) { handleAxiosError(err, "[CATEGORIA] listar"); return []; }
    },
    async criar(payload: CategoriaPayload): Promise<Categoria | null> {
        try { const { data } = await api.post(`${API}/categorias`, payload); return data.categoria || data; }
        catch (err) { handleAxiosError(err, "[CATEGORIA] criar"); return null; }
    },
    async atualizar(id: string, payload: Partial<CategoriaPayload>): Promise<Categoria | null> {
        try { const { data } = await api.put(`${API}/categorias/${id}`, payload); return data.categoria || data; }
        catch (err) { handleAxiosError(err, "[CATEGORIA] atualizar"); return null; }
    },
    async deletar(id: string): Promise<boolean> {
        try { await api.delete(`${API}/categorias/${id}`); return true; }
        catch (err) { handleAxiosError(err, "[CATEGORIA] deletar"); return false; }
    },
    async buscar(id: string): Promise<Categoria | null> {
        try { const { data } = await api.get(`${API}/categorias/${id}`); return data.categoria || data; }
        catch (err) { handleAxiosError(err, "[CATEGORIA] buscar"); return null; }
    },
};

/* -------- Movimentos de Stock -------- */
export const stockService = {
    async listar(params: { produto_id?: string; tipo?: "entrada" | "saida"; tipo_movimento?: string; data_inicio?: string; data_fim?: string; paginar?: boolean; per_page?: number } = {}): Promise<MovimentoStock[]> {
        try {
            const q = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => { if (v !== undefined) q.append(k, String(v)); });
            const { data } = await api.get(`${API}/movimentos-stock${q.toString() ? `?${q}` : ''}`);
            return data.movimentos || [];
        } catch (err) { handleAxiosError(err, "[STOCK] listar"); return []; }
    },

    async resumo(): Promise<{ totalProdutos: number; produtosAtivos: number; produtosEstoqueBaixo: number; produtosSemEstoque: number; valorTotalEstoque: number; movimentacoesHoje: number; entradasHoje: number; saidasHoje: number; produtos_criticos: Produto[] }> {
        try { const { data } = await api.get(`${API}/movimentos-stock/resumo`); return data; }
        catch (err) {
            handleAxiosError(err, "[STOCK] resumo");
            return { totalProdutos: 0, produtosAtivos: 0, produtosEstoqueBaixo: 0, produtosSemEstoque: 0, valorTotalEstoque: 0, movimentacoesHoje: 0, entradasHoje: 0, saidasHoje: 0, produtos_criticos: [] };
        }
    },

    async historicoProduto(produtoId: string, page = 1): Promise<{ message: string; produto: { id: string; nome: string; estoque_atual: number }; movimentos: PaginatedResponse<MovimentoStock> }> {
        try { const { data } = await api.get(`${API}/movimentos-stock/produto/${produtoId}?page=${page}`); return data; }
        catch (err) {
            handleAxiosError(err, "[STOCK] historicoProduto");
            return { message: "Erro", produto: { id: produtoId, nome: "", estoque_atual: 0 }, movimentos: { data: [], current_page: 1, last_page: 1, per_page: 20, total: 0 } };
        }
    },

    async criar(payload: CriarMovimentoPayload): Promise<MovimentoStock | null> {
        try {
            const { data } = await api.post(`${API}/movimentos-stock`, {
                produto_id:     payload.produto_id,
                tipo:           payload.tipo,
                tipo_movimento: payload.tipo_movimento || "ajuste",
                quantidade:     Math.abs(payload.quantidade),
                motivo:         payload.observacao || payload.motivo,
                referencia:     payload.referencia,
                custo_unitario: payload.custo_unitario,
            });
            return data.movimento;
        } catch (err) { handleAxiosError(err, "[STOCK] criar"); return null; }
    },

    async ajuste(produto_id: string, quantidade: number, motivo: string, custo_medio?: number) {
        try { const { data } = await api.post(`${API}/movimentos-stock/ajuste`, { produto_id, quantidade, motivo, custo_medio }); return data; }
        catch (err) { handleAxiosError(err, "[STOCK] ajuste"); return null; }
    },

    async transferencia(produto_origem_id: string, produto_destino_id: string, quantidade: number, motivo: string) {
        try { const { data } = await api.post(`${API}/movimentos-stock/transferencia`, { produto_origem_id, produto_destino_id, quantidade, motivo }); return data; }
        catch (err) { handleAxiosError(err, "[STOCK] transferencia"); return null; }
    },

    async obter(id: string): Promise<MovimentoStock | null> {
        try { const { data } = await api.get(`${API}/movimentos-stock/${id}`); return data.movimento; }
        catch (err) { handleAxiosError(err, "[STOCK] obter"); return null; }
    },

    async estatisticas(params: { data_inicio?: string; data_fim?: string; produto_id?: string } = {}) {
        try {
            const q = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => { if (v) q.append(k, v); });
            const { data } = await api.get(`${API}/movimentos-stock/estatisticas${q.toString() ? `?${q}` : ''}`);
            return data.estatisticas;
        } catch (err) { handleAxiosError(err, "[STOCK] estatisticas"); return null; }
    },

    async verificarDisponibilidade(produto_id: string, quantidade: number): Promise<{ disponivel: boolean; estoque_atual: number; mensagem?: string }> {
        const produto = await produtoService.buscar(produto_id);
        if (!produto) throw new Error("Produto não encontrado");
        if (produto.tipo === "servico") return { disponivel: true, estoque_atual: 0, mensagem: "Serviço não possui controlo de stock" };
        const disponivel = produto.estoque_atual >= quantidade;
        return { disponivel, estoque_atual: produto.estoque_atual, mensagem: disponivel ? undefined : `Stock insuficiente. Disponível: ${produto.estoque_atual}` };
    },
};

/* -------- Dashboard -------- */
export const dashboardService = {
    async fetch(): Promise<DashboardResponse | null> {
        try { const { data } = await api.get<{ success: boolean; data: DashboardResponse }>(`${API}/dashboard`); return data.data; }
        catch (err) { handleAxiosError(err, "[DASHBOARD] fetch"); return null; }
    },
    async resumoDocumentosFiscais(): Promise<ResumoDocumentosFiscais | null> {
        try { const { data } = await api.get(`${API}/dashboard/resumo-documentos-fiscais`); return data.data?.resumo ?? null; }
        catch (err) { handleAxiosError(err, "[DASHBOARD] resumoDocumentosFiscais"); return null; }
    },
    async estatisticasPagamentos(): Promise<EstatisticasPagamentos | null> {
        try { const { data } = await api.get(`${API}/dashboard/estatisticas-pagamentos`); return data.data?.estatisticas ?? null; }
        catch (err) { handleAxiosError(err, "[DASHBOARD] estatisticasPagamentos"); return null; }
    },
    async alertasPendentes(): Promise<AlertasPendentes | null> {
        try { const { data } = await api.get(`${API}/dashboard/alertas`); return data.data?.alertas ?? null; }
        catch (err) { handleAxiosError(err, "[DASHBOARD] alertasPendentes"); return null; }
    },
    async evolucaoMensal(ano?: number): Promise<EvolucaoMensal | null> {
        try { const { data } = await api.get(`${API}/dashboard/evolucao-mensal${ano ? `?ano=${ano}` : ''}`); return data.data?.evolucao ?? null; }
        catch (err) { handleAxiosError(err, "[DASHBOARD] evolucaoMensal"); return null; }
    },
};

/* -------- Relatórios -------- */
export const relatorioService = {
    async documentosFiscais(params?: { data_inicio?: string; data_fim?: string; tipo?: TipoDocumentoFiscal; cliente_id?: string; cliente_nome?: string; com_retencao?: boolean }) {
        try {
            const q = new URLSearchParams();
            Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null) q.append(k, String(v)); });
            const { data } = await api.get(`${API}/relatorios/documentos-fiscais${q.toString() ? `?${q}` : ''}`);
            return data;
        } catch (err) { handleAxiosError(err, "[RELATÓRIO] documentosFiscais"); return null; }
    },
    async pagamentosPendentes() {
        try { const { data } = await api.get(`${API}/relatorios/pagamentos-pendentes`); return data; }
        catch (err) { handleAxiosError(err, "[RELATÓRIO] pagamentosPendentes"); return null; }
    },
    async vendas(params?: { data_inicio?: string; data_fim?: string; apenas_vendas?: boolean; tipo_item?: 'produto' | 'servico'; com_retencao?: boolean }) {
        try {
            const q = new URLSearchParams();
            Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null) q.append(k, String(v)); });
            const { data } = await api.get(`${API}/relatorios/vendas${q.toString() ? `?${q}` : ''}`);
            if (data.data?.vendas) data.data.vendas = data.data.vendas.map((v: Venda) => vendaService.normalizar(v));
            return data;
        } catch (err) { handleAxiosError(err, "[RELATÓRIO] vendas"); return null; }
    },
    async compras(params?: { data_inicio?: string; data_fim?: string }) {
        try {
            const q = new URLSearchParams();
            if (params?.data_inicio) q.append('data_inicio', params.data_inicio);
            if (params?.data_fim)    q.append('data_fim', params.data_fim);
            const { data } = await api.get(`${API}/relatorios/compras${q.toString() ? `?${q}` : ''}`);
            return data;
        } catch (err) { handleAxiosError(err, "[RELATÓRIO] compras"); return null; }
    },
    async stock() {
        try { const { data } = await api.get(`${API}/relatorios/stock`); return data; }
        catch (err) { handleAxiosError(err, "[RELATÓRIO] stock"); return null; }
    },
    async proformas(params?: { data_inicio?: string; data_fim?: string; cliente_id?: string; pendentes?: boolean }) {
        try {
            const q = new URLSearchParams();
            Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null) q.append(k, String(v)); });
            const { data } = await api.get(`${API}/relatorios/proformas${q.toString() ? `?${q}` : ''}`);
            return data;
        } catch (err) { handleAxiosError(err, "[RELATÓRIO] proformas"); return null; }
    },
    async servicos(params?: { data_inicio?: string; data_fim?: string; apenas_ativos?: boolean }) {
        try {
            const q = new URLSearchParams();
            Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null) q.append(k, String(v)); });
            const { data } = await api.get(`${API}/relatorios/servicos${q.toString() ? `?${q}` : ''}`);
            return data;
        } catch (err) { handleAxiosError(err, "[RELATÓRIO] servicos"); return null; }
    },
    async retencoes(params?: { data_inicio?: string; data_fim?: string; cliente_id?: string }) {
        try {
            const q = new URLSearchParams();
            Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null) q.append(k, String(v)); });
            const { data } = await api.get(`${API}/relatorios/retencoes${q.toString() ? `?${q}` : ''}`);
            return data;
        } catch (err) { handleAxiosError(err, "[RELATÓRIO] retencoes"); return null; }
    },
};

/* ================== UTILITÁRIOS ================== */

export function isServico(produto: Produto): boolean  { return produto.tipo === "servico"; }
export function isProduto(produto: Produto): boolean  { return produto.tipo === "produto"; }
export function estaNaLixeira(produto: Produto): boolean { return !!produto.deleted_at; }

/** Usa taxa_retencao (renomeado de retencao) */
export function calcularRetencao(produto: Produto, quantidade = 1): number {
    if (!isServico(produto) || !produto.taxa_retencao) return 0;
    return (produto.preco_venda * quantidade * produto.taxa_retencao) / 100;
}

export function calcularPrecoLiquido(produto: Produto, quantidade = 1): number {
    const total = produto.preco_venda * quantidade;
    if (!isServico(produto) || !produto.taxa_retencao) return total;
    return total - (total * produto.taxa_retencao) / 100;
}

export function formatarPreco(valor: number): string {
    return valor.toLocaleString("pt-PT", { style: "currency", currency: "AOA", minimumFractionDigits: 2 }).replace('AOA', 'Kz').trim();
}

export function formatarData(data: string | null): string {
    if (!data) return "-";
    try { return new Date(data).toLocaleDateString("pt-PT"); } catch { return data; }
}

export function formatarDataHora(data: string | null): string {
    if (!data) return "-";
    try { return new Date(data).toLocaleString("pt-PT"); } catch { return data; }
}

export function formatarUnidadeMedida(unidade: UnidadeMedida | undefined): string {
    if (!unidade) return "-";
    return { hora: "Hora(s)", dia: "Dia(s)", semana: "Semana(s)", mes: "Mês(es)" }[unidade] || unidade;
}

export function formatarNIF(nif: string | null): string {
    if (!nif) return "-";
    if (nif.length === 14) return `${nif.slice(0, 9)} ${nif.slice(9, 11)} ${nif.slice(11)}`;
    return nif;
}

export function getTipoClienteLabel(tipo: TipoCliente): string {
    return tipo === "consumidor_final" ? "Consumidor Final" : "Empresa";
}

export function getTipoClienteColor(tipo: TipoCliente): string {
    return tipo === "empresa" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700";
}

export function getStatusClienteLabel(status: string): string { return status === 'ativo' ? 'Ativo' : 'Inativo'; }
export function getStatusClienteColor(status: string): string { return status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'; }

export function getNomeTipoDocumento(tipo: TipoDocumentoFiscal): string { return NOMES_TIPO_DOCUMENTO[tipo] || tipo; }
export function podeGerarNaVenda(tipo: TipoDocumentoFiscal): boolean { return TIPOS_DOCUMENTO_VENDA.includes(tipo); }
export function ehVenda(tipo: TipoDocumentoFiscal): boolean { return TIPOS_VENDA.includes(tipo); }

export function getEstadoPagamentoColor(estado: EstadoPagamentoVenda): string {
    return { paga: 'bg-green-100 text-green-800', pendente: 'bg-yellow-100 text-yellow-800', parcial: 'bg-blue-100 text-blue-800', cancelada: 'bg-red-100 text-red-800' }[estado] || 'bg-gray-100 text-gray-800';
}

export function getEstadoDocumentoColor(estado: EstadoDocumentoFiscal): string {
    return { emitido: 'bg-blue-100 text-blue-800', paga: 'bg-green-100 text-green-800', parcialmente_paga: 'bg-teal-100 text-teal-800', cancelado: 'bg-red-100 text-red-800', expirado: 'bg-gray-100 text-gray-800' }[estado] || 'bg-gray-100 text-gray-800';
}

export function getTipoDocumentoColor(tipo: TipoDocumentoFiscal): string {
    return ({ FT: 'bg-blue-100 text-blue-800', FR: 'bg-green-100 text-green-800', FP: 'bg-orange-100 text-orange-800', FA: 'bg-purple-100 text-purple-800', NC: 'bg-red-100 text-red-800', ND: 'bg-amber-100 text-amber-800', RC: 'bg-teal-100 text-teal-800', FRt: 'bg-pink-100 text-pink-800' } as Record<TipoDocumentoFiscal, string>)[tipo] || 'bg-gray-100 text-gray-800';
}

export function getMetodoPagamentoNome(metodo?: string): string {
    return ({ transferencia: 'Transferência Bancária', multibanco: 'Multibanco', dinheiro: 'Dinheiro', cartao: 'Cartão', cheque: 'Cheque' } as Record<string, string>)[metodo || ''] || 'Não especificado';
}

export function validarPayloadVenda(payload: CriarVendaPayload): string | null {
    if (!payload.cliente_id && !payload.cliente_nome?.trim()) return 'É necessário informar um cliente (cadastrado ou avulso)';
    if (payload.tipo_documento === 'FR') {
        if (!payload.dados_pagamento) return 'Fatura-Recibo requer dados de pagamento';
        if (!payload.dados_pagamento.metodo) return 'Método de pagamento obrigatório para Fatura-Recibo';
        if (!payload.dados_pagamento.valor || payload.dados_pagamento.valor <= 0) return 'Valor de pagamento deve ser maior que zero';
    }
    return null;
}

export function getStatusBadge(produto: Produto): { texto: string; cor: string } {
    if (produto.deleted_at)           return { texto: "Na Lixeira", cor: "bg-red-100 text-red-800" };
    if (produto.status === "inativo") return { texto: "Inativo",    cor: "bg-gray-100 text-gray-800" };
    return { texto: "Ativo", cor: "bg-green-100 text-green-800" };
}

export function getTipoBadge(tipo: TipoProduto): { texto: string; cor: string } {
    return tipo === "servico" ? { texto: "Serviço", cor: "bg-blue-100 text-blue-800" } : { texto: "Produto", cor: "bg-purple-100 text-purple-800" };
}

/** Badge de retenção — usa taxa_retencao */
export function getRetencaoBadge(taxaRetencao?: number | null): { texto: string; cor: string } | null {
    if (!taxaRetencao) return null;
    return { texto: `Retenção ${taxaRetencao}%`, cor: "bg-orange-100 text-orange-800" };
}

export function calcularMargemLucro(precoCompra: number, precoVenda: number): number {
    if (!precoCompra || precoCompra <= 0) return 0;
    return ((precoVenda - precoCompra) / precoCompra) * 100;
}

/* ================== FUNÇÕES WRAPPER (retrocompatibilidade) ================== */
export async function obterDadosNovaVenda() { return vendaService.obterDadosNovaVenda(); }
export async function criarVenda(payload: CriarVendaPayload) { return vendaService.criar(payload); }
export async function emitirDocumentoFiscal(payload: CriarDocumentoFiscalPayload) { return documentoFiscalService.emitir(payload); }
export async function obterDashboard() { return dashboardService.fetch(); }
export async function obterResumoDocumentosFiscais() { return dashboardService.resumoDocumentosFiscais(); }
export async function obterEstatisticasPagamentos() { return dashboardService.estatisticasPagamentos(); }
export async function obterAlertasPendentes() { return dashboardService.alertasPendentes(); }
export async function obterEvolucaoMensal(ano?: number) { return dashboardService.evolucaoMensal(ano); }

// eslint-disable-next-line import/no-anonymous-default-export
export default { vendaService, documentoFiscalService, clienteService, fornecedorService, produtoService, categoriaService, stockService, dashboardService, relatorioService };