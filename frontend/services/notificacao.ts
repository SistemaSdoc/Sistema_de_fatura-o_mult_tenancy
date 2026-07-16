// src/services/notificacoes.ts
import { landlordApi } from './axios';

export const notificacoesApi = {
  listar: async () => {
    const response = await landlordApi.get('/api/notificacoes');
    return response.data; // deve ser { data: [...] }
  },
  marcarComoLida: async (id: string) => {
    await landlordApi.post(`/api/notificacoes/${id}/marcar-lida`);
  },
  marcarTodasComoLidas: async () => {
    await landlordApi.post('/api/notificacoes/marcar-todas-lidas');
  }
};