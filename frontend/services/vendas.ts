// src/services/vendas.ts

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

/* -------- Paginacao Genérica -------- */
export interface Paginacao<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/* -------- Usuário -------- */
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operador' | 'contablista';
  ativo: boolean;
  ultimo_login?: string | null;
}

export interface CriarItemVendaPayload {
  produto_id: string;
  quantidade: number;
  preco_venda: number;
  desconto?: number;
}

// CORREÇÃO: cliente_nome só deve existir quando for cliente avulso
export interface CriarVendaPayload {
  cliente_id?: string | null;
  cliente_nome?: string;           // Opcional, só enviar quando for avulso
  tipo_documento?: 'fatura' | 'recibo' | 'nota_credito' | 'nota_debito';
  faturar?: boolean;
  itens: CriarItemVendaPayload[];
}

/* -------- Cliente (ATUALIZADO) -------- */
export type TipoCliente = "consumidor_final" | "empresa";

export interface Cliente {
  id: string;
  nome: string;
  nif: string | null;
  tipo: TipoCliente;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  data_registro: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface CriarClienteInput {
  nome: string;
  nif?: string;
  tipo?: TipoCliente;
  telefone?: string;
  email?: string;
  endereco?: string;
  data_registro?: string;
}

export interface AtualizarClienteInput extends Partial<CriarClienteInput> { }

/* -------- Categoria -------- */
export interface Categoria {
  id: string;
  nome: string;
  descricao?: string;
  tipo: 'produto' | 'servico';
  status: 'ativo' | 'inativo';
  user_id: string;
}

export interface CategoriaPayload {
  nome: string;
  descricao?: string;
  tipo?: 'produto' | 'servico';
}

/* -------- Fornecedor -------- */
export interface Fornecedor {
  id: string;
  nome: string;
  tipo: 'nacional' | 'internacional';
  nif?: string;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  status: 'ativo' | 'inativo';
  user_id: string;
}

/* -------- Produto (ATUALIZADO) -------- */
export type TipoProduto = "produto" | "servico";
export type StatusProduto = "ativo" | "inativo";
export type UnidadeMedida = "hora" | "dia" | "semana" | "mes";

export interface Produto {
  id: string;
  categoria_id: string | null;
  categoria?: Categoria;
  fornecedor_id?: string | null;
  fornecedor?: Fornecedor;
  user_id?: string;
  codigo?: string | null;
  nome: string;
  descricao?: string;
  preco_compra: number;
  preco_venda: number;
  custo_medio?: number;
  taxa_iva: number;
  sujeito_iva?: boolean;
  estoque_atual: number;
  estoque_minimo: number;
  status: StatusProduto;
  tipo: TipoProduto;
  // Campos de serviço
  retencao?: number;
  duracao_estimada?: string;
  unidade_medida?: UnidadeMedida;
  // Soft delete
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
  // Relacionamentos
  movimentosStock?: MovimentoStock[];
  // Campos adicionais para listagem
  data_exclusao?: string;
  esta_deletado?: boolean;
}

export interface CriarProdutoInput {
  tipo: TipoProduto;
  categoria_id?: string | null;
  fornecedor_id?: string | null;
  codigo?: string | null;
  nome: string;
  descricao?: string;
  preco_venda: number;
  preco_compra?: number;
  taxa_iva?: number;
  sujeito_iva?: boolean;
  estoque_atual?: number;
  estoque_minimo?: number;
  status?: StatusProduto;
  // Campos de serviço
  retencao?: number;
  duracao_estimada?: string;
  unidade_medida?: UnidadeMedida;
}

export interface AtualizarProdutoInput extends Partial<CriarProdutoInput> { }

export interface ListarProdutosParams {
  tipo?: TipoProduto;
  status?: StatusProduto;
  categoria_id?: string;
  busca?: string;
  estoque_baixo?: boolean;
  sem_estoque?: boolean;
  ordenar?: string;
  direcao?: "asc" | "desc";
  paginar?: boolean;
  per_page?: number;
  with_trashed?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number;
  to?: number;
}

/* -------- Venda -------- */
export interface ItemVenda {
  id: string;
  produto_id: string;
  descricao: string;
  quantidade: number;
  preco_venda: number;
  desconto: number;
  base_tributavel: number;
  valor_iva: number;
  valor_retencao: number;
  subtotal: number;
}

export interface Venda {
  id: string;
  cliente_id?: string | null;
  user_id: string;
  tipo_documento: 'fatura' | 'recibo' | 'nota_credito' | 'nota_debito';
  serie: string;
  numero: number;
  base_tributavel: number;
  total_iva: number;
  total_retencao: number;
  total_pagar: number;
  total: number;
  data_venda: string;
  hora_venda: string;
  status: 'aberta' | 'faturada' | 'cancelada';
  hash_fiscal?: string | null;
  itens?: ItemVenda[];
  cliente?: {
    id: string;
    nome: string;
    nif?: string | null;
    tipo: string;
    telefone?: string;
    email?: string;
    endereco?: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

/* -------- Compra -------- */
export interface ItemCompra {
  id: string;
  compra_id: string;
  produto_id: string;
  quantidade: number;
  preco_compra: number;
  subtotal: number;
  base_tributavel: number;
  valor_iva: number;
}

export interface Compra {
  id: string;
  user_id: string;
  fornecedor_id: string;
  data: string;
  tipo_documento: 'fatura' | 'nota_credito';
  numero_documento: string;
  data_emissao: string;
  base_tributavel: number;
  total_iva: number;
  total_fatura: number;
  total: number;
  validado_fiscalmente: boolean;
  itens?: ItemCompra[];
}

/* -------- Fatura -------- */
export interface ItemFatura {
  id: string;
  fatura_id: string;
  produto_id?: string | null;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  base_tributavel: number;
  taxa_iva: number;
  valor_iva: number;
  valor_retenção: number;
  desconto: number;
  total_linha: number;
}

export interface Fatura {
  id: string;
  user_id: string;
  venda_id: string;
  cliente_id?: string | null;
  serie: string;
  numero: string;
  tipo_documento: 'FT' | 'FR' | 'NC' | 'ND';
  data_emissao: string;
  hora_emissao: string;
  data_vencimento?: string | null;
  base_tributavel: number;
  total_iva: number;
  total_retenção: number;
  total_liquido: number;
  estado: 'emitido' | 'anulado' | 'pago';
  motivo_anulacao?: string | null;
  hash_fiscal?: string | null;
  itens?: ItemFatura[];
  cliente?: Cliente;
}

/* -------- Pagamento -------- */
export interface Pagamento {
  id: string;
  fatura_id: string;
  user_id: string;
  metodo: 'dinheiro' | 'cartao' | 'transferencia';
  valor_pago: number;
  troco: number;
  referencia?: string | null;
  data_pagamento: string;
  hora_pagamento: string;
}

/* -------- Movimento de Stock (ATUALIZADO) -------- */
export interface MovimentoStock {
  id: string;
  produto_id: string;
  user_id: string;
  tipo: 'entrada' | 'saida';
  tipo_movimento: 'compra' | 'venda' | 'ajuste' | 'nota_credito' | 'devolucao';
  quantidade: number;
  custo_medio: number;
  stock_minimo: number;
  referencia?: string;
  observacao?: string;
  created_at?: string;
  updated_at?: string;
  // Campos adicionais do novo serviço
  estoque_anterior?: number;
  estoque_novo?: number;
  custo_unitario?: number;
  motivo?: string;
  user?: {
    id: string;
    name: string;
  };
  produto?: Produto;
}

export interface CriarMovimentoPayload {
  produto_id: string;
  tipo: 'entrada' | 'saida';
  tipo_movimento?: 'compra' | 'venda' | 'ajuste' | 'nota_credito' | 'devolucao';
  quantidade: number;
  custo_medio?: number;
  stock_minimo?: number;
  referencia?: string;
  observacao?: string;
  data?: string;
  // Campos adicionais do novo serviço
  motivo?: string;
  custo_unitario?: number;
}

/* -------- Dashboard -------- */
export interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  clientesAtivos: number;
  produtos: {
    total: number;
    ativos: number;
    inativos: number;
    stock_baixo: number;
  };
  vendas: {
    total: number;
    abertas: number;
    faturadas: number;
    canceladas: number;
    ultimas: Array<{
      id: number;
      cliente: string;
      total: number;
      status: string;
      data: string;
    }>;
    vendasPorMes: Array<{
      mes: string;
      total: number;
    }>;
  };
  faturas: {
    total: number;
    pendentes: number;
    pagas: number;
    receitaMesAtual: number;
    receitaMesAnterior: number;
    ultimas: Array<{
      id: number;
      venda_id: number;
      total: number;
      status: string;
      data: string;
      cliente: string | null;
    }>;
  };
  pagamentos: {
    total: number;
    dinheiro: number;
    cartao: number;
    transferencia: number;
  };
  indicadores: {
    produtosMaisVendidos: Array<{
      produto: string;
      quantidade: number;
    }>;
  };
}

export interface UltimaVenda {
  id: number;
  cliente: string;
  total: number;
  status: string;
  data: string;
}

export interface UltimaFatura {
  id: number;
  venda_id: number;
  total: number;
  estado: string;
  data: string;
}

export interface VendaPorMes {
  mes: string;
  total: number;
}

export interface ProdutoMaisVendido {
  produto: string;
  quantidade: number;
}

export interface ProdutosResumo {
  total: number;
  ativos: number;
  inativos: number;
  stock_baixo: number;
}

export interface VendasResumo {
  total: number;
  abertas: number;
  faturadas: number;
  canceladas: number;
  ultimas: UltimaVenda[];
  vendasPorMes: VendaPorMes[];
}

export interface FaturasResumo {
  total: number;
  pendentes: number;
  pagas: number;
  ultimas: UltimaFatura[];
  receitaMesAtual: number;
  receitaMesAnterior: number;
}

export interface PagamentoMetodo {
  metodo: string;
  total: number;
}

export interface Indicadores {
  produtosMaisVendidos: ProdutoMaisVendido[];
}

export interface DashboardResponse {
  produtos: ProdutosResumo;
  vendas: VendasResumo;
  faturas: FaturasResumo;
  pagamentos: PagamentoMetodo[];
  indicadores: Indicadores;
  kpis: {
    ticketMedio: number;
    crescimentoPercentual: number;
    ivaArrecadado: number;
  };
  receitaMesAtual: number;
  receitaMesAnterior: number;
  clientesAtivos: number;
}

/* ================== SERVIÇOS ================== */

export async function obterDadosNovaVenda(): Promise<{
  clientes: Cliente[];
  produtos: Produto[];
}> {
  const { data } = await api.get("/api/vendas/create");
  return data;
}

// CORREÇÃO: Função helper para criar payload limpo
function criarPayloadVenda(payload: CriarVendaPayload): Record<string, unknown> {
  const cleanPayload: Record<string, unknown> = {
    itens: payload.itens,
  };

  // Só adiciona cliente_id se existir e não for null
  if (payload.cliente_id && payload.cliente_id !== null) {
    cleanPayload.cliente_id = payload.cliente_id;
  }

  // Só adiciona cliente_nome se existir e não for string vazia
  if (payload.cliente_nome && payload.cliente_nome.trim() !== '') {
    cleanPayload.cliente_nome = payload.cliente_nome.trim();
  }

  // Adiciona campos opcionais se existirem
  if (payload.tipo_documento) {
    cleanPayload.tipo_documento = payload.tipo_documento;
  }
  
  if (payload.faturar !== undefined) {
    cleanPayload.faturar = payload.faturar;
  }

  return cleanPayload;
}

export async function criarVenda(payload: CriarVendaPayload) {
  // Usar o helper para limpar o payload antes de enviar
  const cleanPayload = criarPayloadVenda(payload);
  
  console.log('[VENDA SERVICE] Payload limpo:', cleanPayload);
  
  const response = await api.post("/api/vendas", cleanPayload);
  return response.data;
}

/* ================== CLIENTES (ATUALIZADO) ================== */
const API_PREFIX = "/api";

// Configuração para evitar cache
const noCacheConfig = {
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
};

export const clienteService = {
  async listar(): Promise<Cliente[]> {
    console.log('[CLIENTE SERVICE] Listar clientes - Iniciando...');
    const timestamp = new Date().getTime();
    const response = await api.get(`${API_PREFIX}/clientes?t=${timestamp}`, noCacheConfig);
    console.log('[CLIENTE SERVICE] Listar clientes - Sucesso:', response.data);
    return response.data.clientes || [];
  },

  async listarTodos(): Promise<Cliente[]> {
    console.log('[CLIENTE SERVICE] Listar todos clientes (com deletados) - Iniciando...');
    const timestamp = new Date().getTime();
    const response = await api.get(`${API_PREFIX}/clientes/todos?t=${timestamp}`, noCacheConfig);
    console.log('[CLIENTE SERVICE] Listar todos clientes - Sucesso:', response.data);
    return response.data.clientes || [];
  },

  async buscar(id: string): Promise<Cliente | null> {
    console.log('[CLIENTE SERVICE] Buscar cliente - ID:', id);
    const timestamp = new Date().getTime();
    try {
      const response = await api.get(`${API_PREFIX}/clientes/${id}?t=${timestamp}`, noCacheConfig);
      console.log('[CLIENTE SERVICE] Buscar cliente - Sucesso:', response.data);
      return response.data.cliente;
    } catch (err) {
      handleAxiosError(err, "[CLIENTE] Erro ao buscar cliente");
      return null;
    }
  },

  async criar(dados: CriarClienteInput): Promise<Cliente | null> {
    console.log('[CLIENTE SERVICE] Criar cliente - Dados:', dados);
    try {
      const response = await api.post(`${API_PREFIX}/clientes`, dados);
      console.log('[CLIENTE SERVICE] Criar cliente - Sucesso:', response.data);
      return response.data.cliente;
    } catch (err) {
      handleAxiosError(err, "[CLIENTE] Erro ao criar cliente");
      return null;
    }
  },

  async atualizar(id: string, dados: AtualizarClienteInput): Promise<Cliente | null> {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║ [CLIENTE SERVICE] ATUALIZAR CLIENTE - INÍCIO            ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('[CLIENTE SERVICE] ID recebido:', id);
    console.log('[CLIENTE SERVICE] Dados:', dados);

    const url = `${API_PREFIX}/clientes/${id}`;
    console.log('[CLIENTE SERVICE] URL completa:', url);

    try {
      const response = await api.put(url, dados);
      console.log('[CLIENTE SERVICE] Resposta sucesso:', response.status, response.data);
      return response.data.cliente;
    } catch (err) {
      handleAxiosError(err, "[CLIENTE] Erro ao atualizar cliente");
      return null;
    }
  },

  async deletar(id: string): Promise<boolean> {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║ [CLIENTE SERVICE] DELETAR CLIENTE - INÍCIO              ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('[CLIENTE SERVICE] ID recebido:', id);

    try {
      const response = await api.delete(`${API_PREFIX}/clientes/${id}`);
      console.log('[CLIENTE SERVICE] Resposta sucesso:', response.status, response.data);
      return true;
    } catch (err) {
      handleAxiosError(err, "[CLIENTE] Erro ao deletar cliente");
      return false;
    }
  },

  async restaurar(id: string): Promise<Cliente | null> {
    console.log('[CLIENTE SERVICE] Restaurar cliente - ID:', id);
    try {
      const response = await api.post(`${API_PREFIX}/clientes/${id}/restore`);
      console.log('[CLIENTE SERVICE] Cliente restaurado - Sucesso:', response.data);
      return response.data.cliente;
    } catch (err) {
      handleAxiosError(err, "[CLIENTE] Erro ao restaurar cliente");
      return null;
    }
  },

  async removerPermanentemente(id: string): Promise<boolean> {
    console.log('[CLIENTE SERVICE] Remover cliente permanentemente - ID:', id);
    try {
      const response = await api.delete(`${API_PREFIX}/clientes/${id}/force`);
      console.log('[CLIENTE SERVICE] Cliente removido permanentemente - Sucesso:', response.data);
      return true;
    } catch (err) {
      handleAxiosError(err, "[CLIENTE] Erro ao remover cliente permanentemente");
      return false;
    }
  }
};

// Funções utilitárias para clientes
export function formatarNIF(nif: string | null): string {
  if (!nif) return "-";
  if (nif.length === 14) {
    return `${nif.slice(0, 9)} ${nif.slice(9, 11)} ${nif.slice(11)}`;
  }
  return nif;
}

export function getTipoClienteLabel(tipo: TipoCliente): string {
  const labels: Record<TipoCliente, string> = {
    consumidor_final: "Consumidor Final",
    empresa: "Empresa",
  };
  return labels[tipo] || tipo;
}

export function getTipoClienteColor(tipo: TipoCliente): string {
  return tipo === "empresa" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700";
}

/* ================== FORNECEDORES ================== */
export const fornecedorService = {
  listar: async (): Promise<Fornecedor[]> => {
    try {
      const { data } = await api.get<Fornecedor[]>("/api/fornecedores");
      return data;
    } catch (err) {
      handleAxiosError(err, "[FORNECEDOR] Erro ao listar fornecedores");
      return [];
    }
  },

  buscar: async (id: string): Promise<Fornecedor | null> => {
    try {
      const { data } = await api.get<Fornecedor>(`/api/fornecedores/${id}`);
      return data;
    } catch (err) {
      handleAxiosError(err, "[FORNECEDOR] Erro ao buscar fornecedor");
      return null;
    }
  },

  criar: async (payload: Omit<Fornecedor, "id">): Promise<Fornecedor | null> => {
    try {
      const { data } = await api.post<Fornecedor>("/api/fornecedores", payload);
      return data;
    } catch (err) {
      handleAxiosError(err, "[FORNECEDOR] Erro ao criar fornecedor");
      return null;
    }
  },

  atualizar: async (id: string, payload: Partial<Omit<Fornecedor, "id">>): Promise<Fornecedor | null> => {
    try {
      const { data } = await api.put<Fornecedor>(`/api/fornecedores/${id}`, payload);
      return data;
    } catch (err) {
      handleAxiosError(err, "[FORNECEDOR] Erro ao atualizar fornecedor");
      return null;
    }
  },

  deletar: async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/api/fornecedores/${id}`);
      return true;
    } catch (err) {
      handleAxiosError(err, "[FORNECEDOR] Erro ao deletar fornecedor");
      return false;
    }
  }
};

/* ================== PRODUTOS (ATUALIZADO) ================== */
export const produtoService = {
  /**
   * Listar produtos ativos (não deletados) com filtros e paginação opcional
   */
  async listar(params: ListarProdutosParams = {}): Promise<{ message: string; produtos: Produto[] | PaginatedResponse<Produto> }> {
    try {
      const queryParams = new URLSearchParams();

      if (params.tipo) queryParams.append("tipo", params.tipo);
      if (params.status) queryParams.append("status", params.status);
      if (params.categoria_id) queryParams.append("categoria_id", params.categoria_id);
      if (params.busca) queryParams.append("busca", params.busca);
      if (params.estoque_baixo) queryParams.append("estoque_baixo", "true");
      if (params.sem_estoque) queryParams.append("sem_estoque", "true");
      if (params.ordenar) queryParams.append("ordenar", params.ordenar);
      if (params.direcao) queryParams.append("direcao", params.direcao);
      if (params.paginar) queryParams.append("paginar", "true");
      if (params.per_page) queryParams.append("per_page", params.per_page.toString());

      const queryString = queryParams.toString();
      const url = `${API_PREFIX}/produtos${queryString ? `?${queryString}` : ""}`;

      const response = await api.get(url);
      return response.data;
    } catch (err) {
      handleAxiosError(err, "[PRODUTO] Erro ao listar produtos");
      return { message: "Erro", produtos: [] };
    }
  },

  /**
   * Listar todos os produtos (ativos + deletados) - para admin
   */
  async listarTodos(params: Omit<ListarProdutosParams, "with_trashed" | "status" | "estoque_baixo" | "sem_estoque"> = {}): Promise<{
    message: string;
    produtos: Produto[];
    total: number;
    ativos: number;
    deletados: number;
    produtos_fisicos: number;
    servicos: number;
  }> {
    try {
      const queryParams = new URLSearchParams();

      if (params.tipo) queryParams.append("tipo", params.tipo);
      if (params.busca) queryParams.append("busca", params.busca);

      const queryString = queryParams.toString();
      const url = `${API_PREFIX}/produtos/all${queryString ? `?${queryString}` : ""}`;

      const response = await api.get(url);
      return response.data;
    } catch (err) {
      handleAxiosError(err, "[PRODUTO] Erro ao listar todos produtos");
      return { message: "Erro", produtos: [], total: 0, ativos: 0, deletados: 0, produtos_fisicos: 0, servicos: 0 };
    }
  },

  /**
   * Listar APENAS produtos deletados (lixeira) com filtros
   */
  async listarDeletados(params: Omit<ListarProdutosParams, "with_trashed" | "status" | "estoque_baixo" | "sem_estoque" | "categoria_id"> = {}): Promise<{
    message: string;
    produtos: Produto[] | PaginatedResponse<Produto>;
    total_deletados: number;
  }> {
    try {
      const queryParams = new URLSearchParams();

      if (params.busca) queryParams.append("busca", params.busca);
      if (params.paginar) queryParams.append("paginar", "true");
      if (params.per_page) queryParams.append("per_page", params.per_page.toString());

      const queryString = queryParams.toString();
      const url = `${API_PREFIX}/produtos/trashed${queryString ? `?${queryString}` : ""}`;

      const response = await api.get(url);
      return response.data;
    } catch (err) {
      handleAxiosError(err, "[PRODUTO] Erro ao listar produtos deletados");
      return { message: "Erro", produtos: [], total_deletados: 0 };
    }
  },

  /**
   * Buscar produto por ID com todos os relacionamentos
   */
  async buscar(id: string): Promise<Produto | null> {
    try {
      const response = await api.get(`${API_PREFIX}/produtos/${id}`);
      return response.data.produto;
    } catch (err) {
      handleAxiosError(err, "[PRODUTO] Erro ao buscar produto");
      return null;
    }
  },

  /**
   * Criar novo produto/serviço
   */
  async criar(dados: CriarProdutoInput): Promise<Produto | null> {
    try {
      const response = await api.post(`${API_PREFIX}/produtos`, dados);
      return response.data.produto;
    } catch (err) {
      handleAxiosError(err, "[PRODUTO] Erro ao criar produto");
      return null;
    }
  },

  /**
   * Atualizar produto
   */
  async atualizar(id: string, dados: AtualizarProdutoInput): Promise<Produto | null> {
    try {
      const response = await api.put(`${API_PREFIX}/produtos/${id}`, dados);
      return response.data.produto;
    } catch (err) {
      handleAxiosError(err, "[PRODUTO] Erro ao atualizar produto");
      return null;
    }
  },

  /**
   * Alterar status (ativo/inativo)
   */
  async alterarStatus(id: string, status: StatusProduto): Promise<Produto | null> {
    try {
      const response = await api.post(`${API_PREFIX}/produtos/${id}/status`, { status });
      return response.data.produto;
    } catch (err) {
      handleAxiosError(err, "[PRODUTO] Erro ao alterar status");
      return null;
    }
  },

  /**
   * Mover para lixeira (soft delete)
   */
  async moverParaLixeira(id: string): Promise<{ message: string; soft_deleted: boolean; id: string; deleted_at?: string } | null> {
    try {
      const response = await api.delete(`${API_PREFIX}/produtos/${id}`);
      return response.data;
    } catch (err) {
      handleAxiosError(err, "[PRODUTO] Erro ao mover para lixeira");
      return null;
    }
  },

  /**
   * Restaurar produto da lixeira
   */
  async restaurar(id: string): Promise<Produto | null> {
    try {
      const response = await api.post(`${API_PREFIX}/produtos/${id}/restore`);
      return response.data.produto;
    } catch (err) {
      handleAxiosError(err, "[PRODUTO] Erro ao restaurar produto");
      return null;
    }
  },

  /**
   * Deletar permanentemente (force delete) - apenas admin
   */
  async deletarPermanentemente(id: string): Promise<{ message: string; id: string } | null> {
    try {
      const response = await api.delete(`${API_PREFIX}/produtos/${id}/force`);
      return response.data;
    } catch (err) {
      handleAxiosError(err, "[PRODUTO] Erro ao deletar permanentemente");
      return null;
    }
  },

  /**
   * Listar categorias (para o select)
   */
  async listarCategorias(): Promise<Categoria[]> {
    try {
      const response = await api.get(`${API_PREFIX}/categorias`);
      return response.data.categorias || [];
    } catch (err) {
      handleAxiosError(err, "[PRODUTO] Erro ao listar categorias");
      return [];
    }
  },

  /**
   * Verificar se produto está na lixeira
   */
  async verificarStatus(id: string): Promise<{ existe: boolean; deletado: boolean; produto?: Produto }> {
    try {
      const produto = await this.buscar(id);
      return {
        existe: !!produto,
        deletado: !!produto?.deleted_at,
        produto: produto || undefined
      };
    } catch (error) {
      return { existe: false, deletado: false };
    }
  },

  // Método legado para compatibilidade
  listarPaginado: async (page = 1): Promise<Paginacao<Produto>> => {
    try {
      const { data } = await api.get<Paginacao<Produto>>(`/api/produtos?page=${page}`);
      return data;
    } catch (err) {
      handleAxiosError(err, "[PRODUTO] Erro ao listar produtos paginados");
      return { data: [], current_page: 1, last_page: 1, per_page: 0, total: 0 };
    }
  },

  deletar: async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/api/produtos/${id}`);
      return true;
    } catch (err) {
      handleAxiosError(err, "[PRODUTO] Erro ao deletar produto");
      return false;
    }
  }
};

