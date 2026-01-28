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
  Categoria: { 
    id: string;
    nome: string;
  };
  Fornecedor: {
    id: string;
    nome: string;
  };
}

export interface ProdutoPayload {
  nome: string;
  descricao?: string;
  categoria_id: string;
  fornecedor_id: string;
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
  desconto?: number; // desconto informado pelo usuário
  iva?: number;  
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
  cliente: {
    id: string;
    nome: string;
  };
  user: {
    id: string;
    name: string;
  };
  fatura?: {
    id: string;
    status: "emitida" | "cancelada";
    total: number;
  };
}

export interface ProdutoVenda {
  id: string;
  nome: string;
  preco_venda: number;
  estoque_atual: number;
  isento_iva: boolean;
}


export interface CriarVendaPayload {
  cliente_id: string;
  itens: {
    produto_id: string;
    quantidade: number;
    desconto?: number; // desconto informado pelo usuário
    iva?: number;      // IVA informado pelo usuário, ou 0 se isento
  }[];
}

/* -------- Fatura -------- */
export interface Fatura {
  id: string;
  venda_id: string;
  numero: string;
  total: string;
  status: "emitida" | "cancelada";
  hash: string;
  data: string;
  venda?: {
    id: string;
    cliente: {
      id: string;
      nome: string;
      nif: string;
    };
    }
}


/* -------- Dashboard -------- */

export interface DashboardData {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };

  faturasEmitidas: number;
  clientesAtivos: number;

  receitaMensal: number;
  receitaMesAtual: number;
  receitaMesAnterior: number;

  vendasPorMes: {
    mes: string;
    total: number;
  }[];

  produtosMaisVendidos: {
    produto: string;
    quantidade: number;
  }[];

  ultimasFaturas: {
    id: number;
    cliente: string;
    data: string;
    total: number;
    status: string;
  }[];
}


export interface Cliente {
  id: string;
  name: string;
  nif?: string;
  tipo: 'consumidor_final' | 'empresa';
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  created_at?: string;
  updated_at?: string;
  
}

export type Fornecedor = {
  id: string;
  nome: string;
  nif?: string;
  telefone?: string | null;
  email?: string;
  endereco?: string | null;
};

export interface ClientePayload {
  nome: string;
  nif?: string | null;
  tipo: 'consumidor_final' | 'empresa';
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
}



/* -------- Nova Venda (Clientes + Produtos) -------- */
export interface NovaVendaData {
  clientes: Cliente[];
  produtos: ProdutoVenda[];
}
  


export interface Categoria {
  id: string;
  nome: string;
  descricao?: string;
}

export interface CategoriaPayload {
  nome: string;
  descricao?: string;
}


