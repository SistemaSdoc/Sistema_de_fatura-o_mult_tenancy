"use client";

import React, { useState } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import Link from "next/link";
import {
    BarChart2,
    Calendar,
    TrendingUp,
    DollarSign,
} from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts";

/* MOCK DE VENDAS */
const vendasMock = [
    { id: 1, data: "2026-01-14", total: 15000, tipo: "paga" },
    { id: 2, data: "2026-01-14", total: 22000, tipo: "pendente" },
    { id: 3, data: "2026-01-10", total: 50000, tipo: "paga" },
    { id: 4, data: "2025-12-20", total: 180000, tipo: "paga" },
];

/* MOCK DE VENDAS AGRUPADAS PARA GRÁFICO MENSAL/ANUAL */
const vendasPorPeriodo = [
    { periodo: "Jan", total: 120000 },
    { periodo: "Fev", total: 98000 },
    { periodo: "Mar", total: 150000 },
    { periodo: "Abr", total: 175000 },
    { periodo: "Mai", total: 210000 },
];

export default function RelatoriosVendasPage() {
    const [filtro, setFiltro] = useState<"diario" | "mensal" | "anual">(
        "diario"
    );

    const hoje = new Date().toISOString().slice(0, 10);
    const mesAtual = hoje.slice(0, 7);
    const anoAtual = hoje.slice(0, 4);

    const vendasFiltradas = vendasMock.filter((v) => {
        if (filtro === "diario") return v.data === hoje;
        if (filtro === "mensal") return v.data.startsWith(mesAtual);
        if (filtro === "anual") return v.data.startsWith(anoAtual);
        return true;
    });

    const totalVendas = vendasFiltradas.reduce((acc, v) => acc + v.total, 0);
    const vendasPagas = vendasFiltradas.filter((v) => v.tipo === "paga").length;
    const vendasPendentes = vendasFiltradas.filter(
        (v) => v.tipo === "pendente"
    ).length;

    return (
        <MainEmpresa>
            <div className="p-6 space-y-6">
                <h1 className="text-2xl font-bold text-[#123859]">
                    Relatórios de Vendas
                </h1>

                {/* Filtros */}
                <div className="flex gap-3">
                    {["diario", "mensal", "anual"].map((tipo) => (
                        <button
                            key={tipo}
                            onClick={() => setFiltro(tipo as any)}
                            className={`px-4 py-2 rounded-lg font-semibold ${filtro === tipo
                                    ? "bg-[#123859] text-white"
                                    : "bg-white border"
                                }`}
                        >
                            {tipo === "diario" && "Diário"}
                            {tipo === "mensal" && "Mensal"}
                            {tipo === "anual" && "Anual"}
                        </button>
                    ))}
                </div>

                {/* DASHBOARD CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <DashboardCard
                        titulo="Total Vendido"
                        valor={`${totalVendas.toLocaleString()} Kz`}
                        icon={DollarSign}
                    />
                    <DashboardCard
                        titulo="Nº de Vendas"
                        valor={vendasFiltradas.length}
                        icon={BarChart2}
                        link="/dashboard/Faturas/Faturas"
                    />
                    <DashboardCard
                        titulo="Vendas Pagas"
                        valor={vendasPagas}
                        icon={TrendingUp}
                        link="/dashboard/Faturas/Faturas"
                    />
                    <DashboardCard
                        titulo="Pendentes"
                        valor={vendasPendentes}
                        icon={Calendar}
                        link="/dashboard/Faturas/Faturas"
                    />
                </div>

                {/* GRÁFICOS – Só Mensal e Anual */}
                {(filtro === "mensal" || filtro === "anual") && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Gráfico de Barras */}
                        <div className="bg-white p-4 rounded-xl shadow">
                            <h2 className="font-semibold mb-4">
                                Vendas por Período
                            </h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={vendasPorPeriodo}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="periodo" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="total" fill="#F9941F" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Gráfico de Linha */}
                        <div className="bg-white p-4 rounded-xl shadow">
                            <h2 className="font-semibold mb-4">
                                Evolução das Vendas
                            </h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={vendasPorPeriodo}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="periodo" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line
                                        type="monotone"
                                        dataKey="total"
                                        stroke="#123859"
                                        strokeWidth={3}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Tabela */}
                <div className="bg-white rounded-xl shadow overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#123859] text-white">
                            <tr>
                                <th className="p-3 text-left">ID</th>
                                <th className="p-3 text-left">Data</th>
                                <th className="p-3 text-left">Total</th>
                                <th className="p-3 text-left">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vendasFiltradas.map((venda) => (
                                <tr key={venda.id} className="border-b">
                                    <td className="p-3">{venda.id}</td>
                                    <td className="p-3">{venda.data}</td>
                                    <td className="p-3">
                                        {venda.total.toLocaleString()} Kz
                                    </td>
                                    <td className="p-3">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-semibold ${venda.tipo === "paga"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-yellow-100 text-yellow-700"
                                                }`}
                                        >
                                            {venda.tipo}
                                        </span>
                                    </td>
                                </tr>
                            ))}

                            {vendasFiltradas.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="p-4 text-center text-gray-500"
                                    >
                                        Nenhuma venda encontrada
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

/* CARD */
function DashboardCard({
    titulo,
    valor,
    icon: Icon,
    link,
}: {
    titulo: string;
    valor: any;
    icon: any;
    link?: string;
}) {
    const CardContent = (
        <div className="bg-white p-4 rounded-xl shadow flex items-center gap-4 cursor-pointer hover:shadow-lg transition-all duration-300">
            <div className="p-3 rounded-lg bg-[#123859]/10 text-[#123859]">
                <Icon />
            </div>
            <div>
                <p className="text-sm text-gray-500">{titulo}</p>
                <p className="text-xl font-bold">{valor}</p>
            </div>
        </div>
    );

    if (link) {
        return <Link href={link}>{CardContent}</Link>;
    }
    return CardContent;
}
