
"use client";

import { AxiosError } from "axios";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/authprovider";

import MainEmpresa from "../../../components/MainEmpresa";
import { Plus, Trash2, Edit } from "lucide-react";

import {
  listarVendas,
  criarVenda,
  Venda,
  ItemVenda,
  listarProdutos,
  Produto,
} from "@/services/vendas";

export default function NovaVendaPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  /* ================= STATE ================= */
  const [clienteNome, setClienteNome] = useState("");
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);

  /* ================= PROTEÇÃO DE ROTA ================= */
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  /* ================= FETCH VENDAS ================= */
  useEffect(() => {
    if (!user) return;

    async function fetchVendas() {
      try {
        const data = await listarVendas();
        setVendas(data);
      } catch (err) {
        console.error("Erro ao listar vendas:", err);
      }
    }

    fetchVendas();
  }, [user]);

  /* ================= FETCH PRODUTOS ================= */
  useEffect(() => {
    if (!user) return;

    async function fetchProdutos() {
      try {
        const data = await listarProdutos();
        setProdutos(data);
      } catch (err) {
        console.error("Erro ao listar produtos:", err);
      }
    }

    fetchProdutos();
  }, [user]);

  if (authLoading || !user) {
    return <p className="text-center mt-10">Carregando usuário...</p>;
  }

  /* ================= FUNÇÕES DE ITENS ================= */
  const adicionarItem = () => {
    setItens((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        produto_id: "",
        produto_nome: "",
        quantidade: 1,
        preco_venda: 0,
        subtotal: 0,
      },
    ]);
  };

  const atualizarItem = (
    index: number,
    campo: keyof ItemVenda,
    valor: string | number
  ) => {
    setItens((prev) => {
      const novosItens = [...prev];
      novosItens[index][campo] = valor as never;

      if (campo === "produto_id") {
        const produto = produtos.find((p) => p.id === valor);
        if (produto) {
          novosItens[index].produto_nome = produto.nome;
          novosItens[index].preco_venda = produto.preco_venda;
        } else {
          novosItens[index].produto_nome = "";
          novosItens[index].preco_venda = 0;
        }
      }

      novosItens[index].subtotal =
        novosItens[index].quantidade * novosItens[index].preco_venda;

      return novosItens;
    });
  };

  const removerItem = (index: number) => {
    setItens((prev) => prev.filter((_, i) => i !== index));
  };

  const totalVenda = itens.reduce((acc, item) => acc + item.subtotal, 0);

  /* ================= SALVAR VENDA ================= */
  const salvarVenda = async () => {
    if (!clienteNome) return alert("Informe o nome do cliente");
    if (itens.length === 0) return alert("Adicione pelo menos um item");
    if (itens.some((i) => !i.produto_id))
      return alert("Selecione um produto em todos os itens");

    setLoading(true);

    try {
      const payload = {
        cliente_nome: clienteNome,
        itens: itens.map((i) => ({
          produto_id: i.produto_id,
          quantidade: i.quantidade,
        })),
      };

      const { venda } = await criarVenda(payload);
      setVendas((prev) => [venda, ...prev]);

      // Reset
      setClienteNome("");
      setItens([]);
    } catch (err) {
      let mensagem = "Erro desconhecido";

      if (err instanceof AxiosError) {
        mensagem = err.response?.data?.message || err.message;
      } else if (err instanceof Error) {
        mensagem = err.message;
      }

      alert(`Erro ao salvar venda: ${mensagem}`);
    } finally {
      setLoading(false);
    }
  };

  /* ================= RENDER ================= */
  return (
    <MainEmpresa>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-[#123859]">Nova Venda</h1>

        {/* Cliente */}
        <div className="bg-white p-4 rounded-xl shadow">
          <label className="font-semibold">Cliente</label>
          <input
            value={clienteNome}
            onChange={(e) => setClienteNome(e.target.value)}
            placeholder="Nome do cliente"
            className="w-full border p-2 rounded mt-2"
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
            <div key={item.id} className="grid grid-cols-6 gap-2 items-center">
              <select
                className="border p-2 rounded"
                value={item.produto_id}
                onChange={(e) =>
                  atualizarItem(index, "produto_id", e.target.value)
                }
              >
                <option value="">Selecione o produto</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} - {p.preco_venda.toLocaleString()} Kz
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={1}
                value={item.quantidade}
                onChange={(e) =>
                  atualizarItem(index, "quantidade", Number(e.target.value))
                }
                className="border p-2 rounded"
              />

              <input
                disabled
                value={item.preco_venda.toLocaleString()}
                className="border p-2 rounded bg-gray-100"
              />

              <input
                disabled
                value={item.subtotal.toLocaleString()}
                className="border p-2 rounded bg-gray-100"
              />

              <button
                onClick={() => removerItem(index)}
                className="text-red-600"
              >
                <Trash2 />
              </button>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="bg-white p-4 rounded-xl shadow flex justify-between">
          <strong>Total</strong>
          <span className="text-[#F9941F] font-bold">
            {totalVenda.toLocaleString()} Kz
          </span>
        </div>

        {/* Botão salvar */}
        <button
          onClick={salvarVenda}
          disabled={loading || itens.length === 0 || !clienteNome}
          className="w-full bg-[#F9941F] text-white py-3 rounded-xl font-semibold disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Salvar Venda"}
        </button>

        {/* Vendas recentes */}
        {vendas.length > 0 && (
          <div className="bg-white p-4 rounded-xl shadow mt-6">
            <h2 className="font-semibold mb-3">Vendas Recentes</h2>
            {vendas.map((v) => (
              <div
                key={v.id}
                className="flex justify-between border p-3 rounded mb-2"
              >
                <div>
                  <p><strong>Cliente:</strong> {v.cliente_nome}</p>
                  <p><strong>Total:</strong> {v.total.toLocaleString()} Kz</p>
                </div>
                <Edit className="text-[#123859]" />
              </div>
            ))}
          </div>
        )}
      </div>
    </MainEmpresa>
  );
}
