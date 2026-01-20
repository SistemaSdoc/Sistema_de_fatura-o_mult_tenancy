"use client";

import React, { useState } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import { Trash2, Edit } from "lucide-react";

/* MOCK DE CLIENTES */
type Cliente = {
    id: number;
    nome: string;
    telefone: string;
    email: string;
    endereco: string;
    status: "ativo" | "inativo";
};

const clientesMock: Cliente[] = [
    {
        id: 1,
        nome: "Consumidor Final 1",
        telefone: "+244 900 000 001",
        email: "cliente1@example.com",
        endereco: "Rua A, Bairro X, Luanda",
        status: "ativo",
    },
    {
        id: 2,
        nome: "Consumidor Final 2",
        telefone: "+244 900 000 002",
        email: "cliente2@example.com",
        endereco: "Av. Principal, Luanda",
        status: "inativo",
    },
];

export default function TotalClientesPage() {
    const [clientes, setClientes] = useState<Cliente[]>(clientesMock);
    const [filtro, setFiltro] = useState<"todos" | "ativo" | "inativo">("todos");

    const clientesFiltrados =
        filtro === "todos" ? clientes : clientes.filter((c) => c.status === filtro);

    const apagarCliente = (id: number) => {
        if (!confirm("Tem certeza que deseja apagar este cliente?")) return;
        setClientes(clientes.filter((c) => c.id !== id));
    };

    return (
        <MainEmpresa>
            <div className="p-6 space-y-6">
                <h1 className="text-2xl font-bold text-[#123859]">Total de Clientes</h1>

                {/* Filtro por status */}
                <div className="flex gap-3 mb-4">
                    {["todos", "ativo", "inativo"].map((tipo) => (
                        <button
                            key={tipo}
                            onClick={() => setFiltro(tipo as "todos" | "ativo" | "inativo")}
                            className={`px-4 py-2 rounded-lg font-semibold ${filtro === tipo ? "bg-[#123859] text-white" : "bg-white border"
                                }`}
                        >
                            {tipo === "todos" && "Todos"}
                            {tipo === "ativo" && "Ativos"}
                            {tipo === "inativo" && "Inativos"}
                        </button>
                    ))}
                </div>

                {/* Card de resumo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-xl shadow flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total de Clientes</p>
                            <p className="text-xl font-bold">{clientes.length}</p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Clientes Ativos</p>
                            <p className="text-xl font-bold">
                                {clientes.filter((c) => c.status === "ativo").length}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Clientes Inativos</p>
                            <p className="text-xl font-bold">
                                {clientes.filter((c) => c.status === "inativo").length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabela de clientes */}
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
                            {clientesFiltrados.map((cliente) => (
                                <tr key={cliente.id} className="border-b">
                                    <td className="p-3">{cliente.id}</td>
                                    <td className="p-3">{cliente.nome}</td>
                                    <td className="p-3">{cliente.telefone}</td>
                                    <td className="p-3">{cliente.email}</td>
                                    <td className="p-3">{cliente.endereco}</td>

                                    <td className="p-3">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-semibold ${cliente.status === "ativo"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                                }`}
                                        >
                                            {cliente.status}
                                        </span>
                                    </td>

                                    <td className="p-3 flex gap-2">
                                        <button
                                            className="text-green-600 flex items-center gap-1"
                                            onClick={() => {
                                                // FUTURO: redirecionar para editar cliente
                                                alert(`Editar cliente ${cliente.id} (mock)`);
                                            }}
                                        >
                                            <Edit size={16} /> Editar
                                        </button>

                                        <button
                                            className="text-red-600 flex items-center gap-1"
                                            onClick={() => apagarCliente(cliente.id)}
                                        >
                                            <Trash2 size={16} /> Apagar
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {clientesFiltrados.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-4 text-center text-gray-500">
                                        Nenhum cliente encontrado
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </MainEmpresa>
    );
}
