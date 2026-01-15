"use client";

import React from "react";
import MainAdmin from "../components/MainAdmin";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import {
    Building2,
    Users,
    ShoppingCart,
    FileText,
    DollarSign,
} from "lucide-react";

/* MOCK DATA */
const resumo = {
    empresas: 38,
    usuarios: 124,
    vendas: 845,
    faturas: 790,
    receita: 125000000,
};

const vendasMensais = [
    { mes: "Jan", vendas: 120 },
    { mes: "Fev", vendas: 150 },
    { mes: "Mar", vendas: 180 },
    { mes: "Abr", vendas: 210 },
    { mes: "Mai", vendas: 240 },
    { mes: "Jun", vendas: 300 },
];

const receitaMensal = [
    { mes: "Jan", valor: 12000000 },
    { mes: "Fev", valor: 18000000 },
    { mes: "Mar", valor: 20000000 },
    { mes: "Abr", valor: 25000000 },
    { mes: "Mai", valor: 30000000 },
    { mes: "Jun", valor: 40000000 },
];

const empresasPorPlano = [
    { name: "Básico", value: 18 },
    { name: "Pro", value: 12 },
    { name: "Premium", value: 8 },
];

const COLORS = ["#123859", "#F9941F", "#2ecc71"];

export default function DashboardAdminPage() {
    return (
        <MainAdmin>
            <div className="space-y-6">

                {/* TÍTULO */}
                <h1 className="text-2xl font-bold text-[#123859]">
                    Dashboard Administrativo
                </h1>

                {/* CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <ResumoCard
                        title="Empresas"
                        value={resumo.empresas}
                        icon={<Building2 />}
                    />
                    <ResumoCard
                        title="Usuários"
                        value={resumo.usuarios}
                        icon={<Users />}
                    />
                    <ResumoCard
                        title="Vendas"
                        value={resumo.vendas}
                        icon={<ShoppingCart />}
                    />
                    <ResumoCard
                        title="Faturas"
                        value={resumo.faturas}
                        icon={<FileText />}
                    />
                    <ResumoCard
                        title="Receita"
                        value={`${resumo.receita.toLocaleString()} Kz`}
                        icon={<DollarSign />}
                    />
                </div>

                {/* GRÁFICOS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* VENDAS */}
                    <div className="bg-white p-4 rounded-xl shadow">
                        <h2 className="font-bold mb-4">Vendas Mensais</h2>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={vendasMensais}>
                                <XAxis dataKey="mes" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="vendas" fill="#123859" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* RECEITA */}
                    <div className="bg-white p-4 rounded-xl shadow">
                        <h2 className="font-bold mb-4">Receita Mensal</h2>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={receitaMensal}>
                                <XAxis dataKey="mes" />
                                <YAxis />
                                <Tooltip />
                                <Line
                                    type="monotone"
                                    dataKey="valor"
                                    stroke="#F9941F"
                                    strokeWidth={3}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* PIE */}
                <div className="bg-white p-4 rounded-xl shadow max-w-xl">
                    <h2 className="font-bold mb-4">Empresas por Plano</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={empresasPorPlano}
                                dataKey="value"
                                nameKey="name"
                                outerRadius={100}
                                label
                            >
                                {empresasPorPlano.map((_, index) => (
                                    <Cell
                                        key={index}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </MainAdmin>
    );
}

/* COMPONENTE CARD */
function ResumoCard({
    title,
    value,
    icon,
}: {
    title: string;
    value: any;
    icon: React.ReactNode;
}) {
    return (
        <div className="bg-white p-4 rounded-xl shadow flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-500">{title}</p>
                <p className="text-xl font-bold text-[#123859]">{value}</p>
            </div>
            <div className="text-[#F9941F]">{icon}</div>
        </div>
    );
}
