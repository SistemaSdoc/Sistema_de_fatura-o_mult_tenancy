import api from "@/services/axios"; // sua instância Axios centralizada

export interface Empresa {
  id: string;
  nome: string;
  nif: string;
  email: string;
  telefone?: string | null;
  endereco?: string | null;
  logo?: string | null;
  db_name: string;
  regime_fiscal: "simplificado" | "geral";
  sujeito_iva: boolean;
  status: "ativo" | "suspenso";
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
  regime_fiscal?: "simplificado" | "geral";
  sujeito_iva?: boolean;
}

// ----------------- FUNÇÕES -----------------

/**
 * Buscar todas as empresas
 */
export const getEmpresas = async (): Promise<Empresa[]> => {
  const response = await api.get<{ success: boolean; data: Empresa[] }>("/empresas");
  if (!response.data.success) throw new Error("Falha ao buscar empresas");
  return response.data.data;
};

/**
 * Buscar uma empresa por ID
 */
export const getEmpresa = async (empresaId: string): Promise<Empresa> => {
  const response = await api.get<{ success: boolean; data: Empresa }>(`/empresas/${empresaId}`);
  if (!response.data.success) throw new Error("Falha ao buscar empresa");
  return response.data.data;
};

/**
 * Criar nova empresa
 */
export const createEmpresa = async (data: Partial<Empresa>): Promise<Empresa> => {
  const response = await api.post<{ success: boolean; data: Empresa }>("/empresas", data);
  if (!response.data.success) throw new Error("Falha ao criar empresa");
  return response.data.data;
};

/**
 * Atualizar empresa existente
 */
export const updateEmpresa = async (
  empresaId: string,
  data: UpdateEmpresaData
): Promise<Empresa> => {
  const response = await api.put<{ success: boolean; data: Empresa }>(
    `/empresas/${empresaId}`,
    data
  );
  if (!response.data.success) throw new Error("Falha ao atualizar empresa");
  return response.data.data;
};

/**
 * Upload do logo da empresa
 */
export const uploadLogo = async (
  empresaId: string,
  file: File
): Promise<{ logo_url: string }> => {
  const formData = new FormData();
  formData.append("logo", file);

  const response = await api.post<{ success: boolean; logo_url: string }>(
    `/empresas/${empresaId}/logo`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );

  if (!response.data.success) throw new Error("Falha ao fazer upload do logo");
  return response.data;
};

/**
 * Buscar configurações fiscais da empresa
 */
export interface ConfiguracoesFiscais {
  serie_padrao_fatura: string;
  iva_padrao: number;
  regime_fiscal: "simplificado" | "geral";
  sujeito_iva: boolean;
}

export const fetchConfiguracoesFiscais = async (
  empresaId: string
): Promise<ConfiguracoesFiscais> => {
  const response = await api.get<{ success: boolean; configuracoes: ConfiguracoesFiscais }>(
    `/empresas/${empresaId}/configuracoes-fiscais`
  );
  if (!response.data.success) throw new Error("Falha ao buscar configurações fiscais");
  return response.data.configuracoes;
};

/**
 * Atualizar configurações fiscais da empresa
 */
export const updateConfiguracoesFiscais = async (
  empresaId: string,
  data: Partial<ConfiguracoesFiscais>
): Promise<ConfiguracoesFiscais> => {
  const response = await api.put<{ success: boolean; configuracoes: ConfiguracoesFiscais }>(
    `/empresas/${empresaId}/configuracoes-fiscais`,
    data
  );
  if (!response.data.success) throw new Error("Falha ao atualizar configurações fiscais");
  return response.data.configuracoes;
};