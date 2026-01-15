"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import MainAdmin from "../../../../components/MainAdmin";
import {
    AlertTriangle,
    ArrowLeft,
    Trash2,
} from "lucide-react";

/* MOCK DATA */
const empresasData = [
    { id: "1", nome: "Empresa Alpha" },
    { id: "2", nome: "Empresa Beta" },
    { id: "3", nome: "Empresa Gama" },
];

export default function EliminarEmpresaPage() {
    const { id } = useParams();
    const router = useRouter();

    const empresa = empresasData.find((e) => e.id === id);

    const eliminarEmpresa = () => {
        // 🔴 AQUI DEPOIS VAI A CHAMADA À API (DELETE)
        alert(`Empresa "${empresa?.nome}" eliminada com sucesso!`);
        router.push("/Dashboard_Admin/All_empresas");
    };

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
            <div className="max-w-2xl mx-auto space-y-6">

                {/* VOLTAR */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-sm font-semibold text-[#123859] hover:text-[#F9941F]"
                >
                    <ArrowLeft size={16} /> Voltar
                </button>

                {/* ALERTA */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 space-y-4">

                    <div className="flex items-center gap-2 text-red-700 font-bold text-lg">
                        <AlertTriangle />
                        Atenção!
                    </div>

                    <p className="text-sm text-red-700">
                        Tem a certeza que deseja eliminar a empresa
                        <strong> {empresa.nome}</strong>?
                    </p>

                    <p className="text-sm text-red-600">
                        Esta ação é <strong>irreversível</strong>.  
                        Todos os dados associados (clientes, faturas, vendas)
                        poderão ser perdidos.
                    </p>

                    {/* BOTÕES */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 rounded-lg border font-semibold hover:bg-gray-100"
                        >
                            Cancelar
                        </button>

                        <button
                            onClick={eliminarEmpresa}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
                        >
                            <Trash2 size={16} />
                            Eliminar Empresa
                        </button>
                    </div>
                </div>
            </div>
        </MainAdmin>
    );
}
