"use client";

import React, { useEffect, useState } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import { Trash2, Edit, Eye, X } from "lucide-react";
import { produtoService, Produto, ProdutoPayload, stockService } from "@/services/vendas";

export default function StockPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState<string>(""); // filtro por nome

  const [modalVisualizar, setModalVisualizar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);

  const [formEditar, setFormEditar] = useState<Partial<ProdutoPayload>>({
    nome: "",
    descricao: "",
    preco_compra: 0,
    preco_venda: 0,
    estoque_atual: 0,
    estoque_minimo: 0,
    fornecedor_id: "",
    categoria_id: "",
  });

  // Carregar produtos e calcular estoque
  useEffect(() => {
    const fetchProdutos = async () => {
      setLoading(true);
      try {
        const data = await produtoService.listarPaginado(1);

        // Garantir Produto[]
        const produtosValidos: Produto[] = data.data.filter(
          (p): p is Produto => p !== null && p !== undefined
        );

        // Calcular estoque de forma segura
        const produtosComStock: Produto[] = await Promise.all(
          produtosValidos.map(async (p) => {
            try {
              const estoqueAtual = await stockService.calcularStock(p.id);
              return { ...p, estoque_atual: estoqueAtual ?? 0 };
            } catch {
              return { ...p, estoque_atual: 0 };
            }
          })
        );

        setProdutos(produtosComStock); // ✅ Produto[]
      } catch (err) {
        console.error("Erro ao carregar produtos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProdutos();
  }, []);

  // Filtrar produtos por nome (ou outro campo se quiser)
  const produtosFiltrados = produtos.filter((p) =>
    p.nome.toLowerCase().includes(filtro.toLowerCase())
  );

  // Apagar produto
  const apagarProduto = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar este produto?")) return;
    try {
      await produtoService.deletar(id);
      setProdutos(produtos.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Erro ao apagar produto:", err);
      alert("Erro ao apagar produto");
    }
  };

  // Modais
  const abrirModalVisualizar = (produto: Produto) => {
    setProdutoSelecionado(produto);
    setModalVisualizar(true);
  };
  const fecharModalVisualizar = () => {
    setProdutoSelecionado(null);
    setModalVisualizar(false);
  };

  const abrirModalEditar = (produto: Produto) => {
    setProdutoSelecionado(produto);
    setFormEditar({
      nome: produto.nome,
      descricao: produto.descricao || "",
      preco_compra: produto.preco_compra,
      preco_venda: produto.preco_venda,
      estoque_atual: produto.estoque_atual,
      estoque_minimo: produto.estoque_minimo,
      fornecedor_id: produto.Fornecedor?.id || "",
      categoria_id: produto.Categoria?.id || "",
    });
    setModalEditar(true);
  };
  const fecharModalEditar = () => {
    setProdutoSelecionado(null);
    setModalEditar(false);
  };

  const handleChangeEditar = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormEditar({
      ...formEditar,
      [name]: name.includes("preco") || name.includes("estoque") ? Number(value) : value,
    });
  };
const salvarEdicao = async () => {
  if (!produtoSelecionado) return;

  try {
    const atualizado = await produtoService.atualizar(
      produtoSelecionado.id,
      formEditar as ProdutoPayload
    );

    if (!atualizado) {
      alert("Erro ao atualizar produto");
      return;
    }

    setProdutos(produtos.map((p) =>
      p.id === produtoSelecionado.id ? atualizado : p
    ));

    fecharModalEditar();
  } catch (err) {
    console.error("Erro ao atualizar produto:", err);
    alert("Erro ao atualizar produto");
  }
};

  return (
    <MainEmpresa>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-[#123859]">Stock de Produtos</h1>

        {/* Filtro por nome */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Filtrar produtos..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="border px-3 py-2 rounded w-full md:w-1/3"
            title="Filtrar produtos pelo nome"
          />
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-4 rounded-xl shadow flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total de Produtos</p>
              <p className="text-xl font-bold">{produtos.length}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Produtos Filtrados</p>
              <p className="text-xl font-bold">{produtosFiltrados.length}</p>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#123859] text-white">
              <tr>
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">Nome</th>
                <th className="p-3 text-left">Preço Venda (Kz)</th>
                <th className="p-3 text-left">Estoque Atual</th>
                <th className="p-3 text-left">Fornecedor</th>
                <th className="p-3 text-left">Descrição</th>
                <th className="p-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center p-4">
                    Carregando...
                  </td>
                </tr>
              ) : produtosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-4 text-gray-500">
                    Nenhum produto encontrado
                  </td>
                </tr>
              ) : (
                produtosFiltrados.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="p-3">{p.id}</td>
                    <td className="p-3">{p.nome}</td>
                    <td className="p-3">{p.preco_venda.toLocaleString()}</td>
                    <td className="p-3">{p.estoque_atual}</td>
                    <td className="p-3">{p.Fornecedor?.nome || "-"}</td>
                    <td className="p-3">{p.descricao || "-"}</td>
                    <td className="p-3 flex gap-2">
                      <button
                        className="text-blue-600 flex items-center gap-1"
                        onClick={() => abrirModalVisualizar(p)}
                        title={`Visualizar ${p.nome}`}
                      >
                        <Eye size={16} /> Ver
                      </button>
                      <button
                        className="text-green-600 flex items-center gap-1"
                        onClick={() => abrirModalEditar(p)}
                        title={`Editar ${p.nome}`}
                      >
                        <Edit size={16} /> Editar
                      </button>
                      <button
                        className="text-red-600 flex items-center gap-1"
                        onClick={() => apagarProduto(p.id)}
                        title={`Apagar ${p.nome}`}
                      >
                        <Trash2 size={16} /> Apagar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainEmpresa>
  );
}
