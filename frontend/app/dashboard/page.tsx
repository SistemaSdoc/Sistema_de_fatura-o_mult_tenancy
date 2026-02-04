"use client";

import { useEffect, useState } from "react";
import MainEmpresa from "@/app/components/MainEmpresa";
import { dashboardService } from "@/services/vendas";
import type { DashboardResponse, PagamentoMetodo } from "@/services/vendas";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, Legend
} from "recharts";

const PIE_COLORS = ["#123859", "#F9941F", "#C9B6E4"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.fetch()
      .then(res => {
        console.log("DASHBOARD:", res); // res já é DashboardResponse
        if (res) setData(res);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <MainEmpresa>Carregando dashboard...</MainEmpresa>;
  if (!data) return <MainEmpresa>Erro ao carregar dashboard</MainEmpresa>;

  /* ================= FORMATADORES ================= */
  const formatKz = (v: number | string) =>
    new Intl.NumberFormat("pt-AO").format(Number(v)) + " Kz";

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-AO");

  /* ================= BLINDAGEM ================= */
  const faturas = data.faturas ?? {
    receitaMesAtual: 0,
    receitaMesAnterior: 0,
    total: 0,
    pendentes: 0,
    pagas: 0,
    ultimas: [],
  };

  const vendas = data.vendas ?? {
    total: 0,
    abertas: 0,
    faturadas: 0,
    canceladas: 0,
    ultimas: [],
    vendasPorMes: [],
  };

  const indicadores = data.indicadores ?? {
    produtosMaisVendidos: [],
  };

  const clientesAtivos = data.clientesAtivos ?? 0;

  const kpis = data.kpis ?? {
    ticketMedio: 0,
    crescimentoPercentual: 0,
    ivaArrecadado: 0,
  };

  /* ================= PAGAMENTOS ================= */
  const pagamentosArray: PagamentoMetodo[] = Array.isArray(data.pagamentos)
    ? data.pagamentos
    : [];

  const pagamentosMap = pagamentosArray.reduce(
    (acc: Record<string, number>, p) => {
      acc[p.metodo] = Number(p.total);
      return acc;
    },
    { dinheiro: 0, cartao: 0, transferencia: 0 }
  );

  const pagamentosData = [
    { name: "Dinheiro", value: pagamentosMap.dinheiro },
    { name: "Cartão", value: pagamentosMap.cartao },
    { name: "Transferência", value: pagamentosMap.transferencia },
  ];

  /* ================= KPIs ================= */
  const receitaAtual = Number(faturas.receitaMesAtual ?? 0);
  const receitaAnterior = Number(faturas.receitaMesAnterior ?? 0);
  const crescimento = kpis.crescimentoPercentual;
  const ticketMedio = kpis.ticketMedio;

  /* ================= RENDER ================= */
  return (
    <MainEmpresa>
      <div className="p-6 space-y-8">

        {/* 🔹 KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <KPI title="Receita do Mês" value={formatKz(receitaAtual)} />
          <KPI title="Crescimento" value={`${crescimento}%`} />
          <KPI title="Ticket Médio" value={formatKz(ticketMedio)} />
          <KPI title="Vendas Totais" value={vendas.total} />
          <KPI title="Clientes Ativos" value={clientesAtivos} />
        </div>

        {/* 🔹 Receita últimos 12 meses */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="font-semibold mb-4">📈 Receita Últimos 12 Meses</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={vendas.vendasPorMes}>
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={(v?: number) => formatKz(v ?? 0)} />
              <Line type="monotone" dataKey="total" stroke="#123859" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 🔹 Gráficos secundários */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Pagamentos */}
          <div className="bg-white p-4 rounded-xl shadow">
            <h3 className="font-semibold mb-4">💳 Pagamentos</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pagamentosData} dataKey="value" nameKey="name" label>
                  {pagamentosData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v?: number) => formatKz(v ?? 0)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Produtos mais vendidos */}
          <div className="bg-white p-4 rounded-xl shadow">
            <h3 className="font-semibold mb-4">🔥 Produtos Mais Vendidos</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={indicadores.produtosMaisVendidos}>
                <XAxis dataKey="produto" />
                <YAxis />
                <Tooltip formatter={(v?: number) => v} />
                <Bar
                  dataKey="quantidade"
                  fill="#F9941F"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* 🔹 Tabelas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <Tabela
            titulo="🧾 Últimas Vendas"
            colunas={["Cliente", "Total", "Status", "Data"]}
            dados={vendas.ultimas.map(v => [
              v.cliente,
              formatKz(v.total),
              v.status,
              formatDate(v.data),
            ])}
          />

          <Tabela
            titulo="📄 Últimas Faturas"
            colunas={["Venda", "Total", "Estado", "Data"]}
            dados={faturas.ultimas.map(f => [
              `#${f.venda_id}`,
              formatKz(f.total),
              f.estado,
              formatDate(f.data),
            ])}
          />

        </div>

      </div>
    </MainEmpresa>
  );
}

/* ================= COMPONENTES ================= */
function KPI({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function Tabela({
  titulo,
  colunas,
  dados,
}: {
  titulo: string;
  colunas: string[];
  dados: (string | number)[][];
}) {
  return (
    <div className="bg-white p-4 rounded-xl shadow overflow-x-auto">
      <h3 className="font-semibold mb-3">{titulo}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            {colunas.map(c => (
              <th key={c} className="text-left p-2 border-b">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.map((row, i) => (
            <tr key={i} className="border-b hover:bg-gray-50">
              {row.map((cell, j) => (
                <td key={j} className="p-2">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
