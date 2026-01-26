
'use client';

import React, { useState, useEffect } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import { Trash2, Eye } from "lucide-react";
import { listarVendas, Venda, ItemVenda } from "@/services/vendas";
import api from "@/services/axios";
import { AxiosError } from "axios";

export default function TodasVendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [filtro, setFiltro] = useState<"todas" | "emitida" | "cancelada">("todas");
  const [modalAberto, setModalAberto] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);
  const [loading, setLoading] = useState(true);

  const filtros: Array<"todas" | "emitida" | "cancelada"> = [
    "todas",
    "emitida",
    "cancelada",
  ];

  // Carregar todas as vendas do backend
  useEffect(() => {
    async function fetchVendas() {
      setLoading(true);
      const data = await listarVendas();
      setVendas(data);
      setLoading(false);
    }
    fetchVendas();
  }, []);

  // Filtrar vendas pelo status da fatura
  const vendasFiltradas: Venda[] = filtro === "todas"
    ? vendas
    : vendas.filter(v => v.fatura?.status === filtro);

  // Apagar venda localmente
  const apagarVenda = (id: string) => {
    if (!confirm("Tem certeza que deseja apagar esta venda?")) return;
    setVendas(vendas.filter(v => v.id !== id));
  };

  // Abrir modal da fatura
  const abrirModalFatura = (vendaId: string) => {
    const venda = vendas.find(v => v.id === vendaId);
    if (!venda) return alert("Venda não encontrada");
    setVendaSelecionada(venda);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setVendaSelecionada(null);
    setModalAberto(false);
  };

  const imprimirFatura = () => window.print();


const emitirFatura = async () => {
  if (!vendaSelecionada) return;

  try {
    if (!vendaSelecionada.fatura) {
      const response = await api.post<{ fatura: Venda['fatura'] }>("/api/faturas/gerar", {
        venda_id: vendaSelecionada.id,
      });

      const novaFatura = response.data.fatura;

      alert("Fatura emitida com sucesso!");

      const vendaAtualizada: Venda = {
        ...vendaSelecionada,
        fatura: novaFatura,
      };

      setVendaSelecionada(vendaAtualizada);
      setVendas(prev =>
        prev.map(v => (v.id === vendaAtualizada.id ? vendaAtualizada : v))
      );
    }
  } catch (err) {
    if (err instanceof AxiosError) {
      // Aqui podemos fazer um type assertion para acessar message tipado
      const axiosErr = err as AxiosError<{ message: string }>;
      console.error("[FATURA] Erro ao gerar fatura:", axiosErr.response?.data.message);
      alert(axiosErr.response?.data.message || "Erro ao gerar fatura");
    } else {
      console.error("[FATURA] Erro ao gerar fatura:", err);
      alert("Erro ao gerar fatura");
    }
  }
};



  if (loading)
    return <p className="text-center mt-10 text-gray-600">Carregando vendas...</p>;

  return (
    <MainEmpresa>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #fatura, #fatura * { visibility: visible; }
          #fatura { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-[#123859]">Todas as Vendas</h1>

        {/* Filtros */}
        <div className="flex gap-3">
          {filtros.map((status) => (
            <button
              key={status}
              onClick={() => setFiltro(status)}
              className={`px-4 py-2 rounded-lg font-semibold ${
                filtro === status ? "bg-[#123859] text-white" : "bg-white border"
              }`}
            >
              {status === "todas" && "Todas"}
              {status === "emitida" && "Emitidas"}
              {status === "cancelada" && "Canceladas"}
            </button>
          ))}
        </div>

        {/* Tabela de vendas */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#123859] text-white">
              <tr>
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">Cliente</th>
                <th className="p-3 text-left">Data</th>
                <th className="p-3 text-left">Total</th>
                <th className="p-3 text-left">Responsável</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendasFiltradas.map((venda) => (
                <tr key={venda.id} className="border-b">
                  <td className="p-3">{venda.id}</td>
                  <td className="p-3">{venda.cliente?.nome ?? "Cliente não informado"}</td>
                  <td className="p-3">{new Date(venda.data).toLocaleDateString("pt-AO")}</td>
                  <td className="p-3">{venda.total.toLocaleString()} Kz</td>
                  <td className="p-3">{venda.user?.name ?? "Responsável não informado"}</td>
                  <td className="p-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        venda.fatura?.status === "emitida"
                          ? "bg-green-100 text-green-700"
                          : venda.fatura?.status === "cancelada"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {venda.fatura?.status || "pendente"}
                    </span>
                  </td>
                  <td className="p-3 flex gap-2">
                    <button
                      aria-label={`Emitir fatura da venda ${venda.id}`}
                      className="bg-[#F9941F] text-white px-3 py-1 rounded text-xs font-semibold"
                      onClick={() => abrirModalFatura(venda.id)}
                    >
                      Fatura
                    </button>
                    <button
                      aria-label="Visualizar venda"
                      type="button"
                      className="text-green-600"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      aria-label="Apagar venda"
                      type="button"
                      className="text-red-600"
                      onClick={() => apagarVenda(venda.id)}
                    >
                      <Trash2 size={18} />
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

      {/* Modal da Fatura */}
      {modalAberto && vendaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-11/12 md:w-2/3 p-6 space-y-4 relative shadow-xl">
            <div id="fatura">
              <div className="flex justify-between items-center border-b pb-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#123859]">Minha Empresa</h1>
                  <p className="text-gray-500 text-sm">Endereço da Empresa</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-semibold text-[#F9941F]">Fatura</h2>
                  <p>
                    <strong>Nº:</strong>{" "}
                    {vendaSelecionada.fatura
                      ? `FAT-${new Date().getFullYear()}-${vendaSelecionada.fatura.id.toString().padStart(5, "0")}`
                      : "Pendente"}
                  </p>
                  <p>
                    <strong>Data:</strong>{" "}
                    {new Date(vendaSelecionada.data).toLocaleString("pt-AO")}
                  </p>
                  {vendaSelecionada.fatura && (
                    <p>
                      <strong>Valor:</strong> {vendaSelecionada.fatura.total.toLocaleString()} Kz
                    </p>
                  )}
                </div>
              </div>

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
                    {vendaSelecionada.itens.map((item: ItemVenda) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-2">{item.produto_nome}</td>
                        <td className="p-2">{item.quantidade}</td>
                        <td className="p-2">{item.preco_venda.toLocaleString()} Kz</td>
                        <td className="p-2">{item.subtotal.toLocaleString()} Kz</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mt-4">
                <p className="text-lg font-bold">
                  Total: {vendaSelecionada.total.toLocaleString()} Kz
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
                onClick={fecharModal}
              >
                Cancelar
              </button>
              {!vendaSelecionada.fatura && (
                <button
                  className="bg-[#F9941F] text-white px-4 py-2 rounded"
                  onClick={emitirFatura}
                >
                  Emitir Fatura
                </button>
              )}
              <button
                className="bg-[#123859] text-white px-4 py-2 rounded"
                onClick={imprimirFatura}
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </MainEmpresa>
  );
}
