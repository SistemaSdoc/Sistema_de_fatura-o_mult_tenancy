
"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/authprovider";
import MainEmpresa from "../components/MainEmpresa";
import { fetchDashboardData, DashboardData } from "@/services/vendas";
import { AxiosError } from "axios";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/* ================= DASHBOARD PAGE ================= */
export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || authLoading) return;

    const carregarDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchDashboardData();
        setData(response);
      } catch (err) {
        if (err instanceof AxiosError) {
          console.error("[DASHBOARD] Axios error:", err.response?.data || err.message);
          setError(
            err.response?.data?.message ??
            "Erro ao carregar o dashboard. Verifique se você está logado."
          );
        } else {
          console.error("[DASHBOARD] Erro desconhecido:", err);
          setError("Erro desconhecido ao carregar o dashboard.");
        }
      } finally {
        setLoading(false);
      }
    };

    carregarDashboard();
  }, [user, authLoading]);

  if (authLoading || !user) {
    return (
      <MainEmpresa>
        <p className="p-6 text-center text-gray-500">
          Carregando informações do usuário...
        </p>
      </MainEmpresa>
    );
  }

  return (
    <MainEmpresa>
      <div className="p-6">
        <h1 className="text-3xl font-bold text-[#123859] mb-6">Dashboard</h1>

        {loading && <p className="text-center text-gray-500">Carregando dados...</p>}
        {error && <p className="text-center text-red-600">{error}</p>}

        {data && (
          <>
            {/* CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card titulo="Faturas Emitidas" valor={data.faturasEmitidas} />
              <Card titulo="Clientes Ativos" valor={data.clientesAtivos} />
              <Card
                titulo="Receita Mensal"
                valor={`AOA ${data.receitaMensal.toLocaleString()}`}
              />
            </div>

            {/* GRÁFICO DE VENDAS POR MÊS */}
            {data.vendasPorMes.length > 0 && (
              <div className="bg-white shadow rounded-xl p-6 mb-6">
                <h2 className="text-xl font-semibold text-[#123859] mb-4">
                  Vendas por Mês
                </h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.vendasPorMes}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) =>
                          typeof value === "number"
                            ? `AOA ${value.toLocaleString()}`
                            : "-"
                        }
                      />
                      <Bar dataKey="total" fill="#123859" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ÚLTIMAS FATURAS */}
            {data.ultimasFaturas.length > 0 ? (
              <div className="bg-white shadow rounded-xl p-6">
                <h2 className="text-xl font-semibold text-[#123859] mb-4">
                  Últimas Faturas
                </h2>

                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">Cliente</th>
                      <th className="p-2 text-left">Data</th>
                      <th className="p-2 text-left">Total</th>
                      <th className="p-2 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ultimasFaturas.map((fatura, i) => (
                      <tr key={fatura.id} className="border-b">
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2">{fatura.cliente ?? "-"}</td>
                        <td className="p-2">
                          {fatura.data
                            ? new Date(fatura.data).toLocaleDateString("pt-PT")
                            : "-"}
                        </td>
                        <td className="p-2">
                          {fatura.valor
                            ? `AOA ${fatura.valor.toLocaleString()}`
                            : "-"}
                        </td>
                        <td
                          className={`p-2 font-semibold ${
                            fatura.status === "emitida" ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {fatura.status === "emitida" ? "Emitida" : "Cancelada"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500">Nenhuma fatura encontrada.</p>
            )}
          </>
        )}
      </div>
    </MainEmpresa>
  );
}

/* ================= CARD ================= */
function Card({ titulo, valor }: { titulo: string; valor: string | number }) {
  return (
    <div className="bg-white shadow rounded-xl p-6 border">
      <h2 className="text-gray-600 font-semibold">{titulo}</h2>
      <p className="text-2xl font-bold text-[#123859] mt-2">{valor}</p>
    </div>
  );
}
