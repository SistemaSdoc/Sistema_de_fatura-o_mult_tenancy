// src/services/produtos.ts

import api from "./axios";

// ===== TIPOS =====

export type StatusProduto = "ativo" | "inativo";
export type TipoProduto = "produto" | "servico";
export type UnidadeMedida = "hora" | "dia" | "semana" | "mes";
export type TipoPreco = "fixo" | "margem" | "markup";
export type CodigoIsencao = "M00" | "M01" | "M02" | "M03" | "M04" | "M05" | "M06" | "M99";
// ===== INTERFACES =====

export interface Categoria {
    id: string;
    nome: string;
    descricao?: string;
    tipo?: "produto" | "servico";
    status?: "ativo" | "inativo";
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
}

export interface Fornecedor {
    id: string;
    nome: string;
    nif?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
    tipo?: "nacional" | "internacional";
    status?: "ativo" | "inativo";
}

export interface MovimentoStock {
    id: string;
    produto_id: string;
    produto?: Produto;
    user_id: string;
    user?: { id: string; name: string };
    tipo: "entrada" | "saida";
    // venda_cancelada adicionado — alinhado com VendaService::cancelarVenda()
    tipo_movimento: "compra" | "venda" | "venda_cancelada" | "ajuste" | "nota_credito" | "devolucao";
    quantidade: number;
    estoque_anterior?: number;
    estoque_novo?: number;
    custo_medio?: number;
    custo_unitario?: number;
    referencia?: string;
    observacao?: string;
    created_at: string;
    updated_at?: string;
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

    tipo_preco?: TipoPreco;
    despesas_adicionais?: number;
    margem_lucro?: number;
    markup?: number;
        // NOVOS: Campos de cálculo de preço
    // Campos exclusivos de SERVIÇOS
    taxa_retencao?: number | null;
    duracao_estimada?: string;
    unidade_medida?: UnidadeMedida;
    codigo_isencao?: CodigoIsencao | null;  // NOVO

    // Soft delete
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
    markup?:number;
    tipo_preco?:string;
    despesas_adicionais?:number;
    margem_lucro?:number;
    // Serviços
    taxa_retencao?: number;
    duracao_estimada?: string;
    unidade_medida?: UnidadeMedida;
 codigo_isencao?: CodigoIsencao;

}

