// src/services/produtos.ts

import api from "./axios";

// ===== TIPOS =====

export type TipoProduto = "produto" | "servico";
export type StatusProduto = "ativo" | "inativo";
export type UnidadeMedida = "hora" | "dia" | "semana" | "mes";

// ===== INTERFACES =====

export interface Categoria {
    id: string;
    nome: string;
    descricao?: string;
    tipo?: "produto" | "servico"; // ✅ NOVO: tipo da categoria
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
}

export interface Fornecedor {
    id: string;
    nome: string;
    email?: string;
    telefone?: string;
    nif?: string;
    tipo?: "nacional" | "internacional";
    status?: "ativo" | "inativo";
    // ... outros campos do fornecedor
}

export interface MovimentoStock {
    produto: any;
    id: string;
    produto_id: string;
    user_id: string;
    tipo: "entrada" | "saida";
    tipo_movimento: "compra" | "venda" | "ajuste" | "nota_credito" | "devolucao";
    quantidade: number;
    observacao?: string;
    referencia?: string;
    custo_medio?: number;
    custo_unitario?: number;
    estoque_anterior: number;
    estoque_novo: number;
    created_at: string;
    updated_at: string;
    user?: {
        id: string;
        name: string;
    };
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
    
    // ✅ Campos de serviço
    retencao?: number;               // Taxa de retenção (%)
    duracao_estimada?: string;        // Ex: "2 horas", "1 dia"
    unidade_medida?: UnidadeMedida;   // hora, dia, semana, mes
    
    // ✅ Campos calculados
    valor_retencao?: number;          // Valor da retenção (calculado)
    preco_liquido?: number;           // Preço após retenção
    
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
    
    // ✅ Campos de serviço
    retencao?: number;
    duracao_estimada?: string;
    unidade_medida?: UnidadeMedida;
}

export interface AtualizarProdutoInput extends Partial<CriarProdutoInput> { }

// ===== PARÂMETROS DE LISTAGEM =====

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

// ===== RESPOSTAS =====

export interface ListarProdutosResponse {
    message: string;
    produtos: Produto[] | PaginatedResponse<Produto>;
}

export interface ListarCompletosResponse {
    message: string;
    produtos: Produto[];
    total: number;
    ativos: number;
    deletados: number;
    produtos_fisicos: number;
    servicos: number;
}

export interface ListarDeletadosResponse {
    message: string;
    produtos: Produto[] | PaginatedResponse<Produto>;
    total_deletados: number;
}

export interface ProdutoResponse {
    message: string;
    produto: Produto;
}

export interface DeletarResponse {
    message: string;
    soft_deleted: boolean;
    id: string;
    deleted_at?: string;
}

// ===== SERVIÇO =====

const API_PREFIX = "/api";

