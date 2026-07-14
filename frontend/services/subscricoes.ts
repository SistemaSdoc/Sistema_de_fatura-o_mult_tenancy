// src/services/subscricoes.ts
import { tenantApi } from './axios';

export const subscricaoService = {
  /**
   * Criar uma nova assinatura para a empresa autenticada
   */ 
  criar: async (data: {
    plano_id: string;
    forma_pagamento?: string;
    data_vencimento?: string;
    renovacao_automatica?: boolean;
    renovacao?: boolean;
  }) => {
    // 👇 FORÇA RENOVAÇÃO DO CSRF
    await tenantApi.get('/sanctum/csrf-cookie');
    const response = await tenantApi.post('/api/subscricoes', data);
    return response.data;
  },

  /**
   * Buscar a assinatura ativa da empresa
   */
   minhaAssinatura: async () => {
    try {
      const response = await tenantApi.get('/api/subscricoes/me');
      return response.data; // { subscricao: ... }
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // Sem subscrição
      }
      throw error; // Outros erros
    }
  },
  
  /**
   * Cancelar assinatura
   */
  cancelar: async (id: string) => {
    const response = await tenantApi.patch(`/api/subscricoes/${id}/cancel`);
    return response.data;
  },

  /**
   * Renovar assinatura
   */
  renovar: async (id: string) => {
    const response = await tenantApi.post(`/api/subscricoes/${id}/renovar`);
    return response.data;
  }
};