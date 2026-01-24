import api from "./axios";
import { AxiosError } from "axios";

/* ================== HELPERS ================== */
function handleAxiosError(err: unknown, prefix: string) {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message || err.message || "Erro desconhecido";
    console.error(`${prefix}:`, msg);
  } else {
    console.error(`${prefix}:`, err);
  }
}

/* ================== TIPOS ================== */

/* -------- Usuário -------- */
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

/* -------- Cliente -------- */
export interface Cliente {
  id: string;
  nome?: string;
  nif?: string; 
}

/* -------- Produto -------- */
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

/* -------- Item de Venda -------- */
export interface ItemVenda {
  id: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  preco_venda: number;
  subtotal: number;
}

/* -------- Venda -------- */
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

export interface ProdutoVenda {
  id: string;
  nome: string;
  preco_venda: number;
  estoque_atual: number;
}


export interface CriarVendaPayload {
  cliente_id: string;
  itens: {
    produto_id: string;
    quantidade: number;
  }[];
}

/* -------- Fatura -------- */
export interface Fatura {
  id: string;
  cliente: string;
  data: string;
  valor: number;
  status: "emitida" | "cancelada";
}

/* -------- Dashboard -------- */
export interface DashboardData {
  user: User;
  faturasEmitidas: number;
  clientesAtivos: number;
  receitaMensal: number;
  vendasPorMes: { mes: string; total: number }[];
  ultimasFaturas: Fatura[];
}

/* -------- Nova Venda (Clientes + Produtos) -------- */
export interface NovaVendaData {
  clientes: Cliente[];
  produtos: ProdutoVenda[];
}

/* ================== PRODUTOS ================== */
export async function listarProdutos(): Promise<Produto[]> {
  try {
    const { data } = await api.get<Produto[]>("/api/produtos");
    return data;
  } catch (err) {
    handleAxiosError(err, "[PRODUTOS] Erro ao listar produtos");
    return [];
  }
}

export async function criarProduto(payload: ProdutoPayload): Promise<Produto | null> {
  try {
    const { data } = await api.post<Produto>("/api/produtos", payload);
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
    const { data } = await api.put<Produto>(`/api/produtos/${id}`, payload);
    return data;
  } catch (err) {
    handleAxiosError(err, "[PRODUTOS] Erro ao atualizar produto");
    return null;
  }
}

export async function deletarProduto(id: string): Promise<boolean> {
  try {
    await api.delete(`/api/produtos/${id}`);
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
    const { data } = await api.post<{ venda: Venda; fatura: Fatura }>("/api/vendas", payload);
    return data;
  } catch (err) {
    handleAxiosError(err, "[VENDAS] Erro ao criar venda");
    return null;
  }
}

export async function obterVenda(vendaId: string): Promise<Venda | null> {
  try {
    const { data } = await api.get<Venda>(`/api/vendas/${vendaId}`);
    return data;
  } catch (err) {
    handleAxiosError(err, "[VENDAS] Erro ao obter venda");
    return null;
  }
}

export async function cancelarVenda(vendaId: string): Promise<boolean> {
  try {
    await api.post(`/api/vendas/${vendaId}/cancelar`);
    return true;
  } catch (err) {
    handleAxiosError(err, "[VENDAS] Erro ao cancelar venda");
    return false;
  }
}

export async function listarVendas(): Promise<Venda[]> {
  try {
    const { data } = await api.get<Venda[]>("/api/vendas/listar");
    return data;
  } catch (err) {
    handleAxiosError(err, "[VENDAS] Erro ao listar vendas");
    return [];
  }
}

/* ================== NOVA VENDA ================== */
export async function obterDadosNovaVenda(): Promise<NovaVendaData> {
  try {
    const { data } = await api.get<NovaVendaData>("/api/vendas/create-data");
    return data;
  } catch (err) {
    handleAxiosError(err, "[NOVA VENDA] Erro ao obter dados para nova venda");
    return { clientes: [], produtos: [] };
  }
}

/* ================== DASHBOARD ================== */
export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const { data } = await api.get<DashboardData>("/api/dashboard");
    return data;
  } catch (err) {
    handleAxiosError(err, "[DASHBOARD] Erro ao carregar dados");
    throw err;
  }
}
