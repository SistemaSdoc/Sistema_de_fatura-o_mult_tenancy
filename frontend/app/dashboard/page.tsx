'use client';

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/authprovider";
import MainEmpresa from "../components/MainEmpresa";
import { fetchDashboardData, DashboardData } from "@/services/vendas";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Skeleton from "react-loading-skeleton";
import 'react-loading-skeleton/dist/skeleton.css';

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

  // 🔐 Proteção da rota
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  // 📊 React Query para cache e loading
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
    enabled: !!user, // só roda se o user estiver carregado
    staleTime: 1000 * 60 * 5, // cache 5 min
  });

  if (authLoading || !user) {
    return <p className="text-center mt-10">Carregando usuário...</p>;
  }

  return (
    <MainEmpresa>
      <div className="p-6">
        <h1 className="text-3xl font-bold text-[#123859] mb-6">Dashboard</h1>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[1,2,3].map((i) => (
              <Skeleton key={i} height={100} borderRadius={12} />
            ))}
          </div>
        )}

        {/* Erro */}
        {error && (
          <p className="text-center text-red-600">
            {(error as Error).message ?? "Erro desconhecido"}
          </p>
        )}

        {/* Cards e gráficos */}
        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card titulo="Faturas Emitidas" valor={data.faturasEmitidas} />
              <Card titulo="Clientes Ativos" valor={data.clientesAtivos} />
              <Card titulo="Receita Mensal" valor={`AOA ${data.receitaMensal.toLocaleString()}`} />
            </div>

            {data.vendasPorMes.length > 0 && (
              <div className="bg-white shadow rounded-xl p-6 mb-6">
                <h2 className="text-xl font-semibold text-[#123859] mb-4">Vendas por Mês</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.vendasPorMes}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip formatter={(value) =>
                        typeof value === "number"
                          ? `AOA ${value.toLocaleString()}`
                          : "-"
                      }/>
                      <Bar dataKey="total" fill="#123859" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <UltimasFaturas faturas={data.ultimasFaturas} />
          </>
        )}
      </div>
    </MainEmpresa>
  );
}

// ------------------ Card ------------------
function Card({ titulo, valor }: { titulo: string; valor: string | number }) {
  return (
    <div className="bg-white shadow rounded-xl p-6 border">
      <h2 className="text-gray-600 font-semibold">{titulo}</h2>
      <p className="text-2xl font-bold text-[#123859] mt-2">{valor}</p>
    </div>
  );
}

// ------------------ Últimas Faturas ------------------
function UltimasFaturas({ faturas }: { faturas: any[] }) {
  if (faturas.length === 0)
    return <p className="text-center text-gray-500">Nenhuma fatura encontrada.</p>;

  return (
    <div className="bg-white shadow rounded-xl p-6">
      <h2 className="text-xl font-semibold text-[#123859] mb-4">Últimas Faturas</h2>
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
          {faturas.map((f, i) => (
            <tr key={f.id} className="border-b">
              <td className="p-2">{i + 1}</td>
              <td className="p-2">{f.cliente ?? "-"}</td>
              <td className="p-2">{f.data ? new Date(f.data).toLocaleDateString("pt-PT") : "-"}</td>
              <td className="p-2">{`AOA ${f.valor.toLocaleString()}`}</td>
              <td className={`p-2 font-semibold ${f.status === "emitida" ? "text-green-600" : "text-red-600"}`}>
                {f.status === "emitida" ? "Emitida" : "Cancelada"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
