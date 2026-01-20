"use client";

import React from "react";
import { useParams } from "next/navigation";
import MainAdmin from "../../../../components/MainAdmin";
import {
    User,
    Mail,
    Shield,
    Calendar,
    Building2,
} from "lucide-react";

/* MOCK – depois ligas à API */
const usuarioMock = {
    id: 1,
    nome: "Isidro Manuel",
    email: "isidro@email.com",
    perfil: "Administrador",
    empresa: "Empresa Alpha",
    status: "Ativo",
    criadoEm: "2024-02-10",
};

export default function VerUsuarioPage() {
    const { } = useParams();

    return (
        <MainAdmin>
            <div className="space-y-6">

                {/* TÍTULO */}
                <div className="flex items-center gap-2">
                    <User className="text-[#F9941F]" />
                    <h1 className="text-2xl font-bold text-[#123859]">
                        Detalhes do Usuário
                    </h1>
                </div>

                {/* CARD PRINCIPAL */}
                <div className="bg-white rounded-xl shadow p-6 max-w-3xl">

                    {/* INFO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Nome */}
                        <div className="flex items-center gap-3">
                            <User className="text-[#F9941F]" />
                            <div>
                                <p className="text-sm text-gray-500">Nome</p>
                                <p className="font-semibold">
                                    {usuarioMock.nome}
                                </p>
                            </div>
                        </div>

                        {/* Email */}
                        <div className="flex items-center gap-3">
                            <Mail className="text-[#F9941F]" />
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-semibold">
                                    {usuarioMock.email}
                                </p>
                            </div>
                        </div>

                        {/* Perfil */}
                        <div className="flex items-center gap-3">
                            <Shield className="text-[#F9941F]" />
                            <div>
                                <p className="text-sm text-gray-500">Perfil</p>
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F9941F]/20 text-[#F9941F]">
                                    {usuarioMock.perfil}
                                </span>
                            </div>
                        </div>

                        {/* Empresa */}
                        <div className="flex items-center gap-3">
                            <Building2 className="text-[#F9941F]" />
                            <div>
                                <p className="text-sm text-gray-500">Empresa</p>
                                <p className="font-semibold">
                                    {usuarioMock.empresa}
                                </p>
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    usuarioMock.status === "Ativo"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                }`}
                            >
                                {usuarioMock.status}
                            </span>
                        </div>

                        {/* Criado em */}
                        <div className="flex items-center gap-3">
                            <Calendar className="text-[#F9941F]" />
                            <div>
                                <p className="text-sm text-gray-500">
                                    Criado em
                                </p>
                                <p className="font-semibold">
                                    {usuarioMock.criadoEm}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* AÇÕES */}
                    <div className="mt-8 flex gap-3">
                        <button className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition">
                            Desativar
                        </button>
                    </div>
                </div>
            </div>
        </MainAdmin>
    );
}
