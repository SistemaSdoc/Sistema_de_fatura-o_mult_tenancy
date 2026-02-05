// src/services/produtos.ts

import api from "./axios";

// ===== TIPOS =====

export type TipoProduto = "produto" | "servico";
export type StatusProduto = "ativo" | "inativo";

// ===== INTERFACES =====

export interface Categoria {
    id: string;
    nome: string;
    descricao?: string;
}

export interface Produto {
    id: string;
    categoria_id: string;
    categoria?: Categoria;
    codigo?: string;
    nome: string;
    descricao?: string;
    preco_compra: number;
    preco_venda: number;
    taxa_iva: number;
    sujeito_iva: boolean;
    estoque_atual: number;
    estoque_minimo: number;
    status: StatusProduto;
    tipo: TipoProduto;
    created_at?: string;
    updated_at?: string;
}

export interface CriarProdutoInput {
    categoria_id: string;
    codigo?: string;
    nome: string;
    descricao?: string;
    preco_compra: number;
    preco_venda: number;
    taxa_iva?: number;
    sujeito_iva?: boolean;
    estoque_atual?: number;
    estoque_minimo?: number;
    status?: StatusProduto;
    tipo: TipoProduto;
}

export interface AtualizarProdutoInput extends Partial<CriarProdutoInput> { }

// ===== SERVIÇO =====

const API_PREFIX = "/api";

export const produtoService = {
    /**
     * Listar todos os produtos
     */
    async listarProdutos(apenasAtivos = true): Promise<Produto[]> {
        const params = apenasAtivos ? "?ativos=true" : "";
        const response = await api.get(`${API_PREFIX}/produtos${params}`);
        return response.data.produtos || [];
    },

    /**
     * Buscar produto por ID
     */
    async buscarProduto(id: string): Promise<Produto> {
        const response = await api.get(`${API_PREFIX}/produtos/${id}`);
        return response.data.produto;
    },

    /**
     * Criar novo produto/serviço
     */
    async criarProduto(dados: CriarProdutoInput): Promise<Produto> {
        const response = await api.post(`${API_PREFIX}/produtos`, dados);
        return response.data.produto;
    },

    /**
     * Atualizar produto
     */
    async atualizarProduto(id: string, dados: AtualizarProdutoInput): Promise<Produto> {
        const response = await api.put(`${API_PREFIX}/produtos/${id}`, dados);
        return response.data.produto;
    },

    /**
     * Alterar status (ativo/inativo)
     */
    async alterarStatus(id: string, status: StatusProduto): Promise<Produto> {
        const response = await api.patch(`${API_PREFIX}/produtos/${id}/status`, { status });
        return response.data.produto;
    },

    /**
     * Deletar produto
     */
    async deletarProduto(id: string): Promise<void> {
        await api.delete(`${API_PREFIX}/produtos/${id}`);
    },

    /**
     * Listar categorias (para o select)
     */
    async listarCategorias(): Promise<Categoria[]> {
        const response = await api.get(`${API_PREFIX}/categorias`);
        return response.data.categorias || [];
    },
};

// ===== UTILITÁRIOS =====

export function formatarPreco(valor: number): string {
    return valor.toLocaleString("pt-PT", {
        style: "currency",
        currency: "AOA",
        minimumFractionDigits: 2,
    });
}

export function calcularMargemLucro(precoCompra: number, precoVenda: number): number {
    if (!precoCompra) return 0;
    return ((precoVenda - precoCompra) / precoCompra) * 100;
}

export default produtoService;