"use client";

import React, { useEffect, useState } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  Produto,
  Categoria,
  Fornecedor,
  ProdutoPayload,
  produtoService,
  categoriaService,
  fornecedorService,
} from "@/services/vendas";

export default function ProdutosServicoPage() {
  /* ===== STATES ===== */
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(false);

  /* ===== FORM ===== */
  const [form, setForm] = useState<ProdutoPayload & { novaCategoria?: string }>({
    nome: "",
    descricao: "",
    categoria_id: "",
    fornecedor_id: "",
    preco_compra: 0,
    preco_venda: 0,
    estoque_atual: 0, // automatico
    estoque_minimo: 5, // valor padrão
    novaCategoria: "",
  });

  /* ===== LOAD ===== */
  const carregarTudo = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, fornRes] = await Promise.all([
        produtoService.listarPaginado(page),
        categoriaService.listar(),
        fornecedorService.listar(),
      ]);

      console.log(fornRes);
      console.log(Array.isArray(fornRes));
      console.log(fornRes.map((f: Fornecedor) => f.nome));
      // Corrige problema do map em fornecedores
      setProdutos(prodRes?.data || []);
      setLastPage(prodRes?.last_page || 1);
      setCategorias(catRes || []);
      setFornecedores(Array.isArray(fornRes) ? fornRes : []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarTudo();
  }, [page]);

  /* ===== HANDLERS ===== */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let categoria_id = form.categoria_id;

    // Criar nova categoria se digitada
    if (form.novaCategoria?.trim()) {
      try {
        const novaCat = await categoriaService.criar({ nome: form.novaCategoria });
        categoria_id = novaCat.id;
        toast.success(`Categoria "${novaCat.nome}" criada`);
      } catch (err) {
        toast.error("Erro ao criar categoria");
        return;
      }
    }

    if (!categoria_id || !form.fornecedor_id || !form.nome) {
      toast.warn("Preencha todos os campos obrigatórios");
      return;
    }

    const payload: ProdutoPayload = {
      nome: form.nome,
      descricao: form.descricao,
      categoria_id,
      fornecedor_id: form.fornecedor_id,
      preco_compra: Number(form.preco_compra),
      preco_venda: Number(form.preco_venda),
      estoque_atual: 0, // automático
      estoque_minimo: form.estoque_minimo,
    };

    try {
      await produtoService.criar(payload);
      toast.success("Produto criado com sucesso!");
      setForm({
        nome: "",
        descricao: "",
        categoria_id: "",
        fornecedor_id: "",
        preco_compra: 0,
        preco_venda: 0,
        estoque_atual: 0,
        estoque_minimo: 5,
        novaCategoria: "",
      });
      carregarTudo();
    } catch (err) {
      console.error("Erro ao criar produto:", err);
      toast.error("Erro ao criar produto");
    }
  };

  const handleEditar = (produto: Produto) => {
    setForm({
      nome: produto.nome,
      descricao: produto.descricao || "",
      categoria_id: produto.categoria_id,
      fornecedor_id: produto.Fornecedor?.id || "",
      preco_compra: produto.preco_compra,
      preco_venda: produto.preco_venda,
      estoque_atual: produto.estoque_atual,
      estoque_minimo: produto.estoque_minimo,
    });
  };

  const handleDeletar = async (id: string) => {
    if (!confirm("Deseja realmente deletar este produto?")) return;
    try {
      await produtoService.deletar(id);
      toast.success("Produto deletado");
      carregarTudo();
    } catch {
      toast.error("Erro ao deletar produto");
    }
  };

  /* ===== PAGINAÇÃO ===== */
  const totalPaginas = lastPage;

  /* ===== RENDER ===== */
  return (
    <MainEmpresa>
      <ToastContainer position="top-right" autoClose={3000} />
      <h1 className="text-2xl font-bold mb-6 text-center">Produtos & Serviços</h1>

      {/* ===== FORM ===== */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-lg grid grid-cols-2 gap-4 mb-8 max-w-4xl mx-auto"
      >
        <div className="col-span-2">
          <label className="block mb-1 font-semibold">Nome do Produto</label>
          <input
            name="nome"
            value={form.nome}
            onChange={handleChange}
            placeholder="Nome do produto"
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>

        {/* Categoria */}
        <div>
          <label htmlFor="cate" className="block mb-1 font-semibold">Categoria Existente</label>
          <select
            id="cate"
            name="categoria_id"
            value={form.categoria_id}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Selecione a categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 font-semibold">Nova Categoria</label>
          <input
            name="novaCategoria"
            value={form.novaCategoria}
            onChange={handleChange}
            placeholder="Digite para criar nova categoria"
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>

        {/* Fornecedor */}
        <div className="col-span-2">
          <label htmlFor="for" className="block mb-1 font-semibold">Fornecedor</label>
          <select
            id="for"
            name="fornecedor_id"
            value={form.fornecedor_id}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="">Selecione o fornecedor</option>
            {Array.isArray(fornecedores) &&
              fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
          </select>
        </div>

        {/* Preços */}
        <input
          type="number"
          name="preco_compra"
          value={form.preco_compra}
          onChange={handleChange}
          placeholder="Preço de compra"
          className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <input
          type="number"
          name="preco_venda"
          value={form.preco_venda}
          onChange={handleChange}
          placeholder="Preço de venda"
          required
          className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
        />

        {/* Estoque mínimo */}
        <label htmlFor="estoque"> Estoque</label>
        <input
          id="estoque"
          type="number"
          name="estoque_minimo"
          value={form.estoque_minimo}
          readOnly
          className="bg-gray-100 cursor-not-allowed border rounded px-3 py-2"
        />

        {/* Descrição */}
        <textarea
          name="descricao"
          value={form.descricao}
          onChange={handleChange}
          placeholder="Descrição do produto"
          className="col-span-2 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />

        <button
          type="submit"
          className="col-span-2 bg-green-600 text-white font-semibold py-2 rounded hover:bg-green-700 transition"
        >
          Salvar Produto
        </button>
      </form>

      {/* ===== TABLE ===== */}
      {loading ? (
        <p className="text-center">Carregando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead className="bg-gray-200 text-left">
              <tr>
                <th className="p-3 border">Nome</th>
                <th className="p-3 border">Categoria</th>
                <th className="p-3 border">Fornecedor</th>
                <th className="p-3 border">Preço Venda</th>
                <th className="p-3 border">Estoque Atual</th>
                <th className="p-3 border">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{p.nome}</td>
                  <td className="p-3">{p.Categoria?.nome ?? "-"}</td>
                  <td className="p-3">{p.Fornecedor?.nome ?? "-"}</td>
                  <td className="p-3">{p.preco_venda}</td>
                  <td className="p-3">{p.estoque_atual}</td>
                  <td className="p-3 space-x-2">
                    <button
                      onClick={() => handleEditar(p)}
                      className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeletar(p.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                    >
                      Deletar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== PAGINAÇÃO ===== */}
      <div className="flex justify-center gap-4 mt-4 items-center">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
        >
          Anterior
        </button>
        <span>
          Página {page} de {totalPaginas}
        </span>
        <button
          disabled={page === totalPaginas}
          onClick={() => setPage(page + 1)}
          className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
        >
          Próxima
        </button>
      </div>
    </MainEmpresa>
  );
}