export const produtoService = {
    /**
     * Listar produtos ativos (não deletados) com filtros e paginação opcional
     */
    async listarProdutos(params: ListarProdutosParams = {}): Promise<ListarProdutosResponse> {
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
        
        // ✅ NOVOS FILTROS
        if (params.apenas_servicos) queryParams.append("apenas_servicos", "true");
        if (params.apenas_produtos) queryParams.append("apenas_produtos", "true");
        if (params.com_retencao) queryParams.append("com_retencao", "true");

        const queryString = queryParams.toString();
        const url = `${API_PREFIX}/produtos${queryString ? `?${queryString}` : ""}`;

        const response = await api.get(url);
        return response.data;
    },

    /**
     * Listar todos os produtos (ativos + deletados) - para admin
     */
    async listarTodosCompletos(params: Omit<ListarProdutosParams, "with_trashed" | "status" | "estoque_baixo" | "sem_estoque"> = {}): Promise<ListarCompletosResponse> {
        const queryParams = new URLSearchParams();

        if (params.tipo) queryParams.append("tipo", params.tipo);
        if (params.busca) queryParams.append("busca", params.busca);
        if (params.apenas_servicos) queryParams.append("apenas_servicos", "true");
        if (params.apenas_produtos) queryParams.append("apenas_produtos", "true");

        const queryString = queryParams.toString();
        const url = `${API_PREFIX}/produtos/all${queryString ? `?${queryString}` : ""}`;

        const response = await api.get(url);
        return response.data;
    },

    /**
     * Listar APENAS produtos deletados (lixeira) com filtros
     */
    async listarDeletados(params: Omit<ListarProdutosParams, "with_trashed" | "status" | "estoque_baixo" | "sem_estoque" | "categoria_id"> = {}): Promise<ListarDeletadosResponse> {
        const queryParams = new URLSearchParams();

        if (params.busca) queryParams.append("busca", params.busca);
        if (params.paginar) queryParams.append("paginar", "true");
        if (params.per_page) queryParams.append("per_page", params.per_page.toString());

        const queryString = queryParams.toString();
        const url = `${API_PREFIX}/produtos/trashed${queryString ? `?${queryString}` : ""}`;

        const response = await api.get(url);
        return response.data;
    },

    /**
     * Buscar produto por ID com todos os relacionamentos
     */
    async buscarProduto(id: string): Promise<ProdutoResponse> {
        const response = await api.get(`${API_PREFIX}/produtos/${id}`);
        return response.data;
    },

    /**
     * Criar novo produto/serviço
     */
    async criarProduto(dados: CriarProdutoInput): Promise<ProdutoResponse> {
        // ✅ Log para debug
        console.log('[ProdutoService] Criando item:', {
            tipo: dados.tipo,
            nome: dados.nome,
            retencao: dados.retencao
        });
        
        const response = await api.post(`${API_PREFIX}/produtos`, dados);
        return response.data;
    },

    /**
     * Atualizar produto
     */
    async atualizarProduto(id: string, dados: AtualizarProdutoInput): Promise<ProdutoResponse> {
        // ✅ Log para debug
        console.log('[ProdutoService] Atualizando item:', {
            id,
            tipo: dados.tipo,
            retencao: dados.retencao
        });
        
        const response = await api.put(`${API_PREFIX}/produtos/${id}`, dados);
        return response.data;
    },

    /**
     * Alterar status (ativo/inativo)
     */
    async alterarStatus(id: string, status: StatusProduto): Promise<ProdutoResponse> {
        const response = await api.post(`${API_PREFIX}/produtos/${id}/status`, { status });
        return response.data;
    },

    /**
     * Mover para lixeira (soft delete)
     */
    async moverParaLixeira(id: string): Promise<DeletarResponse> {
        const response = await api.delete(`${API_PREFIX}/produtos/${id}`);
        return response.data;
    },

    /**
     * Restaurar produto da lixeira
     */
    async restaurarProduto(id: string): Promise<ProdutoResponse> {
        const response = await api.post(`${API_PREFIX}/produtos/${id}/restore`);
        return response.data;
    },

    /**
     * Deletar permanentemente (force delete) - apenas admin
     */
    async deletarPermanentemente(id: string): Promise<{ message: string; id: string }> {
        const response = await api.delete(`${API_PREFIX}/produtos/${id}/force`);
        return response.data;
    },

    /**
     * Listar categorias (para o select)
     */
    async listarCategorias(params?: { tipo?: "produto" | "servico" }): Promise<Categoria[]> {
        let url = `${API_PREFIX}/categorias`;
        if (params?.tipo) {
            url += `?tipo=${params.tipo}`;
        }
        const response = await api.get(url);
        return response.data.categorias || [];
    },

    /**
     * ✅ NOVO: Listar apenas serviços
     */
    async listarServicos(params: Omit<ListarProdutosParams, "tipo"> = {}): Promise<ListarProdutosResponse> {
        return this.listarProdutos({ ...params, tipo: "servico" });
    },

    /**
     * ✅ NOVO: Listar apenas produtos
     */
    async listarApenasProdutos(params: Omit<ListarProdutosParams, "tipo"> = {}): Promise<ListarProdutosResponse> {
        return this.listarProdutos({ ...params, tipo: "produto" });
    },

    /**
     * ✅ NOVO: Listar serviços com retenção
     */
    async listarServicosComRetencao(params: Omit<ListarProdutosParams, "tipo" | "com_retencao"> = {}): Promise<ListarProdutosResponse> {
        return this.listarProdutos({ 
            ...params, 
            tipo: "servico",
            com_retencao: true 
        });
    },

    /**
     * Verificar se produto está na lixeira
     */
    async verificarStatus(id: string): Promise<{ existe: boolean; deletado: boolean; produto?: Produto }> {
        try {
            const { produto } = await this.buscarProduto(id);
            return {
                existe: true,
                deletado: !!produto.deleted_at,
                produto
            };
        } catch (error) {
            return { existe: false, deletado: false };
        }
    },
};

// ===== SERVIÇO DE MOVIMENTOS DE STOCK =====

export interface CriarMovimentoInput {
    produto_id: string;
    tipo: "entrada" | "saida";
    tipo_movimento: "compra" | "venda" | "ajuste" | "nota_credito" | "devolucao";
    quantidade: number;
    motivo: string;
    referencia?: string;
    custo_unitario?: number;
}

export interface AjusteStockInput {
    produto_id: string;
    quantidade: number;
    motivo: string;
    custo_medio?: number;
}

