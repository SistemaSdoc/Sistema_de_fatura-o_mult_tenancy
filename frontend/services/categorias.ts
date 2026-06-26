// src/services/categorias.ts

import api from "./axios";

export type StatusCategoria = "ativo" | "inativo";
export type TipoCategoria = "produto" | "servico";

// Códigos de isenção SAF-T válidos em Angola
export type CodigoIsencao = "M00" | "M01" | "M02" | "M03" | "M04" | "M05" | "M06" | "M99";

// Taxas de IVA válidas em Angola (AGT)
export type TaxaIVA = 0 | 5 | 14;

export interface Categoria {
    id: string;
    nome: string;
    descricao: string | null;
    status: StatusCategoria;
    tipo: TipoCategoria;
    user_id: string;
    taxa_iva: number;
    sujeito_iva: boolean;
    codigo_isencao: CodigoIsencao | null;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
    produtos_count?: number;
}

export interface CategoriaComputed extends Categoria {
    label_iva: string;
    taxa_iva_efectiva: number;
    is_isenta: boolean;
}

export interface CategoriaSelect {
    id: string;
    nome: string;
    taxa_iva: number;
    label_iva: string;
}

export interface CriarCategoriaInput {
    nome: string;
    descricao?: string;
    status?: StatusCategoria;
    tipo?: TipoCategoria;
    taxa_iva?: TaxaIVA;
    sujeito_iva?: boolean;
    codigo_isencao?: CodigoIsencao;
}

export type AtualizarCategoriaInput = Partial<CriarCategoriaInput>;

export interface FiltrosCategoria {
    tipo?: TipoCategoria;
    status?: StatusCategoria;
    busca?: string;
}

export interface ResumoCategorias {
    total: number;
    iva_14: number;
    iva_5: number;
    isentas: number;
}

export interface ListarCategoriasResponse {
    message: string;
    categorias: Categoria[];
    resumo?: ResumoCategorias;
    total?: number;
}

export interface ParaSelectProdutosResponse {
    message: string;
    categorias: CategoriaSelect[];
}

export interface DetalheCategoriaResponse {
    message: string;
    categoria: Categoria;
}

export interface CriarCategoriaResponse {
    message: string;
    categoria: Categoria;
}

export interface AtualizarCategoriaResponse {
    message: string;
    categoria: Categoria;
}

export interface DeletarCategoriaResponse {
    message: string;
    deleted?: boolean;
}

export interface DeletarCategoriaError {
    message: string;
    error: "produtos_activos" | "produtos_associados";
}

export interface RestaurarCategoriaResponse {
    message: string;
    categoria: Categoria;
}

const API_PREFIX = "/api";