export type AtualizarProdutoInput = Partial<CriarProdutoInput>;

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
    async listarProdutos(params: ListarProdutosParams = {}): Promise<ListarProdutosResponse> {
        const q = new URLSearchParams();
        if (params.tipo) q.append("tipo", params.tipo);
        if (params.status) q.append("status", params.status);
        if (params.categoria_id) q.append("categoria_id", params.categoria_id);
        if (params.busca) q.append("busca", params.busca);
        if (params.estoque_baixo) q.append("estoque_baixo", "true");
        if (params.sem_estoque) q.append("sem_estoque", "true");
        if (params.ordenar) q.append("ordenar", params.ordenar);
        if (params.direcao) q.append("direcao", params.direcao);
        if (params.paginar) q.append("paginar", "true");
        if (params.per_page) q.append("per_page", params.per_page.toString());
        if (params.apenas_servicos) q.append("apenas_servicos", "true");
        if (params.apenas_produtos) q.append("apenas_produtos", "true");
        if (params.com_retencao) q.append("com_retencao", "true");

        const response = await api.get(`${API_PREFIX}/produtos${q.toString() ? `?${q}` : ""}`);
        return response.data;
    },

    async listarTodosCompletos(
        params: Omit<ListarProdutosParams, "status" | "estoque_baixo" | "sem_estoque"> = {}
    ): Promise<ListarCompletosResponse> {
        const q = new URLSearchParams();
        if (params.tipo) q.append("tipo", params.tipo);
        if (params.busca) q.append("busca", params.busca);
        if (params.apenas_servicos) q.append("apenas_servicos", "true");
        if (params.apenas_produtos) q.append("apenas_produtos", "true");

        const response = await api.get(`${API_PREFIX}/produtos/todos${q.toString() ? `?${q}` : ""}`);
        return response.data;
    },

    async listarDeletados(
        params: Omit<ListarProdutosParams, "status" | "estoque_baixo" | "sem_estoque" | "categoria_id"> = {}
    ): Promise<ListarDeletadosResponse> {
        const q = new URLSearchParams();
        if (params.busca) q.append("busca", params.busca);
        if (params.paginar) q.append("paginar", "true");
        if (params.per_page) q.append("per_page", params.per_page.toString());

        const response = await api.get(`${API_PREFIX}/produtos/trashed${q.toString() ? `?${q}` : ""}`);
        return response.data;
    },

    async buscarProduto(id: string): Promise<ProdutoResponse> {
        const response = await api.get(`${API_PREFIX}/produtos/${id}`);
        return response.data;
    },

    async criarProduto(dados: CriarProdutoInput): Promise<ProdutoResponse> {
        const response = await api.post(`${API_PREFIX}/produtos`, dados);
        return response.data;
    },

    async atualizarProduto(id: string, dados: AtualizarProdutoInput): Promise<ProdutoResponse> {
        const response = await api.put(`${API_PREFIX}/produtos/${id}`, dados);
        return response.data;
    },

    async alterarStatus(id: string, status: StatusProduto): Promise<ProdutoResponse> {
        const response = await api.post(`${API_PREFIX}/produtos/${id}/status`, { status });
        return response.data;
    },

    async moverParaLixeira(id: string): Promise<DeletarResponse> {
        const response = await api.delete(`${API_PREFIX}/produtos/${id}`);
        return response.data;
    },

    async restaurarProduto(id: string): Promise<ProdutoResponse> {
        const response = await api.post(`${API_PREFIX}/produtos/${id}/restore`);
        return response.data;
    },

    async deletarPermanentemente(id: string): Promise<{ message: string; id: string }> {
        const response = await api.delete(`${API_PREFIX}/produtos/${id}/force`);
        return response.data;
    },

    async listarCategorias(params?: { tipo?: "produto" | "servico" }): Promise<Categoria[]> {
        const url = params?.tipo
            ? `${API_PREFIX}/categorias?tipo=${params.tipo}`
            : `${API_PREFIX}/categorias`;
        const response = await api.get(url);
        return response.data.categorias || [];
    },

    async listarServicos(params: Omit<ListarProdutosParams, "tipo"> = {}): Promise<ListarProdutosResponse> {
        return this.listarProdutos({ ...params, tipo: "servico" });
    },

    async listarApenasProdutos(params: Omit<ListarProdutosParams, "tipo"> = {}): Promise<ListarProdutosResponse> {
        return this.listarProdutos({ ...params, tipo: "produto" });
    },

    async listarServicosComRetencao(
        params: Omit<ListarProdutosParams, "tipo" | "com_retencao"> = {}
    ): Promise<ListarProdutosResponse> {
        return this.listarProdutos({ ...params, tipo: "servico", com_retencao: true });
    },

    async verificarStatus(id: string): Promise<{ existe: boolean; deletado: boolean; produto?: Produto }> {
        try {
            const { produto } = await this.buscarProduto(id);
            return { existe: true, deletado: !!produto.deleted_at, produto };
        } catch {
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
    estoque_atualizado?: { anterior: number; atual: number; diferenca: number };
    ajuste?: { anterior: number; novo: number; diferenca: number };
    transferencia?: {
        origem: { id: string; nome: string; estoque_anterior: number; estoque_novo: number };
        destino: { id: string; nome: string; estoque_anterior: number; estoque_novo: number };
        quantidade: number;
    };
}

export function calcularPrecoVenda(
    precoCompra: number,
    despesasAdicionais: number = 0,
    tipoPreco: TipoPreco = "fixo",
    margemOuMarkup: number = 0,
    precoFixo?: number
): number {
    const base = precoCompra + despesasAdicionais;

    switch (tipoPreco) {
        case "margem":
            if (margemOuMarkup <= 0 || margemOuMarkup >= 100) return base;
            return base / (1 - (margemOuMarkup / 100));
        
        case "markup":
            return base * (1 + (margemOuMarkup / 100));
        
        case "fixo":
        default:
            return precoFixo || base;
    }
}

/** Retorna label formatado para tipo de preço */
export function getTipoPrecoLabel(tipo: TipoPreco): string {
    return {
        fixo: "Preço Fixo",
        margem: "Margem de Lucro",
        markup: "Markup",
    }[tipo];
}

/** Retorna descrição da fórmula usada */
export function getFormulaDescricao(tipo: TipoPreco): string {
    return {
        fixo: "Preço definido manualmente",
        margem: "(Custo + Despesas) ÷ (1 - Margem%)",
        markup: "(Custo + Despesas) × (1 + Markup%)",
    }[tipo];
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
    async listarMovimentos(params: {
        produto_id?: string;
        tipo?: "entrada" | "saida";
        tipo_movimento?: string;
        data_inicio?: string;
        data_fim?: string;
        paginar?: boolean;
        per_page?: number;
    } = {}): Promise<{ message: string; movimentos: MovimentoStock[] | PaginatedResponse<MovimentoStock> }> {
        const q = new URLSearchParams();
        if (params.produto_id) q.append("produto_id", params.produto_id);
        if (params.tipo) q.append("tipo", params.tipo);
        if (params.tipo_movimento) q.append("tipo_movimento", params.tipo_movimento);
        if (params.data_inicio) q.append("data_inicio", params.data_inicio);
        if (params.data_fim) q.append("data_fim", params.data_fim);
        if (params.paginar) q.append("paginar", "true");
        if (params.per_page) q.append("per_page", params.per_page.toString());

        const response = await api.get(`${API_PREFIX}/movimentos-stock${q.toString() ? `?${q}` : ""}`);
        return response.data;
    },

    async resumo(): Promise<ResumoStockResponse> {
        const response = await api.get(`${API_PREFIX}/movimentos-stock/resumo`);
        return response.data;
    },

    async historicoProduto(produtoId: string, page = 1): Promise<{
        message: string;
        produto: { id: string; nome: string; estoque_atual: number };
        movimentos: PaginatedResponse<MovimentoStock>;
    }> {
        const response = await api.get(`${API_PREFIX}/movimentos-stock/produto/${produtoId}?page=${page}`);
        return response.data;
    },

    async criarMovimento(dados: CriarMovimentoInput): Promise<MovimentoResponse> {
        const response = await api.post(`${API_PREFIX}/movimentos-stock`, dados);
        return response.data;
    },

    async ajuste(dados: AjusteStockInput): Promise<MovimentoResponse> {
        const response = await api.post(`${API_PREFIX}/movimentos-stock/ajuste`, dados);
        return response.data;
    },

    async transferencia(dados: TransferenciaInput): Promise<MovimentoResponse> {
        const response = await api.post(`${API_PREFIX}/movimentos-stock/transferencia`, dados);
        return response.data;
    },

    async buscarMovimento(id: string): Promise<{ message: string; movimento: MovimentoStock }> {
        const response = await api.get(`${API_PREFIX}/movimentos-stock/${id}`);
        return response.data;
    },

    async estatisticas(params: {
        data_inicio?: string;
        data_fim?: string;
        produto_id?: string;
    } = {}): Promise<{ message: string; estatisticas: EstatisticasMovimento }> {
        const q = new URLSearchParams();
        if (params.data_inicio) q.append("data_inicio", params.data_inicio);
        if (params.data_fim) q.append("data_fim", params.data_fim);
        if (params.produto_id) q.append("produto_id", params.produto_id);

        const response = await api.get(`${API_PREFIX}/movimentos-stock/estatisticas${q.toString() ? `?${q}` : ""}`);
        return response.data;
    },
};

// ===== UTILITÁRIOS =====

export function isServico(produto: Produto): boolean {
    return produto.tipo === "servico";
}

export function isProduto(produto: Produto): boolean {
    return produto.tipo === "produto";
}

export function estaNaLixeira(produto: Produto): boolean {
    return !!produto.deleted_at;
}

export function estaEstoqueBaixo(produto: Produto): boolean {
    if (isServico(produto)) return false;
    return produto.estoque_atual > 0 && produto.estoque_atual <= produto.estoque_minimo;
}

export function estaSemEstoque(produto: Produto): boolean {
    if (isServico(produto)) return false;
    return produto.estoque_atual === 0;
}

export function calcularValorEstoque(produto: Produto): number {
    if (isServico(produto)) return 0;
    return produto.estoque_atual * (produto.custo_medio || produto.preco_compra || 0);
}

export function calcularValorTotalEstoque(produtos: Produto[]): number {
    return produtos.reduce((total, p) => total + calcularValorEstoque(p), 0);
}

export function calcularMargemLucro(precoCompra: number, precoVenda: number): number {
    if (!precoCompra || precoCompra <= 0) return 0;
    return ((precoVenda - precoCompra) / precoCompra) * 100;
}

/** Calcula retenção — usa taxa_retencao (renomeado de retencao) */
export function calcularRetencao(produto: Produto, quantidade = 1): number {
    if (!isServico(produto) || !produto.taxa_retencao) return 0;
    return (produto.preco_venda * quantidade * produto.taxa_retencao) / 100;
}

/** Preço líquido após retenção */
export function calcularPrecoLiquido(produto: Produto, quantidade = 1): number {
    const total = produto.preco_venda * quantidade;
    if (!isServico(produto) || !produto.taxa_retencao) return total;
    return total - (total * produto.taxa_retencao) / 100;
}

export function contarStatusEstoque(produtos: Produto[]) {
    const fisicos = produtos.filter(isProduto);
    return {
        total: fisicos.length,
        estoqueBaixo: fisicos.filter(estaEstoqueBaixo).length,
        semEstoque: fisicos.filter(estaSemEstoque).length,
        normal: fisicos.filter(p => !estaEstoqueBaixo(p) && !estaSemEstoque(p)).length,
    };
}

export function estatisticasServicos(servicos: Produto[]) {
    const ativos = servicos.filter(s => s.status === "ativo");
    const total = servicos.length || 1;
    return {
        total: servicos.length,
        ativos: ativos.length,
        inativos: servicos.length - ativos.length,
        precoMedio: servicos.reduce((acc, s) => acc + s.preco_venda, 0) / total,
        retencaoMedia: servicos.reduce((acc, s) => acc + (s.taxa_retencao || 0), 0) / total,
        comRetencao: servicos.filter(s => s.taxa_retencao && s.taxa_retencao > 0).length,
        semRetencao: servicos.filter(s => !s.taxa_retencao || s.taxa_retencao === 0).length,
    };
}

export function formatarPreco(valor: number): string {
    return valor.toLocaleString("pt-PT", {
        style: "currency", currency: "AOA", minimumFractionDigits: 2,
    }).replace("AOA", "Kz").trim();
}

export function formatarData(data: string | null): string {
    if (!data) return "-";
    try { return new Date(data).toLocaleDateString("pt-PT"); }
    catch { return data; }
}

export function formatarDataHora(data: string | null): string {
    if (!data) return "-";
    try { return new Date(data).toLocaleString("pt-PT"); }
    catch { return data; }
}

export function formatarUnidadeMedida(unidade: UnidadeMedida | undefined): string {
    if (!unidade) return "-";
    return { hora: "Hora(s)", dia: "Dia(s)", semana: "Semana(s)", mes: "Mês(es)" }[unidade] || unidade;
}

export function getStatusBadge(produto: Produto): { texto: string; cor: string } {
    if (produto.deleted_at) return { texto: "Na Lixeira", cor: "bg-red-100 text-red-800" };
    if (produto.status === "inativo") return { texto: "Inativo", cor: "bg-gray-100 text-gray-800" };
    return { texto: "Ativo", cor: "bg-green-100 text-green-800" };
}

export function getTipoBadge(tipo: TipoProduto): { texto: string; cor: string } {
    return tipo === "servico"
        ? { texto: "Serviço", cor: "bg-blue-100 text-blue-800" }
        : { texto: "Produto", cor: "bg-purple-100 text-purple-800" };
}

/** Badge de retenção — usa taxa_retencao */
export function getRetencaoBadge(taxaRetencao?: number | null): { texto: string; cor: string } | null {
    if (!taxaRetencao) return null;
    return { texto: `Retenção ${taxaRetencao}%`, cor: "bg-orange-100 text-orange-800" };
}

export default produtoService;