import api from '@/services/axios';

/* ================== TIPOS ================== */

export interface TenantInfo {
  id: string;
  nome: string;
  email: string;
}

export interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/* ---------- PRODUTOS ---------- */
export interface Produto {
  id: string;
  nome: string;
  preco: number;
  stock: number;
  categoria_id: string;
}

/* ---------- CATEGORIAS ---------- */
export interface Categoria {
  id: string;
  nome: string;
}

/* ---------- FORNECEDORES ---------- */
export interface Fornecedor {
  id: string;
  nome: string;
  email?: string;
}

/* ---------- VENDAS ---------- */
export interface ItemVendaPayload {
  produto_id: string;
  quantidade: number;
}

export interface CriarVendaPayload {
  cliente_id: string;
  itens: ItemVendaPayload[];
}

export interface Venda {
  id: string;
  total: number;
  data: string;
}

/* ---------- FATURAS ---------- */
export interface Fatura {
  id: string;
  num_sequencial: string;
  total: number;
  status: 'emitida' | 'cancelada';
  data: string;
}

/* ================== AUTH ================== */
/**
 * LOGIN
 * - Backend resolve o tenant pelo email
 * - Token já vem associado ao tenant
 */
export async function loginTenant(email: string, password: string) {
  const response = await api.post('/login', { email, password });

  return response.data as {
    token: string;
    user: TenantUser;
    tenant: TenantInfo;
  };
}

/**
 * LOGOUT
 * - Invalida o token no backend
 */
export async function logoutTenant() {
  await api.post('/logout');
}

/* ================== PRODUTOS ================== */

export async function listarProdutos(): Promise<Produto[]> {
  const response = await api.get('/produtos');
  return response.data;
}

export async function criarProduto(data: {
  nome: string;
  preco: number;
  stock: number;
  categoria_id: string;
}) {
  const response = await api.post('/produtos', data);
  return response.data;
}

/* ================== CATEGORIAS ================== */

export async function listarCategorias(): Promise<Categoria[]> {
  const response = await api.get('/categorias');
  return response.data;
}

export async function criarCategoria(data: { nome: string }) {
  const response = await api.post('/categorias', data);
  return response.data;
}

/* ================== FORNECEDORES ================== */

export async function listarFornecedores(): Promise<Fornecedor[]> {
  const response = await api.get('/fornecedores');
  return response.data;
}

export async function criarFornecedor(data: {
  nome: string;
  email?: string;
}) {
  const response = await api.post('/fornecedores', data);
  return response.data;
}

/* ================== VENDAS ================== */

export async function criarVenda(data: CriarVendaPayload) {
  const response = await api.post('/vendas', data);
  return response.data; // { venda, fatura }
}

export async function listarVendas(): Promise<Venda[]> {
  const response = await api.get('/vendas');
  return response.data;
}

/* ================== FATURAS ================== */

export async function listarFaturas(): Promise<Fatura[]> {
  const response = await api.get('/faturas');
  return response.data;
}

export async function gerarFatura(venda_id: string) {
  const response = await api.post('/faturas/gerar', { venda_id });
  return response.data;
}
