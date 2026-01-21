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

/* ================== PRODUTOS ================== */

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

export async function listarProdutos(): Promise<Produto[]> {
  try {
    const { data } = await api.get<Produto[]>("/produtos");
    return data;
  } catch (err) {
    handleAxiosError(err, "[PRODUTOS] Erro ao listar produtos");
    return [];
  }
}

export async function criarProduto(payload: ProdutoPayload): Promise<Produto> {
  const { data } = await api.post<Produto>("/produtos", payload);
  return data;
}

export async function atualizarProduto(id: string, payload: Partial<ProdutoPayload>): Promise<Produto> {
  const { data } = await api.put<Produto>(`/produtos/${id}`, payload);
  return data;
}

export async function deletarProduto(id: string): Promise<void> {
  await api.delete(`/produtos/${id}`);
}

/* ================== VENDAS ================== */

export async function criarVenda(payload: CriarVendaPayload): Promise<{ venda: Venda; fatura: Fatura }> {
  const { data } = await api.post("/vendas", payload);
  return data;
}

export async function obterVenda(vendaId: string): Promise<Venda> {
  const { data } = await api.get(`/vendas/${vendaId}`);
  return data;
}

export async function cancelarVenda(vendaId: string): Promise<void> {
  await api.post(`/vendas/${vendaId}/cancelar`);
}

export async function listarVendas(): Promise<Venda[]> {
  try {
    const { data } = await api.get<Venda[]>("/vendas");
    return data;
  } catch (err) {
    handleAxiosError(err, "[VENDAS] Erro ao listar vendas");
    return [];
  }
}

/* ================== DASHBOARD ================== */

export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const { data } = await api.get<DashboardData>("/dashboard");
    return data;
  } catch (err) {
    handleAxiosError(err, "[DASHBOARD] Erro ao carregar dados");

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

/* ================== HELPERS ================== */

function handleAxiosError(err: unknown, prefix: string) {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message || err.message || "Erro desconhecido";
    console.error(`${prefix}:`, msg);
  } else {
    console.error(`${prefix}:`, err);
  }
}
