import axios from "axios";

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

/* ================== AXIOS INSTANCE ================== */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: false,
});

/* ================= REQUEST INTERCEPTOR ================= */
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");

    config.headers = config.headers ?? {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("[AXIOS] Token set:", token);
    }
  }

  return config;
});

/* ================= RESPONSE INTERCEPTOR ================= */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error(
      "[AXIOS ERROR]",
      error.response?.status,
      error.response?.data || error.message
    );
    return Promise.reject(error);
  }
);

export default api;
/* ================== EXPORTS ================== */ 