// Funções utilitárias para produtos
export function formatarPreco(valor: number): string {
  return valor.toLocaleString("pt-PT", {
    style: "currency",
    currency: "AOA",
    minimumFractionDigits: 2,
  });
}

export function calcularMargemLucro(precoCompra: number, precoVenda: number): number {
  if (!precoCompra || precoCompra <= 0) return 0;
  return ((precoVenda - precoCompra) / precoCompra) * 100;
}

export function calcularValorEstoque(produto: Produto): number {
  return produto.estoque_atual * (produto.custo_medio || produto.preco_compra || 0);
}

export function estaEstoqueBaixo(produto: Produto): boolean {
  return produto.estoque_atual > 0 && produto.estoque_atual <= produto.estoque_minimo;
}

export function estaSemEstoque(produto: Produto): boolean {
  return produto.estoque_atual === 0;
}

export function formatarData(data: string | null): string {
  if (!data) return "-";
  return new Date(data).toLocaleDateString("pt-PT");
}

export function formatarDataHora(data: string | null): string {
  if (!data) return "-";
  return new Date(data).toLocaleString("pt-PT");
}

export function estaNaLixeira(produto: Produto): boolean {
  return !!produto.deleted_at;
}

export function isServico(produto: Produto): boolean {
  return produto.tipo === "servico";
}

