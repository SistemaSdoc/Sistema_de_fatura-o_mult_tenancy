"use client";

import React, { useState } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import { BarChart2, Calendar, TrendingUp, DollarSign, LucideIcon } from "lucide-react";

/* MOCK DE FATURAS */
const faturasMock: Fatura[] = [
    {
        id: 1,
        cliente: "Consumidor Final",
        data: "2026-01-14",
        total: 15000,
        tipo: "paga",
    },
    {
        id: 2,
        cliente: "Empresa XYZ",
        data: "2026-01-14",
        total: 22000,
        tipo: "pendente",
    },
    {
        id: 3,
        cliente: "Empresa ABC",
        data: "2026-01-10",
        total: 50000,
        tipo: "paga",
    },
    {
        id: 4,
        cliente: "Cliente 123",
        data: "2025-12-20",
        total: 180000,
        tipo: "paga",
    },
];

type FiltroRelatorio = "diario" | "mensal" | "anual";

type Fatura = {
    id: number;
    cliente: string;
    data: string;
    total: number;
    tipo: "paga" | "pendente";
};

export default function RelatoriosFaturasPage() {
    const [filtro, setFiltro] = useState<FiltroRelatorio>("diario");

    const hoje = new Date().toISOString().slice(0, 10);
    const mesAtual = hoje.slice(0, 7);
    const anoAtual = hoje.slice(0, 4);

    const faturasFiltradas = faturasMock.filter((f) => {
        if (filtro === "diario") return f.data === hoje;
        if (filtro === "mensal") return f.data.startsWith(mesAtual);
        if (filtro === "anual") return f.data.startsWith(anoAtual);
        return true;
    });

    const totalFaturado = faturasFiltradas.reduce((acc, f) => acc + f.total, 0);
    const faturasPagas = faturasFiltradas.filter((f) => f.tipo === "paga").length;
    const faturasPendentes = faturasFiltradas.filter((f) => f.tipo === "pendente").length;

    return (
        <MainEmpresa>
            <div className="p-6 space-y-6">
                <h1 className="text-2xl font-bold text-[#123859]">Relatórios de Faturas</h1>

                {/* Filtros */}
                <div className="flex gap-3">
                    {["diario", "mensal", "anual"].map((tipo) => (
                        <button
                            key={tipo}
                            onClick={() => setFiltro(tipo as FiltroRelatorio)}
                            className={`px-4 py-2 rounded-lg font-semibold ${
                                filtro === tipo ? "bg-[#123859] text-white" : "bg-white border"
                            }`}
                        >
                            {tipo === "diario" && "Diário"}
                            {tipo === "mensal" && "Mensal"}
                            {tipo === "anual" && "Anual"}
                        </button>
                    ))}
                </div>

                {/* Cards de resumo */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <DashboardCard titulo="Total Faturado" valor={`${totalFaturado.toLocaleString()} Kz`} icon={DollarSign} />
                    <DashboardCard titulo="Nº de Faturas" valor={faturasFiltradas.length} icon={BarChart2} />
                    <DashboardCard titulo="Faturas Pagas" valor={faturasPagas} icon={TrendingUp} />
                    <DashboardCard titulo="Pendentes" valor={faturasPendentes} icon={Calendar} />
                </div>

                {/* Tabela */}
                <div className="bg-white rounded-xl shadow overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#123859] text-white">
                            <tr>
                                <th className="p-3 text-left">ID</th>
                                <th className="p-3 text-left">Cliente</th>
                                <th className="p-3 text-left">Data</th>
                                <th className="p-3 text-left">Total</th>
                                <th className="p-3 text-left">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {faturasFiltradas.map((fatura) => (
                                <tr key={fatura.id} className="border-b">
                                    <td className="p-3">{fatura.id}</td>
                                    <td className="p-3">{fatura.cliente}</td>
                                    <td className="p-3">{fatura.data}</td>
                                    <td className="p-3">{fatura.total.toLocaleString()} Kz</td>
                                    <td className="p-3">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                fatura.tipo === "paga"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-yellow-100 text-yellow-700"
                                            }`}
                                        >
                                            {fatura.tipo}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {faturasFiltradas.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-gray-500">
                                        Nenhuma fatura encontrada
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

/* Card do dashboard */
type DashboardCardProps = {
    titulo: string;
    valor: string | number;
    icon: LucideIcon;
};

function DashboardCard({ titulo, valor, icon: Icon }: DashboardCardProps) {
    return (
        <div className="bg-white p-4 rounded-xl shadow flex items-center gap-4">
            <div className="p-3 rounded-lg bg-[#123859]/10 text-[#123859]">
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-sm text-gray-500">{titulo}</p>
                <p className="text-xl font-bold">{valor}</p>
            </div>
        </div>
    );
}