export const categoriaService = {
    /**
     * Listar categorias ativas (padrão)
     * ✅ CORRIGIDO: Mapeia response.data.data para categorias
     */
    async listarCategorias(filtros?: FiltrosCategoria): Promise<ListarCategoriasResponse> {
        const params = new URLSearchParams();
        if (filtros?.tipo) params.append("tipo", filtros.tipo);
        if (filtros?.status) params.append("status", filtros.status);
        if (filtros?.busca) params.append("busca", filtros.busca);

        const url = `${API_PREFIX}/categorias${params.toString() ? `?${params.toString()}` : ""}`;
        const response = await api.get<{
            success: boolean;
            message: string;
            data: Categoria[];
            resumo?: ResumoCategorias;
            modo?: string;
        }>(url);
        
        return {
            message: response.data.message || "Lista de categorias carregada com sucesso",
            categorias: response.data.data || [],
            resumo: response.data.resumo,
            total: response.data.data?.length || 0,
        };
    },

    /**
     * Listar TODAS as categorias (incluindo inativas)
     * ✅ CORRIGIDO
     */
    async listarTodasCategorias(filtros?: FiltrosCategoria): Promise<ListarCategoriasResponse> {
        const params = new URLSearchParams();
        if (filtros?.tipo) params.append("tipo", filtros.tipo);
        if (filtros?.status) params.append("status", filtros.status);
        if (filtros?.busca) params.append("busca", filtros.busca);

        const url = `${API_PREFIX}/categorias/todas${params.toString() ? `?${params.toString()}` : ""}`;
        const response = await api.get<{
            success: boolean;
            message: string;
            data: Categoria[];
            total?: number;
            modo?: string;
        }>(url);
        
        return {
            message: response.data.message || "Lista de todas as categorias carregada com sucesso",
            categorias: response.data.data || [],
            total: response.data.total || response.data.data?.length || 0,
        };
    },

    /**
     * Listar categorias deletadas (soft delete)
     * ✅ CORRIGIDO
     */
    async listarCategoriasDeletadas(filtros?: Omit<FiltrosCategoria, 'status'>): Promise<ListarCategoriasResponse> {
        const params = new URLSearchParams();
        if (filtros?.tipo) params.append("tipo", filtros.tipo);
        if (filtros?.busca) params.append("busca", filtros.busca);

        const url = `${API_PREFIX}/categorias/deletadas${params.toString() ? `?${params.toString()}` : ""}`;
        const response = await api.get<{
            success: boolean;
            message: string;
            data: Categoria[];
            total?: number;
            modo?: string;
        }>(url);
        
        return {
            message: response.data.message || "Lista de categorias deletadas carregada com sucesso",
            categorias: response.data.data || [],
            total: response.data.total || response.data.data?.length || 0,
        };
    },

    /**
     * Listar categorias para dropdown/select
     * ✅ CORRIGIDO
     */
    async paraSelectProdutos(): Promise<ParaSelectProdutosResponse> {
        const response = await api.get<{
            success: boolean;
            message: string;
            data: CategoriaSelect[];
            modo?: string;
        }>(`${API_PREFIX}/categorias/select`);
        
        return {
            message: response.data.message || "Categorias para selecção",
            categorias: response.data.data || [],
        };
    },

    /**
     * Buscar categoria específica
     * ✅ CORRIGIDO
     */
    async buscarCategoria(id: string): Promise<DetalheCategoriaResponse> {
        const response = await api.get<{
            success: boolean;
            message: string;
            data: Categoria;
            modo?: string;
        }>(`${API_PREFIX}/categorias/${id}`);
        
        return {
            message: response.data.message || "Categoria carregada com sucesso",
            categoria: response.data.data,
        };
    },

    /**
     * Criar nova categoria
     * ✅ CORRIGIDO
     */
    async criarCategoria(dados: CriarCategoriaInput): Promise<CriarCategoriaResponse> {
        const dadosParaEnviar = { ...dados };
        if (dadosParaEnviar.sujeito_iva !== false) {
            delete dadosParaEnviar.codigo_isencao;
        }

        const response = await api.post<{
            success: boolean;
            message: string;
            data: Categoria;
            modo?: string;
        }>(`${API_PREFIX}/categorias`, dadosParaEnviar);
        
        return {
            message: response.data.message || "Categoria criada com sucesso",
            categoria: response.data.data,
        };
    },

    /**
     * Atualizar categoria
     * ✅ CORRIGIDO
     */
    async atualizarCategoria(
        id: string, 
        dados: AtualizarCategoriaInput
    ): Promise<AtualizarCategoriaResponse> {
        const response = await api.put<{
            success: boolean;
            message: string;
            data: Categoria;
            modo?: string;
        }>(`${API_PREFIX}/categorias/${id}`, dados);
        
        return {
            message: response.data.message || "Categoria atualizada com sucesso",
            categoria: response.data.data,
        };
    },

    /**
     * Deletar categoria (soft delete)
     */
    async deletarCategoria(id: string): Promise<DeletarCategoriaResponse> {
        try {
            const response = await api.delete<{
                success: boolean;
                message: string;
                deleted?: boolean;
                modo?: string;
            }>(`${API_PREFIX}/categorias/${id}`);
            
            return {
                message: response.data.message || "Categoria eliminada com sucesso",
                deleted: response.data.deleted ?? true,
            };
        } catch (error: unknown) {
            const err = error as { 
                response?: { 
                    status: number; 
                    data?: DeletarCategoriaError 
                } 
            };
            
            if (err.response?.status === 409) {
                throw err.response.data;
            }
            throw error;
        }
    },

    /**
     * Restaurar categoria deletada
     * ✅ CORRIGIDO
     */
    async restaurarCategoria(id: string): Promise<RestaurarCategoriaResponse> {
        const response = await api.post<{
            success: boolean;
            message: string;
            data: Categoria;
            modo?: string;
        }>(`${API_PREFIX}/categorias/${id}/restore`);
        
        return {
            message: response.data.message || "Categoria restaurada com sucesso",
            categoria: response.data.data,
        };
    },

    /**
     * Forçar delete permanente
     * ✅ CORRIGIDO
     */
    async forcarDeleteCategoria(id: string): Promise<{ message: string }> {
        const response = await api.delete<{
            success: boolean;
            message: string;
            modo?: string;
        }>(`${API_PREFIX}/categorias/${id}/force`);
        
        return {
            message: response.data.message || "Categoria eliminada permanentemente",
        };
    },
};

