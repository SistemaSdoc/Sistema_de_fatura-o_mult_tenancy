"use client";

import React, { ReactNode, useEffect, useMemo, useState } from "react";
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
import * as XLSX from "xlsx";
import {
  listarVendas,
  clienteService,
  produtoService,
  fornecedorService,
  Venda,
  Cliente,
  Produto,
  Fornecedor,
} from "@/services/vendas";

/* ================= CORES ================= */
const theme = {
  primary: "#123859",
  secondary: "#F9941F",
  success: "#22c55e",
  danger: "#ef4444",
};

interface ResumoProps {
  titulo: string;
  valor: ReactNode;
}

interface CardProps {
  titulo: string;
  children: ReactNode;
}

/* ================= PAGE ================= */
export default function RelatorioAnualPage() {
  const [ano, setAno] = useState(new Date().getFullYear().toString());
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================= LOAD ================= */
  useEffect(() => {
    async function carregar() {
      setLoading(true);

      const [
        vendasData,
        clientesData,
        produtosData,
        fornecedoresData,
      ] = await Promise.all([
        listarVendas(),
        clienteService.listar(),
        produtoService.listarPaginado(1),
        fornecedorService.listar(),
      ]);

      setVendas(vendasData);
      setClientes(clientesData);
      setProdutos(produtosData.data);
      setFornecedores(fornecedoresData);

      setLoading(false);
    }

    carregar();
  }, []);

  /* ================= FILTROS ================= */
  const vendasFiltradas = useMemo(
    () => vendas.filter(v => v.data.startsWith(ano)),
    [vendas, ano]
  );

  const clientesFiltrados = useMemo(
    () => clientes.filter(c => c.created_at?.startsWith(ano)),
    [clientes, ano]
  );

  /* ================= KPIs ================= */
  const totalVendas = vendasFiltradas.reduce((s, v) => s + v.total, 0);

  const ticketMedio =
    vendasFiltradas.length > 0
      ? totalVendas / vendasFiltradas.length
      : 0;

  /* ================= STATUS ================= */
  const vendasPorStatus = [
    {
      name: "Emitidas",
      value: vendasFiltradas.filter(v => v.fatura?.status === "emitida").length,
    },
    {
      name: "Canceladas",
      value: vendasFiltradas.filter(v => v.fatura?.status === "cancelada").length,
    },
  ];

  /* ================= MENSAL ================= */
  const meses = Array.from({ length: 12 }, (_, i) =>
    `${i + 1}`.padStart(2, "0")
  );

  const vendasPorMes = meses.map(mes => ({
    mes,
    total: vendasFiltradas
      .filter(v => v.data.slice(5, 7) === mes)
      .reduce((s, v) => s + v.total, 0),
  }));

  let acumulado = 0;
  const vendasAcumuladas = vendasPorMes.map(m => {
    acumulado += m.total;
    return { ...m, acumulado };
  });

  /* ================= CLIENTES ================= */
  const topClientes = useMemo(() => {
    const mapa: Record<string, number> = {};

    vendasFiltradas.forEach(v => {
      mapa[v.cliente_nome] =
        (mapa[v.cliente_nome] || 0) + v.total;
    });

    return Object.entries(mapa)
      .map(([cliente, total]) => ({ cliente, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [vendasFiltradas]);

  /* ================= EXPORT ================= */
  const exportToExcel = () => {
    const dados = vendasFiltradas.map(v => ({
      "ID Venda": v.id,
      Cliente: v.cliente_nome,
      Data: new Date(v.data).toLocaleDateString(),
      Total: v.total,
      Status: v.fatura?.status ?? "N/A",
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
    XLSX.writeFile(wb, `Relatorio_Gestao_${ano}.xlsx`);
  };

  if (loading) {
    return (
      <MainEmpresa>
        <div className="p-6">Carregando relatório…</div>
      </MainEmpresa>
    );
  }

  return (
    <MainEmpresa>
      <div className="p-6 space-y-8">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#123859]">
            Relatório Anual de Gestão
          </h1>

          <div  className="flex gap-3 items-end">
            <label htmlFor="ano">Ano</label>
            <input
            name="ano"
            id="ano"
              type="number"
              value={ano}
              onChange={e => setAno(e.target.value)}
              className="border rounded px-2 py-1"
            />
            <button
              onClick={exportToExcel}
              className="bg-[#123859] text-white px-4 py-2 rounded"
            >
              Exportar Excel
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Resumo titulo="Total de Vendas (Kz)" valor={totalVendas.toLocaleString()} />
          <Resumo titulo="Ticket Médio" valor={ticketMedio.toLocaleString()} />
          <Resumo titulo="Clientes do Ano" valor={clientesFiltrados.length} />
          <Resumo titulo="Produtos" valor={produtos.length} />
          <Resumo titulo="Fornecedores" valor={fornecedores.length} />
        </div>

        {/* GRÁFICOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card titulo="Vendas por Status">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={vendasPorStatus} dataKey="value" label>
                  <Cell fill={theme.success} />
                  <Cell fill={theme.danger} />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card titulo="Top 5 Clientes">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topClientes}>
                <XAxis dataKey="cliente" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill={theme.secondary} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card titulo="Vendas Mensais & Acumuladas">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={vendasAcumuladas}>
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Line dataKey="total" stroke={theme.primary} />
              <Line dataKey="acumulado" stroke={theme.secondary} strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </MainEmpresa>
  );
}

/* ================= COMPONENTES ================= */

function Resumo({ titulo, valor }: ResumoProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow border-l-4 border-[#123859]">
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className="text-2xl font-bold text-[#123859]">
        {valor}
      </p>
    </div>
  );
}

function Card({ titulo, children }: CardProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h2 className="text-lg font-bold text-[#123859] mb-3">
        {titulo}
      </h2>
      {children}
    </div>
  );
}
