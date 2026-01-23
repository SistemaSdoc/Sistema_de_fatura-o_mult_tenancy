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
  vendasPorMes: { mes: string; total: number }[];
  ultimasFaturas: Fatura[];
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

/* ================== HELPERS ================== */

function handleAxiosError(err: unknown, prefix: string) {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message || err.message || "Erro desconhecido";
    console.error(`${prefix}:`, msg);
  } else {
    console.error(`${prefix}:`, err);
  }
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

export async function criarProduto(payload: ProdutoPayload): Promise<Produto | null> {
  try {
    const { data } = await api.post<Produto>("/produtos", payload);
    return data;
  } catch (err) {
    handleAxiosError(err, "[PRODUTOS] Erro ao criar produto");
    return null;
  }
}

export async function atualizarProduto(
  id: string,
  payload: Partial<ProdutoPayload>
): Promise<Produto | null> {
  try {
    const { data } = await api.put<Produto>(`/produtos/${id}`, payload);
    return data;
  } catch (err) {
    handleAxiosError(err, "[PRODUTOS] Erro ao atualizar produto");
    return null;
  }
}

export async function deletarProduto(id: string): Promise<boolean> {
  try {
    await api.delete(`/produtos/${id}`);
    return true;
  } catch (err) {
    handleAxiosError(err, "[PRODUTOS] Erro ao deletar produto");
    return false;
  }
}

/* ================== VENDAS ================== */

export async function criarVenda(
  payload: CriarVendaPayload
): Promise<{ venda: Venda; fatura: Fatura } | null> {
  try {
    const { data } = await api.post<{ venda: Venda; fatura: Fatura }>("/vendas", payload);
    return data;
  } catch (err) {
    handleAxiosError(err, "[VENDAS] Erro ao criar venda");
    return null;
  }
}

export async function obterVenda(vendaId: string): Promise<Venda | null> {
  try {
    const { data } = await api.get<Venda>(`/vendas/${vendaId}`);
    return data;
  } catch (err) {
    handleAxiosError(err, "[VENDAS] Erro ao obter venda");
    return null;
  }
}

export async function cancelarVenda(vendaId: string): Promise<boolean> {
  try {
    await api.post(`/vendas/${vendaId}/cancelar`);
    return true;
  } catch (err) {
    handleAxiosError(err, "[VENDAS] Erro ao cancelar venda");
    return false;
  }
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
    return {
      faturasEmitidas: 0,
      clientesAtivos: 0,
      receitaMensal: 0,
      vendasPorMes: [],
      ultimasFaturas: [],
    };
  }
}