export interface TransferenciaInput {
    produto_origem_id: string;
    produto_destino_id: string;
    quantidade: number;
    motivo: string;
}

export interface MovimentoResponse {
    message: string;
    movimento: MovimentoStock;
    estoque_atualizado?: {
        anterior: number;
        atual: number;
        diferenca: number;
    };
    ajuste?: {
        anterior: number;
        novo: number;
        diferenca: number;
    };
    transferencia?: {
        origem: {
            id: string;
            nome: string;
            estoque_anterior: number;
            estoque_novo: number;
        };
        destino: {
            id: string;
            nome: string;
            estoque_anterior: number;
            estoque_novo: number;
        };
        quantidade: number;
    };
}

export interface ResumoStockResponse {
    totalProdutos: number;
    produtosAtivos: number;
    produtosEstoqueBaixo: number;
    produtosSemEstoque: number;
    valorTotalEstoque: number;
    movimentacoesHoje: number;
    entradasHoje: number;
    saidasHoje: number;
    produtos_criticos: Produto[];
}

export interface EstatisticasMovimento {
    total_movimentos: number;
    total_entradas: number;
    total_saidas: number;
    por_tipo: Array<{ tipo_movimento: string; total: number }>;
    por_mes: Array<{ mes: string; entradas: number; saidas: number }>;
}

export const movimentoStockService = {
    /**
     * Listar todos os movimentos de stock
     */
    async listarMovimentos(params: {
        produto_id?: string;
        tipo?: "entrada" | "saida";
        tipo_movimento?: string;
        data_inicio?: string;
        data_fim?: string;
        paginar?: boolean;
        per_page?: number;
    } = {}): Promise<{ message: string; movimentos: MovimentoStock[] | PaginatedResponse<MovimentoStock> }> {
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
        return response.data;
    },

    /**
     * Resumo do estoque (para dashboard)
     */
    async resumo(): Promise<ResumoStockResponse> {
        const response = await api.get(`${API_PREFIX}/movimentos-stock/resumo`);
        return response.data;
    },

    /**
     * Histórico de movimentos de um produto específico
     */
    async historicoProduto(produtoId: string, page = 1): Promise<{
        message: string;
        produto: { id: string; nome: string; estoque_atual: number };
        movimentos: PaginatedResponse<MovimentoStock>;
    }> {
        const response = await api.get(`${API_PREFIX}/movimentos-stock/produto/${produtoId}?page=${page}`);
        return response.data;
    },

    /**
     * Criar novo movimento de stock (entrada/saída)
     */
    async criarMovimento(dados: CriarMovimentoInput): Promise<MovimentoResponse> {
        const response = await api.post(`${API_PREFIX}/movimentos-stock`, dados);
        return response.data;
    },

    /**
     * Ajuste manual de stock (correção de inventário)
     */
    async ajuste(dados: AjusteStockInput): Promise<MovimentoResponse> {
        const response = await api.post(`${API_PREFIX}/movimentos-stock/ajuste`, dados);
        return response.data;
    },

    /**
     * Transferência entre produtos
     */
    async transferencia(dados: TransferenciaInput): Promise<MovimentoResponse> {
        const response = await api.post(`${API_PREFIX}/movimentos-stock/transferencia`, dados);
        return response.data;
    },

    /**
     * Mostrar movimento específico
     */
    async buscarMovimento(id: string): Promise<{ message: string; movimento: MovimentoStock }> {
        const response = await api.get(`${API_PREFIX}/movimentos-stock/${id}`);
        return response.data;
    },

    /**
     * Estatísticas de movimentos (relatório)
     */
    async estatisticas(params: {
        data_inicio?: string;
        data_fim?: string;
        produto_id?: string;
    } = {}): Promise<{ message: string; estatisticas: EstatisticasMovimento }> {
        const queryParams = new URLSearchParams();

        if (params.data_inicio) queryParams.append("data_inicio", params.data_inicio);
        if (params.data_fim) queryParams.append("data_fim", params.data_fim);
        if (params.produto_id) queryParams.append("produto_id", params.produto_id);

        const queryString = queryParams.toString();
        const url = `${API_PREFIX}/movimentos-stock/estatisticas${queryString ? `?${queryString}` : ""}`;

        const response = await api.get(url);
        return response.data;
    },
};

// ===== UTILITÁRIOS =====

export function formatarPreco(valor: number): string {
    return valor.toLocaleString("pt-PT", {
        style: "currency",
        currency: "AOA",
        minimumFractionDigits: 2,
    }).replace("AOA", "Kz");
}

