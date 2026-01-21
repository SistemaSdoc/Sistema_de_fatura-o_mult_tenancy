
import axios, { AxiosHeaders, InternalAxiosRequestConfig } from "axios";
import { AxiosError } from "axios";
/* ================== TIPOS ================== */
export interface ItemVenda {
  id: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  preco_venda: number;
  subtotal: number;
}

export interface Venda {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  user_id: string;
  user_nome: string;
  data: string;
  total: number;
  itens: ItemVenda[];
}

export interface Cliente {
  id: string;
  nome: string;
}

export interface ItemFatura {
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  iva: number;
  subtotal: number;
}

export interface ClienteFatura {
  id: string;
  nome: string;
}

export interface Fatura {
  id: string;
  venda_id: string;
  cliente: ClienteFatura;
  num_sequencial: string;
  total: number;
  status: "emitida" | "cancelada";
  hash: string;
  data: string;
  itens: ItemFatura[];
}

export interface CriarVendaPayload {
  cliente_id: string;
  itens: {
    produto_id: string;
    quantidade: number;
  }[];
}




/* ================== TIPOS ================== */
export interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[]>; 
  status?: number;                   
}

/* ================== INSTÂNCIA AXIOS PARA COOKIES ================== */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // ex: http://localhost:8000
  withCredentials: true, // ⚠ essencial para enviar cookies
});

/* ================== INTERCEPTOR DE REQUEST ================== */
// Aqui não precisamos do token Bearer, mas podemos usar para logs
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Pode adicionar headers adicionais se precisar
  return config;
});

/* ================== INTERCEPTOR DE RESPONSE ================== */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const data = error.response?.data as ApiErrorResponse;
    const message = data?.message || error.message;

    console.error("[AXIOS ERROR]", error.response?.status, message);

    return Promise.reject(error);
  }
);

export default api;