/* =====================================================================
 | HELPERS DE FORMATAÇÃO
 | ================================================================== */

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

export function getTaxaIVAColor(taxa: number): string {
    if (taxa === 0) return "bg-gray-100 text-gray-700 border-gray-200";
    if (taxa === 5) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    if (taxa === 14) return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
}

export function getTaxaIVALabel(taxa: number, sujeitoIVA: boolean = true): string {
    if (!sujeitoIVA || taxa === 0) return "Isento (0%)";
    if (taxa === 5) return "5% (Cesta Básica)";
    return `${taxa}%`;
}

export function getTaxaIVATexto(taxa: number, sujeitoIVA: boolean = true): string {
    if (!sujeitoIVA || taxa === 0) return "Isento";
    if (taxa === 5) return "5% - Cesta Básica";
    return `${taxa}% - Taxa Geral`;
}

export function computeCategoriaProps(categoria: Categoria): CategoriaComputed {
    const isIsenta = !categoria.sujeito_iva || categoria.taxa_iva === 0;
    
    let label_iva: string;
    if (isIsenta) {
        label_iva = "Isento (0%)";
    } else if (categoria.taxa_iva === 5) {
        label_iva = "5% (Cesta Básica)";
    } else {
        label_iva = `${categoria.taxa_iva}%`;
    }
    
    return {
        ...categoria,
        label_iva,
        taxa_iva_efectiva: isIsenta ? 0 : categoria.taxa_iva,
        is_isenta: isIsenta,
    };
}

export function computeCategoriasProps(categorias: Categoria[]): CategoriaComputed[] {
    return categorias.map(computeCategoriaProps);
}

export function getCodigoIsencaoLabel(codigo: CodigoIsencao | null): string | null {
    if (!codigo) return null;
    
    const descricoes: Record<CodigoIsencao, string> = {
        "M00": "Não sujeito a IVA",
        "M01": "Isento artigo 6.º do CIVA",
        "M02": "Isento artigo 7.º do CIVA",
        "M03": "Isento artigo 8.º do CIVA",
        "M04": "Isento artigo 9.º do CIVA",
        "M05": "Isento artigo 10.º do CIVA",
        "M06": "Isento artigo 11.º do CIVA",
        "M99": "Outras isenções",
    };
    
    return descricoes[codigo] || codigo;
}

export function validarIVA(
    sujeitoIVA: boolean, 
    taxaIVA: number, 
    codigoIsencao?: CodigoIsencao | null
): string | null {
    if (!sujeitoIVA) {
        if (taxaIVA !== 0) {
            return "Categoria isenta deve ter taxa de IVA igual a 0%";
        }
    } else {
        if (codigoIsencao) {
            return "Categoria sujeita a IVA não pode ter código de isenção";
        }
        if (taxaIVA !== 5 && taxaIVA !== 14) {
            return "Categoria sujeita a IVA deve ter taxa de 5% ou 14%";
        }
    }
    
    const taxasValidas: TaxaIVA[] = [0, 5, 14];
    if (!taxasValidas.includes(taxaIVA as TaxaIVA)) {
        return "Taxa de IVA inválida. Valores permitidos: 0%, 5% ou 14%";
    }
    
    return null;
}

export function filtrarCategoriasFrontend(
    categorias: Categoria[],
    filtros: {
        taxa_iva?: TaxaIVA;
        apenas_isentas?: boolean;
    }
): Categoria[] {
    let resultado = [...categorias];
    
    if (filtros.taxa_iva !== undefined) {
        resultado = resultado.filter(c => c.taxa_iva === filtros.taxa_iva);
    }
    
    if (filtros.apenas_isentas) {
        resultado = resultado.filter(c => !c.sujeito_iva || c.taxa_iva === 0);
    }
    
    return resultado;
}

export function groupCategoriasByTipo(categorias: Categoria[]): {
    produtos: Categoria[];
    servicos: Categoria[];
} {
    return {
        produtos: categorias.filter(c => c.tipo === "produto"),
        servicos: categorias.filter(c => c.tipo === "servico"),
    };
}

export function groupCategoriasByStatus(categorias: Categoria[]): {
    ativos: Categoria[];
    inativos: Categoria[];
} {
    return {
        ativos: categorias.filter(c => c.status === "ativo"),
        inativos: categorias.filter(c => c.status === "inativo"),
    };
}

export default categoriaService;