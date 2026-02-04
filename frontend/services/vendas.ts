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

export interface CriarVendaPayload {
  cliente_id: string | null;
  tipo_documento?: 'fatura' | 'recibo' | 'nota_credito' | 'nota_debito';
  faturar?: boolean;
  itens: CriarItemVendaPayload[];
}


/* -------- Cliente -------- */
export interface Cliente {
  id: string;
  nome: string;
  nif?: string | null;
  tipo: 'consumidor_final' | 'empresa';
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  data_registro?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClientePayload {
  nome: string;
  nif?: string | null;
  tipo: 'consumidor_final' | 'empresa';
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
}

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

/* -------- Produto -------- */
export interface Produto {
  id: string;
  nome: string;
  descricao?: string | null;
  codigo?: string | null;
  categoria_id: string;
  user_id: string;
  preco_compra: number;
  preco_venda: number;
  sujeito_iva: boolean;
  isento_iva: boolean;
  taxa_iva: number;
  estoque_atual: number;
  estoque_minimo: number;
  custo_medio?: number;
  tipo: 'produto' | 'servico';
  status: 'ativo' | 'inativo';
}

export interface ProdutoPayload {
  nome: string;
  descricao?: string | null;
  codigo?: string | null;
  categoria_id: string;
  user_id: string;
  preco_compra: number;
  preco_venda: number;
  sujeito_iva?: boolean;
  taxa_iva?: number;
  estoque_atual: number;
  estoque_minimo: number;
  tipo?: 'produto' | 'servico';
  status?: 'ativo' | 'inativo';
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
  serie: string;                  // Série fiscal (ex: "A")
  numero: number;                 // Número sequencial da fatura
  base_tributavel: number;        // Soma das bases tributáveis
  total_iva: number;              // Soma do IVA
  total_retencao: number;         // Soma da retenção
  total_pagar: number;            // base + IVA - retenção
  total: number;                  // mesmo valor de total_pagar
  data_venda: string;             // YYYY-MM-DD
  hora_venda: string;             // HH:mm:ss
  status: 'aberta' | 'faturada' | 'cancelada';
  hash_fiscal?: string | null;    // SHA1 do número + data + total
  itens?: ItemVenda[];            // Itens da venda
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

/* -------- Movimento de Stock -------- */
export interface MovimentoStock {
  id: string;
  produto_id: string;
  user_id: string;
  tipo: 'entrada' | 'saida';
  tipo_movimento: 'compra' | 'venda' | 'ajuste' | 'nota_credito';
  quantidade: number;
  custo_medio: number;
  stock_minimo: number;
  referencia?: string;
  observacao?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CriarMovimentoPayload {
  produto_id: string;
  tipo: 'entrada' | 'saida';
  tipo_movimento?: 'compra' | 'venda' | 'ajuste' | 'nota_credito';
  quantidade: number;
  custo_medio?: number;
  stock_minimo?: number;
  referencia?: string;
  observacao?: string;
  data?: string;
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
  metodo: string; // dinheiro | cartao | transferencia
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

export async function criarVenda(payload: CriarVendaPayload) {
  const response = await api.post("/api/vendas", payload);
  return response.data;
}


/* ================== CLIENTES ================== */
export const clienteService = {
  listar: async (): Promise<Cliente[]> => {
    try {
      const { data } = await api.get<{ data: Cliente[] }>("/api/clientes");
      return data.data ?? [];
    } catch (err) {
      handleAxiosError(err, "[CLIENTE] Erro ao listar clientes");
      return [];
    }
  },

  criar: async (payload: ClientePayload): Promise<Cliente | null> => {
    try {
      const { data } = await api.post<Cliente>("/api/clientes", payload);
      return data;
    } catch (err) {
      handleAxiosError(err, "[CLIENTE] Erro ao criar cliente");
      return null;
    }
  },

  buscar: async (id: string): Promise<Cliente | null> => {
    try {
      const { data } = await api.get<Cliente>(`/api/clientes/${id}`);
      return data;
    } catch (err) {
      handleAxiosError(err, "[CLIENTE] Erro ao buscar cliente");
      return null;
    }
  },

  atualizar: async (id: string, payload: Partial<ClientePayload>): Promise<Cliente | null> => {
    try {
      const { data } = await api.put<Cliente>(`/api/clientes/${id}`, payload);
      return data;
    } catch (err) {
      handleAxiosError(err, "[CLIENTE] Erro ao atualizar cliente");
      return null;
    }
  },

  deletar: async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/api/clientes/${id}`);
      return true;
    } catch (err) {
      handleAxiosError(err, "[CLIENTE] Erro ao deletar cliente");
      return false;
    }
  }
};

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

/* ================== PRODUTOS ================== */
export const produtoService = {
  listarPaginado: async (page = 1): Promise<Paginacao<Produto>> => {
    try {
      const { data } = await api.get<Paginacao<Produto>>(`/api/produtos?page=${page}`);
      return data;
    } catch (err) {
      handleAxiosError(err, "[PRODUTO] Erro ao listar produtos");
      return { data: [], current_page: 1, last_page: 1, per_page: 0, total: 0 };
    }
  },

  criar: async (payload: ProdutoPayload): Promise<Produto | null> => {
    try {
      const { data } = await api.post<Produto>("/api/produtos", payload);
      return data;
    } catch (err) {
      handleAxiosError(err, "[PRODUTO] Erro ao criar produto");
      return null;
    }
  },

  atualizar: async (id: string, payload: ProdutoPayload): Promise<Produto | null> => {
    try {
      const { data } = await api.put<Produto>(`/api/produtos/${id}`, payload);
      return data;
    } catch (err) {
      handleAxiosError(err, "[PRODUTO] Erro ao atualizar produto");
      return null;
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

/* ================== MOVIMENTOS DE STOCK ================== */
export const stockService = {
  listar: async (): Promise<MovimentoStock[]> => {
    try {
      const { data } = await api.get<MovimentoStock[]>("/api/movimentos-stock");
      return data;
    } catch (err) {
      handleAxiosError(err, "[STOCK] Erro ao listar movimentos");
      return [];
    }
  },

  criar: async (payload: CriarMovimentoPayload): Promise<MovimentoStock | null> => {
    try {
      const { data } = await api.post<MovimentoStock>("/api/movimentos-stock", payload);
      return data;
    } catch (err) {
      handleAxiosError(err, "[STOCK] Erro ao criar movimento");
      return null;
    }
  },

  obter: async (id: string): Promise<MovimentoStock | null> => {
    try {
      const { data } = await api.get<MovimentoStock>(`/api/movimentos-stock/${id}`);
      return data;
    } catch (err) {
      handleAxiosError(err, "[STOCK] Erro ao obter movimento");
      return null;
    }
  },

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
      const movimentos = await stockService.listar();
      const entradas = movimentos
        .filter(m => m.produto_id === produto_id && m.tipo === "entrada")
        .reduce((sum, m) => sum + m.quantidade, 0);
      const saidas = movimentos
        .filter(m => m.produto_id === produto_id && m.tipo === "saida")
        .reduce((sum, m) => sum + m.quantidade, 0);
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
      const { data } = await api.post<{ venda: Venda; fatura: Fatura }>("/api/vendas", payload);
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
      const { data } = await api.get<{ data: Venda[] }>("/api/vendas/listar");
      return data.data ?? [];
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
      // 1️⃣ Faz a chamada
      const { data } = await api.get<{
        message: string;
        dados: DashboardResponse;
      }>("/api/dashboard");

      // 2️⃣ Retorna apenas "dados", que é do tipo DashboardResponse
      return data.dados;
    } catch (err) {
      handleAxiosError(err, "[DASHBOARD]");
      return null;
    }
  },
};
