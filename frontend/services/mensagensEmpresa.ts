import { authApi } from "./axios";

export interface MensagemEmpresa {
  id: string;
  mensagem: string;
  remetente_tipo: "landlord" | "empresa";
  remetente_nome: string | null;
  remetente_email: string | null;
  lida: boolean;
  lida_em?: string | null;
  created_at: string | null;
}

export const mensagensEmpresaApi = {
  listar: async () => {
    const response = await authApi.get("empresa/mensagens");
    return response.data as {
      success?: boolean;
      data: {
        mensagens: MensagemEmpresa[];
        nao_lidas: number;
      };
    };
  },
  marcarComoLida: async (id: string) => {
    const response = await authApi.patch(`empresa/mensagens/${id}/marcar-lida`);
    return response.data as {
      success?: boolean;
      data?: MensagemEmpresa;
    };
  },
  eliminar: async (id: string) => {
    const response = await authApi.delete(`empresa/mensagens/${id}`);
    return response.data as {
      success?: boolean;
      message?: string;
    };
  },
};
