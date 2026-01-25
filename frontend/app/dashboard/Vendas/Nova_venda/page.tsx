
'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/authprovider";
import MainEmpresa from "../../../components/MainEmpresa";
import { Plus, Trash2 } from "lucide-react";
import {
  criarVenda,
  ItemVenda,
  Venda,
  ProdutoVenda,
  Cliente,
  obterDadosNovaVenda,
} from "@/services/vendas";
import api from "@/services/axios";

/* ================== TIPOS LOCAIS ================== */

export default function NovaVendaPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  /* ================= STATES ================= */
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<ProdutoVenda[]>([]); 
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); 

  /* ================= PROTEÇÃO DE ROTA ================= */
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  /* ================= FETCH DADOS ================= */
  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      const data = await obterDadosNovaVenda();
      setClientes(data.clientes);
      setProdutos(data.produtos);
    }
    fetchData();
  }, [user]);

  /* ================= FUNÇÕES DE ITENS ================= */
  const adicionarItem = (): void => {
    setItens(prev => [
      ...prev,
      { id: crypto.randomUUID(), produto_id: "", produto_nome: "", quantidade: 1, preco_venda: 0, subtotal: 0 },
    ]);
  };

  const atualizarItem = (index: number, campo: keyof ItemVenda, valor: string | number): void => {
    setItens(prev => {
      const novosItens = [...prev];
      novosItens[index][campo] = valor as never;

      if (campo === "produto_id") {
        const produto = produtos.find(p => p.id === valor);
        if (produto) {
          novosItens[index].produto_nome = produto.nome;
          novosItens[index].preco_venda = produto.preco_venda;
          if (novosItens[index].quantidade > produto.estoque_atual) {
            novosItens[index].quantidade = produto.estoque_atual;
          }
        } else {
          novosItens[index].produto_nome = "";
          novosItens[index].preco_venda = 0;
        }
      }

      novosItens[index].subtotal = novosItens[index].quantidade * novosItens[index].preco_venda;
      return novosItens;
    });
  };

  const removerItem = (index: number): void => {
    setItens(prev => prev.filter((_, i) => i !== index));
  };

  const totalVenda = itens.reduce((acc, item) => acc + item.subtotal, 0);

  /* ================= SALVAR VENDA ================= */
  const salvarVenda = async (): Promise<void> => {
    if (!clienteSelecionado) return setError("Selecione um cliente");
    if (itens.length === 0) return setError("Adicione pelo menos um item");
    if (itens.some(i => !i.produto_id)) return setError("Selecione todos os produtos");

    for (const item of itens) {
      const produto = produtos.find(p => p.id === item.produto_id);
      if (produto && item.quantidade > produto.estoque_atual) {
        return setError(`Quantidade do produto ${produto.nome} maior que o estoque disponível`);
      }
    }

    setLoading(true);
    setError(null);
    try {
      await api.get("/sanctum/csrf-cookie");

      const payload = {
        cliente_id: clienteSelecionado.id,
        itens: itens.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade })),
      };

      const result = await criarVenda(payload);
      if (!result) return setError("Erro ao criar venda");

      setVendas(prev => [result.venda, ...prev]);
      setClienteSelecionado(null);
      setItens([]);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro desconhecido ao criar venda";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return <p className="text-center mt-10">Carregando usuário...</p>;

  /* ================= RENDER ================= */
  return (
    <MainEmpresa>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-[#123859]">Nova Venda</h1>

        {/* Banner de erro */}
        {error && (
          <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Ops!</strong>
            <span className="block sm:inline ml-2">{error}</span>
            <span
              className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer"
              onClick={() => setError(null)}
            >
              <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <title>Fechar</title>
                <path d="M14.348 5.652a1 1 0 00-1.414 0L10 8.586 7.066 5.652a1 1 0 10-1.414 1.414L8.586 10l-2.934 2.934a1 1 0 101.414 1.414L10 11.414l2.934 2.934a1 1 0 001.414-1.414L11.414 10l2.934-2.934a1 1 0 000-1.414z"/>
              </svg>
            </span>
          </div>
        )}

        {/* Cliente */}
        <div className="bg-white p-4 rounded-xl shadow space-y-2">
          <label htmlFor="cliente" className="font-semibold">Cliente</label>
          <select
            id="cliente"
            className="w-full border p-2 rounded"
            value={clienteSelecionado?.id || ""}
            onChange={e => {
              const cliente = clientes.find(c => c.id === e.target.value) || null;
              setClienteSelecionado(cliente);
            }}
          >
            <option value="">Selecione o cliente</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>
                {c.nome} {c.nif ? `(${c.nif})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Itens */}
        <div className="bg-white p-4 rounded-xl shadow space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Itens da Venda</h2>
            <button
              onClick={adicionarItem}
              className="flex gap-2 bg-[#123859] text-white px-3 py-1 rounded hover:bg-[#0d2a45] transition"
            >
              <Plus size={16} /> Adicionar Item
            </button>
          </div>

          {itens.length === 0 && <p className="text-gray-500">Nenhum item adicionado</p>}

          {itens.map((item, index) => {
            const produto = produtos.find(p => p.id === item.produto_id);
            const maxQtd = produto ? produto.estoque_atual : 1;
            return (
              <div key={item.id} className="grid grid-cols-6 gap-2 items-center">
                <label htmlFor={`produto-${index}`} className="sr-only">Produto</label>
                <select
                  id={`produto-${index}`}
                  className="border p-2 rounded"
                  value={item.produto_id}
                  onChange={e => atualizarItem(index, "produto_id", e.target.value)}
                >
                  <option value="">Selecione o produto</option>
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} - {p.preco_venda.toLocaleString()} Kz (Estoque: {p.estoque_atual})
                    </option>
                  ))}
                </select>
                <label htmlFor={`quantidade-${index}`} className="sr-only">Quantidade</label>
                <input
                  id={`quantidade-${index}`}
                  type="number"
                  min={1}
                  max={maxQtd}
                  value={item.quantidade}
                  onChange={e => atualizarItem(index, "quantidade", Number(e.target.value))}
                  className="border p-2 rounded"
                  placeholder="Qtd"
                />

                <input
                  disabled
                  value={item.preco_venda.toLocaleString("pt-AO")}
                  className="border p-2 rounded bg-gray-100"
                  aria-label="Preço unitário"
                />

                <input
                  disabled
                  value={item.subtotal.toLocaleString("pt-AO")}
                  className="border p-2 rounded bg-gray-100"
                  aria-label="Subtotal"
                />

                <button
                  onClick={() => removerItem(index)}
                  className="text-red-600 hover:text-red-800"
                  aria-label="Remover item"
                >
                  <Trash2 />
                </button>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="bg-white p-4 rounded-xl shadow flex justify-between items-center">
          <strong className="text-lg">Total</strong>
          <span className="text-[#F9941F] font-bold text-lg">
            {totalVenda.toLocaleString("pt-AO")} Kz
          </span>
        </div>

        {/* Botão Salvar */}
        <button
          onClick={salvarVenda}
          disabled={loading || itens.length === 0 || !clienteSelecionado}
          className="w-full bg-[#F9941F] text-white py-3 rounded-xl font-semibold disabled:opacity-50 hover:bg-[#e07b1c] transition"
        >
          {loading ? "Salvando..." : "Salvar Venda"}
        </button>

        {/* Vendas recentes */}
        {vendas.length > 0 && (
          <div className="bg-white p-4 rounded-xl shadow mt-6 space-y-2">
            <h2 className="font-semibold mb-2">Vendas Recentes</h2>
            {vendas.map(v => (
              <div
                key={v.id}
                className="flex justify-between border p-3 rounded items-center hover:bg-gray-50 transition"
              >
                <div>
                  <p><strong>Cliente:</strong> {v.cliente_nome}</p>
                  <p><strong>Total:</strong> {v.total.toLocaleString("pt-AO")} Kz</p>
                  <p><strong>Data:</strong> {new Date(v.data).toLocaleDateString("pt-AO")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainEmpresa>
  );
}