import api from "./axios";
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

export interface CriarVendaPayload {
  cliente_id: string;
  itens: {
    produto_id: string;
    quantidade: number;
  }[];
}

export interface Fatura {
  id: string;
  cliente: string;
  data: string;
  valor: number;
  status: "emitida" | "cancelada";
}

/* ================== DASHBOARD ================== */

export interface DashboardData {
  faturasEmitidas: number;
  clientesAtivos: number;
  receitaMensal: number;
  vendasPorMes: {
    mes: string;
    total: number;
  }[];
  ultimasFaturas: {
    id: string;
    cliente: string;
    data: string;
    valor: number;
    status: "emitida" | "cancelada";
  }[];
}

/* ================== VENDAS ================== */

export async function criarVenda(
  payload: CriarVendaPayload
): Promise<{ venda: Venda; fatura: Fatura }> {
  const response = await api.post("/vendas", payload);
  return response.data;
}

export async function obterVenda(vendaId: string): Promise<Venda> {
  const response = await api.get(`/vendas/${vendaId}`);
  return response.data;
}

export async function cancelarVenda(vendaId: string): Promise<void> {
  await api.post(`/vendas/${vendaId}/cancelar`);
}

export async function listarVendas(): Promise<Venda[]> {
  try {
    const response = await api.get<Venda[]>("/vendas");
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error(
        "Erro ao listar vendas:",
        error.response?.data?.message || error.message
      );
    }
    return [];
  }
}

/* ================== DASHBOARD ================== */


export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Usuário não autenticado.");

    const response = await api.get<DashboardData>("/dashboard", {
      headers: {
        Authorization: `Bearer ${token}`, 
      },
    });

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error(
        "Erro ao carregar o dashboard:",
        error.response?.data?.message || error.message
      );
    }
    return {
      faturasEmitidas: 0,
      clientesAtivos: 0,
      receitaMensal: 0,
      vendasPorMes: [],
      ultimasFaturas: [],
    };
  }
}
