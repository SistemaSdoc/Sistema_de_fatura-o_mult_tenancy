"use client";

import React, { useState } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import { Trash2, Edit, Eye, X } from "lucide-react";

interface ProdutoServico {
    id: number;
    nome: string;
    tipo: "Produto" | "Serviço";
    preco: number;
    descricao: string;
    estoque?: number;
    fornecedor: string;
}

const produtosMock: ProdutoServico[] = [
    {
        id: 1,
        nome: "Produto A",
        tipo: "Produto",
        preco: 5000,
        estoque: 20,
        descricao: "Descrição do Produto A",
        fornecedor: "Fornecedor X",
    },
    {
        id: 2,
        nome: "Serviço B",
        tipo: "Serviço",
        preco: 15000,
        descricao: "Descrição do Serviço B",
        fornecedor: "Fornecedor Y",
    },
    {
        id: 3,
        nome: "Produto C",
        tipo: "Produto",
        preco: 8000,
        estoque: 15,
        descricao: "Descrição do Produto C",
        fornecedor: "Fornecedor Z",
    },
];

export default function StockPage() {
    const [produtos, setProdutos] = useState<ProdutoServico[]>(produtosMock);
    const [filtro, setFiltro] = useState<"Todos" | "Produto" | "Serviço">("Todos");

    const [modalAberto, setModalAberto] = useState(false);
    const [editarAberto, setEditarAberto] = useState(false);
    const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoServico | null>(null);
    const [formEditar, setFormEditar] = useState({
        nome: "",
        tipo: "Produto",
        preco: "",
        estoque: "",
        descricao: "",
        fornecedor: "",
    });

    const produtosFiltrados =
        filtro === "Todos" ? produtos : produtos.filter((p) => p.tipo === filtro);

    const apagarProduto = (id: number) => {
        if (!confirm("Tem certeza que deseja apagar este produto/serviço?")) return;
        setProdutos(produtos.filter((p) => p.id !== id));
    };

    const abrirModalVisualizar = (produto: ProdutoServico) => {
        setProdutoSelecionado(produto);
        setModalAberto(true);
    };

    const fecharModalVisualizar = () => {
        setProdutoSelecionado(null);
        setModalAberto(false);
    };

    const abrirModalEditar = (produto: ProdutoServico) => {
        setProdutoSelecionado(produto);
        setFormEditar({
            nome: produto.nome,
            tipo: produto.tipo,
            preco: produto.preco.toString(),
            estoque: produto.estoque?.toString() || "",
            descricao: produto.descricao,
            fornecedor: produto.fornecedor,
        });
        setEditarAberto(true);
    };

    const fecharModalEditar = () => {
        setProdutoSelecionado(null);
        setEditarAberto(false);
    };

    const handleChangeEditar = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormEditar({ ...formEditar, [name]: value });
    };

    const salvarEdicao = () => {
        if (!produtoSelecionado) return;

        const atualizado: ProdutoServico = {
            id: produtoSelecionado.id,
            nome: formEditar.nome,
            tipo: formEditar.tipo as "Produto" | "Serviço",
            preco: Number(formEditar.preco),
            descricao: formEditar.descricao,
            estoque: formEditar.tipo === "Produto" ? Number(formEditar.estoque) : undefined,
            fornecedor: formEditar.fornecedor,
        };

        setProdutos(
            produtos.map((p) => (p.id === produtoSelecionado.id ? atualizado : p))
        );
        fecharModalEditar();
    };

    return (
        <MainEmpresa>
            <div className="p-6 space-y-6">
                <h1 className="text-2xl font-bold text-[#123859]">Stock de Produtos/Serviços</h1>

                {/* Filtro por tipo */}
                <div className="flex gap-3 mb-4">
                    {["Todos", "Produto", "Serviço"].map((tipo) => (
                        <button
                            key={tipo}
                            onClick={() => setFiltro(tipo as any)}
                            className={`px-4 py-2 rounded-lg font-semibold ${filtro === tipo ? "bg-[#123859] text-white" : "bg-white border"
                                }`}
                        >
                            {tipo}
                        </button>
                    ))}
                </div>

                {/* Cards de resumo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-xl shadow flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total de Produtos/Serviços</p>
                            <p className="text-xl font-bold">{produtos.length}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total de Produtos</p>
                            <p className="text-xl font-bold">
                                {produtos.filter((p) => p.tipo === "Produto").length}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total de Serviços</p>
                            <p className="text-xl font-bold">
                                {produtos.filter((p) => p.tipo === "Serviço").length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabela de produtos/serviços */}
                <div className="bg-white rounded-xl shadow overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#123859] text-white">
                            <tr>
                                <th className="p-3 text-left">ID</th>
                                <th className="p-3 text-left">Nome</th>
                                <th className="p-3 text-left">Tipo</th>
                                <th className="p-3 text-left">Preço (Kz)</th>
                                <th className="p-3 text-left">Estoque</th>
                                <th className="p-3 text-left">Fornecedor</th>
                                <th className="p-3 text-left">Descrição</th>
                                <th className="p-3 text-left">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {produtosFiltrados.map((p) => (
                                <tr key={p.id} className="border-b">
                                    <td className="p-3">{p.id}</td>
                                    <td className="p-3">{p.nome}</td>
                                    <td className="p-3">{p.tipo}</td>
                                    <td className="p-3">{p.preco.toLocaleString()}</td>
                                    <td className="p-3">{p.tipo === "Produto" ? p.estoque : "-"}</td>
                                    <td className="p-3">{p.fornecedor}</td>
                                    <td className="p-3">{p.descricao || "-"}</td>
                                    <td className="p-3 flex gap-2">
                                        <button
                                            className="text-blue-600 flex items-center gap-1"
                                            onClick={() => abrirModalVisualizar(p)}
                                        >
                                            <Eye size={16} /> Ver
                                        </button>
                                        <button
                                            className="text-green-600 flex items-center gap-1"
                                            onClick={() => abrirModalEditar(p)}
                                        >
                                            <Edit size={16} /> Editar
                                        </button>
                                        <button
                                            className="text-red-600 flex items-center gap-1"
                                            onClick={() => apagarProduto(p.id)}
                                        >
                                            <Trash2 size={16} /> Apagar
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {produtosFiltrados.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-4 text-center text-gray-500">
                                        Nenhum produto/serviço encontrado
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Visualizar */}
            {modalAberto && produtoSelecionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl w-11/12 md:w-1/2 p-6 space-y-4 shadow-xl relative">
                        <button
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-900"
                            onClick={fecharModalVisualizar}
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold text-[#123859]">Detalhes do Produto/Serviço</h2>
                        <p><strong>Nome:</strong> {produtoSelecionado.nome}</p>
                        <p><strong>Tipo:</strong> {produtoSelecionado.tipo}</p>
                        <p><strong>Preço:</strong> {produtoSelecionado.preco.toLocaleString()} Kz</p>
                        <p><strong>Estoque:</strong> {produtoSelecionado.estoque ?? "-"}</p>
                        <p><strong>Fornecedor:</strong> {produtoSelecionado.fornecedor}</p>
                        <p><strong>Descrição:</strong> {produtoSelecionado.descricao || "-"}</p>
                    </div>
                </div>
            )}

            {/* Modal Editar */}
            {editarAberto && produtoSelecionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl w-11/12 md:w-1/2 p-6 space-y-4 shadow-xl relative">
                        <button
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-900"
                            onClick={fecharModalEditar}
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold text-[#123859]">Editar Produto/Serviço</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block font-semibold mb-1">Nome</label>
                                <input
                                    type="text"
                                    name="nome"
                                    value={formEditar.nome}
                                    onChange={handleChangeEditar}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold mb-1">Tipo</label>
                                <select
                                    name="tipo"
                                    value={formEditar.tipo}
                                    onChange={handleChangeEditar}
                                    className="w-full border rounded px-3 py-2"
                                >
                                    <option value="Produto">Produto</option>
                                    <option value="Serviço">Serviço</option>
                                </select>
                            </div>
                            {formEditar.tipo === "Produto" && (
                                <div>
                                    <label className="block font-semibold mb-1">Estoque</label>
                                    <input
                                        type="number"
                                        name="estoque"
                                        value={formEditar.estoque}
                                        onChange={handleChangeEditar}
                                        className="w-full border rounded px-3 py-2"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block font-semibold mb-1">Preço (Kz)</label>
                                <input
                                    type="number"
                                    name="preco"
                                    value={formEditar.preco}
                                    onChange={handleChangeEditar}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold mb-1">Fornecedor</label>
                                <input
                                    type="text"
                                    name="fornecedor"
                                    value={formEditar.fornecedor}
                                    onChange={handleChangeEditar}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold mb-1">Descrição</label>
                                <textarea
                                    name="descricao"
                                    value={formEditar.descricao}
                                    onChange={handleChangeEditar}
                                    className="w-full border rounded px-3 py-2"
                                ></textarea>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
                                onClick={fecharModalEditar}
                            >
                                Cancelar
                            </button>
                            <button
                                className="bg-[#123859] text-white px-4 py-2 rounded"
                                onClick={salvarEdicao}
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainEmpresa>
    );
}
