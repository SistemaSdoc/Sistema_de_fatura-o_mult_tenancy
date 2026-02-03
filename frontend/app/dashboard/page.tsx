"use client";

import { useEffect, useState } from "react";
import MainEmpresa from "@/app/components/MainEmpresa";
import { dashboardService, DashboardResponse } from "@/services/vendas";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, Legend
} from "recharts";

type ChartDataInput = { [key: string]: string | number };

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.fetch()
      .then(res => res && setData(res))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <MainEmpresa>Carregando dashboard...</MainEmpresa>;
  if (!data) return <MainEmpresa>Erro ao carregar dashboard</MainEmpresa>;

  // ================= FUNÇÕES AUX =================
  const formatKz = (valor: number) =>
    new Intl.NumberFormat("pt-AO").format(valor) + " Kz";

  const formatDate = (dataStr: string) =>
    new Date(dataStr).toLocaleDateString("pt-AO");

  // ================= CAMPOS BLINDADOS =================
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

  const pagamentos = data.pagamentos ?? {
    total: 0,
    dinheiro: 0,
    cartao: 0,
    transferencia: 0,
  };

  const indicadores = data.indicadores ?? {
    produtosMaisVendidos: [],
  };

const clientesAtivos = data?.clientesAtivos ?? 0;
console.log(clientesAtivos);


  // ================= KPIs =================
  const receitaAtual = faturas.receitaMesAtual ?? 0;
  const receitaAnterior = faturas.receitaMesAnterior ?? 0;

  const crescimento = receitaAnterior > 0
    ? (((receitaAtual - receitaAnterior) / receitaAnterior) * 100).toFixed(1)
    : "0";

  const ticketMedio = vendas.total > 0
    ? (receitaAtual / vendas.total).toFixed(2)
    : "0";

  const pagamentosData: ChartDataInput[] = [
    { name: "Dinheiro", value: pagamentos.dinheiro ?? 0 },
    { name: "Cartão", value: pagamentos.cartao ?? 0 },
    { name: "Transferência", value: pagamentos.transferencia ?? 0 },
  ];

  const pieColors = ["#123859", "#F9941F", "#C9B6E4"];

  // ================= RENDER =================
  return (
    <MainEmpresa>
      <div className="p-6 space-y-8">

        {/* 🔹 KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPI title="Receita do Mês" value={formatKz(receitaAtual)} />
          <KPI title="Crescimento" value={`${crescimento}%`} />
          <KPI title="Ticket Médio" value={formatKz(Number(ticketMedio))} />
          <KPI title="Vendas Totais" value={vendas.total} />
          <KPI title="Clientes Ativos" value={clientesAtivos} />

        </div>

        {/* 🔹 Receita últimos 12 meses */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="font-semibold mb-4">📈 Receita Últimos 12 Meses</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={vendas.vendasPorMes ?? []}>
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={(v?: number) => formatKz(v ?? 0)} />
              <Line type="monotone" dataKey="total" stroke="#123859" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 🔹 Gráficos secundários */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Faturação por pagamento */}
          <div className="bg-white p-4 rounded-xl shadow">
            <h3 className="font-semibold mb-4">💳 Faturação por Pagamento</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pagamentosData} dataKey="value" nameKey="name" label>
                  {pagamentosData.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
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
              <BarChart data={indicadores.produtosMaisVendidos ?? []}>
                <XAxis dataKey="produto" />
                <YAxis />
                <Tooltip formatter={(v?: number) => formatKz(v ?? 0)} />
                <Bar dataKey="quantidade" fill="#F9941F" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* 🔹 Tabelas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <Tabela
            titulo="🧾 Últimas Vendas"
            colunas={["Cliente", "Total", "Status", "Data"]}
            dados={(vendas.ultimas ?? []).map(v => [
              v.cliente ?? "Desconhecido",
              formatKz(v.total ?? 0),
              v.status ?? "Desconhecido",
              formatDate(v.data ?? ""),
            ])}
          />

          <Tabela
            titulo="📄 Últimas Faturas"
            colunas={["Venda", "Total", "Estado", "Data"]}
            dados={(faturas.ultimas ?? []).map(f => [
              `#${f.venda_id ?? 0}`,
              formatKz(f.total ?? 0),
              f.estado ?? "Desconhecido",
              formatDate(f.data ?? ""),
            ])}
          />

        </div>

      </div>
    </MainEmpresa>
  );
}

/* ================= COMPONENTES ================= */

interface KPIProps {
  title: string;
  value: string | number;
}
function KPI({ title, value }: KPIProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

interface TabelaProps {
  titulo: string;
  colunas: string[];
  dados: (string | number)[][];
}
function Tabela({ titulo, colunas, dados }: TabelaProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow overflow-x-auto">
      <h3 className="font-semibold mb-3">{titulo}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            {colunas.map(col => (
              <th key={col} className="text-left p-2 border-b">{col}</th>
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
