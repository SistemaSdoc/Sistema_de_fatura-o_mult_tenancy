"use client";
import React, { useState } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import { Plus, Trash2, Edit, CheckCircle } from "lucide-react";

const produtosMock = [
    { id: 1, nome: "Produto A", preco: 5000, stock: 20 },
    { id: 2, nome: "Produto B", preco: 7500, stock: 10 },
];

export default function NovaVendaPage() {
    const [cliente, setCliente] = useState("");
    const [tipoVenda, setTipoVenda] = useState("");
    const [metodoPagamento, setMetodoPagamento] = useState("");
    const [itens, setItens] = useState<any[]>([]);
    const [vendas, setVendas] = useState<any[]>([]);
    const [mostrarFinalizar, setMostrarFinalizar] = useState(false);
    const [vendaEditando, setVendaEditando] = useState<any>(null);

    /* ================= ITENS ================= */

    const adicionarItem = () => {
        setItens([
            ...itens,
            { produto_id: "", quantidade: 1, preco: 0, subtotal: 0, stock: 0 },
        ]);
    };

    const atualizarItem = (index: number, campo: string, valor: any) => {
        const novosItens = [...itens];
        novosItens[index][campo] = valor;

        if (campo === "produto_id") {
            const produto = produtosMock.find(p => p.id == valor);
            novosItens[index].preco = produto?.preco || 0;
            novosItens[index].stock = produto?.stock || 0;
        }

        novosItens[index].subtotal =
            novosItens[index].quantidade * novosItens[index].preco;

        setItens(novosItens);
    };

    const removerItem = (index: number) => {
        setItens(itens.filter((_, i) => i !== index));
    };

    const totalVenda = itens.reduce((acc, item) => acc + item.subtotal, 0);

    /* ================= VENDAS ================= */

    const adicionarVenda = () => {
        if (!cliente || !tipoVenda || !metodoPagamento || itens.length === 0) return;

        setVendas([
            ...vendas,
            {
                id: Date.now(),
                cliente,
                itens,
                tipoVenda,
                metodoPagamento,
                total: totalVenda,
                status: "pendente",
            },
        ]);

        // limpar formulário
        setCliente("");
        setTipoVenda("");
        setMetodoPagamento("");
        setItens([]);
        setMostrarFinalizar(true);
    };

    const editarVenda = (venda: any) => {
        setVendaEditando(venda);
        setCliente(venda.cliente);
        setItens(venda.itens);
        setMetodoPagamento(venda.metodoPagamento);
        setTipoVenda(venda.tipoVenda);
        setMostrarFinalizar(true);
    };

    const finalizarVenda = () => {
        setVendas(vendas.map(v =>
            v.id === vendaEditando?.id
                ? { ...v, status: "finalizada" }
                : v
        ));

        setVendaEditando(null);
        setMostrarFinalizar(false);
        setCliente("");
        setItens([]);
        setMetodoPagamento("");
        setTipoVenda("");
    };

    return (
        <MainEmpresa>
            <div className="p-6 space-y-6">
                <h1 className="text-2xl font-bold text-[#123859]">Nova Venda</h1>

                {/* Cliente */}
                <div className="bg-white p-4 rounded-xl shadow">
                    <label className="font-semibold">Cliente</label>
                    <input
                        value={cliente}
                        onChange={e => setCliente(e.target.value)}
                        className="w-full border p-2 rounded mt-2"
                        placeholder="Nome do cliente"
                    />
                </div>

                {/* Itens */}
                <div className="bg-white p-4 rounded-xl shadow space-y-4">
                    <div className="flex justify-between">
                        <h2 className="font-semibold">Itens da Venda</h2>
                        <button
                            onClick={adicionarItem}
                            className="flex gap-2 bg-[#123859] text-white px-3 py-1 rounded"
                        >
                            <Plus size={16} /> Adicionar
                        </button>
                    </div>

                    {itens.map((item, index) => (
                        <div key={index} className="grid grid-cols-6 gap-2">
                            <select
                                className="border p-2 rounded"
                                onChange={e => atualizarItem(index, "produto_id", e.target.value)}
                            >
                                <option value="">Produto</option>
                                {produtosMock.map(p => (
                                    <option key={p.id} value={p.id}>{p.nome}</option>
                                ))}
                            </select>

                            <input
                                type="number"
                                value={item.quantidade}
                                onChange={e => atualizarItem(index, "quantidade", Number(e.target.value))}
                                className="border p-2 rounded"
                            />

                            <input disabled value={item.preco} className="border p-2 rounded bg-gray-100" />
                            <input disabled value={item.stock} className="border p-2 rounded bg-gray-100" />
                            <input disabled value={item.subtotal} className="border p-2 rounded bg-gray-100" />

                            <button onClick={() => removerItem(index)} className="text-red-600">
                                <Trash2 />
                            </button>
                        </div>
                    ))}
                </div>
                {/* Pagamento + Tipo de Venda */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Método de Pagamento */}
                    <div className="bg-white p-4 rounded-xl shadow">
                        <label className="font-semibold">Método de Pagamento</label>
                        <select
                            value={metodoPagamento}
                            onChange={e => setMetodoPagamento(e.target.value)}
                            className="w-full border p-2 rounded mt-2"
                        >
                            <option value="" disabled hidden>Selecione o método de pagamento</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="transferencia">Transferência</option>
                            <option value="multicaixa">Multicaixa</option>
                        </select>
                    </div>

                    {/* Tipo de Venda */}
                    <div className="bg-white p-4 rounded-xl shadow">
                        <label className="font-semibold">Tipo de Venda</label>
                        <select
                            value={tipoVenda}
                            onChange={e => setTipoVenda(e.target.value)}
                            className="w-full border p-2 rounded mt-2"
                        >
                            <option value="" disabled hidden>Selecione o tipo de venda</option>
                            <option value="pendente">Venda Pendente</option>
                            <option value="paga">Venda Paga</option>
                        </select>
                    </div>
                </div>

                {/* Total */}
                <div className="bg-white p-4 rounded-xl shadow flex justify-between">
                    <strong>Total</strong>
                    <span className="text-[#F9941F] font-bold">
                        {totalVenda.toLocaleString()} Kz
                    </span>
                </div>

                {/* Adicionar */}
                <button
                    onClick={adicionarVenda}
                    className="w-full bg-[#F9941F] text-white py-3 rounded-xl font-semibold"
                >
                    Adicionar Venda
                </button>

                {/* Finalizar */}
                {mostrarFinalizar && (
                    <button
                        onClick={finalizarVenda}
                        className="w-full bg-green-600 text-white py-3 rounded-xl flex justify-center gap-2"
                    >
                        <CheckCircle /> Finalizar Venda
                    </button>
                )}

                {/* Vendas Pendentes */}
                {vendas.length > 0 && (
                    <div className="bg-white p-4 rounded-xl shadow">
                        <h2 className="font-semibold mb-3">Vendas Pendentes</h2>

                        {vendas.map(v => (
                            <div key={v.id} className="flex justify-between border p-3 rounded mb-2">
                                <div>
                                    <p><strong>Cliente:</strong> {v.cliente}</p>
                                    <p><strong>Total:</strong> {v.total.toLocaleString()} Kz</p>
                                    <p><strong>Status:</strong> {v.status}</p>
                                </div>
                                <button onClick={() => editarVenda(v)} className="text-[#F9941F]">
                                    <Edit />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </MainEmpresa>
    );
}
