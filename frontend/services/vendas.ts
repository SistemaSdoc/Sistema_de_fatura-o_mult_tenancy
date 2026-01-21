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

/* ================== TIPOS ================== */

export interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  categoria_id: string;
  preco_compra: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
}

export interface ProdutoPayload {
  nome: string;
  descricao?: string;
  categoria_id: string;
  preco_compra: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
}

/* ================== PRODUTOS ================== */

// Listar todos os produtos
export async function listarProdutos(): Promise<Produto[]> {
  try {
    const response = await api.get<Produto[]>("/produtos");
    return response.data;
  } catch (err) {
    if (err instanceof AxiosError) {
      console.error("Erro ao listar produtos:", err.response?.data || err.message);
    } else {
      console.error("Erro desconhecido ao listar produtos:", err);
    }
    return [];
  }
}

// Criar novo produto
export async function criarProduto(payload: ProdutoPayload): Promise<Produto> {
  const response = await api.post<Produto>("/produtos", payload);
  return response.data;
}

// Atualizar produto existente
export async function atualizarProduto(id: string, payload: Partial<ProdutoPayload>): Promise<Produto> {
  const response = await api.put<Produto>(`/produtos/${id}`, payload);
  return response.data;
}

// Deletar produto
export async function deletarProduto(id: string): Promise<void> {
  await api.delete(`/produtos/${id}`);
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
        "[VENDAS] Erro ao listar vendas:",
        error.response?.data?.message || error.message
      );
    }
    return [];
  }
}

/* ================== DASHBOARD ================== */

export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const response = await api.get<DashboardData>("/dashboard");
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error(
        "[DASHBOARD] Erro ao carregar dados:",
        error.response?.data?.message || error.message
      );
    } else {
      console.error("[DASHBOARD] Erro desconhecido:", error);
    }

    // Valores default para evitar quebra do frontend
    return {
      faturasEmitidas: 0,
      clientesAtivos: 0,
      receitaMensal: 0,
      vendasPorMes: [],
      ultimasFaturas: [],
    };
  }
}
