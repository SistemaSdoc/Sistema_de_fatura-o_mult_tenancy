"use client";

import React, { useState, useEffect } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import * as XLSX from "xlsx";

interface Venda {
    id: number;
    cliente: string;
    data: string;
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
    tipo: "Produto" | "Serviço";
    preco: number;
}

interface Fornecedor {
    id: number;
    nome: string;
    status: "Ativo" | "Inativo";
}

/* MOCK DATA */
const vendasMock: Venda[] = [
    { id: 1, cliente: "Consumidor Final 1", data: "2026-01-14", total: 15000, tipo: "paga" },
    { id: 2, cliente: "Empresa XYZ", data: "2026-01-14", total: 22000, tipo: "pendente" },
    { id: 3, cliente: "Consumidor Final 2", data: "2026-01-14", total: 8000, tipo: "paga" },
    { id: 4, cliente: "Consumidor Final 1", data: "2026-01-13", total: 12000, tipo: "paga" },
];

const clientesMock: Cliente[] = [
    { id: 1, nome: "Consumidor Final 1", dataCadastro: "2026-01-14" },
    { id: 2, nome: "Consumidor Final 2", dataCadastro: "2026-01-14" },
    { id: 3, nome: "Empresa XYZ", dataCadastro: "2026-01-13" },
];

const produtosMock: ProdutoServico[] = [
    { id: 1, nome: "Produto A", tipo: "Produto", preco: 5000 },
    { id: 2, nome: "Serviço B", tipo: "Serviço", preco: 10000 },
    { id: 3, nome: "Produto C", tipo: "Produto", preco: 7000 },
];

const fornecedoresMock: Fornecedor[] = [
    { id: 1, nome: "Fornecedor A", status: "Ativo" },
    { id: 2, nome: "Fornecedor B", status: "Inativo" },
    { id: 3, nome: "Fornecedor C", status: "Ativo" },
];

const coresPie = ["#123859", "#F9941F"];

