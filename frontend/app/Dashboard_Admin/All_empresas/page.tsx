"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import MainAdmin from "../../components/MainAdmin";
import {
    Eye,
    Power,
    Search,
    Building2,
} from "lucide-react";

/* MOCK DATA */
const empresasData = [
    {
        id: 1,
        nome: "Empresa Alpha",
        email: "alpha@email.com",
        plano: "Premium",
        status: "Ativa",
        dataCriacao: "2024-01-15",
    },
    {
        id: 2,
        nome: "Empresa Beta",
        email: "beta@email.com",
        plano: "Pro",
        status: "Ativa",
        dataCriacao: "2024-03-10",
    },
    {
        id: 3,
        nome: "Empresa Gama",
        email: "gama@email.com",
        plano: "Básico",
        status: "Inativa",
        dataCriacao: "2023-11-02",
    },
];

export default function AllEmpresasPage() {
    const [search, setSearch] = useState("");
    const router = useRouter();

    const empresasFiltradas = empresasData.filter(
        (empresa) =>
            empresa.nome.toLowerCase().includes(search.toLowerCase()) ||
            empresa.email.toLowerCase().includes(search.toLowerCase())
    );

    const verEmpresa = (id: number) => {
        router.push(`/Dashboard_Admin/All_empresas/Ver/${id}`);
    };

    const eliminarEmpresa = (id: number) => {
        const confirmar = confirm(
            "Tem certeza que deseja eliminar esta empresa?"
        );
        if (!confirmar) return;

        router.push(`/Dashboard_Admin/All_empresas/Eliminar/${id}`);
    };

    return (
        <MainAdmin>
            <div className="space-y-6">

                {/* TÍTULO */}
                <div className="flex items-center gap-2">
                    <Building2 className="text-[#F9941F]" />
                    <h1 className="text-2xl font-bold text-[#123859]">
                        Todas as Empresas
                    </h1>
                </div>

                {/* PESQUISA */}
                <div className="flex items-center bg-white p-3 rounded-xl shadow max-w-md">
                    <Search className="text-gray-400 mr-2" size={18} />
                    <input
                        type="text"
                        placeholder="Pesquisar empresa..."
                        className="w-full outline-none text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* TABELA */}
                <div className="bg-white rounded-xl shadow overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#123859] text-white">
                            <tr>
                                <th className="p-3 text-left">Empresa</th>
                                <th className="p-3 text-left">Email</th>
                                <th className="p-3 text-center">Plano</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 text-center">Criada em</th>
                                <th className="p-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {empresasFiltradas.map((empresa) => (
                                <tr
                                    key={empresa.id}
                                    className="border-b hover:bg-gray-50"
                                >
                                    <td className="p-3 font-medium">
                                        {empresa.nome}
                                    </td>
                                    <td className="p-3">
                                        {empresa.email}
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className="px-2 py-1 rounded text-xs font-semibold bg-[#F9941F]/20 text-[#F9941F]">
                                            {empresa.plano}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-semibold ${
                                                empresa.status === "Ativa"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                            }`}
                                        >
                                            {empresa.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        {empresa.dataCriacao}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex justify-center gap-3">
                                            <button
                                                title="Ver Empresa"
                                                onClick={() => verEmpresa(empresa.id)}
                                                className="p-1 rounded hover:bg-gray-100 text-[#123859]"
                                            >
                                                <Eye size={16} />
                                            </button>

                                            <button
                                                title="Eliminar Empresa"
                                                onClick={() =>
                                                    eliminarEmpresa(empresa.id)
                                                }
                                                className="p-1 rounded hover:bg-gray-100 text-red-600"
                                            >
                                                <Power size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {empresasFiltradas.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="p-4 text-center text-gray-500"
                                    >
                                        Nenhuma empresa encontrada
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </MainAdmin>
    );
}
