// @/services/empresaService.ts - SERVIÇO PARA DADOS DA EMPRESA
import axios from 'axios';
import Cookies from 'js-cookie';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.1.199:8000';

// Criar instância autenticada
const createAuthApi = () => {
    const token = Cookies.get('auth_token');

    if (!token) {
        throw new Error('Não autenticado');
    }

    return axios.create({
        baseURL: BACKEND_URL,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        withCredentials: true,
        timeout: 10000,
    });
};

export interface Empresa {
    id: string;
    nome: string;
    nif: string;
    email: string;
    logo: string | null;
    status: string;
    endereco: string | null;
    telefone: string | null;
    regime_fiscal: string | null;
    sujeito_iva: boolean;
    data_registro: string;
    created_at?: string;
    updated_at?: string;
}

export interface UpdateEmpresaData {
    nome?: string;
    nif?: string;
    email?: string;
    endereco?: string;
    telefone?: string;
    regime_fiscal?: string;
    sujeito_iva?: boolean;
}

export interface ConfiguracoesFiscais {
    serie_padrao_fatura: string;
    iva_padrao: number;
    regime_fiscal: string;
    sujeito_iva: boolean;
}

/**
 * Buscar dados da empresa do usuário logado
 */
export const fetchEmpresa = async (empresaId: string): Promise<Empresa> => {
    const authApi = createAuthApi();
    const response = await authApi.get<{ empresa: Empresa }>(`/api/empresas/${empresaId}`);
    return response.data.empresa;
};

/**
 * Atualizar dados da empresa
 */
export const updateEmpresa = async (empresaId: string, data: UpdateEmpresaData): Promise<Empresa> => {
    const authApi = createAuthApi();
    const response = await authApi.put<{ empresa: Empresa }>(`/api/empresas/${empresaId}`, data);
    return response.data.empresa;
};

/**
 * Upload do logo da empresa
 */
export const uploadLogo = async (empresaId: string, file: File): Promise<{ logo_url: string }> => {
    const authApi = createAuthApi();

    const formData = new FormData();
    formData.append('logo', file);

    const response = await authApi.post<{ logo_url: string }>(
        `/api/empresas/${empresaId}/logo`,
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }
    );

    return response.data;
};

/**
 * Buscar configurações fiscais da empresa
 */
export const fetchConfiguracoesFiscais = async (empresaId: string): Promise<ConfiguracoesFiscais> => {
    const authApi = createAuthApi();
    const response = await authApi.get<{ configuracoes: ConfiguracoesFiscais }>(
        `/api/empresas/${empresaId}/configuracoes-fiscais`
    );
    return response.data.configuracoes;
};

/**
 * Atualizar configurações fiscais
 */
export const updateConfiguracoesFiscais = async (
    empresaId: string,
    data: Partial<ConfiguracoesFiscais>
): Promise<ConfiguracoesFiscais> => {
    const authApi = createAuthApi();
    const response = await authApi.put<{ configuracoes: ConfiguracoesFiscais }>(
        `/api/empresas/${empresaId}/configuracoes-fiscais`,
        data
    );
    return response.data.configuracoes;
};