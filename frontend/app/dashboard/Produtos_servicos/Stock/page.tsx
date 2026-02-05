// src/app/(empresa)/estoque/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MainEmpresa from "../../../components/MainEmpresa";
import { estoqueService, ResumoEstoque, MovimentoStock } from "@/services/estoque";
import { produtoService, Produto, Categoria } from "@/services/produtos";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Search,
  Plus,
  Minus,
  History,
  Box,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
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
          <span className={`text-xs font-medium ${
            trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-500"
          }`}>
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

interface ModalMovimentoProps {
  isOpen: boolean;
  onClose: () => void;
  produto: Produto | null;
  tipo: "entrada" | "saida" | "ajuste";
  onConfirm: (quantidade: number, motivo: string) => void;
}

function ModalMovimento({ isOpen, onClose, produto, tipo, onConfirm }: ModalMovimentoProps) {
  const [quantidade, setQuantidade] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");

  if (!isOpen || !produto) return null;

  const titulos = {
    entrada: "Entrada de Stock",
    saida: "Saída de Stock",
    ajuste: "Ajuste de Stock",
  };

  const cores = {
    entrada: "text-green-600",
    saida: "text-red-600",
    ajuste: "text-blue-600",
  };

  const handleConfirm = () => {
    const qtd = parseInt(quantidade);
    if (!qtd || qtd <= 0) {
      setErro("Quantidade deve ser maior que zero");
      return;
    }
    if (!motivo.trim()) {
      setErro("Motivo é obrigatório");
      return;
    }
    onConfirm(qtd, motivo);
    setQuantidade("");
    setMotivo("");
    setErro("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className={`text-lg font-semibold mb-4 ${cores[tipo]}`}>{titulos[tipo]}</h3>
        
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="font-medium text-gray-900">{produto.nome}</p>
          <p className="text-sm text-gray-500">
            Stock atual: <span className="font-semibold">{produto.estoque_atual}</span> unidades
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
              Quantidade
            </label>
            <input
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              min="1"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] outline-none"
              placeholder="0"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] outline-none resize-none"
              placeholder="Ex: Compra ao fornecedor X..."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
              tipo === "entrada" ? "bg-green-600 hover:bg-green-700" :
              tipo === "saida" ? "bg-red-600 hover:bg-red-700" :
              "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            Confirmar
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
  const [resumo, setResumo] = useState<ResumoEstoque | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentoStock[]>([]);
  
  // Filtros
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [filtroEstoque, setFiltroEstoque] = useState<"todos" | "baixo" | "zerado">("todos");
  
  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [tipoMovimento, setTipoMovimento] = useState<"entrada" | "saida" | "ajuste">("entrada");
  
  // Tabs
  const [abaAtiva, setAbaAtiva] = useState<"produtos" | "movimentacoes">("produtos");

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const [resumoData, produtosData, cats, movs] = await Promise.all([
        estoqueService.obterResumo(),
        estoqueService.listarProdutosEstoque(),
        produtoService.listarCategorias(),
        estoqueService.listarMovimentacoes(),
      ]);
      
      setResumo(resumoData);
      setProdutos(produtosData);
      setCategorias(cats);
      setMovimentacoes(movs);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }

  async function aplicarFiltros() {
    setLoading(true);
    try {
      const filtros = {
        busca: busca || undefined,
        categoria_id: categoriaFiltro || undefined,
        estoque_baixo: filtroEstoque === "baixo" ? true : undefined,
        sem_estoque: filtroEstoque === "zerado" ? true : undefined,
      };
      
      const data = await estoqueService.listarProdutosEstoque(filtros);
      setProdutos(data);
    } catch (error) {
      console.error("Erro ao filtrar:", error);
    } finally {
      setLoading(false);
    }
  }

  function abrirModal(produto: Produto, tipo: "entrada" | "saida" | "ajuste") {
    setProdutoSelecionado(produto);
    setTipoMovimento(tipo);
    setModalAberto(true);
  }

  async function handleMovimento(quantidade: number, motivo: string) {
    if (!produtoSelecionado) return;
    
    try {
      const dados = {
        produto_id: produtoSelecionado.id,
        quantidade,
        motivo,
      };

      if (tipoMovimento === "entrada") {
        await estoqueService.registrarEntrada(dados);
      } else if (tipoMovimento === "saida") {
        await estoqueService.registrarSaida(dados);
      } else {
        await estoqueService.ajustarStock(dados);
      }

      // Recarregar dados
      await carregarDados();
      setModalAberto(false);
    } catch (error) {
      console.error("Erro ao registrar movimento:", error);
      alert("Erro ao registrar movimento. Tente novamente.");
    }
  }

  function getStatusEstoque(produto: Produto): { label: string; cor: string; icone: React.ReactNode } {
    if (produto.estoque_atual === 0) {
      return { 
        label: "Sem Estoque", 
        cor: "bg-red-100 text-red-700 border-red-200",
        icone: <XCircle className="w-3 h-3" />
      };
    }
    if (produto.estoque_atual <= produto.estoque_minimo) {
      return { 
        label: "Estoque Baixo", 
        cor: "bg-orange-100 text-orange-700 border-orange-200",
        icone: <AlertTriangle className="w-3 h-3" />
      };
    }
    return { 
      label: "OK", 
      cor: "bg-green-100 text-green-700 border-green-200",
      icone: <CheckCircle2 className="w-3 h-3" />
    };
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
            <h1 className="text-3xl font-bold text-[#123859]">Gestão de Estoque</h1>
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
              value={resumo.produtosAtivos}
              color="blue"
            />
            <StatCard
              icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
              label="Estoque Baixo"
              value={resumo.produtosEstoqueBaixo}
              trend="down"
              color="orange"
            />
            <StatCard
              icon={<TrendingDown className="w-5 h-5 text-red-600" />}
              label="Sem Estoque"
              value={resumo.produtosSemEstoque}
              trend="down"
              color="red"
            />
            <StatCard
              icon={<DollarSign className="w-5 h-5 text-green-600" />}
              label="Valor Total em Stock"
              value={resumo.valorTotalEstoque.toLocaleString("pt-PT", {
                style: "currency",
                currency: "AOA",
              })}
              color="green"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setAbaAtiva("produtos")}
              className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors ${
                abaAtiva === "produtos"
                  ? "text-[#123859] border-b-2 border-[#123859]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Box className="w-4 h-4" />
              Produtos
            </button>
            <button
              onClick={() => setAbaAtiva("movimentacoes")}
              className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors ${
                abaAtiva === "movimentacoes"
                  ? "text-[#123859] border-b-2 border-[#123859]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <History className="w-4 h-4" />
              Movimentações
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
                    className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] outline-none"
                  >
                    <option value="">Todas as categorias</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                    ))}
                  </select>

                  <select
                    value={filtroEstoque}
                    onChange={(e) => setFiltroEstoque(e.target.value as any)}
                    className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] outline-none"
                  >
                    <option value="todos">Todos os níveis</option>
                    <option value="baixo">Estoque baixo</option>
                    <option value="zerado">Sem estoque</option>
                  </select>

                  <button
                    onClick={aplicarFiltros}
                    className="flex items-center gap-2 px-4 py-2 bg-[#123859] text-white rounded-lg hover:bg-[#1a4d7a] transition-colors"
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
                        <th className="py-3 px-4 text-left font-semibold text-gray-700 uppercase text-xs">Produto</th>
                        <th className="py-3 px-4 text-left font-semibold text-gray-700 uppercase text-xs">Categoria</th>
                        <th className="py-3 px-4 text-center font-semibold text-gray-700 uppercase text-xs">Estoque</th>
                        <th className="py-3 px-4 text-center font-semibold text-gray-700 uppercase text-xs">Mínimo</th>
                        <th className="py-3 px-4 text-right font-semibold text-gray-700 uppercase text-xs">Preço</th>
                        <th className="py-3 px-4 text-center font-semibold text-gray-700 uppercase text-xs">Status</th>
                        <th className="py-3 px-4 text-center font-semibold text-gray-700 uppercase text-xs">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {produtos.map((produto) => {
                        const statusEstoque = getStatusEstoque(produto);
                        
                        return (
                          <tr key={produto.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4">
                              <div className="font-medium text-gray-900">{produto.nome}</div>
                              {produto.codigo && (
                                <div className="text-xs text-gray-500">Cód: {produto.codigo}</div>
                              )}
                            </td>
                            <td className="py-4 px-4 text-gray-600">
                              {produto.categoria?.nome || "-"}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`font-semibold ${
                                produto.estoque_atual <= produto.estoque_minimo 
                                  ? "text-orange-600" 
                                  : "text-gray-900"
                              }`}>
                                {produto.estoque_atual}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center text-gray-500">
                              {produto.estoque_minimo}
                            </td>
                            <td className="py-4 px-4 text-right font-medium">
                              {produto.preco_venda.toLocaleString("pt-PT", {
                                style: "currency",
                                currency: "AOA",
                              })}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusEstoque.cor}`}>
                                {statusEstoque.icone}
                                {statusEstoque.label}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => abrirModal(produto, "entrada")}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Entrada"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => abrirModal(produto, "saida")}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Saída"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => abrirModal(produto, "ajuste")}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Ajuste"
                                >
                                  <RefreshCw className="w-4 h-4" />
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
                      Nenhum produto encontrado
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Aba de Movimentações */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4 text-left font-semibold text-gray-700 uppercase text-xs">Data</th>
                      <th className="py-3 px-4 text-left font-semibold text-gray-700 uppercase text-xs">Produto</th>
                      <th className="py-3 px-4 text-center font-semibold text-gray-700 uppercase text-xs">Tipo</th>
                      <th className="py-3 px-4 text-center font-semibold text-gray-700 uppercase text-xs">Qtd</th>
                      <th className="py-3 px-4 text-center font-semibold text-gray-700 uppercase text-xs">Anterior</th>
                      <th className="py-3 px-4 text-center font-semibold text-gray-700 uppercase text-xs">Novo</th>
                      <th className="py-3 px-4 text-left font-semibold text-gray-700 uppercase text-xs">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {movimentacoes.map((mov) => (
                      <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
                          {new Date(mov.created_at).toLocaleDateString("pt-PT")}
                        </td>
                        <td className="py-4 px-4 font-medium text-gray-900">
                          {mov.produto?.nome || "-"}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            mov.tipo === "entrada" ? "bg-green-100 text-green-700" :
                            mov.tipo === "saida" ? "bg-red-100 text-red-700" :
                            "bg-blue-100 text-blue-700"
                          }`}>
                            {mov.tipo === "entrada" && <Plus className="w-3 h-3" />}
                            {mov.tipo === "saida" && <Minus className="w-3 h-3" />}
                            {mov.tipo === "ajuste" && <RefreshCw className="w-3 h-3" />}
                            {mov.tipo.charAt(0).toUpperCase() + mov.tipo.slice(1)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-medium">
                          {mov.quantidade > 0 ? `+${mov.quantidade}` : mov.quantidade}
                        </td>
                        <td className="py-4 px-4 text-center text-gray-500">
                          {mov.quantidade_anterior}
                        </td>
                        <td className="py-4 px-4 text-center font-semibold text-[#123859]">
                          {mov.quantidade_nova}
                        </td>
                        <td className="py-4 px-4 text-gray-600 max-w-xs truncate">
                          {mov.motivo}
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
            )}
          </div>
        </div>
      </div>

      {/* Modal de Movimento */}
      <ModalMovimento
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        produto={produtoSelecionado}
        tipo={tipoMovimento}
        onConfirm={handleMovimento}
      />
    </MainEmpresa>
  );
}