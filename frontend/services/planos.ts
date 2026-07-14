// src/services/planos.ts
import { landlordApi } from './axios';



export const planosService = {
  /**
   * Lista todos os planos ativos com suas features
   * @returns {Promise<Array>} Lista de planos
   */
  listarAtivos: async () => {
    const response = await landlordApi.get('/api/planos-ativos');
    return response.data;
  },

  /**
   * Busca um plano específico pelo ID
   * @param {string} id - UUID do plano
   * @returns {Promise<Object>} Dados do plano com features
   */
  buscarPorId: async (id: string) => {
    const response = await landlordApi.get(`/api/planos/${id}`);
    return response.data;
  },

  /**
   * Lista todos os planos (incluindo inativos) - apenas para administradores
   * @returns {Promise<Array>} Lista completa de planos
   */
  listarTodos: async () => {
    const response = await landlordApi.get('/api/planos');
    return response.data;
  },

  /**
   * Cria um novo plano (apenas landlord)
   */
  criar: async (data: any) => {
    const response = await landlordApi.post('/api/planos', data);
    return response.data;
  },

  /**
   * Atualiza um plano existente (apenas landlord)
   */
  atualizar: async (id: string, data: any) => {
    const response = await landlordApi.put(`/api/planos/${id}`, data);
    return response.data;
  },

  /**
   * Remove um plano (apenas landlord)
   */
  deletar: async (id: string) => {
    const response = await landlordApi.delete(`/api/planos/${id}`);
    return response.data;
  },

  /**
   * Associa uma feature a um plano
   */
  attachFeature: async (planoId: string, featureId: string, quantidade: number, unidade?: string) => {
    const response = await landlordApi.post(`/api/planos/${planoId}/attach-feature`, {
      feature_id: featureId,
      quantidade,
      unidade
    });
    return response.data;
  },

  /**
   * Remove uma feature de um plano
   */
  detachFeature: async (planoId: string, featureId: string) => {
    const response = await landlordApi.delete(`/api/planos/${planoId}/detach-feature/${featureId}`);
    return response.data;
  }
};