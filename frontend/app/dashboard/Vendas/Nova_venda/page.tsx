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
  Produto,
  Cliente,
  obterDadosNovaVenda,
} from "@/services/vendas";
import api from "@/services/axios"; // 🔹 para garantir CSRF cookie

/* ================== TIPOS LOCAIS ================== */
interface ItemVendaForm extends ItemVenda {}

export default function NovaVendaPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  /* ================= STATES ================= */
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [itens, setItens] = useState<ItemVendaForm[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(false);

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

  const atualizarItem = (index: number, campo: keyof ItemVendaForm, valor: string | number): void => {
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
    if (!clienteSelecionado) return alert("Selecione um cliente");
    if (itens.length === 0) return alert("Adicione pelo menos um item");
    if (itens.some(i => !i.produto_id)) return alert("Selecione todos os produtos");

    for (const item of itens) {
      const produto = produtos.find(p => p.id === item.produto_id);
      if (produto && item.quantidade > produto.estoque_atual) {
        return alert(`Quantidade do produto ${produto.nome} maior que o estoque disponível`);
      }
    }

    setLoading(true);
    try {
      // 🔹 Garante CSRF cookie antes do POST
      await api.get("/sanctum/csrf-cookie");

      const payload = {
        cliente_id: clienteSelecionado.id,
        itens: itens.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade })),
      };

      const result = await criarVenda(payload);
      if (!result) return alert("Erro ao criar venda");

      // Atualiza lista e limpa formulário
      setVendas(prev => [result.venda, ...prev]);
      setClienteSelecionado(null);
      setItens([]);
      alert("Venda criada com sucesso!");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro desconhecido ao criar venda";
      alert(msg);
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

        {/* Cliente */}
        <div className="bg-white p-4 rounded-xl shadow space-y-2">
          <label className="font-semibold">Cliente</label>
          <select
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
            <button onClick={adicionarItem} className="flex gap-2 bg-[#123859] text-white px-3 py-1 rounded hover:bg-[#0d2a45] transition">
              <Plus size={16} /> Adicionar Item
            </button>
          </div>

          {itens.length === 0 && <p className="text-gray-500">Nenhum item adicionado</p>}

          {itens.map((item, index) => {
            const produto = produtos.find(p => p.id === item.produto_id);
            const maxQtd = produto ? produto.estoque_atual : 1;
            return (
              <div key={item.id} className="grid grid-cols-6 gap-2 items-center">
                <select
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

                <input
                  type="number"
                  min={1}
                  max={maxQtd}
                  value={item.quantidade}
                  onChange={e => atualizarItem(index, "quantidade", Number(e.target.value))}
                  className="border p-2 rounded"
                />

                <input disabled value={item.preco_venda.toLocaleString()} className="border p-2 rounded bg-gray-100" />
                <input disabled value={item.subtotal.toLocaleString()} className="border p-2 rounded bg-gray-100" />

                <button onClick={() => removerItem(index)} className="text-red-600 hover:text-red-800">
                  <Trash2 />
                </button>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="bg-white p-4 rounded-xl shadow flex justify-between items-center">
          <strong className="text-lg">Total</strong>
          <span className="text-[#F9941F] font-bold text-lg">{totalVenda.toLocaleString()} Kz</span>
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
              <div key={v.id} className="flex justify-between border p-3 rounded items-center hover:bg-gray-50 transition">
                <div>
                  <p><strong>Cliente:</strong> {v.cliente_nome}</p>
                  <p><strong>Total:</strong> {v.total.toLocaleString()} Kz</p>
                  <p><strong>Data:</strong> {new Date(v.data).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainEmpresa>
  );
}
