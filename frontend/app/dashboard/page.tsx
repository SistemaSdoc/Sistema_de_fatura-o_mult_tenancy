"use client";

import React from "react";
import MainEmpresa from "../components/MainEmpresa";

export default function DashboardPage() {
    return (
        <MainEmpresa>
            <div className="p-6">
                <h1 className="text-3xl font-bold text-[#123859] mb-6">Dashboard</h1>

                {/* Cards de resumo */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-700">Faturas Emitidas</h2>
                        <p className="text-2xl font-bold text-[#123859] mt-2">120</p>
                    </div>

                    <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-700">Clientes Ativos</h2>
                        <p className="text-2xl font-bold text-[#123859] mt-2">85</p>
                    </div>

                    <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-700">Receita Mensal</h2>
                        <p className="text-2xl font-bold text-[#123859] mt-2">AOA 3.200.000</p>
                    </div>
                </div>

                {/* Gráfico / Estatísticas */}
                <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200 mb-6">
                    <h2 className="text-xl font-semibold text-[#123859] mb-4">Vendas por Mês</h2>
                    <div className="h-64 flex items-center justify-center text-gray-400">
                        Gráfico Placeholder
                    </div>
                </div>

                {/* Lista de últimas faturas */}
                <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
                    <h2 className="text-xl font-semibold text-[#123859] mb-4">Últimas Faturas</h2>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="py-2 px-4">#</th>
                                <th className="py-2 px-4">Cliente</th>
                                <th className="py-2 px-4">Data</th>
                                <th className="py-2 px-4">Valor</th>
                                <th className="py-2 px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-100">
                                <td className="py-2 px-4">1</td>
                                <td className="py-2 px-4">João Silva</td>
                                <td className="py-2 px-4">12/01/2026</td>
                                <td className="py-2 px-4">AOA 150.000</td>
                                <td className="py-2 px-4 text-green-600 font-semibold">Pago</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-2 px-4">2</td>
                                <td className="py-2 px-4">Maria Santos</td>
                                <td className="py-2 px-4">10/01/2026</td>
                                <td className="py-2 px-4">AOA 80.000</td>
                                <td className="py-2 px-4 text-yellow-600 font-semibold">Pendente</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-2 px-4">3</td>
                                <td className="py-2 px-4">Pedro Costa</td>
                                <td className="py-2 px-4">05/01/2026</td>
                                <td className="py-2 px-4">AOA 200.000</td>
                                <td className="py-2 px-4 text-red-600 font-semibold">Vencido</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </MainEmpresa>
    );
}