export function calcularMargemLucro(precoCompra: number, precoVenda: number): number {
    if (!precoCompra || precoCompra <= 0) return 0;
    return ((precoVenda - precoCompra) / precoCompra) * 100;
}

export function calcularValorEstoque(produto: Produto): number {
    if (produto.tipo === "servico") return 0;
    return produto.estoque_atual * (produto.custo_medio || produto.preco_compra || 0);
}

export function estaEstoqueBaixo(produto: Produto): boolean {
    if (produto.tipo === "servico") return false;
    return produto.estoque_atual > 0 && produto.estoque_atual <= produto.estoque_minimo;
}

export function estaSemEstoque(produto: Produto): boolean {
    if (produto.tipo === "servico") return false;
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

export function formatarDuracao(duracao: string, unidade: string): string {
    return `${duracao} ${unidade}`;
}

/**
 * ✅ NOVO: Calcular valor da retenção de um serviço
 */
export function calcularRetencao(produto: Produto, quantidade = 1): number {
    if (!isServico(produto) || !produto.retencao) return 0;
    return (produto.preco_venda * quantidade * produto.retencao) / 100;
}

/**
 * ✅ NOVO: Calcular preço líquido (após retenção)
 */
export function calcularPrecoLiquido(produto: Produto, quantidade = 1): number {
    const total = produto.preco_venda * quantidade;
    if (!isServico(produto) || !produto.retencao) return total;
    return total - (total * produto.retencao) / 100;
}

/**
 * Verifica se o produto está na lixeira
 */
export function estaNaLixeira(produto: Produto): boolean {
    return !!produto.deleted_at;
}

/**
 * Verifica se é um serviço (não tem controle de stock)
 */
export function isServico(produto: Produto): boolean {
    return produto.tipo === "servico";
}

/**
 * Verifica se é um produto (tem controle de stock)
 */
export function isProduto(produto: Produto): boolean {
    return produto.tipo === "produto";
}

/**
 * Retorna badge de status para o produto
 */
export function getStatusBadge(produto: Produto): { texto: string; cor: string } {
    if (produto.deleted_at) {
        return { texto: "Na Lixeira", cor: "bg-red-100 text-red-800" };
    }
    if (produto.status === "inativo") {
        return { texto: "Inativo", cor: "bg-gray-100 text-gray-800" };
    }
    return { texto: "Ativo", cor: "bg-green-100 text-green-800" };
}

/**
 * Retorna badge de tipo (produto vs serviço)
 */
export function getTipoBadge(tipo: TipoProduto): { texto: string; cor: string } {
    if (tipo === "servico") {
        return { texto: "Serviço", cor: "bg-blue-100 text-blue-800" };
    }
    return { texto: "Produto", cor: "bg-purple-100 text-purple-800" };
}

/**
 * Retorna badge de retenção para serviços
 */
export function getRetencaoBadge(retencao?: number): { texto: string; cor: string } | null {
    if (!retencao) return null;
    return {
        texto: `Retenção ${retencao}%`,
        cor: "bg-orange-100 text-orange-800"
    };
}

/**
 * Formata a unidade de medida para exibição
 */
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

/**
 * Calcula o valor total do estoque de uma lista de produtos
 */
export function calcularValorTotalEstoque(produtos: Produto[]): number {
    return produtos.reduce((total, produto) => {
        if (produto.tipo === "servico") return total;
        return total + calcularValorEstoque(produto);
    }, 0);
}

/**
 * Conta produtos por status de estoque
 */
export function contarStatusEstoque(produtos: Produto[]) {
    const fisicos = produtos.filter(p => p.tipo === "produto");
    return {
        total: fisicos.length,
        estoqueBaixo: fisicos.filter(estaEstoqueBaixo).length,
        semEstoque: fisicos.filter(estaSemEstoque).length,
        normal: fisicos.filter(p => !estaEstoqueBaixo(p) && !estaSemEstoque(p)).length,
    };
}

/**
 * ✅ NOVO: Estatísticas de serviços
 */
export function estatisticasServicos(servicos: Produto[]) {
    const ativos = servicos.filter(s => s.status === "ativo");
    return {
        total: servicos.length,
        ativos: ativos.length,
        inativos: servicos.length - ativos.length,
        precoMedio: servicos.reduce((acc, s) => acc + s.preco_venda, 0) / (servicos.length || 1),
        retencaoMedia: servicos.reduce((acc, s) => acc + (s.retencao || 0), 0) / (servicos.length || 1),
        comRetencao: servicos.filter(s => s.retencao && s.retencao > 0).length,
        semRetencao: servicos.filter(s => !s.retencao || s.retencao === 0).length,
    };
}

export default produtoService;