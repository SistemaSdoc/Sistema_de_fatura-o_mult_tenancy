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
import { useThemeColors, useTheme } from "@/context/ThemeContext";

const formatKz = (v: number | string): string => {
  const num = Number(v) || 0;
  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    minimumFractionDigits: 0,
  }).format(num).replace("AOA", "Kz");
};

// Componente Skeleton com tema
const SkeletonCard = ({ colors }: { colors: any }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="p-4 rounded-xl shadow border animate-pulse"
    style={{ 
      backgroundColor: colors.card, 
      borderColor: colors.border 
    }}
  >
    <div 
      className="w-10 h-10 rounded-lg mb-3"
      style={{ backgroundColor: colors.border }}
    ></div>
    <div 
      className="h-4 rounded w-20 mb-2"
      style={{ backgroundColor: colors.border }}
    ></div>
    <div 
      className="h-6 rounded w-24"
      style={{ backgroundColor: colors.border }}
    ></div>
  </motion.div>
);

const SkeletonChart = ({ colors }: { colors: any }) => (
  <div 
    className="p-4 rounded-xl shadow border"
    style={{ 
      backgroundColor: colors.card, 
      borderColor: colors.border 
    }}
  >
    <div 
      className="h-6 rounded w-40 mb-4"
      style={{ backgroundColor: colors.border }}
    ></div>
    <div 
      className="h-[360px] rounded flex items-center justify-center"
      style={{ backgroundColor: colors.hover }}
    ></div>
  </div>
);

