// src/services/features.ts
import { landlordApi } from './axios';

export const featuresService = {
  /**
   * Lista todas as features ativas (filtra no backend ou frontend)
   * Usa o endpoint GET /api/features com parâmetro ativo=1
   */
  listarAtivas: async () => {
    // O endpoint /api/features já existe (Route::apiResource('features', FeatureController::class))
    // Vamos passar o parâmetro 'ativo' para filtrar apenas as ativas
    const response = await landlordApi.get('/api/features', {
      params: { ativo: 1 } // Se o controller aceitar, senão filtra no frontend
    });
    return response.data;
  },

  /**
   * Busca uma feature pelo ID
   */
  buscarPorId: async (id: string) => {
    const response = await landlordApi.get(`/api/features/${id}`);
    return response.data;
  },

  /**
   * Cria uma nova feature (apenas landlord)
   */
  criar: async (data: any) => {
    const response = await landlordApi.post('/api/features', data);
    return response.data;
  },

  /**
   * Atualiza uma feature (apenas landlord)
   */
  atualizar: async (id: string, data: any) => {
    const response = await landlordApi.put(`/api/features/${id}`, data);
    return response.data;
  },

  /**
   * Remove uma feature (apenas landlord)
   */
  deletar: async (id: string) => {
    const response = await landlordApi.delete(`/api/features/${id}`);
    return response.data;
  }
};