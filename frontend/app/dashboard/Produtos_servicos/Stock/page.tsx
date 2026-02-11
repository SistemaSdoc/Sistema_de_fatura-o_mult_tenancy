// src/app/(empresa)/estoque/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import MainEmpresa from "../../../components/MainEmpresa";
import {
  produtoService, // ✅ CORRIGIDO: Usar produtoService, não estoqueService
  Produto,
  Categoria,
  formatarPreco,
  estaEstoqueBaixo,
  estaSemEstoque,
  formatarData,
  movimentoStockService, // ✅ ADICIONADO: Serviço correto de movimentos
  MovimentoStock,
} from "@/services/produtos";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Search,
  Plus,
  History,
  Box,
  Filter,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  RotateCcw,
  Archive,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCcw,
} from "lucide-react";

// ===== COMPONENTES AUXILIARES =====

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  color: "blue" | "orange" | "red" | "green";
}

function StatCard({ icon, label, value, trend, color }: StatCardProps) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    red: "bg-red-50 text-red-700 border-red-200",
    green: "bg-green-50 text-green-700 border-green-200",
  };

  return (
    <div className={`p-5 rounded-xl border ${colors[color]} bg-opacity-50`}>
      <div className="flex items-start justify-between">
        <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
        {trend && (
          <span
            className={`text-xs font-medium ${trend === "up"
                ? "text-green-600"
                : trend === "down"
                  ? "text-red-600"
                  : "text-gray-500"
              }`}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm opacity-75">{label}</p>
      </div>
    </div>
  );
}

interface ModalEntradaProps {
  isOpen: boolean;
  onClose: () => void;
  produto: Produto | null;
  onConfirm: (quantidade: number, motivo: string) => Promise<void>;
}

function ModalEntrada({
  isOpen,
  onClose,
  produto,
  onConfirm,
}: ModalEntradaProps) {
  const [quantidade, setQuantidade] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !produto) return null;

  const handleConfirm = async () => {
    const qtd = parseInt(quantidade);
    if (!qtd || qtd <= 0) {
      setErro("Quantidade deve ser maior que zero");
      return;
    }
    if (!motivo.trim()) {
      setErro("Motivo é obrigatório");
      return;
    }

    setLoading(true);
    setErro("");
    try {
      await onConfirm(qtd, motivo);
      setQuantidade("");
      setMotivo("");
      setErro("");
    } catch (error) {
      if (error instanceof Error) {
        setErro(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setQuantidade("");
      setMotivo("");
      setErro("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4 text-green-600 flex items-center gap-2">
          <ArrowUpCircle className="w-5 h-5" />
          Entrada de Stock
        </h3>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="font-medium text-gray-900">{produto.nome}</p>
          <p className="text-sm text-gray-500">
            Stock atual:{" "}
            <span className="font-semibold">{produto.estoque_atual}</span>{" "}
            unidades
          </p>
        </div>

        {erro && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {erro}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantidade <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              min="1"
              disabled={loading}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] outline-none disabled:bg-gray-100"
              placeholder="0"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              disabled={loading}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] outline-none resize-none disabled:bg-gray-100"
              placeholder="Ex: Compra ao fornecedor X, Nota fiscal #123..."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <RefreshCcw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ArrowUpCircle className="w-4 h-4" />
                Confirmar Entrada
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  titulo: string;
  mensagem: string;
  tipo?: "danger" | "warning" | "info";
  confirmarTexto?: string;
}

function ConfirmacaoModal({
  isOpen,
  onClose,
  onConfirm,
  titulo,
  mensagem,
  tipo = "danger",
  confirmarTexto = "Confirmar",
}: ConfirmacaoModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const cores = {
    danger: "text-red-600 bg-red-600 hover:bg-red-700",
    warning: "text-orange-600 bg-orange-600 hover:bg-orange-700",
    info: "text-blue-600 bg-blue-600 hover:bg-blue-700",
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3
          className={`text-lg font-semibold mb-2 ${tipo === "danger"
              ? "text-red-600"
              : tipo === "warning"
                ? "text-orange-600"
                : "text-blue-600"
            }`}
        >
          {titulo}
        </h3>
        <p className="text-gray-600 mb-6">{mensagem}</p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${cores[tipo]}`}
          >
            {loading && <RefreshCcw className="w-4 h-4 animate-spin" />}
            {confirmarTexto}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== PÁGINA PRINCIPAL =====

export default function EstoquePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<any>(null); // ✅ Simplificado tipo
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtosDeletados, setProdutosDeletados] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentoStock[]>([]);

  // Filtros
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [filtroEstoque, setFiltroEstoque] = useState<
    "todos" | "baixo" | "zerado"
  >("todos");

  // Modal Entrada
  const [modalEntradaAberto, setModalEntradaAberto] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(
    null
  );

  // Modal Confirmação
  const [modalConfirmacao, setModalConfirmacao] = useState<{
    isOpen: boolean;
    tipo: "delete" | "restore" | "forceDelete";
    produto: Produto | null;
  }>({
    isOpen: false,
    tipo: "delete",
    produto: null,
  });

  // Tabs
  const [abaAtiva, setAbaAtiva] = useState<
    "produtos" | "movimentacoes" | "deletados"
  >("produtos");

  // ✅ CORRIGIDO: Usar produtoService e movimentoStockService
  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [resumoData, produtosData, cats, movs] = await Promise.all([
        movimentoStockService.resumo(), // ✅ CORRIGIDO
        produtoService.listarProdutos({ tipo: "produto" }), // ✅ CORRIGIDO
        produtoService.listarCategorias(), // ✅ CORRIGIDO
        movimentoStockService.listarMovimentos({ paginar: false }), // ✅ CORRIGIDO
      ]);

      setResumo(resumoData);
      const listaProdutos = Array.isArray(produtosData.produtos)
        ? produtosData.produtos
        : (produtosData.produtos as any)?.data || [];
      setProdutos(listaProdutos);
      setCategorias(cats);
      const listaMovs = Array.isArray(movs.movimentos)
        ? movs.movimentos
        : (movs.movimentos as any)?.data || [];
      setMovimentacoes(listaMovs);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ CORRIGIDO: Usar produtoService.listarDeletados
  const carregarDeletados = useCallback(async () => {
    try {
      const response = await produtoService.listarDeletados({
        paginar: false,
      });
      const listaDeletados = Array.isArray(response.produtos)
        ? response.produtos
        : (response.produtos as any)?.data || [];
      setProdutosDeletados(listaDeletados);
    } catch (error) {
      console.error("Erro ao carregar produtos deletados:", error);
      setProdutosDeletados([]);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    if (abaAtiva === "deletados") {
      carregarDeletados();
    }
  }, [abaAtiva, carregarDeletados]);

  // ✅ CORRIGIDO: Usar produtoService.listarProdutos
  async function aplicarFiltros() {
    setLoading(true);
    try {
      const filtros: Parameters<typeof produtoService.listarProdutos>[0] = {
        tipo: "produto",
      };

      if (busca) filtros.busca = busca;
      if (categoriaFiltro) filtros.categoria_id = categoriaFiltro;
      if (filtroEstoque === "baixo") filtros.estoque_baixo = true;
      if (filtroEstoque === "zerado") filtros.sem_estoque = true;

      const data = await produtoService.listarProdutos(filtros);
      const listaProdutos = Array.isArray(data.produtos)
        ? data.produtos
        : (data.produtos as any)?.data || [];
      setProdutos(listaProdutos);
    } catch (error) {
      console.error("Erro ao filtrar:", error);
    } finally {
      setLoading(false);
    }
  }

  function abrirModalEntrada(produto: Produto) {
    setProdutoSelecionado(produto);
    setModalEntradaAberto(true);
  }

  // ✅ CORRIGIDO: Usar movimentoStockService.criarMovimento
  async function handleEntrada(quantidade: number, motivo: string) {
    if (!produtoSelecionado) return;

    try {
      await movimentoStockService.criarMovimento({
        produto_id: produtoSelecionado.id,
        quantidade,
        motivo,
        tipo: "entrada", // ✅ CORRIGIDO: tipo é obrigatório
        tipo_movimento: "ajuste",
      });

      await carregarDados();
      setModalEntradaAberto(false);
    } catch (error: any) {
      console.error("Erro ao registrar entrada:", error);
      const mensagem =
        error?.response?.data?.message ||
        error?.message ||
        "Erro ao registrar entrada. Tente novamente.";
      throw new Error(mensagem);
    }
  }

  function abrirModalDeletar(produto: Produto) {
    setModalConfirmacao({
      isOpen: true,
      tipo: "delete",
      produto,
    });
  }

  function abrirModalRestaurar(produto: Produto) {
    setModalConfirmacao({
      isOpen: true,
      tipo: "restore",
      produto,
    });
  }

  function abrirModalForceDelete(produto: Produto) {
    setModalConfirmacao({
      isOpen: true,
      tipo: "forceDelete",
      produto,
    });
  }

  // ✅ CORRIGIDO: Usar produtoService.moverParaLixeira
  async function handleDeletarProduto() {
    if (!modalConfirmacao.produto) return;

    try {
      await produtoService.moverParaLixeira(modalConfirmacao.produto.id);
      await carregarDados();
      setModalConfirmacao({ isOpen: false, tipo: "delete", produto: null });
    } catch (error: any) {
      console.error("Erro ao deletar produto:", error);
      const mensagem =
        error?.response?.data?.message ||
        error?.message ||
        "Erro ao deletar produto. Tente novamente.";
      alert(mensagem);
      throw error;
    }
  }

  // ✅ CORRIGIDO: Usar produtoService.restaurarProduto
  async function handleRestaurarProduto() {
    if (!modalConfirmacao.produto) return;

    try {
      await produtoService.restaurarProduto(modalConfirmacao.produto.id);
      await carregarDeletados();
      await carregarDados();
      setModalConfirmacao({ isOpen: false, tipo: "restore", produto: null });
    } catch (error: any) {
      console.error("Erro ao restaurar produto:", error);
      const mensagem =
        error?.response?.data?.message ||
        error?.message ||
        "Erro ao restaurar produto. Tente novamente.";
      alert(mensagem);
      throw error;
    }
  }

  // ✅ CORRIGIDO: Usar produtoService.deletarPermanentemente
  async function handleForceDelete() {
    if (!modalConfirmacao.produto) return;

    try {
      await produtoService.deletarPermanentemente(modalConfirmacao.produto.id);
      await carregarDeletados();
      setModalConfirmacao({ isOpen: false, tipo: "forceDelete", produto: null });
    } catch (error: any) {
      console.error("Erro ao deletar permanentemente:", error);
      const mensagem =
        error?.response?.data?.message ||
        error?.message ||
        "Erro ao deletar permanentemente. Tente novamente.";
      alert(mensagem);
      throw error;
    }
  }

  function getStatusEstoque(produto: Produto): {
    label: string;
    cor: string;
    icone: React.ReactNode;
  } {
    if (estaSemEstoque(produto)) {
      return {
        label: "Sem Estoque",
        cor: "bg-red-100 text-red-700 border-red-200",
        icone: <XCircle className="w-3 h-3" />,
      };
    }
    if (estaEstoqueBaixo(produto)) {
      return {
        label: "Estoque Baixo",
        cor: "bg-orange-100 text-orange-700 border-orange-200",
        icone: <AlertTriangle className="w-3 h-3" />,
      };
    }
    return {
      label: "OK",
      cor: "bg-green-100 text-green-700 border-green-200",
      icone: <CheckCircle2 className="w-3 h-3" />,
    };
  }

  function getIconeMovimento(tipo: string): React.ReactNode {
    switch (tipo) {
      case "entrada":
        return <ArrowUpCircle className="w-3 h-3" />;
      case "saida":
        return <ArrowDownCircle className="w-3 h-3" />;
      case "ajuste":
        return <RefreshCcw className="w-3 h-3" />;
      default:
        return <RotateCcw className="w-3 h-3" />;
    }
  }

  function getCorMovimento(tipo: string): string {
    switch (tipo) {
      case "entrada":
        return "bg-green-100 text-green-700";
      case "saida":
        return "bg-red-100 text-red-700";
      case "ajuste":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  if (loading && !resumo) {
    return (
      <MainEmpresa>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin w-12 h-12 border-4 border-[#123859] border-t-transparent rounded-full" />
        </div>
      </MainEmpresa>
    );
  }

  return (
    <MainEmpresa>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#123859]">
              Gestão de Estoque
            </h1>
            <p className="text-gray-500 mt-1">Controle e movimentação de stock</p>
          </div>
          <button
            onClick={() => router.push("/produtos/novo")}
            className="flex items-center gap-2 px-4 py-2 bg-[#F9941F] text-white rounded-lg hover:bg-[#e08516] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Produto
          </button>
        </div>

        {/* Cards de Resumo */}
        {resumo && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Package className="w-5 h-5 text-blue-600" />}
              label="Produtos Ativos"
              value={resumo.produtosAtivos || 0}
              color="blue"
            />
            <StatCard
              icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
              label="Estoque Baixo"
              value={resumo.produtosEstoqueBaixo || 0}
              trend="down"
              color="orange"
            />
            <StatCard
              icon={<TrendingDown className="w-5 h-5 text-red-600" />}
              label="Sem Estoque"
              value={resumo.produtosSemEstoque || 0}
              trend="down"
              color="red"
            />
            <StatCard
              icon={<DollarSign className="w-5 h-5 text-green-600" />}
              label="Valor Total em Stock"
              value={formatarPreco(resumo.valorTotalEstoque || 0)}
              color="green"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setAbaAtiva("produtos")}
              className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors ${abaAtiva === "produtos"
                  ? "text-[#123859] border-b-2 border-[#123859]"
                  : "text-gray-500 hover:text-gray-700"
                }`}
            >
              <Box className="w-4 h-4" />
              Produtos
            </button>
            <button
              onClick={() => setAbaAtiva("movimentacoes")}
              className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors ${abaAtiva === "movimentacoes"
                  ? "text-[#123859] border-b-2 border-[#123859]"
                  : "text-gray-500 hover:text-gray-700"
                }`}
            >
              <History className="w-4 h-4" />
              Movimentações
            </button>
            <button
              onClick={() => setAbaAtiva("deletados")}
              className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors ${abaAtiva === "deletados"
                  ? "text-[#123859] border-b-2 border-[#123859]"
                  : "text-gray-500 hover:text-gray-700"
                }`}
            >
              <Archive className="w-4 h-4" />
              Deletados
              {produtosDeletados.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">
                  {produtosDeletados.length}
                </span>
              )}
            </button>
          </div>

          <div className="p-6">
            {abaAtiva === "produtos" ? (
              <>
                {/* Filtros */}
                <div className="flex flex-col lg:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Buscar produto..."
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] outline-none"
                    />
                  </div>

                  <select
                    value={categoriaFiltro}
                    onChange={(e) => setCategoriaFiltro(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] outline-none bg-white"
                  >
                    <option value="">Todas as categorias</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filtroEstoque}
                    onChange={(e) =>
                      setFiltroEstoque(e.target.value as any)
                    }
                    className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] outline-none bg-white"
                  >
                    <option value="todos">Todos os níveis</option>
                    <option value="baixo">Estoque baixo</option>
                    <option value="zerado">Sem estoque</option>
                  </select>

                  <button
                    onClick={aplicarFiltros}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#123859] text-white rounded-lg hover:bg-[#1a4d7a] transition-colors disabled:opacity-50"
                  >
                    <Filter className="w-4 h-4" />
                    Filtrar
                  </button>
                </div>

                {/* Tabela de Produtos */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4 text-left font-semibold text-gray-700 uppercase text-xs">
                          Produto
                        </th>
                        <th className="py-3 px-4 text-left font-semibold text-gray-700 uppercase text-xs">
                          Categoria
                        </th>
                        <th className="py-3 px-4 text-center font-semibold text-gray-700 uppercase text-xs">
                          Estoque
                        </th>
                        <th className="py-3 px-4 text-center font-semibold text-gray-700 uppercase text-xs">
                          Mínimo
                        </th>
                        <th className="py-3 px-4 text-right font-semibold text-gray-700 uppercase text-xs">
                          Preço
                        </th>
                        <th className="py-3 px-4 text-center font-semibold text-gray-700 uppercase text-xs">
                          Status
                        </th>
                        <th className="py-3 px-4 text-center font-semibold text-gray-700 uppercase text-xs">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {produtos.map((produto) => {
                        const statusEstoque = getStatusEstoque(produto);

                        return (
                          <tr
                            key={produto.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-4 px-4">
                              <div className="font-medium text-gray-900">
                                {produto.nome}
                              </div>
                              {produto.codigo && (
                                <div className="text-xs text-gray-500">
                                  Cód: {produto.codigo}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4 text-gray-600">
                              {produto.categoria?.nome || "-"}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span
                                className={`font-semibold ${estaEstoqueBaixo(produto) ||
                                    estaSemEstoque(produto)
                                    ? "text-orange-600"
                                    : "text-gray-900"
                                  }`}
                              >
                                {produto.estoque_atual}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center text-gray-500">
                              {produto.estoque_minimo}
                            </td>
                            <td className="py-4 px-4 text-right font-medium">
                              {formatarPreco(produto.preco_venda)}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusEstoque.cor}`}
                              >
                                {statusEstoque.icone}
                                {statusEstoque.label}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => abrirModalEntrada(produto)}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Registrar Entrada"
                                >
                                  <ArrowUpCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => abrirModalDeletar(produto)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Mover para Lixeira"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {produtos.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p>Nenhum produto encontrado</p>
                      {(busca || categoriaFiltro || filtroEstoque !== "todos") && (
                        <button
                          onClick={() => {
                            setBusca("");
                            setCategoriaFiltro("");
                            setFiltroEstoque("todos");
                            carregarDados();
                          }}
                          className="mt-2 text-[#123859] hover:underline text-sm"
                        >
                          Limpar filtros
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : abaAtiva === "movimentacoes" ? (
              /* Aba de Movimentações */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4 text-left font-semibold text-gray-700 uppercase text-xs">
                        Data
                      </th>
                      <th className="py-3 px-4 text-left font-semibold text-gray-700 uppercase text-xs">
                        Produto
                      </th>
                      <th className="py-3 px-4 text-center font-semibold text-gray-700 uppercase text-xs">
                        Tipo
                      </th>
                      <th className="py-3 px-4 text-center font-semibold text-gray-700 uppercase text-xs">
                        Qtd
                      </th>
                      <th className="py-3 px-4 text-left font-semibold text-gray-700 uppercase text-xs">
                        Motivo/Observação
                      </th>
                      <th className="py-3 px-4 text-center font-semibold text-gray-700 uppercase text-xs">
                        Stock Anterior → Novo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {movimentacoes.map((mov) => (
                      <tr
                        key={mov.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
                          {formatarData(mov.created_at)}
                        </td>
                        <td className="py-4 px-4 font-medium text-gray-900">
                          {mov.produto?.nome || "-"}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getCorMovimento(
                              mov.tipo
                            )}`}
                          >
                            {getIconeMovimento(mov.tipo)}
                            {mov.tipo.charAt(0).toUpperCase() + mov.tipo.slice(1)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-medium">
                          <span
                            className={
                              mov.quantidade > 0 ? "text-green-600" : "text-red-600"
                            }
                          >
                            {mov.quantidade > 0
                              ? `+${mov.quantidade}`
                              : mov.quantidade}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-600 max-w-xs">
                          <div className="truncate" title={mov.observacao || ""}>
                            {mov.observacao || "-"}
                          </div>
                          {mov.tipo_movimento && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {mov.tipo_movimento}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center text-sm text-gray-500">
                          {mov.estoque_anterior !== undefined && mov.estoque_novo !== undefined ? (
                            <span>
                              {mov.estoque_anterior} → {mov.estoque_novo}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {movimentacoes.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <History className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    Nenhuma movimentação registrada
                  </div>
                )}
              </div>
            ) : (
              /* Aba de Deletados */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4 text-left font-semibold text-gray-700 uppercase text-xs">
                        Produto
                      </th>
                      <th className="py-3 px-4 text-left font-semibold text-gray-700 uppercase text-xs">
                        Categoria
                      </th>
                      <th className="py-3 px-4 text-center font-semibold text-gray-700 uppercase text-xs">
                        Deletado em
                      </th>
                      <th className="py-3 px-4 text-right font-semibold text-gray-700 uppercase text-xs">
                        Preço
                      </th>
                      <th className="py-3 px-4 text-center font-semibold text-gray-700 uppercase text-xs">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {produtosDeletados.map((produto) => (
                      <tr
                        key={produto.id}
                        className="hover:bg-gray-50 transition-colors bg-red-50/30"
                      >
                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-900 line-through opacity-75">
                            {produto.nome}
                          </div>
                          {produto.codigo && (
                            <div className="text-xs text-gray-500">
                              Cód: {produto.codigo}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {produto.categoria?.nome || "-"}
                        </td>
                        <td className="py-4 px-4 text-center text-gray-500">
                          {produto.deleted_at
                            ? formatarData(produto.deleted_at)
                            : "-"}
                        </td>
                        <td className="py-4 px-4 text-right font-medium opacity-75">
                          {formatarPreco(produto.preco_venda)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => abrirModalRestaurar(produto)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Restaurar Produto"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => abrirModalForceDelete(produto)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Deletar Permanentemente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {produtosDeletados.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Archive className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    Nenhum produto deletado
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Entrada */}
      <ModalEntrada
        isOpen={modalEntradaAberto}
        onClose={() => setModalEntradaAberto(false)}
        produto={produtoSelecionado}
        onConfirm={handleEntrada}
      />

      {/* Modal de Confirmação - Deletar */}
      {modalConfirmacao.tipo === "delete" && (
        <ConfirmacaoModal
          isOpen={modalConfirmacao.isOpen}
          onClose={() =>
            setModalConfirmacao({ isOpen: false, tipo: "delete", produto: null })
          }
          onConfirm={handleDeletarProduto}
          titulo="Mover para Lixeira"
          mensagem={`Tem certeza que deseja mover "${modalConfirmacao.produto?.nome}" para a lixeira? O produto não aparecerá mais nas listagens, mas poderá ser restaurado posteriormente.`}
          tipo="warning"
          confirmarTexto="Mover para Lixeira"
        />
      )}

      {/* Modal de Confirmação - Restaurar */}
      {modalConfirmacao.tipo === "restore" && (
        <ConfirmacaoModal
          isOpen={modalConfirmacao.isOpen}
          onClose={() =>
            setModalConfirmacao({
              isOpen: false,
              tipo: "restore",
              produto: null,
            })
          }
          onConfirm={handleRestaurarProduto}
          titulo="Restaurar Produto"
          mensagem={`Tem certeza que deseja restaurar "${modalConfirmacao.produto?.nome}"? O produto voltará a estar disponível no estoque.`}
          tipo="info"
          confirmarTexto="Restaurar"
        />
      )}

      {/* Modal de Confirmação - Force Delete */}
      {modalConfirmacao.tipo === "forceDelete" && (
        <ConfirmacaoModal
          isOpen={modalConfirmacao.isOpen}
          onClose={() =>
            setModalConfirmacao({
              isOpen: false,
              tipo: "forceDelete",
              produto: null,
            })
          }
          onConfirm={handleForceDelete}
          titulo="Deletar Permanentemente"
          mensagem={`ATENÇÃO: Tem certeza que deseja deletar "${modalConfirmacao.produto?.nome}" PERMANENTEMENTE? Esta ação não pode ser desfeita e todos os dados serão perdidos!`}
          tipo="danger"
          confirmarTexto="Deletar Permanentemente"
        />
      )}
    </MainEmpresa>
  );
}