export default function RelatorioAvancadoPage() {
    const [vendas, setVendas] = useState(vendasMock);
    const [clientes, setClientes] = useState(clientesMock);
    const [produtos, setProdutos] = useState(produtosMock);
    const [fornecedores, setFornecedores] = useState(fornecedoresMock);

    const [startDate, setStartDate] = useState("2026-01-13");
    const [endDate, setEndDate] = useState("2026-01-14");

    const [vendasFiltradas, setVendasFiltradas] = useState<Venda[]>([]);
    const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);

    useEffect(() => {
        setVendasFiltradas(
            vendas.filter(v => v.data >= startDate && v.data <= endDate)
        );
        setClientesFiltrados(
            clientes.filter(c => c.dataCadastro >= startDate && c.dataCadastro <= endDate)
        );
    }, [startDate, endDate, vendas, clientes]);

    const totalVendas = vendasFiltradas.reduce((sum, v) => sum + v.total, 0);

    const vendasPorStatus = [
        { name: "Pagas", value: vendasFiltradas.filter(v => v.tipo === "paga").length },
        { name: "Pendentes", value: vendasFiltradas.filter(v => v.tipo === "pendente").length },
    ];

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(vendasFiltradas);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Vendas");
        XLSX.writeFile(wb, "Relatorio.xlsx");
    };

    const exportToPDF = () => {
        alert("Exportar PDF: você pode integrar com jsPDF ou html2pdf!");
    };

    return (
        <MainEmpresa>
            <div className="p-6 space-y-6">
                <h1 className="text-2xl font-bold text-[#123859]">Relatório Avançado</h1>

                {/* Filtro por datas */}
                <div className="flex gap-4 items-end mt-4">
                    <div>
                        <label className="block font-semibold">Data Início</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="border rounded px-2 py-1"
                        />
                    </div>
                    <div>
                        <label className="block font-semibold">Data Fim</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="border rounded px-2 py-1"
                        />
                    </div>
                    <button
                        onClick={exportToExcel}
                        className="bg-[#123859] text-white px-4 py-2 rounded hover:bg-[#0f2c4c]"
                    >
                        Exportar Excel
                    </button>
                    <button
                        onClick={exportToPDF}
                        className="bg-[#F9941F] text-white px-4 py-2 rounded hover:bg-[#d87e17]"
                    >
                        Exportar PDF
                    </button>
                </div>

                {/* Resumos */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
                    <div className="bg-white p-4 rounded-xl shadow flex flex-col items-center">
                        <p className="text-sm text-gray-500">Total Vendas (Kz)</p>
                        <p className="text-xl font-bold">{totalVendas.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow flex flex-col items-center">
                        <p className="text-sm text-gray-500">Clientes Filtrados</p>
                        <p className="text-xl font-bold">{clientesFiltrados.length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow flex flex-col items-center">
                        <p className="text-sm text-gray-500">Total Clientes</p>
                        <p className="text-xl font-bold">{clientes.length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow flex flex-col items-center">
                        <p className="text-sm text-gray-500">Produtos/Serviços</p>
                        <p className="text-xl font-bold">{produtos.length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow flex flex-col items-center">
                        <p className="text-sm text-gray-500">Fornecedores</p>
                        <p className="text-xl font-bold">{fornecedores.length}</p>
                    </div>
                </div>

                {/* Gráficos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="bg-white p-4 rounded-xl shadow">
                        <h2 className="text-lg font-bold text-[#123859] mb-2">Vendas por Status</h2>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={vendasPorStatus}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label
                                >
                                    {vendasPorStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={coresPie[index % coresPie.length]} />
                                    ))}
                                </Pie>
                                <Legend />
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow">
                        <h2 className="text-lg font-bold text-[#123859] mb-2">Vendas por Cliente</h2>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={vendasFiltradas}>
                                <XAxis dataKey="cliente" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="total" fill="#F9941F" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow mt-6">
                    <h2 className="text-lg font-bold text-[#123859] mb-2">Tendência de Vendas</h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={vendasFiltradas}>
                            <XAxis dataKey="data" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="total" stroke="#123859" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Tabelas detalhadas */}
                <div className="space-y-6 mt-6">
                    {/* Vendas */}
                    <div className="bg-white p-4 rounded-xl shadow overflow-x-auto">
                        <h2 className="text-lg font-bold text-[#123859] mb-2">Vendas</h2>
                        <table className="w-full text-sm">
                            <thead className="bg-[#123859] text-white">
                                <tr>
                                    <th className="p-2 text-left">ID</th>
                                    <th className="p-2 text-left">Cliente</th>
                                    <th className="p-2 text-left">Data</th>
                                    <th className="p-2 text-left">Total (Kz)</th>
                                    <th className="p-2 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vendasFiltradas.map(v => (
                                    <tr key={v.id} className="border-b">
                                        <td className="p-2">{v.id}</td>
                                        <td className="p-2">{v.cliente}</td>
                                        <td className="p-2">{v.data}</td>
                                        <td className="p-2">{v.total.toLocaleString()}</td>
                                        <td className="p-2">{v.tipo}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Clientes */}
                    <div className="bg-white p-4 rounded-xl shadow overflow-x-auto">
                        <h2 className="text-lg font-bold text-[#123859] mb-2">Clientes</h2>
                        <table className="w-full text-sm">
                            <thead className="bg-[#123859] text-white">
                                <tr>
                                    <th className="p-2 text-left">ID</th>
                                    <th className="p-2 text-left">Nome</th>
                                    <th className="p-2 text-left">Data Cadastro</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientesFiltrados.map(c => (
                                    <tr key={c.id} className="border-b">
                                        <td className="p-2">{c.id}</td>
                                        <td className="p-2">{c.nome}</td>
                                        <td className="p-2">{c.dataCadastro}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Produtos/Serviços */}
                    <div className="bg-white p-4 rounded-xl shadow overflow-x-auto">
                        <h2 className="text-lg font-bold text-[#123859] mb-2">Produtos/Serviços</h2>
                        <table className="w-full text-sm">
                            <thead className="bg-[#123859] text-white">
                                <tr>
                                    <th className="p-2 text-left">ID</th>
                                    <th className="p-2 text-left">Nome</th>
                                    <th className="p-2 text-left">Tipo</th>
                                    <th className="p-2 text-left">Preço (Kz)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {produtos.map(p => (
                                    <tr key={p.id} className="border-b">
                                        <td className="p-2">{p.id}</td>
                                        <td className="p-2">{p.nome}</td>
                                        <td className="p-2">{p.tipo}</td>
                                        <td className="p-2">{p.preco.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Fornecedores */}
                    <div className="bg-white p-4 rounded-xl shadow overflow-x-auto">
                        <h2 className="text-lg font-bold text-[#123859] mb-2">Fornecedores</h2>
                        <table className="w-full text-sm">
                            <thead className="bg-[#123859] text-white">
                                <tr>
                                    <th className="p-2 text-left">ID</th>
                                    <th className="p-2 text-left">Nome</th>
                                    <th className="p-2 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fornecedores.map(f => (
                                    <tr key={f.id} className="border-b">
                                        <td className="p-2">{f.id}</td>
                                        <td className="p-2">{f.nome}</td>
                                        <td className="p-2">{f.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </MainEmpresa>
    );
}
