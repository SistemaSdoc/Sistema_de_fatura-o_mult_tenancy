"use client";

import { Eye } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import MainEmpresa from "@/app/components/MainEmpresa";
import { useDashboard } from "@/hooks/useDashboard";

export default function DashboardPage() {
  const { data, loading, error } = useDashboard();

  if (loading) {
    return <MainEmpresa>Carregando dashboard...</MainEmpresa>;
  }

  if (error || !data) {
    return <MainEmpresa>Erro ao carregar dados</MainEmpresa>;
  }

  return (
    <MainEmpresa>
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">

        <h1 className="text-3xl font-bold text-gray-800">
          Dashboard Financeiro
        </h1>

        {/* ===================== CARDS ===================== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ResumoCard titulo="Receita mês atual" valor={data.receitaMesAtual} moeda />
          <ResumoCard titulo="Receita mês anterior" valor={data.receitaMesAnterior} moeda />
          <ResumoCard titulo="Faturas emitidas" valor={data.faturasEmitidas} />
          <ResumoCard titulo="Clientes ativos" valor={data.clientesAtivos} />
        </div>

        {/* ===================== COMPARAÇÃO MENSAL ===================== */}
        <div className="bg-white p-5 rounded-xl shadow">
          <h2 className="font-semibold mb-4">📈 Comparação mensal</h2>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={[
                {
                  nome: "Receita",
                  Atual: data.receitaMesAtual,
                  Anterior: data.receitaMesAnterior,
                },
              ]}
            >
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="Atual"
                fill="#C9F5D7"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="Anterior"
                fill="#C9B6E4"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ===================== VENDAS POR MÊS ===================== */}
        <div className="bg-white p-5 rounded-xl shadow">
          <h2 className="font-semibold mb-4">📊 Vendas por mês</h2>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.vendasPorMes}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="total"
                fill="#C9B6E4"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ===================== PRODUTOS MAIS VENDIDOS ===================== */}
        <div className="bg-white p-5 rounded-xl shadow">
          <h2 className="font-semibold mb-4">📦 Produtos mais vendidos</h2>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.produtosMaisVendidos}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis dataKey="produto" />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="quantidade"
                fill="#C9F5D7"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ===================== ÚLTIMAS FATURAS ===================== */}
        <div className="bg-white p-5 rounded-xl shadow">
          <h2 className="font-semibold mb-4">📄 Últimas faturas</h2>

          <table className="w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Cliente</th>
                <th className="p-2">Total</th>
                <th className="p-2">Data</th>
                <th className="p-2">Ação</th>
              </tr>
            </thead>
            <tbody>
              {data.ultimasFaturas.map(f => (
                <tr key={f.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{f.cliente}</td>
                  <td className="p-2 text-right">
                    {f.total.toLocaleString("pt-AO")} Kz
                  </td>
                  <td className="p-2">
                    {new Date(f.data).toLocaleDateString("pt-AO")}
                  </td>
                  <td className="p-2 text-center">
                    <button title="Ver fatura">
                      <Eye size={18} />
                    </button>
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

/* ===================== CARD ===================== */
function ResumoCard({
  titulo,
  valor,
  moeda = false,
}: {
  titulo: string;
  valor: number;
  moeda?: boolean;
}) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <p className="text-gray-500 text-sm">{titulo}</p>
      <p className="text-2xl font-bold text-gray-800">
        {moeda ? `${valor.toLocaleString("pt-AO")} Kz` : valor}
      </p>
    </div>
  );
}