/* ================== TIPOS ================== */
export interface MovimentoStock {
  id: string;
  produto_id: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  origem?: string;
  referencia?: string;
  data?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CriarMovimentoPayload {
  produto_id: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  origem?: string;
  referencia?: string;
  data?: string;
}



/* ================== STOCK SERVICE ================== */
export const stockService = {
  // LISTAR MOVIMENTOS
  async listar(): Promise<MovimentoStock[]> {
    try {
      const { data } = await api.get<MovimentoStock[]>("/api/movimentos-stock");
      return data;
    } catch (err) {
      handleAxiosError(err, "[STOCK] Erro ao listar movimentos");
      return [];
    }
  },

  // CRIAR MOVIMENTO
  async criar(payload: CriarMovimentoPayload): Promise<MovimentoStock | null> {
    try {
      const { data } = await api.post<MovimentoStock>("/api/movimentos-stock", payload);
      return data;
    } catch (err) {
      handleAxiosError(err, "[STOCK] Erro ao criar movimento");
      return null;
    }
  },

  // OBTER UM MOVIMENTO
  async obter(id: string): Promise<MovimentoStock | null> {
    try {
      const { data } = await api.get<MovimentoStock>(`/api/movimentos-stock/${id}`);
      return data;
    } catch (err) {
      handleAxiosError(err, "[STOCK] Erro ao obter movimento");
      return null;
    }
  },

  // ATUALIZAR MOVIMENTO
  async atualizar(id: string, payload: Partial<CriarMovimentoPayload>): Promise<MovimentoStock | null> {
    try {
      const { data } = await api.put<MovimentoStock>(`/api/movimentos-stock/${id}`, payload);
      return data;
    } catch (err) {
      handleAxiosError(err, "[STOCK] Erro ao atualizar movimento");
      return null;
    }
  },

  // DELETAR MOVIMENTO
  async deletar(id: string): Promise<boolean> {
    try {
      await api.delete(`/api/movimentos-stock/${id}`);
      return true;
    } catch (err) {
      handleAxiosError(err, "[STOCK] Erro ao deletar movimento");
      return false;
    }
  },

  

  // CALCULAR STOCK ATUAL DE UM PRODUTO
  async calcularStock(produto_id: string): Promise<number> {
    try {
      const movimentos = await this.listar();
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

export const categoriaService = {
  listar: async (): Promise<Categoria[]> => {
    try {
      const res = await api.get("/api/categorias");
      return res.data;
    } catch (err) {
      console.error("Erro ao listar categorias:", err);
      return [];
    }
  },

  criar: async (payload: CategoriaPayload): Promise<Categoria> => {
    try {
      const res = await api.post("/api/categorias", payload);
      return res.data;
    } catch (err) {
      console.error("Erro ao criar categoria:", err);
      throw err;
    }
  },

  atualizar: async (id: string, payload: Partial<CategoriaPayload>): Promise<Categoria> => {
    try {
      const res = await api.put(`/api/categorias/${id}`, payload);
      return res.data;
    } catch (err) {
      console.error("Erro ao atualizar categoria:", err);
      throw err;
    }
  },

  deletar: async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/api/categorias/${id}`);
      return true;
    } catch (err) {
      console.error("Erro ao deletar categoria:", err);
      return false;
    }
  },

  buscar: async (id: string): Promise<Categoria> => {
    try {
      const res = await api.get(`/api/categorias/${id}`);
      return res.data;
    } catch (err) {
      console.error("Erro ao buscar categoria:", err);
      throw err;
    }
  },
};



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
    const { data } = await api.get<{ data: Venda[] }>("/api/vendas/listar");
    return data.data ?? [];
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

// services/vendas.ts
export async function emitirFatura(vendaId: string): Promise<Fatura | null> {
  try {
    const { data } = await api.post<{ fatura: Fatura }>("/api/faturas/gerar", { venda_id: vendaId });
    return data.fatura;
  } catch (err) {
    handleAxiosError(err, "[FATURA] Erro ao gerar fatura");
    return null;
  }
}
export async function listarFaturas(): Promise<Fatura[]> {
  try {
    const { data } = await api.get<Fatura[]>("/api/faturas");
    return data;
  } catch (err) {
    handleAxiosError(err, "[FATURA] Erro ao listar faturas");
    return [];
  }
}

export const clienteService = {

  // LISTAR
  async listar(): Promise<Cliente[]> {
    const response = await api.get('/api/clientes')
    return response.data
  },

  // CRIAR
  async criar(payload: ClientePayload): Promise<Cliente> {
    const response = await api.post('/api/clientes', payload)
    return response.data
  },

  // MOSTRAR
  async buscar(id: string): Promise<Cliente> {
    const response = await api.get(`/api/clientes/${id}`)
    return response.data
  },

  // ATUALIZAR
  async atualizar(id: string, payload: Partial<ClientePayload>): Promise<Cliente> {
    const response = await api.put(`/api/clientes/${id}`, payload)
    return response.data
  },

  // DELETAR
  async deletar(id: string): Promise<void> {
    await api.delete(`/api/clientes/${id}`)
  }
}


export const fornecedorService = {
  // LISTAR
  async listar(): Promise<Fornecedor[]> {
    const response = await api.get("/api/fornecedores");
    return response.data;
  },

  // BUSCAR POR ID
  async buscar(id: string): Promise<Fornecedor> {
    const response = await api.get(`/api/fornecedores/${id}`);
    return response.data;
  },

  // CRIAR
  async criar(data: Omit<Fornecedor, "id">): Promise<Fornecedor> {
    const response = await api.post("/api/fornecedores", data);
    return response.data;
  },

  // ATUALIZAR
  async atualizar(id: string, data: Partial<Omit<Fornecedor, "id">>): Promise<Fornecedor> {
    const response = await api.put(`/api/fornecedores/${id}`, data);
    return response.data;
  },

  // DELETAR
  async deletar(id: string): Promise<void> {
    await api.delete(`/api/fornecedores/${id}`);
  },
};


/* ================== PRODUTO SERVICE ================== */
export const produtoService = {
  // LISTAR COM PAGINAÇÃO
  async listarPaginado(page = 1): Promise<Paginacao<Produto>> {
    const { data } = await api.get(`/api/produtos?page=${page}`);
    return data;
  },

  async criar(payload: ProdutoPayload): Promise<Produto | null> {
    const { data } = await api.post("/api/produtos", payload);
    return data;
  },

  async atualizar(id: string, payload: ProdutoPayload): Promise<Produto | null> {
    const { data } = await api.put(`/api/produtos/${id}`, payload);
    return data;
  },

  async deletar(id: string): Promise<boolean> {
    await api.delete(`/api/produtos/${id}`);
    return true;
  },
};