const SkeletonTable = ({ colors }: { colors: any }) => (
  <div 
    className="p-4 rounded-xl shadow border"
    style={{ 
      backgroundColor: colors.card, 
      borderColor: colors.border 
    }}
  >
    <div 
      className="h-6 rounded w-32 mb-4"
      style={{ backgroundColor: colors.border }}
    ></div>
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div 
          key={i} 
          className="h-8 rounded"
          style={{ backgroundColor: colors.hover }}
        ></div>
      ))}
    </div>
  </div>
);

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const colors = useThemeColors();
  const { theme } = useTheme();

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
        <div className="p-6 space-y-6" style={{ backgroundColor: colors.background }}>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ color: colors.secondary }}
            className="text-2xl font-bold"
          >
            Dashboard
          </motion.h1>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} colors={colors} />)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonChart colors={colors} />
            <SkeletonChart colors={colors} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonChart colors={colors} />
            <SkeletonChart colors={colors} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonTable colors={colors} />
            <SkeletonTable colors={colors} />
          </div>
        </div>
      </MainEmpresa>
    );
  }

  if (error || !data) {
    return (
      <MainEmpresa>
        <div className="p-6" style={{ backgroundColor: colors.background, color: '#EF4444' }}>
          Erro: {error || 'Sem dados'}
        </div>
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

  // Dados mockados para fallback
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
      <div className="p-6 space-y-6 transition-colors duration-300" style={{ backgroundColor: colors.background }}>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ color: colors.secondary }}
          className="text-2xl font-bold"
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
            <Link 
              href="/dashboard/Vendas/relatorios" 
              className="p-4 rounded-xl shadow border block hover:shadow-lg transition-all"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <DollarSign style={{ color: colors.primary }} className="mb-2" size={24} />
              <div style={{ color: colors.textSecondary }} className="text-sm">Total Faturado</div>
              <div style={{ color: colors.text }} className="text-xl font-bold">{formatKz(metricas.totalFaturado)}</div>
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Link 
              href="/dashboard/Clientes/Novo_cliente" 
              className="p-4 rounded-xl shadow border block hover:shadow-lg transition-all"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <Users style={{ color: colors.primary }} className="mb-2" size={24} />
              <div style={{ color: colors.textSecondary }} className="text-sm">Clientes Ativos</div>
              <div style={{ color: colors.text }} className="text-xl font-bold">{metricas.totalClientes}</div>
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Link 
              href="/dashboard/Faturas/relatorios" 
              className="p-4 rounded-xl shadow border block hover:shadow-lg transition-all"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <CreditCard style={{ color: colors.primary }} className="mb-2" size={24} />
              <div style={{ color: colors.textSecondary }} className="text-sm">Pendente</div>
              <div style={{ color: colors.text }} className="text-xl font-bold">{formatKz(metricas.totalPendente)}</div>
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Link 
              href="/dashboard/Produtos_servicos/Stock" 
              className="p-4 rounded-xl shadow border block hover:shadow-lg transition-all"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <Package style={{ color: colors.primary }} className="mb-2" size={24} />
              <div style={{ color: colors.textSecondary }} className="text-sm">Stock Baixo</div>
              <div style={{ color: colors.text }} className="text-xl font-bold">{metricas.produtosEmStockBaixo}</div>
            </Link>
          </motion.div>
        </motion.div>

        {/* Primeira linha - Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Produtos Mais Vendidos */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 rounded-xl shadow border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: colors.text }}>
              <Package style={{ color: colors.secondary }} /> Top Produtos Mais Vendidos
            </h2>
            <div style={{ width: '100%', height: '360px' }}>
              <ResponsiveContainer>
                <BarChart data={displayProdutos} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} 
                    stroke={theme === 'dark' ? '#404040' : '#E5E7EB'} />
                  <XAxis type="number" 
                    tick={{ fill: colors.textSecondary, fontSize: 12 }}
                    stroke={colors.border} />
                  <YAxis dataKey="nome" type="category" width={100} 
                    tick={{ fill: colors.textSecondary, fontSize: 12 }}
                    stroke={colors.border} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.text
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'quantidade') return [`${value} unidades`, 'Quantidade'];
                      return [formatKz(value), 'Valor'];
                    }}
                  />
                  <Bar dataKey="quantidade" fill={colors.secondary} radius={[0, 4, 4, 0]} barSize={20}>
                    {displayProdutos.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? colors.secondary : `${colors.secondary}${Math.max(40, 90 - index * 15)}`} />
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
            className="p-4 rounded-xl shadow border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: colors.text }}>
              <TrendingUp style={{ color: colors.secondary }} /> Evolução Mensal
            </h2>
            <div style={{ width: '100%', height: '360px' }}>
              <ResponsiveContainer>
                <AreaChart data={displayEvolucao}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" 
                    stroke={theme === 'dark' ? '#404040' : '#12385920'} 
                    vertical={false} />
                  <XAxis dataKey="mes" 
                    tick={{ fill: colors.textSecondary, fontSize: 12 }}
                    stroke={colors.border} />
                  <YAxis tickFormatter={(v) => `${(v / 1000)}k`} width={60}
                    tick={{ fill: colors.textSecondary, fontSize: 12 }}
                    stroke={colors.border} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.text
                    }}
                    formatter={(v) => formatKz(Number(v))} />
                  <Area type="monotone" dataKey="total" stroke={colors.primary} fill="url(#colorTotal)" strokeWidth={2} />
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
            className="p-4 rounded-xl shadow border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: colors.text }}>
              <Receipt style={{ color: colors.secondary }} /> Documentos por Tipo
            </h2>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer>
                <BarChart data={displayDocumentosTipo} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#404040' : '#E5E7EB'} />
                  <XAxis dataKey="nome" 
                    tick={{ fill: colors.textSecondary, fontSize: 11 }}
                    stroke={colors.border} />
                  <YAxis yAxisId="left" orientation="left" 
                    stroke={colors.primary}
                    tick={{ fill: colors.textSecondary }} />
                  <YAxis yAxisId="right" orientation="right" 
                    stroke={colors.secondary}
                    tick={{ fill: colors.textSecondary }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.text
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'quantidade') return [value, 'Quantidade'];
                      return [formatKz(value), 'Valor'];
                    }}
                  />
                  <Bar yAxisId="left" dataKey="quantidade" fill={colors.primary} name="Quantidade" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="valor" fill={colors.secondary} name="Valor" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Documentos por Estado */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl shadow border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: colors.text }}>
              <FileText style={{ color: colors.secondary }} /> Documentos por Estado
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
                      <Cell key={i} fill={i === 0 ? colors.primary : i === 1 ? colors.secondary : '#95a5a6'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.text
                    }}
                    formatter={(value) => [`${value} documentos`, 'Quantidade']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda adicional */}
            <div className="flex justify-center gap-4 mt-4 pt-4 border-t" 
              style={{ borderColor: colors.border }}>
              {displayDocumentosEstado.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{
                    backgroundColor: i === 0 ? colors.primary : i === 1 ? colors.secondary : '#95a5a6'
                  }} />
                  <span style={{ color: colors.textSecondary }} className="text-xs">{item.estado}: {item.quantidade}</span>
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
            className="p-4 rounded-xl shadow border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>Últimas Vendas</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: colors.border }}>
                  <th className="text-left p-2" style={{ color: colors.textSecondary }}>Cliente</th>
                  <th className="text-left p-2" style={{ color: colors.textSecondary }}>Total</th>
                  <th className="text-left p-2" style={{ color: colors.textSecondary }}>Status</th>
                  <th className="text-left p-2" style={{ color: colors.textSecondary }}>Data</th>
                </tr>
              </thead>
              <tbody>
                {data.vendas?.ultimas?.slice(0, 5).map((v: any, i: number) => (
                  <tr key={i} className="border-b transition-colors" 
                    style={{ borderColor: colors.border }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme === 'dark' ? '#333333' : '#F9FAFB';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}>
                    <td className="p-2" style={{ color: colors.text }}>{v.cliente || '-'}</td>
                    <td className="p-2" style={{ color: colors.text }}>{formatKz(v.total || 0)}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        v.status === 'faturada' 
                          ? theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'
                          : v.status === 'pendente' 
                            ? theme === 'dark' ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
                            : theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {v.status || '-'}
                      </span>
                    </td>
                    <td className="p-2" style={{ color: colors.textSecondary }}>{v.data || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Link 
              href="/dashboard/Vendas/relatorios" 
              className="block text-center mt-4 hover:underline transition-colors"
              style={{ color: colors.secondary }}
            >
              Ver mais →
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-4 rounded-xl shadow border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>Últimos Documentos</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: colors.border }}>
                  <th className="text-left p-2" style={{ color: colors.textSecondary }}>Tipo</th>
                  <th className="text-left p-2" style={{ color: colors.textSecondary }}>Nº</th>
                  <th className="text-left p-2" style={{ color: colors.textSecondary }}>Total</th>
                  <th className="text-left p-2" style={{ color: colors.textSecondary }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.documentos_fiscais?.ultimos?.slice(0, 5).map((d: any, i: number) => (
                  <tr key={i} className="border-b transition-colors"
                    style={{ borderColor: colors.border }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme === 'dark' ? '#333333' : '#F9FAFB';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}>
                    <td className="p-2" style={{ color: colors.text }}>{d.tipo_nome || '-'}</td>
                    <td className="p-2" style={{ color: colors.text }}>{d.numero || '-'}</td>
                    <td className="p-2" style={{ color: colors.text }}>{formatKz(d.total || 0)}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        d.estado === 'paga' 
                          ? theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'
                          : d.estado === 'emitido' 
                            ? theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
                            : d.estado === 'cancelado' 
                              ? theme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'
                              : d.estado === 'parcialmente_paga' 
                                ? theme === 'dark' ? 'bg-orange-900 text-orange-300' : 'bg-orange-100 text-orange-700'
                                : theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {d.estado === 'parcialmente_paga' ? 'Parcial' : d.estado || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Link 
              href="/dashboard/Faturas/Faturas" 
              className="block text-center mt-4 hover:underline transition-colors"
              style={{ color: colors.secondary }}
            >
              Ver mais →
            </Link>
          </motion.div>
        </div>
      </div>
    </MainEmpresa>
  );
}