export function getStatusBadge(produto: Produto): { texto: string; cor: string } {
  if (produto.deleted_at) {
    return { texto: "Na Lixeira", cor: "bg-red-100 text-red-800" };
  }
  if (produto.status === "inativo") {
    return { texto: "Inativo", cor: "bg-gray-100 text-gray-800" };
  }
  return { texto: "Ativo", cor: "bg-green-100 text-green-800" };
}

export function getTipoBadge(tipo: TipoProduto): { texto: string; cor: string } {
  if (tipo === "servico") {
    return { texto: "Serviço", cor: "bg-blue-100 text-blue-800" };
  }
  return { texto: "Produto", cor: "bg-purple-100 text-purple-800" };
}

export function formatarUnidadeMedida(unidade: UnidadeMedida | undefined): string {
  if (!unidade) return "-";
  const map: Record<UnidadeMedida, string> = {
    hora: "Hora(s)",
    dia: "Dia(s)",
    semana: "Semana(s)",
    mes: "Mês(es)",
  };
  return map[unidade] || unidade;
}

/* ================== CATEGORIAS ================== */
export const categoriaService = {
  listar: async (): Promise<Categoria[]> => {
    try {
      const { data } = await api.get<Categoria[]>("/api/categorias");
      return data;
    } catch (err) {
      handleAxiosError(err, "[CATEGORIA] Erro ao listar categorias");
      return [];
    }
  },

  criar: async (payload: CategoriaPayload): Promise<Categoria | null> => {
    try {
      const { data } = await api.post<Categoria>("/api/categorias", payload);
      return data;
    } catch (err) {
      handleAxiosError(err, "[CATEGORIA] Erro ao criar categoria");
      return null;
    }
  },

  atualizar: async (id: string, payload: Partial<CategoriaPayload>): Promise<Categoria | null> => {
    try {
      const { data } = await api.put<Categoria>(`/api/categorias/${id}`, payload);
      return data;
    } catch (err) {
      handleAxiosError(err, "[CATEGORIA] Erro ao atualizar categoria");
      return null;
    }
  },

  deletar: async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/api/categorias/${id}`);
      return true;
    } catch (err) {
      handleAxiosError(err, "[CATEGORIA] Erro ao deletar categoria");
      return false;
    }
  },

  buscar: async (id: string): Promise<Categoria | null> => {
    try {
      const { data } = await api.get<Categoria>(`/api/categorias/${id}`);
      return data;
    } catch (err) {
      handleAxiosError(err, "[CATEGORIA] Erro ao buscar categoria");
      return null;
    }
  }
};

/* ================== MOVIMENTOS DE STOCK (ATUALIZADO) ================== */
export const stockService = {
  /**
   * Listar todos os movimentos de stock
   */
  async listar(params: {
    produto_id?: string;
    tipo?: "entrada" | "saida";
    tipo_movimento?: string;
    data_inicio?: string;
    data_fim?: string;
    paginar?: boolean;
    per_page?: number;
  } = {}): Promise<MovimentoStock[]> {
    try {
      const queryParams = new URLSearchParams();

      if (params.produto_id) queryParams.append("produto_id", params.produto_id);
      if (params.tipo) queryParams.append("tipo", params.tipo);
      if (params.tipo_movimento) queryParams.append("tipo_movimento", params.tipo_movimento);
      if (params.data_inicio) queryParams.append("data_inicio", params.data_inicio);
      if (params.data_fim) queryParams.append("data_fim", params.data_fim);
      if (params.paginar) queryParams.append("paginar", "true");
      if (params.per_page) queryParams.append("per_page", params.per_page.toString());

      const queryString = queryParams.toString();
      const url = `${API_PREFIX}/movimentos-stock${queryString ? `?${queryString}` : ""}`;

      const response = await api.get(url);
      return response.data.movimentos || [];
    } catch (err) {
      handleAxiosError(err, "[STOCK] Erro ao listar movimentos");
      return [];
    }
  },

  /**
   * Resumo do estoque (para dashboard)
   */
  async resumo(): Promise<{
    totalProdutos: number;
    produtosAtivos: number;
    produtosEstoqueBaixo: number;
    produtosSemEstoque: number;
    valorTotalEstoque: number;
    movimentacoesHoje: number;
    entradasHoje: number;
    saidasHoje: number;
    produtos_criticos: Produto[];
  }> {
    try {
      const response = await api.get(`${API_PREFIX}/movimentos-stock/resumo`);
      return response.data;
    } catch (err) {
      handleAxiosError(err, "[STOCK] Erro ao obter resumo");
      return {
        totalProdutos: 0,
        produtosAtivos: 0,
        produtosEstoqueBaixo: 0,
        produtosSemEstoque: 0,
        valorTotalEstoque: 0,
        movimentacoesHoje: 0,
        entradasHoje: 0,
        saidasHoje: 0,
        produtos_criticos: []
      };
    }
  },

  /**
   * Histórico de movimentos de um produto específico
   */
  async historicoProduto(produtoId: string, page = 1): Promise<{
    message: string;
    produto: { id: string; nome: string; estoque_atual: number };
    movimentos: PaginatedResponse<MovimentoStock>;
  }> {
    try {
      const response = await api.get(`${API_PREFIX}/movimentos-stock/produto/${produtoId}?page=${page}`);
      return response.data;
    } catch (err) {
      handleAxiosError(err, "[STOCK] Erro ao obter histórico");
      return {
        message: "Erro",
        produto: { id: produtoId, nome: "", estoque_atual: 0 },
        movimentos: { data: [], current_page: 1, last_page: 1, per_page: 20, total: 0 }
      };
    }
  },

  /**
   * Criar novo movimento de stock (entrada/saída)
   */
  async criar(payload: CriarMovimentoPayload): Promise<MovimentoStock | null> {
    try {
      const response = await api.post(`${API_PREFIX}/movimentos-stock`, {
        produto_id: payload.produto_id,
        tipo: payload.tipo,
        tipo_movimento: payload.tipo_movimento || "ajuste",
        quantidade: Math.abs(payload.quantidade),
        motivo: payload.observacao || payload.motivo,
        referencia: payload.referencia,
        custo_unitario: payload.custo_unitario,
      });
      return response.data.movimento;
    } catch (err) {
      handleAxiosError(err, "[STOCK] Erro ao criar movimento");
      return null;
    }
  },

  /**
   * Ajuste manual de stock (correção de inventário)
   */
  async ajuste(produto_id: string, quantidade: number, motivo: string, custo_medio?: number): Promise<{
    message: string;
    movimento?: MovimentoStock;
    ajuste: {
      anterior: number;
      novo: number;
      diferenca: number;
    };
  } | null> {
    try {
      const response = await api.post(`${API_PREFIX}/movimentos-stock/ajuste`, {
        produto_id,
        quantidade,
        motivo,
        custo_medio,
      });
      return response.data;
    } catch (err) {
      handleAxiosError(err, "[STOCK] Erro ao realizar ajuste");
      return null;
    }
  },

  /**
   * Transferência entre produtos
   */
  async transferencia(produto_origem_id: string, produto_destino_id: string, quantidade: number, motivo: string): Promise<{
    message: string;
    transferencia: {
      origem: { id: string; nome: string; estoque_anterior: number; estoque_novo: number };
      destino: { id: string; nome: string; estoque_anterior: number; estoque_novo: number };
      quantidade: number;
    };
  } | null> {
    try {
      const response = await api.post(`${API_PREFIX}/movimentos-stock/transferencia`, {
        produto_origem_id,
        produto_destino_id,
        quantidade,
        motivo,
      });
      return response.data;
    } catch (err) {
      handleAxiosError(err, "[STOCK] Erro ao realizar transferência");
      return null;
    }
  },

  /**
   * Mostrar movimento específico
   */
  async obter(id: string): Promise<MovimentoStock | null> {
    try {
      const response = await api.get(`${API_PREFIX}/movimentos-stock/${id}`);
      return response.data.movimento;
    } catch (err) {
      handleAxiosError(err, "[STOCK] Erro ao obter movimento");
      return null;
    }
  },

  /**
   * Estatísticas de movimentos (relatório)
   */
  async estatisticas(params: {
    data_inicio?: string;
    data_fim?: string;
    produto_id?: string;
  } = {}): Promise<{
    total_movimentos: number;
    total_entradas: number;
    total_saidas: number;
    por_tipo: Array<{ tipo_movimento: string; total: number }>;
    por_mes: Array<{ mes: string; entradas: number; saidas: number }>;
  } | null> {
    try {
      const queryParams = new URLSearchParams();
      if (params.data_inicio) queryParams.append("data_inicio", params.data_inicio);
      if (params.data_fim) queryParams.append("data_fim", params.data_fim);
      if (params.produto_id) queryParams.append("produto_id", params.produto_id);

      const queryString = queryParams.toString();
      const url = `${API_PREFIX}/movimentos-stock/estatisticas${queryString ? `?${queryString}` : ""}`;

      const response = await api.get(url);
      return response.data.estatisticas;
    } catch (err) {
      handleAxiosError(err, "[STOCK] Erro ao obter estatísticas");
      return null;
    }
  },

  // Métodos legados para compatibilidade
  atualizar: async (id: string, payload: Partial<CriarMovimentoPayload>): Promise<MovimentoStock | null> => {
    try {
      const { data } = await api.put<MovimentoStock>(`/api/movimentos-stock/${id}`, payload);
      return data;
    } catch (err) {
      handleAxiosError(err, "[STOCK] Erro ao atualizar movimento");
      return null;
    }
  },

  deletar: async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/api/movimentos-stock/${id}`);
      return true;
    } catch (err) {
      handleAxiosError(err, "[STOCK] Erro ao deletar movimento");
      return false;
    }
  },

  calcularStock: async (produto_id: string): Promise<number> => {
    try {
      const movimentos = await stockService.listar({ produto_id });
      const entradas = movimentos
        .filter(m => m.tipo === "entrada")
        .reduce((sum, m) => sum + m.quantidade, 0);
      const saidas = movimentos
        .filter(m => m.tipo === "saida")
        .reduce((sum, m) => sum + Math.abs(m.quantidade), 0);
      return entradas - saidas;
    } catch (err) {
      handleAxiosError(err, "[STOCK] Erro ao calcular stock");
      return 0;
    }
  }
};

