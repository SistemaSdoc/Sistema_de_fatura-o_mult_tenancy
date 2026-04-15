// src/services/categorias.ts
import api from "./axios";

export type StatusCategoria = "ativo" | "inativo";
export type TipoCategoria = "produto" | "servico";

// Códigos de isenção SAF-T válidos em Angola
export type CodigoIsencao = "M00" | "M01" | "M02" | "M03" | "M04" | "M05" | "M06" | "M99";

// Taxas de IVA válidas em Angola (AGT)
export type TaxaIVA = 0 | 5 | 14;

export interface Categoria {
    id: string; // UUID
    nome: string;
    descricao: string | null;
    status: StatusCategoria;
    tipo: TipoCategoria;
    user_id: string; // UUID
    // ✅ NOVOS: Campos de IVA
    taxa_iva: number; // 0, 5 ou 14
    sujeito_iva: boolean;
    codigo_isencao: CodigoIsencao | null;
    // Timestamps
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
    // Relações/Contadores
    produtos_count?: number;
    // Campos computados do backend
    label_iva?: string; // ex: "14%" ou "Isento (0%)"
    taxa_iva_efectiva?: number;
    total_produtos?: number;
}

// Categoria formatada para dropdown/select
export interface CategoriaSelect {
    id: string;
    nome: string;
    tipo: TipoCategoria;
    taxa_iva: number;
    sujeito_iva: boolean;
    codigo_isencao: CodigoIsencao | null;
    label_iva: string;
}

export interface CriarCategoriaInput {
    nome: string;
    descricao?: string;
    status?: StatusCategoria;
    tipo?: TipoCategoria;
    // ✅ NOVOS: Campos de IVA
    taxa_iva?: TaxaIVA; // 0, 5 ou 14 (padrão: 14)
    sujeito_iva?: boolean; // padrão: true
    codigo_isencao?: CodigoIsencao; // obrigatório apenas se sujeito_iva = false
}

export type AtualizarCategoriaInput = Partial<CriarCategoriaInput>;

// Filtros para listagem de categorias
export interface FiltrosCategoria {
    tipo?: TipoCategoria;
    status?: StatusCategoria;
    busca?: string; // busca por nome
    taxa_iva?: TaxaIVA;
    apenas_isentas?: boolean;
}

// Resumo estatístico da listagem
export interface ResumoCategorias {
    total: number;
    com_iva_14: number;
    com_iva_5: number;
    isentas: number;
}

// Resposta da listagem com resumo
export interface ListarCategoriasResponse {
    message: string;
    categorias: Categoria[];
    resumo: ResumoCategorias;
}

// Resposta do select para produtos
export interface ParaSelectProdutosResponse {
    message: string;
    categorias: CategoriaSelect[];
}

// Resposta do detalhe/show
export interface DetalheCategoriaResponse {
    message: string;
    categoria: Categoria;
}

// Resposta da criação
export interface CriarCategoriaResponse {
    message: string;
    categoria: Categoria;
}

// Resposta da atualização
export interface AtualizarCategoriaResponse {
    message: string;
    categoria: Categoria;
    aviso?: string; // aviso quando taxa de IVA é alterada e existem produtos
}

// Resposta do delete
export interface DeletarCategoriaResponse {
    message: string;
}

// Erro específico do delete quando existem produtos ativos
export interface DeletarCategoriaError {
    message: string;
    error: "produtos_activos";
}

const API_PREFIX = "/api";

