'use client';

import React, { useState, useEffect } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import { BarChart2, Calendar, TrendingUp, DollarSign, LucideIcon } from "lucide-react";
import { Fatura, Venda, listarFaturas } from "@/services/vendas";
import api from "@/services/axios";

/* Filtros disponíveis */
type FiltroRelatorio = "diario" | "mensal" | "anual";

export default function RelatoriosFaturasPage() {
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [filtro, setFiltro] = useState<FiltroRelatorio>("diario");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        await api.get("/sanctum/csrf-cookie");

        const data = await listarFaturas();

        // Garante cliente e data
const dataSegura = data.map(f => ({
  ...f,
  // Garante que sempre exista uma data
  data: f.data || new Date().toISOString(),
  // Garante que cliente sempre tenha valores, mesmo se venda ou cliente estiver undefined
  cliente: f.venda?.cliente ?? { id: "desconhecido", nome: "—", nif: "—" },
}));


        console.log("[FATURA] Todas as faturas carregadas:", dataSegura);
        setFaturas(dataSegura);
      } catch (err) {
        console.error("[FATURA] Erro ao carregar faturas:", err);
        setFaturas([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const hoje = new Date().toISOString().slice(0, 10);
  const mesAtual = hoje.slice(0, 7);
  const anoAtual = hoje.slice(0, 4);

  const faturasFiltradas = faturas.filter(f => {
    if (!f.data) return false;

    if (filtro === "diario") return f.data.startsWith(hoje);
    if (filtro === "mensal") return f.data.startsWith(mesAtual);
    if (filtro === "anual") return f.data.startsWith(anoAtual);

    return false;
  });

  console.log("[FILTRO] Filtro atual:", filtro);
  console.log("[FATURAS] Faturas filtradas:", faturasFiltradas);
  

  // Usando f.total e convertendo para número
  const totalFaturado = faturasFiltradas.reduce((acc, f) => acc + parseFloat(f.total), 0);
  const faturasEmitidas = faturasFiltradas.filter(f => f.status === "emitida").length;
  const faturasCanceladas = faturasFiltradas.filter(f => f.status === "cancelada").length;

  if (loading) return <p className="text-center mt-10 text-gray-600">Carregando faturas...</p>;

  return (
    <MainEmpresa>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-[#123859]">Relatórios de Faturas</h1>

        {/* Filtros */}
        <div className="flex gap-3">
          {["diario", "mensal", "anual"].map(tipo => (
            <button
              key={tipo}
              onClick={() => setFiltro(tipo as FiltroRelatorio)}
              className={`px-4 py-2 rounded-lg font-semibold ${
                filtro === tipo ? "bg-[#123859] text-white" : "bg-white border"
              }`}
            >
              {tipo === "diario" && "Diário"}
              {tipo === "mensal" && "Mensal"}
              {tipo === "anual" && "Anual"}
            </button>
          ))}
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <DashboardCard titulo="Total Faturado" valor={`${totalFaturado.toLocaleString()} Kz`} icon={DollarSign} />
          <DashboardCard titulo="Nº de Faturas" valor={faturasFiltradas.length} icon={BarChart2} />
          <DashboardCard titulo="Emitidas" valor={faturasEmitidas} icon={TrendingUp} />
          <DashboardCard titulo="Canceladas" valor={faturasCanceladas} icon={Calendar} />
        </div>

        {/* Tabela de faturas */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#123859] text-white">
              <tr>
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">Cliente</th>
                <th className="p-3 text-left">Data</th>
                <th className="p-3 text-left">Valor</th>
                <th className="p-3 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {faturasFiltradas.map(fatura => (
                <tr key={fatura.id} className="border-b">
                  <td className="p-3">{fatura.id}</td>
                  <td className="p-3">{fatura.venda?.cliente?.nome ?? "Cliente não informado"}</td>
                  <td className="p-3">{new Date(fatura.data).toLocaleDateString("pt-AO")}</td>
                  <td className="p-3">{parseFloat(fatura.total).toLocaleString()} Kz</td>
                  <td className="p-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      fatura.status === "emitida" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {fatura.status}
                    </span>
                  </td>
                </tr>
              ))}
              {faturasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    Nenhuma fatura encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainEmpresa>
  );
}

/* Card do dashboard */
type DashboardCardProps = {
  titulo: string;
  valor: string | number;
  icon: LucideIcon;
};

function DashboardCard({ titulo, valor, icon: Icon }: DashboardCardProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow flex items-center gap-4">
      <div className="p-3 rounded-lg bg-[#123859]/10 text-[#123859]">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{titulo}</p>
        <p className="text-xl font-bold">{valor}</p>
      </div>
    </div>
  );
}
