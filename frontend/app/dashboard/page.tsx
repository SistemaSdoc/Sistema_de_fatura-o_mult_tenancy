'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/authprovider";
import MainEmpresa from "../components/MainEmpresa";
import { fetchDashboardData, DashboardData } from "@/services/vendas";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* 🔐 Proteção da rota */
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  /* 📊 Carrega dashboard */
  useEffect(() => {
    if (!user || authLoading) return;

    const carregarDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchDashboardData();
        setData(response);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    carregarDashboard();
  }, [user, authLoading]);

  if (authLoading || !user) {
    return <p className="text-center mt-10">Carregando usuário...</p>;
  }

  return (
    <MainEmpresa>
      <div className="p-6">
        <h1 className="text-3xl font-bold text-[#123859] mb-6">
          Dashboard
        </h1>

        {loading && (
          <p className="text-center text-gray-500">
            Carregando dados...
          </p>
        )}

        {error && (
          <p className="text-center text-red-600">
            {error}
          </p>
        )}

        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card titulo="Faturas Emitidas" valor={data.faturasEmitidas} />
              <Card titulo="Clientes Ativos" valor={data.clientesAtivos} />
              <Card
                titulo="Receita Mensal"
                valor={`AOA ${data.receitaMensal.toLocaleString()}`}
              />
            </div>

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
                    {data.ultimasFaturas.map((f, i) => (
                      <tr key={f.id} className="border-b">
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2">{f.cliente ?? "-"}</td>
                        <td className="p-2">
                          {f.data
                            ? new Date(f.data).toLocaleDateString("pt-PT")
                            : "-"}
                        </td>
                        <td className="p-2">
                          {`AOA ${f.valor.toLocaleString()}`}
                        </td>
                        <td
                          className={`p-2 font-semibold ${
                            f.status === "emitida"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {f.status === "emitida"
                            ? "Emitida"
                            : "Cancelada"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500">
                Nenhuma fatura encontrada.
              </p>
            )}
          </>
        )}
      </div>
    </MainEmpresa>
  );
}

function Card({ titulo, valor }: { titulo: string; valor: string | number }) {
  return (
    <div className="bg-white shadow rounded-xl p-6 border">
      <h2 className="text-gray-600 font-semibold">{titulo}</h2>
      <p className="text-2xl font-bold text-[#123859] mt-2">{valor}</p>
    </div>
  );
}