export const categoriaService = {
    /* =====================================================================
     | LISTAGEM
     | ================================================================== */

    /**
     * Listar todas as categorias com filtros opcionais e resumo estatístico.
     */
    async listarCategorias(filtros?: FiltrosCategoria): Promise<ListarCategoriasResponse> {
        console.log('[CATEGORIA SERVICE] Listar categorias - Filtros:', filtros);
        
        const params = new URLSearchParams();
        if (filtros?.tipo) params.append("tipo", filtros.tipo);
        if (filtros?.status) params.append("status", filtros.status);
        if (filtros?.busca) params.append("busca", filtros.busca);
        if (filtros?.taxa_iva !== undefined) params.append("taxa_iva", String(filtros.taxa_iva));
        if (filtros?.apenas_isentas) params.append("apenas_isentas", "true");

        const url = `${API_PREFIX}/categorias${params.toString() ? `?${params.toString()}` : ""}`;
        const response = await api.get<ListarCategoriasResponse>(url);
        
        console.log('[CATEGORIA SERVICE] Listar categorias - Sucesso:', response.data);
        return response.data;
    },

    /**
     * Listar categorias para dropdown/select no formulário de produtos.
     * Retorna apenas os campos necessários incluindo informações de IVA.
     */
    async paraSelectProdutos(): Promise<ParaSelectProdutosResponse> {
        console.log('[CATEGORIA SERVICE] Para select produtos - Iniciando...');
        const response = await api.get<ParaSelectProdutosResponse>(`${API_PREFIX}/categorias/select`);
        console.log('[CATEGORIA SERVICE] Para select produtos - Sucesso:', response.data);
        return response.data;
    },

    /* =====================================================================
     | DETALHE
     | ================================================================== */

    /**
     * Buscar categoria específica com contagem de produtos e campos computados.
     */
    async buscarCategoria(id: string): Promise<DetalheCategoriaResponse> {
        console.log('[CATEGORIA SERVICE] Buscar categoria - ID:', id);
        const response = await api.get<DetalheCategoriaResponse>(`${API_PREFIX}/categorias/${id}`);
        console.log('[CATEGORIA SERVICE] Buscar categoria - Sucesso:', response.data);
        return response.data;
    },

    /* =====================================================================
     | CRIAR
     | ================================================================== */

    /**
     * Criar nova categoria com validação de IVA.
     * Taxas válidas: 0% (isento), 5% (cesta básica), 14% (geral).
     */
    async criarCategoria(dados: CriarCategoriaInput): Promise<CriarCategoriaResponse> {
        console.log('[CATEGORIA SERVICE] Criar categoria - Dados:', dados);
        
        // Validação frontend: código de isenção só faz sentido quando não sujeito a IVA
        if (dados.codigo_isencao && dados.sujeito_iva !== false) {
            console.warn('[CATEGORIA SERVICE] Aviso: código_isencao definido mas sujeito_iva é true');
        }

        const response = await api.post<CriarCategoriaResponse>(`${API_PREFIX}/categorias`, dados);
        console.log('[CATEGORIA SERVICE] Criar categoria - Sucesso:', response.data);
        return response.data;
    },

    /* =====================================================================
     | ACTUALIZAR
     | ================================================================== */

    /**
     * Atualizar categoria existente.
     * Retorna aviso se a taxa de IVA for alterada e existirem produtos associados.
     */
    async atualizarCategoria(
        id: string, 
        dados: AtualizarCategoriaInput
    ): Promise<AtualizarCategoriaResponse> {
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║ [CATEGORIA SERVICE] ATUALIZAR CATEGORIA - INÍCIO        ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log('[CATEGORIA SERVICE] ID:', id, 'Dados:', dados);

        const url = `${API_PREFIX}/categorias/${id}`;

        try {
            const response = await api.put<AtualizarCategoriaResponse>(url, dados);
            console.log('[CATEGORIA SERVICE] Sucesso:', response.status);
            
            if (response.data.aviso) {
                console.warn('[CATEGORIA SERVICE] Aviso do backend:', response.data.aviso);
            }
            
            return response.data;
        } catch (error: unknown) {
            const err = error as { response?: { status: number; data?: { message: string } } };
            console.error('[CATEGORIA SERVICE] ERRO:', err.response?.status, err.response?.data?.message);
            throw error;
        }
    },

    /* =====================================================================
     | APAGAR
     | ================================================================== */

    /**
     * Eliminar categoria.
     * Erro 409 se existirem produtos ativos associados.
     */
    async deletarCategoria(id: string): Promise<DeletarCategoriaResponse> {
        console.log('[CATEGORIA SERVICE] Deletar categoria - ID:', id);
        const response = await api.delete<DeletarCategoriaResponse>(`${API_PREFIX}/categorias/${id}`);
        console.log('[CATEGORIA SERVICE] Deletar categoria - Sucesso:', response.status);
        return response.data;
    },
};

/* =====================================================================
 | HELPERS DE FORMATAÇÃO
 | ================================================================== */

/**
 * Retorna a cor do badge baseada no status.
 */
export function getStatusColor(status: StatusCategoria): string {
    return status === "ativo"
        ? "bg-green-100 text-green-700 border-green-200"
        : "bg-red-100 text-red-700 border-red-200";
}

/**
 * Retorna a cor do badge baseada no tipo.
 */
export function getTipoColor(tipo: TipoCategoria): string {
    return tipo === "produto"
        ? "bg-blue-100 text-blue-700 border-blue-200"
        : "bg-purple-100 text-purple-700 border-purple-200";
}

/**
 * Retorna o label traduzido do status.
 */
export function getStatusLabel(status: StatusCategoria): string {
    return status === "ativo" ? "Ativo" : "Inativo";
}

/**
 * Retorna o label traduzido do tipo.
 */
export function getTipoLabel(tipo: TipoCategoria): string {
    return tipo === "produto" ? "Produto" : "Serviço";
}

/**
 * Retorna a cor do badge baseada na taxa de IVA.
 */
export function getTaxaIVAColor(taxa: number): string {
    switch (taxa) {
        case 0:
            return "bg-gray-100 text-gray-700 border-gray-200";
        case 5:
            return "bg-yellow-100 text-yellow-700 border-yellow-200";
        case 14:
            return "bg-blue-100 text-blue-700 border-blue-200";
        default:
            return "bg-gray-100 text-gray-700 border-gray-200";
    }
}

/**
 * Retorna o label formatado da taxa de IVA.
 * Exemplo: "14%", "5% (Cesta Básica)", "Isento (0%)"
 */
export function getTaxaIVALabel(taxa: number, sujeitoIVA: boolean = true): string {
    if (!sujeitoIVA || taxa === 0) {
        return "Isento (0%)";
    }
    if (taxa === 5) {
        return "5% (Cesta Básica)";
    }
    return `${taxa}%`;
}

/**
 * Retorna a descrição do código de isenção SAF-T.
 */
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

/**
 * Valida se a combinação de IVA é consistente.
 * Retorna null se válido, ou mensagem de erro se inválido.
 */
export function validarIVA(
    sujeitoIVA: boolean, 
    taxaIVA: number, 
    codigoIsencao?: CodigoIsencao | null
): string | null {
    if (!sujeitoIVA) {
        // Se não sujeito a IVA, taxa deve ser 0
        if (taxaIVA !== 0) {
            return "Categoria isenta deve ter taxa de IVA igual a 0%";
        }
    } else {
        // Se sujeito a IVA, não pode ter código de isenção
        if (codigoIsencao) {
            return "Categoria sujeita a IVA não pode ter código de isenção";
        }
    }
    
    // Taxas válidas em Angola
    const taxasValidas: TaxaIVA[] = [0, 5, 14];
    if (!taxasValidas.includes(taxaIVA as TaxaIVA)) {
        return "Taxa de IVA inválida. Valores permitidos: 0%, 5% ou 14%";
    }
    
    return null;
}

export default categoriaService;