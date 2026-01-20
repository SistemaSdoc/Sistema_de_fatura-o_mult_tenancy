"use client";

import React, { useState } from "react";
import MainAdmin from "../../components/MainAdmin";
import { Eye, Pencil, Trash, Search, User } from "lucide-react";

/* MOCK DE USUÁRIOS */
interface Usuario {
    id: number;
    nome: string;
    email: string;
    cargo: string;
    status: "Ativo" | "Inativo";
    dataCriacao: string;
}

const usuariosMock: Usuario[] = [
    {
        id: 1,
        nome: "João Silva",
        email: "joao@example.com",
        cargo: "Administrador",
        status: "Ativo",
        dataCriacao: "2024-01-15",
    },
    {
        id: 2,
        nome: "Maria Santos",
        email: "maria@example.com",
        cargo: "Funcionário",
        status: "Inativo",
        dataCriacao: "2023-12-02",
    },
    {
        id: 3,
        nome: "Pedro Costa",
        email: "pedro@example.com",
        cargo: "Gestor",
        status: "Ativo",
        dataCriacao: "2024-03-20",
    },
];

export default function AllUsuariosPage() {
    const [search, setSearch] = useState("");
    const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosMock);
    const [filtro, setFiltro] = useState<"Todos" | "Ativo" | "Inativo">("Todos");

    const usuariosFiltrados = usuarios.filter((usuario) => {
        const statusMatch = filtro === "Todos" ? true : usuario.status === filtro;
        const searchMatch =
            usuario.nome.toLowerCase().includes(search.toLowerCase()) ||
            usuario.email.toLowerCase().includes(search.toLowerCase());
        return statusMatch && searchMatch;
    });

    const eliminarUsuario = (id: number) => {
        if (!confirm("Tem certeza que deseja eliminar este usuário?")) return;
        setUsuarios(usuarios.filter((u) => u.id !== id));
    };

    return (
        <MainAdmin>
            <div className="space-y-6">
                {/* TÍTULO */}
                <div className="flex items-center gap-2">
                    <User className="text-[#F9941F]" />
                    <h1 className="text-2xl font-bold text-[#123859]">
                        Todos os Usuários
                    </h1>
                </div>

                {/* PESQUISA E FILTRO */}
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex items-center bg-white p-3 rounded-xl shadow max-w-md w-full">
                        <Search className="text-gray-400 mr-2" size={18} />
                        <input
                            type="text"
                            placeholder="Pesquisar usuário..."
                            className="w-full outline-none text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2">
                        {["Todos", "Ativo", "Inativo"].map((tipo) => (
                            <button
                                key={tipo}
                                onClick={() => setFiltro(tipo as any)}
                                className={`px-4 py-2 rounded-lg font-semibold ${filtro === tipo
                                        ? "bg-[#123859] text-white"
                                        : "bg-white border"
                                    }`}
                            >
                                {tipo}
                            </button>
                        ))}
                    </div>
                </div>

                {/* TABELA */}
                <div className="bg-white rounded-xl shadow overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#123859] text-white">
                            <tr>
                                <th className="p-3 text-left">ID</th>
                                <th className="p-3 text-left">Nome</th>
                                <th className="p-3 text-left">Email</th>
                                <th className="p-3 text-left">Cargo</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 text-center">Criado em</th>
                                <th className="p-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuariosFiltrados.map((usuario) => (
                                <tr
                                    key={usuario.id}
                                    className="border-b hover:bg-gray-50"
                                >
                                    <td className="p-3">{usuario.id}</td>
                                    <td className="p-3 font-medium">{usuario.nome}</td>
                                    <td className="p-3">{usuario.email}</td>
                                    <td className="p-3">{usuario.cargo}</td>
                                    <td className="p-3 text-center">
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-semibold ${usuario.status === "Ativo"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                                }`}
                                        >
                                            {usuario.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">{usuario.dataCriacao}</td>
                                    <td className="p-3 text-center flex justify-center gap-2">
                                        <a
                                            href={`/Dashboard_Admin/All_usuarios/ver/${usuario.id}`}
                                            title="Ver"
                                            className="p-1 rounded hover:bg-gray-100"
                                        >
                                            <Eye size={16} />
                                        </a>
                                        <button
                                            title="Eliminar"
                                            className="p-1 rounded hover:bg-gray-100 text-red-600"
                                            onClick={() => eliminarUsuario(usuario.id)}
                                        >
                                            <Trash size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {usuariosFiltrados.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-4 text-center text-gray-500">
                                        Nenhum usuário encontrado
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
