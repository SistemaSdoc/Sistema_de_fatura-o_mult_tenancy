"use client";

import React, { useState } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import { Trash2, Eye } from "lucide-react";

/* MOCK DE VENDAS */
const vendasMock = [
    {
        id: 1,
        cliente: "Consumidor Final",
        data: "2026-01-14",
        total: 15000,
        tipo: "paga",
        metodoPagamento: "dinheiro",
        itens: [
            { produto: "Produto A", quantidade: 2, preco: 5000, subtotal: 10000 },
            { produto: "Produto B", quantidade: 1, preco: 5000, subtotal: 5000 },
        ],
    },
    {
        id: 2,
        cliente: "Empresa XYZ",
        data: "2026-01-14",
        total: 22000,
        tipo: "pendente",
        metodoPagamento: "transferencia",
        itens: [
            { produto: "Produto A", quantidade: 4, preco: 5000, subtotal: 20000 },
            { produto: "Produto B", quantidade: 1, preco: 2000, subtotal: 2000 },
        ],
    },
];

export default function TodasVendasPage() {
    const [vendas, setVendas] = useState(vendasMock);
    const [filtro, setFiltro] = useState<"todas" | "paga" | "pendente">("todas");
    const [modalAberto, setModalAberto] = useState(false);
    const [vendaSelecionada, setVendaSelecionada] = useState<any>(null);

    const vendasFiltradas =
        filtro === "todas" ? vendas : vendas.filter((v) => v.tipo === filtro);

    const apagarVenda = (id: number) => {
        if (!confirm("Tem certeza que deseja apagar esta venda?")) return;
        setVendas(vendas.filter((v) => v.id !== id));
    };

    const abrirModalFatura = (venda: any) => {
        setVendaSelecionada(venda);
        setModalAberto(true);
    };

    const fecharModal = () => {
        setVendaSelecionada(null);
        setModalAberto(false);
    };

    const confirmarFatura = () => {
        alert(`Fatura da venda ${vendaSelecionada.id} confirmada!`);
        fecharModal();
        // Integração real de fatura aqui
    };

    const gerarNumeroFatura = (id: number) => {
        return `FAT-${new Date().getFullYear()}-${id.toString().padStart(5, "0")}`;
    };

    const imprimirFatura = () => {
        window.print();
    };

    return (
        <MainEmpresa>
            {/* Estilo para ocultar botões na impressão */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #fatura, #fatura * {
                        visibility: visible;
                    }
                    #fatura {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}</style>

            <div className="p-6 space-y-6">
                <h1 className="text-2xl font-bold text-[#123859]">Todas as Vendas</h1>

                {/* Filtro */}
                <div className="flex gap-3">
                    {["todas", "paga", "pendente"].map((tipo) => (
                        <button
                            key={tipo}
                            onClick={() => setFiltro(tipo as any)}
                            className={`px-4 py-2 rounded-lg font-semibold ${filtro === tipo ? "bg-[#123859] text-white" : "bg-white border"
                                }`}
                        >
                            {tipo === "todas" && "Todas"}
                            {tipo === "paga" && "Pagas"}
                            {tipo === "pendente" && "Pendentes"}
                        </button>
                    ))}
                </div>

                {/* Tabela */}
                <div className="bg-white rounded-xl shadow overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#123859] text-white">
                            <tr>
                                <th className="p-3 text-left">ID</th>
                                <th className="p-3 text-left">Cliente</th>
                                <th className="p-3 text-left">Data</th>
                                <th className="p-3 text-left">Total</th>
                                <th className="p-3 text-left">Pagamento</th>
                                <th className="p-3 text-left">Estado</th>
                                <th className="p-3 text-left">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vendasFiltradas.map((venda) => (
                                <tr key={venda.id} className="border-b">
                                    <td className="p-3">{venda.id}</td>
                                    <td className="p-3">{venda.cliente}</td>
                                    <td className="p-3">{venda.data}</td>
                                    <td className="p-3">{venda.total.toLocaleString()} Kz</td>
                                    <td className="p-3">{venda.metodoPagamento}</td>
                                    <td className="p-3">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-semibold ${venda.tipo === "paga"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-yellow-100 text-yellow-700"
                                                }`}
                                        >
                                            {venda.tipo}
                                        </span>
                                    </td>
                                    <td className="p-3 flex gap-2">
                                        <button
                                            className="bg-[#F9941F] text-white px-3 py-1 rounded text-xs font-semibold"
                                            onClick={() => abrirModalFatura(venda)}
                                        >
                                            Gerar Fatura
                                        </button>
                                        <button className="text-green-600">
                                            <Eye />
                                        </button>
                                        <button
                                            className="text-red-600"
                                            onClick={() => apagarVenda(venda.id)}
                                        >
                                            <Trash2 />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {vendasFiltradas.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-4 text-center text-gray-500">
                                        Nenhuma venda encontrada
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Fatura */}
            {modalAberto && vendaSelecionada && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl w-11/12 md:w-2/3 p-6 space-y-4 relative shadow-xl">
                        {/* Cabeçalho */}
                        <div id="fatura">
                            <div className="flex justify-between items-center border-b pb-4 mb-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-[#123859]">Minha Empresa</h1>
                                    <p className="text-gray-500 text-sm">Endereço da Empresa</p>
                                    <p className="text-gray-500 text-sm">Telefone: +244 900 000 000</p>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-xl font-semibold text-[#F9941F]">Fatura</h2>
                                    <p><strong>Nº:</strong> FAT-{new Date().getFullYear()}-{vendaSelecionada.id.toString().padStart(5, "0")}</p>
                                    <p><strong>Data:</strong> {new Date().toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Cliente e Pagamento */}
                            <div className="flex justify-between mb-4">
                                <div>
                                    <p><strong>Cliente:</strong> {vendaSelecionada.cliente}</p>
                                    <p><strong>Estado:</strong> {vendaSelecionada.tipo}</p>
                                </div>
                                <div>
                                    <p><strong>Método de Pagamento:</strong> {vendaSelecionada.metodoPagamento}</p>
                                </div>
                            </div>

                            {/* Tabela de Itens */}
                            <div className="overflow-x-auto border rounded">
                                <table className="w-full text-sm border-collapse">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-2 border-b">Produto</th>
                                            <th className="p-2 border-b">Quantidade</th>
                                            <th className="p-2 border-b">Preço Unit.</th>
                                            <th className="p-2 border-b">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vendaSelecionada.itens.map((item: any, idx: number) => (
                                            <tr key={idx} className="border-b">
                                                <td className="p-2">{item.produto}</td>
                                                <td className="p-2">{item.quantidade}</td>
                                                <td className="p-2">{item.preco.toLocaleString()} Kz</td>
                                                <td className="p-2">{item.subtotal.toLocaleString()} Kz</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Total */}
                            <div className="flex justify-end mt-4">
                                <p className="text-lg font-bold">
                                    Total: {vendaSelecionada.total.toLocaleString()} Kz
                                </p>
                            </div>

                            {/* Rodapé */}
                            <div className="border-t mt-6 pt-4 text-center text-gray-500 text-sm">
                                Obrigado pela preferência! Esta fatura serve como comprovante de pagamento.
                            </div>
                        </div>

                        {/* Botões */}
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
                                onClick={fecharModal}
                            >
                                Cancelar
                            </button>
                            <button
                                className="bg-[#123859] text-white px-4 py-2 rounded"
                                onClick={() => { confirmarFatura(); imprimirFatura(); }}
                            >
                                Confirmar & Imprimir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainEmpresa>
    );
}
