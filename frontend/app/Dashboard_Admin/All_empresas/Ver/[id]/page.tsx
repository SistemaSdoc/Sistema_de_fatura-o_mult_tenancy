"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import MainAdmin from "../../../../components/MainAdmin";
import {
    Building2,
    Mail,
    Calendar,
    BadgeCheck,
    ArrowLeft,
} from "lucide-react";

/* MOCK DATA (temporário) */
const empresasData = [
    {
        id: "1",
        nome: "Empresa Alpha",
        email: "alpha@email.com",
        plano: "Premium",
        status: "Ativa",
        dataCriacao: "2024-01-15",
        telefone: "+244 923 000 111",
        endereco: "Luanda, Angola",
    },
    {
        id: "2",
        nome: "Empresa Beta",
        email: "beta@email.com",
        plano: "Pro",
        status: "Ativa",
        dataCriacao: "2024-03-10",
        telefone: "+244 923 000 222",
        endereco: "Benguela, Angola",
    },
];

export default function VerEmpresaPage() {
    const { id } = useParams();
    const router = useRouter();

    const empresa = empresasData.find((e) => e.id === id);

    if (!empresa) {
        return (
            <MainAdmin>
                <div className="bg-white p-6 rounded-xl shadow text-center text-red-600">
                    Empresa não encontrada.
                </div>
            </MainAdmin>
        );
    }

    return (
        <MainAdmin>
            <div className="space-y-6">

                {/* VOLTAR */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-sm font-semibold text-[#123859] hover:text-[#F9941F]"
                >
                    <ArrowLeft size={16} /> Voltar
                </button>

                {/* TÍTULO */}
                <div className="flex items-center gap-2">
                    <Building2 className="text-[#F9941F]" />
                    <h1 className="text-2xl font-bold text-[#123859]">
                        Detalhes da Empresa
                    </h1>
                </div>

                {/* CARD PRINCIPAL */}
                <div className="bg-white rounded-xl shadow p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* NOME */}
                    <div>
                        <label className="text-sm text-gray-500">Empresa</label>
                        <p className="font-semibold text-lg">
                            {empresa.nome}
                        </p>
                    </div>

                    {/* STATUS */}
                    <div>
                        <label className="text-sm text-gray-500">Status</label>
                        <p
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                                empresa.status === "Ativa"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                            }`}
                        >
                            <BadgeCheck size={14} />
                            {empresa.status}
                        </p>
                    </div>

                    {/* EMAIL */}
                    <div>
                        <label className="text-sm text-gray-500">Email</label>
                        <p className="flex items-center gap-2">
                            <Mail size={16} />
                            {empresa.email}
                        </p>
                    </div>

                    {/* TELEFONE */}
                    <div>
                        <label className="text-sm text-gray-500">Telefone</label>
                        <p>{empresa.telefone}</p>
                    </div>

                    {/* ENDEREÇO */}
                    <div>
                        <label className="text-sm text-gray-500">Endereço</label>
                        <p>{empresa.endereco}</p>
                    </div>

                    {/* PLANO */}
                    <div>
                        <label className="text-sm text-gray-500">Plano</label>
                        <span className="inline-block px-3 py-1 rounded text-sm font-semibold bg-[#F9941F]/20 text-[#F9941F]">
                            {empresa.plano}
                        </span>
                    </div>

                    {/* DATA DE CRIAÇÃO */}
                    <div>
                        <label className="text-sm text-gray-500">
                            Data de Criação
                        </label>
                        <p className="flex items-center gap-2">
                            <Calendar size={16} />
                            {empresa.dataCriacao}
                        </p>
                    </div>
                </div>
            </div>
        </MainAdmin>
    );
}
