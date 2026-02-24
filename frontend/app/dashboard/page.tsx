'use client';

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area, CartesianGrid,
  PieChart, Pie, Cell
} from "recharts";
import {
  TrendingUp, Users,
  CreditCard, DollarSign, Package, Receipt,
  FileText
} from "lucide-react";
import Link from "next/link";

import MainEmpresa from "@/app/components/MainEmpresa";
import { dashboardService } from "@/services/Dashboard";

const COLORS = {
  primary: "#123859",
  secondary: "#F9941F",
};

const formatKz = (v: number | string): string => {
  const num = Number(v) || 0;
  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    minimumFractionDigits: 0,
  }).format(num).replace("AOA", "Kz");
};

// Componente Skeleton
const SkeletonCard = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="bg-white p-4 rounded-xl shadow border animate-pulse"
  >
    <div className="w-10 h-10 bg-gray-200 rounded-lg mb-3"></div>
    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
    <div className="h-6 bg-gray-200 rounded w-24"></div>
  </motion.div>
);

const SkeletonChart = () => (
  <div className="bg-white p-4 rounded-xl shadow border">
    <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
    <div className="h-[360px] bg-gray-100 rounded flex items-center justify-center"></div>
  </div>
);

const SkeletonTable = () => (
  <div className="bg-white p-4 rounded-xl shadow border">
    <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
    <div className="space-y-3">
      <div className="h-8 bg-gray-100 rounded"></div>
      <div className="h-8 bg-gray-100 rounded"></div>
      <div className="h-8 bg-gray-100 rounded"></div>
      <div className="h-8 bg-gray-100 rounded"></div>
      <div className="h-8 bg-gray-100 rounded"></div>
    </div>
  </div>
);

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await dashboardService.fetch();
        console.log('Dados recebidos:', response);
        setData(response);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <MainEmpresa>
        <div className="p-6 space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-[#F9941F]"
          >
            Dashboard
          </motion.h1>

          {/* Skeleton Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>

          {/* Skeleton Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonChart />
            <SkeletonChart />
          </div>

          {/* Skeleton Second Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonChart />
            <SkeletonChart />
          </div>

          {/* Skeleton Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonTable />
            <SkeletonTable />
          </div>
        </div>
      </MainEmpresa>
    );
  }

  if (error || !data) {
    return (
      <MainEmpresa>
        <div className="p-6 text-red-500">Erro: {error || 'Sem dados'}</div>
      </MainEmpresa>
    );
  }

  // Preparar dados usando os métodos do service
  const metricas = dashboardService.calcularMetricas(data);
  const graficos = dashboardService.prepararDadosGraficos(data);

  // Dados para o gráfico de produtos mais vendidos
  const produtosData = data.indicadores?.produtosMaisVendidos?.slice(0, 5).map((p: any) => ({
    nome: p.produto?.substring(0, 15) || 'Produto',
    quantidade: p.quantidade || 0,
    valor: p.valor_total || 0
  })) || [];

  // Dados para o gráfico de evolução mensal
  const evolucaoData = graficos.evolucaoMensal.map((item: any) => ({
    mes: item.mes,
    total: item.Total || 0
  })) || [];

  // Dados para documentos por tipo
  const documentosPorTipo = graficos.documentosPorTipo.map(item => ({
    nome: item.nome,
    quantidade: item.quantidade,
    valor: item.valor
  }));

  // Dados para documentos por estado
  const documentosPorEstado = graficos.documentosPorEstado.reduce((acc: any, item) => {
    const estado = item.estado;
    if (!acc[estado]) {
      acc[estado] = {
        estado: estado === 'paga' ? 'Pago' :
          estado === 'emitido' ? 'Emitido' :
            estado === 'cancelado' ? 'Cancelado' :
              estado === 'parcialmente_paga' ? 'Parcial' :
                estado,
        quantidade: 0
      };
    }
    acc[estado].quantidade += item.quantidade;
    return acc;
  }, {});

  const documentosEstadoData = Object.values(documentosPorEstado);

  // Dados mockados para fallback (usando o service)
  const mockProdutos = [
    { nome: 'Produto A', quantidade: 50 },
    { nome: 'Produto B', quantidade: 30 },
    { nome: 'Produto C', quantidade: 20 },
  ];

  const mockEvolucao = [
    { mes: 'Jan', total: 100000 },
    { mes: 'Fev', total: 150000 },
    { mes: 'Mar', total: 120000 },
  ];

  const mockDocumentosTipo = [
    { nome: 'Faturas', quantidade: 45, valor: 450000 },
    { nome: 'Faturas-Recibo', quantidade: 30, valor: 300000 },
    { nome: 'Notas de Crédito', quantidade: 5, valor: 50000 },
  ];

  const mockDocumentosEstado = [
    { estado: 'Pago', quantidade: 40 },
    { estado: 'Emitido', quantidade: 25 },
    { estado: 'Parcial', quantidade: 15 },
  ];

  const displayProdutos = produtosData.length ? produtosData : mockProdutos;
  const displayEvolucao = evolucaoData.length ? evolucaoData : mockEvolucao;
  const displayDocumentosTipo = documentosPorTipo.length ? documentosPorTipo : mockDocumentosTipo;
  const displayDocumentosEstado = documentosEstadoData.length ? documentosEstadoData : mockDocumentosEstado;

  return (
    <MainEmpresa>
      <div className="p-6 space-y-6">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-[#F9941F]"
        >
          Dashboard
        </motion.h1>

        {/* Cards KPI com hover animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Link href="/dashboard/Vendas/relatorios" className="bg-white p-4 rounded-xl shadow border block hover:shadow-lg transition-shadow">
              <DollarSign className="text-[#123859] mb-2" size={24} />
              <div className="text-sm text-gray-500">Total Faturado</div>
              <div className="text-xl font-bold">{formatKz(metricas.totalFaturado)}</div>
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Link href="/dashboard/Clientes/Novo_cliente" className="bg-white p-4 rounded-xl shadow border block hover:shadow-lg transition-shadow">
              <Users className="text-[#123859] mb-2" size={24} />
              <div className="text-sm text-gray-500">Clientes Ativos</div>
              <div className="text-xl font-bold">{metricas.totalClientes}</div>
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Link href="/dashboard/Faturas/relatorios" className="bg-white p-4 rounded-xl shadow border block hover:shadow-lg transition-shadow">
              <CreditCard className="text-[#123859] mb-2" size={24} />
              <div className="text-sm text-gray-500">Pendente</div>
              <div className="text-xl font-bold">{formatKz(metricas.totalPendente)}</div>
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Link href="/dashboard/Produtos_servicos/Stock" className="bg-white p-4 rounded-xl shadow border block hover:shadow-lg transition-shadow">
              <Package className="text-[#123859] mb-2" size={24} />
              <div className="text-sm text-gray-500">Stock Baixo</div>
              <div className="text-xl font-bold">{metricas.produtosEmStockBaixo}</div>
            </Link>
          </motion.div>
        </motion.div>

        {/* Primeira linha - Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Produtos Mais Vendidos */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-4 rounded-xl shadow border"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Package className="text-[#F9941F]" /> Top Produtos Mais Vendidos
            </h2>
            <div style={{ width: '100%', height: '360px' }}>
              <ResponsiveContainer>
                <BarChart data={displayProdutos} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (name === 'quantidade') return [`${value} unidades`, 'Quantidade'];
                      return [formatKz(value), 'Valor'];
                    }}
                  />
                  <Bar dataKey="quantidade" fill={COLORS.secondary} radius={[0, 4, 4, 0]} barSize={20}>
                    {displayProdutos.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.secondary : `${COLORS.secondary}${Math.max(40, 90 - index * 15)}`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Evolução Mensal */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-4 rounded-xl shadow border"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="text-[#F9941F]" /> Evolução Mensal
            </h2>
            <div style={{ width: '100%', height: '360px' }}>
              <ResponsiveContainer>
                <AreaChart data={displayEvolucao}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#12385920" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000)}k`} width={60} />
                  <Tooltip formatter={(v) => formatKz(Number(v))} />
                  <Area type="monotone" dataKey="total" stroke={COLORS.primary} fill="url(#colorTotal)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Segunda linha - Documentos por Tipo e Estado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Documentos por Tipo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-4 rounded-xl shadow border"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Receipt className="text-[#F9941F]" /> Documentos por Tipo
            </h2>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer>
                <BarChart data={displayDocumentosTipo} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" orientation="left" stroke={COLORS.primary} />
                  <YAxis yAxisId="right" orientation="right" stroke={COLORS.secondary} />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (name === 'quantidade') return [value, 'Quantidade'];
                      return [formatKz(value), 'Valor'];
                    }}
                  />
                  <Bar yAxisId="left" dataKey="quantidade" fill={COLORS.primary} name="Quantidade" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="valor" fill={COLORS.secondary} name="Valor" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Documentos por Estado */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-4 rounded-xl shadow border"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="text-[#F9941F]" /> Documentos por Estado
            </h2>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={displayDocumentosEstado}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="quantidade"
                    nameKey="estado"
                    label={(entry) => `${entry.estado}: ${entry.quantidade}`}
                    labelLine={false}
                  >
                    {displayDocumentosEstado.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? COLORS.primary : i === 1 ? COLORS.secondary : '#95a5a6'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} documentos`, 'Quantidade']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda adicional */}
            <div className="flex justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
              {displayDocumentosEstado.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{
                    backgroundColor: i === 0 ? COLORS.primary : i === 1 ? COLORS.secondary : '#95a5a6'
                  }} />
                  <span className="text-xs text-gray-600">{item.estado}: {item.quantidade}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Tabelas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-4 rounded-xl shadow border"
          >
            <h2 className="text-lg font-semibold mb-4">Últimas Vendas</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Cliente</th>
                  <th className="text-left p-2">Total</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {data.vendas?.ultimas?.slice(0, 5).map((v: any, i: number) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-2">{v.cliente || '-'}</td>
                    <td className="p-2">{formatKz(v.total || 0)}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${v.status === 'faturada' ? 'bg-green-100 text-green-700' :
                        v.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100'
                        }`}>
                        {v.status || '-'}
                      </span>
                    </td>
                    <td className="p-2">{v.data || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Link href="/dashboard/Vendas/relatorios" className="block text-center mt-4 text-[#F9941F] hover:underline">
              Ver mais →
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-4 rounded-xl shadow border"
          >
            <h2 className="text-lg font-semibold mb-4">Últimos Documentos</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-left p-2">Nº</th>
                  <th className="text-left p-2">Total</th>
                  <th className="text-left p-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.documentos_fiscais?.ultimos?.slice(0, 5).map((d: any, i: number) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-2">{d.tipo_nome || '-'}</td>
                    <td className="p-2">{d.numero || '-'}</td>
                    <td className="p-2">{formatKz(d.total || 0)}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${d.estado === 'paga' ? 'bg-green-100 text-green-700' :
                        d.estado === 'emitido' ? 'bg-blue-100 text-blue-700' :
                          d.estado === 'cancelado' ? 'bg-red-100 text-red-700' :
                            d.estado === 'parcialmente_paga' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100'
                        }`}>
                        {d.estado === 'parcialmente_paga' ? 'Parcial' : d.estado || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Link href="/dashboard/Faturas/Faturas" className="block text-center mt-4 text-[#F9941F] hover:underline">
              Ver mais →
            </Link>
          </motion.div>
        </div>
      </div>
    </MainEmpresa>
  );
}