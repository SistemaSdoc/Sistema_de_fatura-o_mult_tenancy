"use client";

import React, { useState } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import { Trash2, Edit, Eye, X } from "lucide-react";

interface Fornecedor {
    id: number;
    nome: string;
    telefone: string;
    email: string;
    endereco: string;
    status: "Ativo" | "Inativo";
}

/* MOCK DE FORNECEDORES */
const fornecedoresMock: Fornecedor[] = [
    {
        id: 1,
        nome: "Fornecedor A",
        telefone: "+244 900 000 101",
        email: "fornecedorA@example.com",
        endereco: "Rua X, Luanda",
        status: "Ativo",
    },
    {
        id: 2,
        nome: "Fornecedor B",
        telefone: "+244 900 000 102",
        email: "fornecedorB@example.com",
        endereco: "Av. Y, Luanda",
        status: "Inativo",
    },
];

export default function TotalFornecedoresPage() {
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>(fornecedoresMock);
    const [filtro, setFiltro] = useState<"Todos" | "Ativo" | "Inativo">("Todos");

    // Modal de edição
    const [modalEditarAberto, setModalEditarAberto] = useState(false);
    const [fornecedorSelecionado, setFornecedorSelecionado] = useState<Fornecedor | null>(null);

    // Modal de visualização
    const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false);
    const [fornecedorVisualizar, setFornecedorVisualizar] = useState<Fornecedor | null>(null);

    const fornecedoresFiltrados =
        filtro === "Todos" ? fornecedores : fornecedores.filter((f) => f.status === filtro);

    const apagarFornecedor = (id: number) => {
        if (!confirm("Tem certeza que deseja apagar este fornecedor?")) return;
        setFornecedores(fornecedores.filter((f) => f.id !== id));
    };

    const abrirModalEditar = (fornecedor: Fornecedor) => {
        setFornecedorSelecionado(fornecedor);
        setModalEditarAberto(true);
    };

    const abrirModalVisualizar = (fornecedor: Fornecedor) => {
        setFornecedorVisualizar(fornecedor);
        setModalVisualizarAberto(true);
    };

    const fecharModalEditar = () => {
        setFornecedorSelecionado(null);
        setModalEditarAberto(false);
    };

    const fecharModalVisualizar = () => {
        setFornecedorVisualizar(null);
        setModalVisualizarAberto(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!fornecedorSelecionado) return;
        const { name, value } = e.target;
        setFornecedorSelecionado({ ...fornecedorSelecionado, [name]: value });
    };

    const salvarEdicao = () => {
        if (!fornecedorSelecionado) return;
        setFornecedores(
            fornecedores.map((f) => (f.id === fornecedorSelecionado.id ? fornecedorSelecionado : f))
        );
        fecharModalEditar();
    };

    return (
        <MainEmpresa>
            <div className="p-6 space-y-6">
                <h1 className="text-2xl font-bold text-[#123859]">Total de Fornecedores</h1>

                {/* Filtro por status */}
                <div className="flex gap-3 mb-4">
                    {["Todos", "Ativo", "Inativo"].map((tipo) => (
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

                {/* Cards resumo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-xl shadow flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total de Fornecedores</p>
                            <p className="text-xl font-bold">{fornecedores.length}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Ativos</p>
                            <p className="text-xl font-bold">
                                {fornecedores.filter((f) => f.status === "Ativo").length}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Inativos</p>
                            <p className="text-xl font-bold">
                                {fornecedores.filter((f) => f.status === "Inativo").length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabela de fornecedores */}
                <div className="bg-white rounded-xl shadow overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#123859] text-white">
                            <tr>
                                <th className="p-3 text-left">ID</th>
                                <th className="p-3 text-left">Nome</th>
                                <th className="p-3 text-left">Telefone</th>
                                <th className="p-3 text-left">Email</th>
                                <th className="p-3 text-left">Endereço</th>
                                <th className="p-3 text-left">Status</th>
                                <th className="p-3 text-left">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fornecedoresFiltrados.map((f) => (
                                <tr key={f.id} className="border-b">
                                    <td className="p-3">{f.id}</td>
                                    <td className="p-3">{f.nome}</td>
                                    <td className="p-3">{f.telefone}</td>
                                    <td className="p-3">{f.email || "-"}</td>
                                    <td className="p-3">{f.endereco || "-"}</td>
                                    <td className="p-3">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-semibold ${f.status === "Ativo"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                                }`}
                                        >
                                            {f.status}
                                        </span>
                                    </td>
                                    <td className="p-3 flex gap-2">
                                        <button
                                            className="text-blue-600 flex items-center gap-1"
                                            onClick={() => abrirModalVisualizar(f)}
                                        >
                                            <Eye size={16} /> Ver
                                        </button>
                                        <button
                                            className="text-green-600 flex items-center gap-1"
                                            onClick={() => abrirModalEditar(f)}
                                        >
                                            <Edit size={16} /> Editar
                                        </button>
                                        <button
                                            className="text-red-600 flex items-center gap-1"
                                            onClick={() => apagarFornecedor(f.id)}
                                        >
                                            <Trash2 size={16} /> Apagar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {fornecedoresFiltrados.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-4 text-center text-gray-500">
                                        Nenhum fornecedor encontrado
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal de edição */}
                {modalEditarAberto && fornecedorSelecionado && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="bg-white rounded-xl w-11/12 md:w-1/2 p-6 space-y-4 relative shadow-xl">
                            <button
                                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
                                onClick={fecharModalEditar}
                            >
                                <X size={24} />
                            </button>
                            <h2 className="text-xl font-bold text-[#123859]">Editar Fornecedor</h2>
                            <div className="space-y-3">
                                <div>
                                    <label className="block font-semibold mb-1">Nome</label>
                                    <input
                                        type="text"
                                        name="nome"
                                        value={fornecedorSelecionado.nome}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold mb-1">Telefone</label>
                                    <input
                                        type="text"
                                        name="telefone"
                                        value={fornecedorSelecionado.telefone}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold mb-1">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={fornecedorSelecionado.email}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold mb-1">Endereço</label>
                                    <input
                                        type="text"
                                        name="endereco"
                                        value={fornecedorSelecionado.endereco}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold mb-1">Status</label>
                                    <select
                                        name="status"
                                        value={fornecedorSelecionado.status}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2"
                                    >
                                        <option value="Ativo">Ativo</option>
                                        <option value="Inativo">Inativo</option>
                                    </select>
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
                    </div>
                )}

                {/* Modal de visualização */}
                {modalVisualizarAberto && fornecedorVisualizar && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="bg-white rounded-xl w-11/12 md:w-1/3 p-6 space-y-4 relative shadow-xl">
                            <button
                                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
                                onClick={fecharModalVisualizar}
                            >
                                <X size={24} />
                            </button>
                            <h2 className="text-xl font-bold text-[#123859]">Detalhes do Fornecedor</h2>
                            <div className="space-y-2">
                                <p><strong>ID:</strong> {fornecedorVisualizar.id}</p>
                                <p><strong>Nome:</strong> {fornecedorVisualizar.nome}</p>
                                <p><strong>Telefone:</strong> {fornecedorVisualizar.telefone}</p>
                                <p><strong>Email:</strong> {fornecedorVisualizar.email || "-"}</p>
                                <p><strong>Endereço:</strong> {fornecedorVisualizar.endereco || "-"}</p>
                                <p>
                                    <strong>Status:</strong>{" "}
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-semibold ${fornecedorVisualizar.status === "Ativo"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-red-100 text-red-700"
                                            }`}
                                    >
                                        {fornecedorVisualizar.status}
                                    </span>
                                </p>
                            </div>
                            <div className="flex justify-end mt-4">
                                <button
                                    className="bg-[#123859] text-white px-4 py-2 rounded"
                                    onClick={fecharModalVisualizar}
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainEmpresa>
    );
}
