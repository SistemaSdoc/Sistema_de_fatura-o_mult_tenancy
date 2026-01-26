
"use client";

import React from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import { Eye, DollarSign, BarChart2, TrendingUp, Calendar } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useDashboard } from "@/hooks/useDashboard";
import Link from "next/link";

interface DashboardCardProps {
  titulo: string;
  valor: string | number;
  icon: React.ElementType;
  link?: string;
}

const COLORS = ["#F9941F", "#123859", "#C9B6E4", "#C9F5D7", "#A0AEC0"];

export default function DashboardPage() {
  const { data, loading, error } = useDashboard();

  if (loading) return <p>Carregando dashboard...</p>;
  if (error || !data) return <p>Erro ao carregar dados</p>;

  const {
    faturasEmitidas,
    clientesAtivos,
    receitaMesAtual,
    receitaMesAnterior,
    vendasPorMes,
    produtosMaisVendidos,
    ultimasFaturas,
  } = data;

  const totalVendas = vendasPorMes.reduce((acc, v) => acc + v.total, 0);

  return (
    <MainEmpresa>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-[#123859]">Relatório total das vendas</h1>

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <DashboardCard titulo="Receita mês atual" valor={`${receitaMesAtual.toLocaleString("pt-AO")} Kz`} icon={DollarSign} />
          <DashboardCard titulo="Receita mês anterior" valor={`${receitaMesAnterior.toLocaleString("pt-AO")} Kz`} icon={TrendingUp} />
          <DashboardCard titulo="Faturas emitidas" valor={faturasEmitidas} icon={BarChart2} />
          <DashboardCard titulo="Clientes ativos" valor={clientesAtivos} icon={Calendar} />
        </div>

        {/* GRÁFICO COMPARATIVO MÊS */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="font-bold mb-4">Comparação mês atual vs anterior</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[{ nome: "Receita", atual: receitaMesAtual, anterior: receitaMesAnterior }]}>
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="atual" fill="#F9941F" />
              <Bar dataKey="anterior" fill="#123859" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* VENDAS POR MÊS */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="font-bold mb-4">Vendas por mês</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={vendasPorMes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#123859" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* PRODUTOS MAIS VENDIDOS (Pie) */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="font-bold mb-4">Produtos mais vendidos</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={produtosMaisVendidos}
                dataKey="quantidade"
                nameKey="produto"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#F9941F"
                label={({ percent }) =>
                  percent !== undefined ? `${(percent * 100).toFixed(0)}%` : ""
                }
              >
                {produtosMaisVendidos.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number | undefined) =>
                  value !== undefined ? value.toLocaleString("pt-AO") : "0"
                }
              />
            </PieChart>

          </ResponsiveContainer>
        </div>

        {/* ÚLTIMAS FATURAS */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="font-bold mb-4">Últimas faturas</h2>
          <table className="w-full border">
            <thead className="bg-[#0f2b4c] text-[#fff]">
              <tr>
                <th className="p-2 text-left">Cliente</th>
                <th className="p-2 text-right">Total</th>
                <th className="p-2 text-left">Data</th>
                <th className="p-2 text-center">Ação</th>
              </tr>
            </thead>
            <tbody>
              {ultimasFaturas.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="p-2">{f.cliente}</td>
                  <td className="p-2 text-right">{f.total.toLocaleString("pt-AO")} Kz</td>
                  <td className="p-2">{new Date(f.data).toLocaleDateString("pt-AO")}</td>
                  <td className="p-2 text-center">
                    <Link href="/dashboard/Faturas/Faturas">
                      <Eye size={18} className="text-[#123859] hover:scale-110 transition" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainEmpresa>
  );
}

/* CARD COMPONENT */
function DashboardCard({ titulo, valor, icon: Icon, link }: DashboardCardProps) {
  const content = (
    <div className="bg-white p-4 rounded-xl shadow flex items-center gap-4 cursor-pointer hover:shadow-lg transition-all duration-300">
      <div className="p-3 rounded-lg bg-[#123859]/10 text-[#123859]">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{titulo}</p>
        <p className="text-xl font-bold">{valor}</p>
      </div>
    </div>
  );

  if (link) return <a href={link}>{content}</a>;
  return content;
}
