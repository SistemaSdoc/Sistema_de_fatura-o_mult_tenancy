// src/app/(empresa)/estoque/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import MainEmpresa from "../../../components/MainEmpresa";
import {
  produtoService,
  Produto,
  Categoria,
  formatarPreco,
  estaEstoqueBaixo,
  estaSemEstoque,
  formatarData,
  movimentoStockService,
  MovimentoStock,
  isServico,
  isProduto,
  getTipoBadge,
} from "@/services/produtos";
import {
  Package,
  AlertTriangle,
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
  Wrench,
  Layers,
} from "lucide-react";

// ===== COMPONENTES AUXILIARES =====

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "blue" | "orange" | "red" | "green" | "purple";
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    red: "bg-red-50 text-red-700 border-red-200",
    green: "bg-green-50 text-green-700 border-green-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <div className={`p-3 rounded-xl border ${colors[color]} bg-opacity-50`}>
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-white rounded-lg shadow-sm">{icon}</div>
        <div>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-xs opacity-75">{label}</p>
        </div>
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
          className={`text-lg font-semibold mb-2 ${
            tipo === "danger"
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
  const [resumo, setResumo] = useState<any>(null);
  const [itens, setItens] = useState<Produto[]>([]);
  const [itensDeletados, setItensDeletados] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentoStock[]>([]);

  // Filtros
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "produto" | "servico">("todos");
  const [filtroEstoque, setFiltroEstoque] = useState<"todos" | "baixo" | "zerado">("todos");

  // Modal Entrada
  const [modalEntradaAberto, setModalEntradaAberto] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<Produto | null>(null);

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
  const [abaAtiva, setAbaAtiva] = useState<"itens" | "movimentacoes" | "deletados">("itens");

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [resumoData, itensData, cats, movs] = await Promise.all([
        movimentoStockService.resumo(),
        produtoService.listarProdutos({}), // ✅ Sem filtro de tipo para trazer tudo
        produtoService.listarCategorias(),
        movimentoStockService.listarMovimentos({ paginar: false }),
      ]);

      setResumo(resumoData);
      const listaItens = Array.isArray(itensData.produtos)
        ? itensData.produtos
        : (itensData.produtos as any)?.data || [];
      setItens(listaItens);
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

  const carregarDeletados = useCallback(async () => {
    try {
      const response = await produtoService.listarDeletados({
        paginar: false,
      });
      const listaDeletados = Array.isArray(response.produtos)
        ? response.produtos
        : (response.produtos as any)?.data || [];
      setItensDeletados(listaDeletados);
    } catch (error) {
      console.error("Erro ao carregar itens deletados:", error);
      setItensDeletados([]);
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

  async function aplicarFiltros() {
    setLoading(true);
    try {
      const filtros: Parameters<typeof produtoService.listarProdutos>[0] = {};

      if (busca) filtros.busca = busca;
      if (categoriaFiltro) filtros.categoria_id = categoriaFiltro;
      
      // Aplicar filtro por tipo
      if (tipoFiltro === "produto") filtros.tipo = "produto";
      if (tipoFiltro === "servico") filtros.tipo = "servico";
      
      // Filtros de estoque (só se aplicam a produtos)
      if (filtroEstoque === "baixo") filtros.estoque_baixo = true;
      if (filtroEstoque === "zerado") filtros.sem_estoque = true;

      const data = await produtoService.listarProdutos(filtros);
      const listaItens = Array.isArray(data.produtos)
        ? data.produtos
        : (data.produtos as any)?.data || [];
      setItens(listaItens);
    } catch (error) {
      console.error("Erro ao filtrar:", error);
    } finally {
      setLoading(false);
    }
  }

  function abrirModalEntrada(item: Produto) {
    if (isServico(item)) {
      alert("Serviços não têm controle de estoque");
      return;
    }
    setItemSelecionado(item);
    setModalEntradaAberto(true);
  }

  async function handleEntrada(quantidade: number, motivo: string) {
    if (!itemSelecionado) return;

    try {
      await movimentoStockService.criarMovimento({
        produto_id: itemSelecionado.id,
        quantidade,
        motivo,
        tipo: "entrada",
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

  function abrirModalDeletar(item: Produto) {
    setModalConfirmacao({
      isOpen: true,
      tipo: "delete",
      produto: item,
    });
  }

  function abrirModalRestaurar(item: Produto) {
    setModalConfirmacao({
      isOpen: true,
      tipo: "restore",
      produto: item,
    });
  }

  function abrirModalForceDelete(item: Produto) {
    setModalConfirmacao({
      isOpen: true,
      tipo: "forceDelete",
      produto: item,
    });
  }

  async function handleDeletarItem() {
    if (!modalConfirmacao.produto) return;

    try {
      await produtoService.moverParaLixeira(modalConfirmacao.produto.id);
      await carregarDados();
      setModalConfirmacao({ isOpen: false, tipo: "delete", produto: null });
    } catch (error: any) {
      console.error("Erro ao deletar item:", error);
      const mensagem =
        error?.response?.data?.message ||
        error?.message ||
        "Erro ao deletar item. Tente novamente.";
      alert(mensagem);
      throw error;
    }
  }

  async function handleRestaurarItem() {
    if (!modalConfirmacao.produto) return;

    try {
      await produtoService.restaurarProduto(modalConfirmacao.produto.id);
      await carregarDeletados();
      await carregarDados();
      setModalConfirmacao({ isOpen: false, tipo: "restore", produto: null });
    } catch (error: any) {
      console.error("Erro ao restaurar item:", error);
      const mensagem =
        error?.response?.data?.message ||
        error?.message ||
        "Erro ao restaurar item. Tente novamente.";
      alert(mensagem);
      throw error;
    }
  }

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

  function getStatusEstoque(item: Produto): {
    label: string;
    cor: string;
    icone: React.ReactNode;
  } {
    if (isServico(item)) {
      return {
        label: "Serviço",
        cor: "bg-purple-100 text-purple-700 border-purple-200",
        icone: <Wrench className="w-3 h-3" />,
      };
    }
    if (estaSemEstoque(item)) {
      return {
        label: "Sem Estoque",
        cor: "bg-red-100 text-red-700 border-red-200",
        icone: <XCircle className="w-3 h-3" />,
      };
    }
    if (estaEstoqueBaixo(item)) {
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
      default:
        return <RefreshCcw className="w-3 h-3" />;
    }
  }

  function getCorMovimento(tipo: string): string {
    switch (tipo) {
      case "entrada":
        return "bg-green-100 text-green-700";
      case "saida":
        return "bg-red-100 text-red-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  }

  // Calcular estatísticas separadas
  const produtos = itens.filter(isProduto);
  const servicos = itens.filter(isServico);

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
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#123859]">Produtos e Serviços</h1>
          <button
            onClick={() => router.push("/dashboard/Produtos_servicos/Novo_produto_servico")}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#F9941F] text-white rounded-lg hover:bg-[#e08516] transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Item
          </button>
        </div>

        {/* Cards de Resumo */}
        {resumo && (
          <div className="grid grid-cols-4 gap-3">
            <StatCard
              icon={<Package className="w-4 h-4 text-blue-600" />}
              label="Produtos"
              value={produtos.length}
              color="blue"
            />
            <StatCard
              icon={<Wrench className="w-4 h-4 text-purple-600" />}
              label="Serviços"
              value={servicos.length}
              color="purple"
            />
            <StatCard
              icon={<AlertTriangle className="w-4 h-4 text-orange-600" />}
              label="Estoque Baixo"
              value={resumo.produtosEstoqueBaixo || 0}
              color="orange"
            />
            <StatCard
              icon={<XCircle className="w-4 h-4 text-red-600" />}
              label="Sem Estoque"
              value={resumo.produtosSemEstoque || 0}
              color="red"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setAbaAtiva("itens")}
              className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors ${
                abaAtiva === "itens"
                  ? "text-[#123859] border-b-2 border-[#123859]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Layers className="w-4 h-4" />
              Todos os Itens
              <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                {itens.length}
              </span>
            </button>
            <button
              onClick={() => setAbaAtiva("movimentacoes")}
              className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors ${
                abaAtiva === "movimentacoes"
                  ? "text-[#123859] border-b-2 border-[#123859]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <History className="w-4 h-4" />
              Movimentações
            </button>
            <button
              onClick={() => setAbaAtiva("deletados")}
              className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors ${
                abaAtiva === "deletados"
                  ? "text-[#123859] border-b-2 border-[#123859]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Archive className="w-4 h-4" />
              Lixeira
              {itensDeletados.length > 0 && (
                <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">
                  {itensDeletados.length}
                </span>
              )}
            </button>
          </div>

          <div className="p-4">
            {abaAtiva === "itens" ? (
              <>
                {/* Filtros */}
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Buscar..."
                      className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:ring-1 focus:ring-[#123859] outline-none"
                    />
                  </div>

                  <select
                    value={tipoFiltro}
                    onChange={(e) => setTipoFiltro(e.target.value as any)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:ring-1 focus:ring-[#123859] outline-none bg-white"
                  >
                    <option value="todos">Todos</option>
                    <option value="produto">Produtos</option>
                    <option value="servico">Serviços</option>
                  </select>

                  <select
                    value={categoriaFiltro}
                    onChange={(e) => setCategoriaFiltro(e.target.value)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:ring-1 focus:ring-[#123859] outline-none bg-white"
                  >
                    <option value="">Categorias</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome}
                      </option>
                    ))}
                  </select>

                  {tipoFiltro !== "servico" && (
                    <select
                      value={filtroEstoque}
                      onChange={(e) => setFiltroEstoque(e.target.value as any)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:ring-1 focus:ring-[#123859] outline-none bg-white"
                    >
                      <option value="todos">Todos níveis</option>
                      <option value="baixo">Estoque baixo</option>
                      <option value="zerado">Sem estoque</option>
                    </select>
                  )}

                  <button
                    onClick={aplicarFiltros}
                    disabled={loading}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#123859] text-white rounded-lg hover:bg-[#1a4d7a] transition-colors disabled:opacity-50 text-sm"
                  >
                    <Filter className="w-4 h-4" />
                    Filtrar
                  </button>
                </div>

                {/* Tabela de Itens */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-2 px-3 text-left font-medium text-gray-600">Item</th>
                        <th className="py-2 px-3 text-left font-medium text-gray-600">Tipo</th>
                        <th className="py-2 px-3 text-left font-medium text-gray-600">Categoria</th>
                        <th className="py-2 px-3 text-center font-medium text-gray-600">Stock</th>
                        <th className="py-2 px-3 text-right font-medium text-gray-600">Preço</th>
                        <th className="py-2 px-3 text-center font-medium text-gray-600">Status</th>
                        <th className="py-2 px-3 text-center font-medium text-gray-600">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itens.map((item) => {
                        const statusEstoque = getStatusEstoque(item);
                        const tipoBadge = getTipoBadge(item.tipo);
                        const isServicoItem = isServico(item);

                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="py-2 px-3">
                              <div className="font-medium">{item.nome}</div>
                              {item.codigo && (
                                <div className="text-xs text-gray-400">{item.codigo}</div>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${tipoBadge.cor}`}>
                                {isServicoItem ? <Wrench className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                                {tipoBadge.texto}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-gray-600">
                              {item.categoria?.nome || "-"}
                            </td>
                            <td className="py-2 px-3 text-center font-medium">
                              {isServicoItem ? (
                                <span className="text-gray-400">—</span>
                              ) : (
                                item.estoque_atual
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-medium">
                              {formatarPreco(item.preco_venda)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusEstoque.cor}`}
                              >
                                {statusEstoque.icone}
                                {statusEstoque.label}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center justify-center gap-1">
                                {!isServicoItem && (
                                  <button
                                    onClick={() => abrirModalEntrada(item)}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                    title="Registrar Entrada"
                                  >
                                    <ArrowUpCircle className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => abrirModalDeletar(item)}
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
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

                  {itens.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      <Layers className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p>Nenhum item encontrado</p>
                    </div>
                  )}
                </div>
              </>
            ) : abaAtiva === "movimentacoes" ? (
              /* Aba de Movimentações */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-2 px-3 text-left font-medium text-gray-600">Data</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-600">Produto</th>
                      <th className="py-2 px-3 text-center font-medium text-gray-600">Tipo</th>
                      <th className="py-2 px-3 text-center font-medium text-gray-600">Qtd</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-600">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {movimentacoes.slice(0, 10).map((mov) => (
                      <tr key={mov.id} className="hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-600 whitespace-nowrap text-xs">
                          {formatarData(mov.created_at)}
                        </td>
                        <td className="py-2 px-3 font-medium">
                          {mov.produto?.nome || "-"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getCorMovimento(
                              mov.tipo
                            )}`}
                          >
                            {getIconeMovimento(mov.tipo)}
                            {mov.tipo}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-medium">
                          <span className={mov.quantidade > 0 ? "text-green-600" : "text-red-600"}>
                            {mov.quantidade > 0 ? `+${mov.quantidade}` : mov.quantidade}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-600 text-xs">
                          {mov.observacao || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {movimentacoes.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    <History className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    Nenhuma movimentação
                  </div>
                )}
              </div>
            ) : (
              /* Aba de Lixeira */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-2 px-3 text-left font-medium text-gray-600">Item</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-600">Tipo</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-600">Categoria</th>
                      <th className="py-2 px-3 text-center font-medium text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itensDeletados.map((item) => {
                      const tipoBadge = getTipoBadge(item.tipo);
                      
                      return (
                        <tr key={item.id} className="hover:bg-gray-50 bg-red-50/30">
                          <td className="py-2 px-3">
                            <span className="line-through opacity-75">{item.nome}</span>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${tipoBadge.cor} opacity-75`}>
                              {item.tipo === "servico" ? <Wrench className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                              {tipoBadge.texto}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-600">
                            {item.categoria?.nome || "-"}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => abrirModalRestaurar(item)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="Restaurar"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => abrirModalForceDelete(item)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Deletar permanentemente"
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

                {itensDeletados.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    <Archive className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    Lixeira vazia
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modais */}
      <ModalEntrada
        isOpen={modalEntradaAberto}
        onClose={() => setModalEntradaAberto(false)}
        produto={itemSelecionado}
        onConfirm={handleEntrada}
      />

      {modalConfirmacao.tipo === "delete" && (
        <ConfirmacaoModal
          isOpen={modalConfirmacao.isOpen}
          onClose={() => setModalConfirmacao({ isOpen: false, tipo: "delete", produto: null })}
          onConfirm={handleDeletarItem}
          titulo="Mover para Lixeira"
          mensagem={`Mover "${modalConfirmacao.produto?.nome}" para a lixeira?`}
          tipo="warning"
          confirmarTexto="Mover"
        />
      )}

      {modalConfirmacao.tipo === "restore" && (
        <ConfirmacaoModal
          isOpen={modalConfirmacao.isOpen}
          onClose={() => setModalConfirmacao({ isOpen: false, tipo: "restore", produto: null })}
          onConfirm={handleRestaurarItem}
          titulo="Restaurar Item"
          mensagem={`Restaurar "${modalConfirmacao.produto?.nome}"?`}
          tipo="info"
          confirmarTexto="Restaurar"
        />
      )}

      {modalConfirmacao.tipo === "forceDelete" && (
        <ConfirmacaoModal
          isOpen={modalConfirmacao.isOpen}
          onClose={() => setModalConfirmacao({ isOpen: false, tipo: "forceDelete", produto: null })}
          onConfirm={handleForceDelete}
          titulo="Deletar Permanentemente"
          mensagem={`Deletar "${modalConfirmacao.produto?.nome}" permanentemente?`}
          tipo="danger"
          confirmarTexto="Deletar"
        />
      )}
    </MainEmpresa>
  );
}