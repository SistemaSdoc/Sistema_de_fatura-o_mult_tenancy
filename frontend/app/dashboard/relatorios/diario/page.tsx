"use client";

import React, { useEffect, useMemo, useState, ReactNode } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

/* ================= TIPAGENS ================= */

interface Venda {
  id: number;
  cliente: string;
  data: string;
  total: number;
  status: "paga" | "pendente";
}

interface KPIs {
  totalVendas: number;
  ticketMedio: number;
  clientesPeriodo: number;
  produtos: number;
  fornecedores: number;
}

interface ApiResponse {
  kpis: KPIs;
  vendas: Venda[];
}

/* ================= PAGE ================= */

export default function RelatorioAvancadoPage() {
  const [startDate, setStartDate] = useState("2026-01-13");
  const [endDate, setEndDate] = useState("2026-01-14");

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(false);

  /* ================= FETCH API ================= */

  const carregarRelatorio = async () => {
    setLoading(true);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/relatorios/avancado?start=${startDate}&end=${endDate}`,
        {
          credentials: "include", // Sanctum
        }
      );

      if (!res.ok) throw new Error("Erro ao carregar relatório");

      const data: ApiResponse = await res.json();
      setVendas(data.vendas);
      setKpis(data.kpis);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarRelatorio();
  }, [startDate, endDate]);

  /* ================= GRÁFICOS ================= */

  const vendasPorStatus = useMemo(
    () => [
      { name: "Pagas", value: vendas.filter(v => v.status === "paga").length },
      { name: "Pendentes", value: vendas.filter(v => v.status === "pendente").length },
    ],
    [vendas]
  );

  const coresPie = ["#22c55e", "#ef4444"];

  /* ================= JSX ================= */

  return (
    <MainEmpresa>
      <div className="p-6 space-y-8">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#123859]">
            Relatório Avançado de Gestão
          </h1>

          <div className="flex gap-3">
            <input  type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border px-2 py-1 rounded" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border px-2 py-1 rounded" />
          </div>
        </div>

        {/* KPIs */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Resumo titulo="Total Vendas (Kz)" valor={kpis.totalVendas.toLocaleString()} />
            <Resumo titulo="Ticket Médio" valor={kpis.ticketMedio.toLocaleString()} />
            <Resumo titulo="Clientes no Período" valor={kpis.clientesPeriodo} />
            <Resumo titulo="Produtos" valor={kpis.produtos} />
            <Resumo titulo="Fornecedores" valor={kpis.fornecedores} />
          </div>
        )}

        {/* LOADING */}
        {loading && <p className="text-gray-500">Carregando dados...</p>}

        {/* GRÁFICOS */}
        {!loading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card titulo="Vendas por Status">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={vendasPorStatus} dataKey="value" label>
                      {vendasPorStatus.map((_, i) => (
                        <Cell key={i} fill={coresPie[i]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              <Card titulo="Vendas por Cliente">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={vendas}>
                    <XAxis dataKey="cliente" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#F9941F" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <Card titulo="Tendência de Vendas">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={vendas}>
                  <XAxis dataKey="data" />
                  <YAxis />
                  <Tooltip />
                  <Line dataKey="total" stroke="#123859" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </>
        )}
      </div>
    </MainEmpresa>
  );
}

/* ================= COMPONENTES ================= */

interface ResumoProps {
  titulo: string;
  valor: ReactNode;
}

function Resumo({ titulo, valor }: ResumoProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow border-l-4 border-[#123859]">
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className="text-2xl font-bold text-[#123859]">{valor}</p>
    </div>
  );
}

interface CardProps {
  titulo: string;
  children: ReactNode;
}

function Card({ titulo, children }: CardProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h2 className="text-lg font-bold text-[#123859] mb-3">{titulo}</h2>
      {children}
    </div>
  );
}
