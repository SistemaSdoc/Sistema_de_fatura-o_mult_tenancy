// src/services/categorias.ts
import api from "./axios";

export type StatusCategoria = "ativo" | "inativo";
export type TipoCategoria = "produto" | "servico";

export interface Categoria {
    id: number;
    nome: string;
    descricao: string | null;
    status: StatusCategoria;
    tipo: TipoCategoria;
    user_id: number;
    created_at?: string;
    updated_at?: string;
}

export interface CriarCategoriaInput {
    nome: string;
    descricao?: string;
    status?: StatusCategoria;
    tipo?: TipoCategoria;
}

export interface AtualizarCategoriaInput extends Partial<CriarCategoriaInput> { }

const API_PREFIX = "/api";

export const categoriaService = {
    async listarCategorias(): Promise<Categoria[]> {
        console.log('[CATEGORIA SERVICE] Listar categorias - Iniciando...');
        const response = await api.get(`${API_PREFIX}/categorias`);
        console.log('[CATEGORIA SERVICE] Listar categorias - Sucesso:', response.data);
        return response.data.categorias || [];
    },

    async buscarCategoria(id: number): Promise<Categoria> {
        console.log('[CATEGORIA SERVICE] Buscar categoria - ID:', id);
        const response = await api.get(`${API_PREFIX}/categorias/${id}`);
        console.log('[CATEGORIA SERVICE] Buscar categoria - Sucesso:', response.data);
        return response.data.categoria;
    },

    async criarCategoria(dados: CriarCategoriaInput): Promise<Categoria> {
        console.log('[CATEGORIA SERVICE] Criar categoria - Dados:', dados);
        const response = await api.post(`${API_PREFIX}/categorias`, dados);
        console.log('[CATEGORIA SERVICE] Criar categoria - Sucesso:', response.data);
        return response.data.categoria;
    },

    async atualizarCategoria(id: number, dados: AtualizarCategoriaInput): Promise<Categoria> {
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║ [CATEGORIA SERVICE] ATUALIZAR CATEGORIA - INÍCIO        ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log('[CATEGORIA SERVICE] ID:', id, 'Dados:', dados);

        const url = `${API_PREFIX}/categorias/${id}`;

        try {
            const response = await api.put(url, dados);
            console.log('[CATEGORIA SERVICE] Sucesso:', response.status);
            return response.data.categoria;
        } catch (error: any) {
            console.error('[CATEGORIA SERVICE] ERRO:', error.response?.status, error.response?.data?.message);
            throw error;
        }
    },

    async deletarCategoria(id: number): Promise<void> {
        console.log('[CATEGORIA SERVICE] Deletar categoria - ID:', id);
        const response = await api.delete(`${API_PREFIX}/categorias/${id}`);
        console.log('[CATEGORIA SERVICE] Deletar categoria - Sucesso:', response.status);
    },
};

export function getStatusColor(status: StatusCategoria): string {
    return status === "ativo"
        ? "bg-green-100 text-green-700 border-green-200"
        : "bg-red-100 text-red-700 border-red-200";
}

export function getTipoColor(tipo: TipoCategoria): string {
    return tipo === "produto"
        ? "bg-blue-100 text-blue-700 border-blue-200"
        : "bg-purple-100 text-purple-700 border-purple-200";
}

export function getStatusLabel(status: StatusCategoria): string {
    return status === "ativo" ? "Ativo" : "Inativo";
}

export function getTipoLabel(tipo: TipoCategoria): string {
    return tipo === "produto" ? "Produto" : "Serviço";
}

export default categoriaService;