/* ================== VENDAS E FATURAS ================== */
export const vendaService = {
  criarVenda: async (payload: CriarVendaPayload): Promise<{ venda: Venda; fatura: Fatura } | null> => {
    try {
      // Usar a mesma função de limpeza do serviço principal
      const cleanPayload = criarPayloadVenda(payload);
      const { data } = await api.post<{ venda: Venda; fatura: Fatura }>("/api/vendas", cleanPayload);
      return data;
    } catch (err) {
      handleAxiosError(err, "[VENDAS] Erro ao criar venda");
      return null;
    }
  },

  obterVenda: async (id: string): Promise<Venda | null> => {
    try {
      const { data } = await api.get<Venda>(`/api/vendas/${id}`);
      return data;
    } catch (err) {
      handleAxiosError(err, "[VENDAS] Erro ao obter venda");
      return null;
    }
  },

  cancelarVenda: async (id: string): Promise<boolean> => {
    try {
      await api.post(`/api/vendas/${id}/cancelar`);
      return true;
    } catch (err) {
      handleAxiosError(err, "[VENDAS] Erro ao cancelar venda");
      return false;
    }
  },

  listarVendas: async (): Promise<Venda[]> => {
    try {
      const { data } = await api.get<{ message: string; vendas: Venda[] }>("/api/vendas");
      return data.vendas ?? [];
    } catch (err) {
      handleAxiosError(err, "[VENDAS] Erro ao listar vendas");
      return [];
    }
  },

  obterDadosNovaVenda: async (): Promise<{ clientes: Cliente[]; produtos: Produto[] }> => {
    try {
      const { data } = await api.get<{ clientes: Cliente[]; produtos: Produto[] }>("/api/vendas/create-data");
      return data;
    } catch (err) {
      handleAxiosError(err, "[VENDAS] Erro ao obter dados da nova venda");
      return { clientes: [], produtos: [] };
    }
  },

  emitirFatura: async (vendaId: string): Promise<Fatura | null> => {
    try {
      const { data } = await api.post<{ fatura: Fatura }>("/api/faturas/gerar", { venda_id: vendaId });
      return data.fatura;
    } catch (err) {
      handleAxiosError(err, "[FATURA] Erro ao gerar fatura");
      return null;
    }
  },

  listarFaturas: async (): Promise<Fatura[]> => {
    try {
      const { data } = await api.get<Fatura[]>("/api/faturas");
      return data;
    } catch (err) {
      handleAxiosError(err, "[FATURA] Erro ao listar faturas");
      return [];
    }
  }
};

/* ================= DASHBOARD SERVICE ================= */
export const dashboardService = {
  fetch: async (): Promise<DashboardResponse | null> => {
    try {
      const { data } = await api.get<{
        message: string;
        dados: DashboardResponse;
      }>("/api/dashboard");
      return data.dados;
    } catch (err) {
      handleAxiosError(err, "[DASHBOARD]");
      return null;
    }
  },
};