"use client";

import React, { useState } from "react";
import MainEmpresa from "../../../components/MainEmpresa";

interface ProdutoServico {
    id: number;
    nome: string;
    tipo: "Produto" | "Serviço";
    preco: number;
    descricao: string;
    estoque?: number; // opcional para serviços
    fornecedor: string;
}

export default function NovoProdutoServicoPage() {
    const [produtos, setProdutos] = useState<ProdutoServico[]>([]);
    const [form, setForm] = useState({
        nome: "",
        tipo: "Produto",
        preco: "",
        descricao: "",
        estoque: "",
        fornecedor: "",
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.nome || !form.preco || !form.fornecedor) {
            alert("Por favor, preencha o nome, preço e fornecedor!");
            return;
        }

        const novoProduto: ProdutoServico = {
            id: produtos.length + 1,
            nome: form.nome,
            tipo: form.tipo as "Produto" | "Serviço",
            preco: Number(form.preco),
            descricao: form.descricao,
            estoque: form.tipo === "Produto" ? Number(form.estoque) : undefined,
            fornecedor: form.fornecedor,
        };

        setProdutos([...produtos, novoProduto]);

        alert(`Produto/Serviço "${form.nome}" adicionado com sucesso!`);

        setForm({
            nome: "",
            tipo: "Produto",
            preco: "",
            descricao: "",
            estoque: "",
            fornecedor: "",
        });
    };

    return (
        <MainEmpresa>
            <div className="flex justify-center items-start p-6">
                <div className="w-full max-w-xl space-y-6">
                    <h1 className="text-2xl font-bold text-[#123859] text-center">Novo Produto/Serviço</h1>

                    <form
                        onSubmit={handleSubmit}
                        className="bg-white p-6 rounded-xl shadow space-y-4"
                    >
                        {/* Nome */}
                        <div>
                            <label className="block font-semibold mb-1">Nome</label>
                            <input
                                type="text"
                                name="nome"
                                value={form.nome}
                                onChange={handleChange}
                                className="w-full border rounded px-3 py-2"
                                placeholder="Digite o nome do produto ou serviço"
                                required
                            />
                        </div>

                        {/* Tipo */}
                        <div>
                            <label className="block font-semibold mb-1">Tipo</label>
                            <select
                                name="tipo"
                                value={form.tipo}
                                onChange={handleChange}
                                className="w-full border rounded px-3 py-2"
                            >
                                <option value="Produto">Produto</option>
                                <option value="Serviço">Serviço</option>
                            </select>
                        </div>

                        {/* Preço */}
                        <div>
                            <label className="block font-semibold mb-1">Preço (Kz)</label>
                            <input
                                type="number"
                                name="preco"
                                value={form.preco}
                                onChange={handleChange}
                                className="w-full border rounded px-3 py-2"
                                placeholder="Digite o preço"
                                required
                            />
                        </div>

                        {/* Estoque (somente produto) */}
                        {form.tipo === "Produto" && (
                            <div>
                                <label className="block font-semibold mb-1">Estoque</label>
                                <input
                                    type="number"
                                    name="estoque"
                                    value={form.estoque}
                                    onChange={handleChange}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="Digite a quantidade em estoque"
                                />
                            </div>
                        )}

                        {/* Fornecedor */}
                        <div>
                            <label className="block font-semibold mb-1">Fornecedor</label>
                            <input
                                type="text"
                                name="fornecedor"
                                value={form.fornecedor}
                                onChange={handleChange}
                                className="w-full border rounded px-3 py-2"
                                placeholder="Digite o nome do fornecedor"
                                required
                            />
                        </div>

                        {/* Descrição */}
                        <div>
                            <label className="block font-semibold mb-1">Descrição</label>
                            <textarea
                                name="descricao"
                                value={form.descricao}
                                onChange={handleChange}
                                className="w-full border rounded px-3 py-2"
                                placeholder="Digite uma descrição (opcional)"
                            ></textarea>
                        </div>

                        {/* Botão */}
                        <div className="text-center">
                            <button
                                type="submit"
                                className="bg-[#F9941F] text-white px-6 py-2 rounded font-semibold hover:bg-[#d87e17]"
                            >
                                Adicionar Produto/Serviço
                            </button>
                        </div>
                    </form>

                    {/* Lista de produtos/serviços adicionados */}
                    {produtos.length > 0 && (
                        <div className="mt-6 bg-white rounded-xl shadow p-4">
                            <h2 className="text-xl font-bold text-[#123859] mb-4 text-center">
                                Produtos/Serviços Cadastrados
                            </h2>
                            <table className="w-full text-sm">
                                <thead className="bg-[#123859] text-white">
                                    <tr>
                                        <th className="p-2 text-left">ID</th>
                                        <th className="p-2 text-left">Nome</th>
                                        <th className="p-2 text-left">Tipo</th>
                                        <th className="p-2 text-left">Preço (Kz)</th>
                                        <th className="p-2 text-left">Estoque</th>
                                        <th className="p-2 text-left">Fornecedor</th>
                                        <th className="p-2 text-left">Descrição</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {produtos.map((p) => (
                                        <tr key={p.id} className="border-b">
                                            <td className="p-2">{p.id}</td>
                                            <td className="p-2">{p.nome}</td>
                                            <td className="p-2">{p.tipo}</td>
                                            <td className="p-2">{p.preco.toLocaleString()}</td>
                                            <td className="p-2">{p.tipo === "Produto" ? p.estoque : "-"}</td>
                                            <td className="p-2">{p.fornecedor}</td>
                                            <td className="p-2">{p.descricao || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </MainEmpresa>
    );
}
