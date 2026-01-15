"use client";

import React, { useState } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import { Trash2, Edit } from "lucide-react";

interface Fornecedor {
    id: number;
    nome: string;
    telefone: string;
    email: string;
    endereco: string;
    status: "Ativo" | "Inativo";
}

export default function NovoFornecedorPage() {
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [form, setForm] = useState({
        nome: "",
        telefone: "",
        email: "",
        endereco: "",
        status: "Ativo",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.nome || !form.telefone) {
            alert("Por favor, preencha o nome e o telefone!");
            return;
        }

        const novoFornecedor: Fornecedor = {
            id: fornecedores.length + 1,
            nome: form.nome,
            telefone: form.telefone,
            email: form.email,
            endereco: form.endereco,
            status: form.status as "Ativo" | "Inativo",
        };

        setFornecedores([...fornecedores, novoFornecedor]);

        alert(`Fornecedor "${form.nome}" adicionado com sucesso!`);

        setForm({
            nome: "",
            telefone: "",
            email: "",
            endereco: "",
            status: "Ativo",
        });
    };

    const apagarFornecedor = (id: number) => {
        if (!confirm("Tem certeza que deseja apagar este fornecedor?")) return;
        setFornecedores(fornecedores.filter((f) => f.id !== id));
    };

    const editarFornecedor = (id: number) => {
        const fornecedor = fornecedores.find((f) => f.id === id);
        if (!fornecedor) return;

        const nome = prompt("Editar nome", fornecedor.nome);
        const telefone = prompt("Editar telefone", fornecedor.telefone);
        const email = prompt("Editar email", fornecedor.email);
        const endereco = prompt("Editar endereço", fornecedor.endereco);
        const status = prompt("Editar status (Ativo/Inativo)", fornecedor.status);

        if (nome && telefone && (status === "Ativo" || status === "Inativo")) {
            setFornecedores(
                fornecedores.map((f) =>
                    f.id === id
                        ? {
                            ...f,
                            nome,
                            telefone,
                            email: email || "",
                            endereco: endereco || "",
                            status: status as "Ativo" | "Inativo",
                        }
                        : f
                )
            );
        }
    };

    return (
        <MainEmpresa>
            <div className="p-6 flex flex-col items-center space-y-6">
                <h1 className="text-2xl font-bold text-[#123859]">Novo Fornecedor</h1>

                {/* Formulário */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-white p-6 rounded-xl shadow w-full max-w-md space-y-4"
                >
                    <div>
                        <label className="block font-semibold mb-1">Nome</label>
                        <input
                            type="text"
                            name="nome"
                            value={form.nome}
                            onChange={handleChange}
                            className="w-full border rounded px-3 py-2"
                            placeholder="Digite o nome do fornecedor"
                            required
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Telefone</label>
                        <input
                            type="text"
                            name="telefone"
                            value={form.telefone}
                            onChange={handleChange}
                            className="w-full border rounded px-3 py-2"
                            placeholder="Digite o telefone"
                            required
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            className="w-full border rounded px-3 py-2"
                            placeholder="Digite o email"
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Endereço</label>
                        <input
                            type="text"
                            name="endereco"
                            value={form.endereco}
                            onChange={handleChange}
                            className="w-full border rounded px-3 py-2"
                            placeholder="Digite o endereço"
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Status</label>
                        <select
                            name="status"
                            value={form.status}
                            onChange={handleChange}
                            className="w-full border rounded px-3 py-2"
                        >
                            <option value="Ativo">Ativo</option>
                            <option value="Inativo">Inativo</option>
                        </select>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="bg-[#F9941F] text-white px-4 py-2 rounded font-semibold hover:bg-[#d87e17]"
                        >
                            Adicionar Fornecedor
                        </button>
                    </div>
                </form>

                {/* Lista de fornecedores */}
                {fornecedores.length > 0 && (
                    <div className="bg-white rounded-xl shadow p-4 w-full max-w-4xl">
                        <h2 className="text-xl font-bold text-[#123859] mb-4">Fornecedores Cadastrados</h2>
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
                                {fornecedores.map((f) => (
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
                                                className="text-green-600 flex items-center gap-1"
                                                onClick={() => editarFornecedor(f.id)}
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
                                {fornecedores.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-4 text-center text-gray-500">
                                            Nenhum fornecedor encontrado
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </MainEmpresa>
    );
}
