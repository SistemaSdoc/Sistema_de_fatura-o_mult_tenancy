"use client";

import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import MainEmpresa from "../../../components/MainEmpresa";
import { useAuth } from "@/context/authprovider";

import {
  criarVenda,
  ItemVenda,
  Venda,
  Produto,
  Cliente,
  obterDadosNovaVenda,
  CriarVendaPayload,
} from "@/services/vendas";

export default function NovaVendaPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [venda, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ================== PROTEÇÃO ================== */
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  /* ================== FETCH INICIAL ================== */
  useEffect(() => {
    if (!user) return;
async function carregarDados() {
  try {
    const data = await obterDadosNovaVenda();
    console.log("Dados da nova venda:", data); // ✅ Veja se chega
    setClientes(data.clientes);
    setProdutos(data.produtos);
  } catch (err) {
    console.error("Erro ao carregar dados:", err);
  }
}


    carregarDados();
  }, [user]);

  /* ================== ITENS ================== */
  const adicionarItem = () => {
    setItens(prev => [
      ...prev,
      {
        id: uuidv4(),
        produto_id: "",
        produto_nome: "",
        quantidade: 1,
        preco_venda: 0,
        desconto: 0,
        valor_iva: 0,
        subtotal: 0,
        descricao: "",
        base_tributavel: 0,
        valor_retenção: 0,
      },
    ]);
  };

  const atualizarItem = (
    index: number,
    campo: keyof ItemVenda,
    valor: string | number
  ) => {
    setItens(prev => {
      const novos = [...prev];
      const item = { ...novos[index] };

      if (campo === "produto_id" && typeof valor === "string") {
        const produto = produtos.find(p => p.id === valor);

        if (produto) {
          item.produto_id = produto.id;
          item.descricao = produto.nome;
          item.preco_venda = produto.preco_venda;
          item.valor_iva = produto.isento_iva ? 0 : 0.14 * produto.preco_venda;
          item.quantidade = Math.min(item.quantidade, produto.estoque_atual);
        } else {
          item.produto_id = "";
          item.descricao = "";
          item.preco_venda = 0;
          item.valor_iva = 0;
        }
      }

      if (
        campo === "quantidade" ||
        campo === "preco_venda" ||
        campo === "desconto"
      ) {
        item[campo] = Number(valor);
      }

      // 🔢 Subtotal
      item.subtotal =
        item.preco_venda * item.quantidade -
        item.desconto +
        item.valor_iva * item.quantidade;

      novos[index] = item;
      return novos;
    });
  };

  const removerItem = (index: number) => {
    setItens(prev => prev.filter((_, i) => i !== index));
  };

  const totalVenda = itens.reduce((acc, i) => acc + i.subtotal, 0);

  /* ================== SALVAR ================== */
 const salvarVenda = async () => {
  if (!clienteSelecionado) {
    return setError("Selecione um cliente");
  }

  if (itens.length === 0) {
    return setError("Adicione itens à venda");
  }

  if (itens.some(i => !i.produto_id)) {
    return setError("Selecione todos os produtos");
  }

  for (const item of itens) {
    const produto = produtos.find(p => p.id === item.produto_id);
    if (produto && item.quantidade > produto.estoque_atual) {
      return setError(
        `Estoque insuficiente para o produto ${produto.nome}`
      );
    }
  }

  setLoading(true);
  setError(null);

  try {
    const payload: CriarVendaPayload = {
      cliente_id: clienteSelecionado.id,
      tipo_documento: "fatura",
      faturar: true,
      itens: itens.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_venda: item.preco_venda,
        desconto: item.desconto ?? 0
      }))
    };

    const result = await criarVenda(payload);

    if (!result) {
      throw new Error("Erro ao criar venda");
    }

    setVendas(prev => [result.venda, ...prev]);
    setClienteSelecionado(null);
    setItens([]);

    router.push("/dashboard/Faturas/Faturas");

  } catch (err) {
    setError(err instanceof Error ? err.message : "Erro inesperado");
  } finally {
    setLoading(false);
  }
};


  /* ================== RENDER ================== */
  return (
    <MainEmpresa>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-[#123859]">Nova Venda</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded">
            {error}
          </div>
        )}

        {/* CLIENTE */}
        <div className="bg-white p-4 rounded shadow">
          <label htmlFor="cliente" className="font-semibold">Cliente</label>
          <select
          id='cliente'
            className="w-full border p-2 rounded"
            value={clienteSelecionado?.id ?? ""}
            onChange={e =>
              setClienteSelecionado(
                clientes.find(c => c.id === e.target.value) ?? null
              )
            }
          >
            <option value="">Selecione</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>
                {c.nome} {c.nif ? `(${c.nif})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* ITENS */}
        <div className="bg-white p-4 rounded shadow space-y-4">
          <div className="flex justify-between">
            <h2 className="font-semibold">Itens</h2>
            <button
              onClick={adicionarItem}
              className="bg-[#123859] text-white px-3 py-1 rounded flex gap-2"
            >
              <Plus size={16} /> Item
            </button>
          </div>

          {itens.map((item, index) => {
            const produto = produtos.find(p => p.id === item.produto_id);

            return (
              <div key={item.id} className="border p-4 rounded space-y-3">
                <label htmlFor="produto">Produto</label>
                <select id="produto"
                  className="w-full border p-2 rounded"
                  value={item.produto_id}
                  onChange={e =>
                    atualizarItem(index, "produto_id", e.target.value)
                  }
                >
                  <option value="">Produto</option>
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.estoque_atual})
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-5 gap-3">
                  <label htmlFor="quan">Quantidade</label>
                  <input
                  id="quan"
                    type="number"
                    min={1}
                    max={produto?.estoque_atual ?? 1}
                    value={item.quantidade}
                    onChange={e =>
                      atualizarItem(index, "quantidade", Number(e.target.value))
                    }
                    className="border p-2 rounded"
                  />

<label htmlFor="Desconto">Desconto</label>
                  <input
                  id="Desconto"
                    type="number"
                    value={item.desconto}
                    onChange={e =>
                      atualizarItem(index, "desconto", Number(e.target.value))
                    }
                    className="border p-2 rounded"
                  />

                  <label htmlFor="preco">Preço Venda</label>  
                  <input
                  id="preco"
                    disabled
                    value={item.preco_venda.toLocaleString("pt-AO")}
                    className="border p-2 rounded bg-gray-100"
                  />

                  <label htmlFor="subtotal">Subtotal</label>
                  <input
                  id="subtotal"
                    disabled
                    value={item.subtotal.toLocaleString("pt-AO")}
                    className="border p-2 rounded bg-gray-100"
                  />

                  <button

                    onClick={() => removerItem(index)}
                    className="text-[#F9941F]"
                  >Remover
                    <Trash2 />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* TOTAL */}
        <div className="text-right font-bold text-xl text-[#F9941F]">
          Total: {totalVenda.toLocaleString("pt-AO")} Kz
        </div>

        <button
          onClick={salvarVenda}
          disabled={loading}
          className="w-full bg-[#F9941F] text-white py-3 rounded font-semibold"
        >
          {loading ? "Salvando..." : "Salvar Venda"}
        </button>
      </div>
    </MainEmpresa>
  );
}
