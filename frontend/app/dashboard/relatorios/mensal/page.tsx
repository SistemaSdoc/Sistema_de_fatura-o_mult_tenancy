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
import * as XLSX from "xlsx";
import api from "axios";

/* ================= TIPAGENS ================= */

interface Venda {
  id: number;
  cliente: string;
  data: string; // yyyy-mm-dd
  total: number;
  tipo: "paga" | "pendente";
}

interface Cliente {
  id: number;
  nome: string;
  dataCadastro: string;
}

interface ProdutoServico {
  id: number;
  nome: string;
  preco: number;
}

interface Fornecedor {
  id: number;
  nome: string;
  status: "Ativo" | "Inativo";
}

/* ================= TEMA ================= */

const theme = {
  primary: "#123859",
  secondary: "#F9941F",
  success: "#22c55e",
  danger: "#ef4444",
};

/* ================= PAGE ================= */

export default function RelatorioMensalPage() {
  const [mes, setMes] = useState("2026-01");

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<ProdutoServico[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

  /* ================= LOAD ================= */

  useEffect(() => {
    async function carregar() {
      const [v, c, p, f] = await Promise.all([
        api.get<Venda[]>("/vendas"),
        api.get<Cliente[]>("/clientes"),
        api.get<ProdutoServico[]>("/produtos"),
        api.get<Fornecedor[]>("/fornecedores"),
      ]);

      setVendas(v.data);
      setClientes(c.data);
      setProdutos(p.data);
      setFornecedores(f.data);
    }

    carregar();
  }, []);

  /* ================= FILTROS ================= */

  const vendasFiltradas = useMemo(
    () => vendas.filter(v => v.data.startsWith(mes)),
    [vendas, mes]
  );

  const clientesFiltrados = useMemo(
    () => clientes.filter(c => c.dataCadastro.startsWith(mes)),
    [clientes, mes]
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
      name: "Pagas",
      value: vendasFiltradas.filter(v => v.tipo === "paga").length,
    },
    {
      name: "Pendentes",
      value: vendasFiltradas.filter(v => v.tipo === "pendente").length,
    },
  ];

  /* ================= TOP CLIENTES ================= */

  const topClientes = useMemo(() => {
    const mapa: Record<string, number> = {};

    vendasFiltradas.forEach(v => {
      mapa[v.cliente] = (mapa[v.cliente] || 0) + v.total;
    });

    return Object.entries(mapa)
      .map(([cliente, total]) => ({ cliente, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [vendasFiltradas]);

  /* ================= TENDÊNCIA DIÁRIA ================= */

  const vendasPorDia = useMemo(() => {
    const mapa: Record<string, number> = {};

    vendasFiltradas.forEach(v => {
      const dia = v.data.slice(8, 10);
      mapa[dia] = (mapa[dia] || 0) + v.total;
    });

    return Object.entries(mapa).map(([dia, total]) => ({
      dia,
      total,
    }));
  }, [vendasFiltradas]);

  /* ================= EXPORT ================= */

  const exportToExcel = () => {
    const dados = vendasFiltradas.map(v => ({
      ID: v.id,
      Cliente: v.cliente,
      Data: v.data,
      Total: v.total,
      Status: v.tipo,
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas Mensais");
    XLSX.writeFile(wb, `Relatorio_Mensal_${mes}.xlsx`);
  };

  /* ================= JSX ================= */

  return (
    <MainEmpresa>
      <div className="p-6 space-y-8">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#123859]">
            Relatório Mensal de Gestão
          </h1>

          <div className="flex gap-3 items-end">
           <label htmlFor="mes">Mes</label>
            <input
            name="mes"
            id="mes"
              type="month"
              value={mes}
              onChange={e => setMes(e.target.value)}
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
          <Resumo titulo="Clientes do Mês" valor={clientesFiltrados.length} />
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

          <Card titulo="Top 5 Clientes do Mês">
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

        <Card titulo="Tendência Diária de Vendas">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={vendasPorDia}>
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip />
              <Line dataKey="total" stroke={theme.primary} strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
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
      <p className="text-2xl font-bold text-[#123859]">
        {valor}
      </p>
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
      <h2 className="text-lg font-bold text-[#123859] mb-3">
        {titulo}
      </h2>
      {children}
    </div>
  );
}
