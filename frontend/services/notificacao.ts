// src/services/notificacoes.ts
import { landlordApi } from './axios';

/* ------------------------------------------------------------------ */
/*  Tipos                                                              */
/* ------------------------------------------------------------------ */
export type NotificacaoTipo = "info" | "success" | "warning" | "danger";

export interface NotificacaoAPI {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: NotificacaoTipo;
  tipo_evento?: string | null;
  lida: boolean;
  lida_em?: string | null;
  dados?: Record<string, unknown> | null;
  url?: string | null;
  empresa_id?: string | null;
  user_id?: string | null;
  enviada_email?: boolean;
  enviada_email_em?: string | null;
  email_erro?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificacoesResponse {
  success: boolean;
  data: NotificacaoAPI[];
  total?: number;
  meta?: {
    nao_lidas: number;
    total: number;
  };
}

export interface MarcarTodasResponse {
  success: boolean;
  marcadas: number;
}

/* ------------------------------------------------------------------ */
/*  API                                                                */
/* ------------------------------------------------------------------ */
export const notificacoesApi = {
  /**
   * Lista apenas as NÃO LIDAS (para o sino do MainLandlord).
   * GET /api/landlord/notificacoes/nao-lidas
   */
  listar: async (): Promise<NotificacoesResponse> => {
    const response = await landlordApi.get<NotificacoesResponse>(
      '/api/landlord/notificacoes/nao-lidas'
    );
    return response.data;
  },

  /**
   * Lista TODAS as notificações (lidas + não lidas).
   * Útil para uma página de histórico.
   * GET /api/landlord/notificacoes?limit=50
   */
  listarTodas: async (limit = 50): Promise<NotificacoesResponse> => {
    const response = await landlordApi.get<NotificacoesResponse>(
      '/api/landlord/notificacoes',
      { params: { limit } }
    );
    return response.data;
  },

  /**
   * Marca uma notificação como lida.
   * POST /api/landlord/notificacoes/{id}/marcar-lida
   */
  marcarComoLida: async (id: string): Promise<void> => {
    await landlordApi.post(`/api/landlord/notificacoes/${id}/marcar-lida`);
  },

  /**
   * Marca todas as notificações do utilizador como lidas.
   * POST /api/landlord/notificacoes/marcar-todas-lidas
   */
  marcarTodasComoLidas: async (): Promise<MarcarTodasResponse> => {
    const response = await landlordApi.post<MarcarTodasResponse>(
      '/api/landlord/notificacoes/marcar-todas-lidas'
    );
    return response.data;
  },

  /**
   * Elimina uma notificação.
   * DELETE /api/landlord/notificacoes/{id}
   */
  eliminar: async (id: string): Promise<void> => {
    await landlordApi.delete(`/api/landlord/notificacoes/${id}`);
  },
};