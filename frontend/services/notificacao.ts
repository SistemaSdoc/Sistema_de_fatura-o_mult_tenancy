// src/services/notificacoes.ts
import { landlordApi } from './axios';

export const notificacoesApi = {
  listar: async () => {
    const response = await landlordApi.get('/api/landlord/notificacoes');
    return response.data; // deve ser { data: [...] }
  },
  marcarComoLida: async (id: string) => {
    await landlordApi.post(`/api/landlord/notificacoes/${id}/marcar-lida`);
  },
  marcarTodasComoLidas: async () => {
    await landlordApi.post('/api/landlord/notificacoes/marcar-todas-lidas');
  }
};