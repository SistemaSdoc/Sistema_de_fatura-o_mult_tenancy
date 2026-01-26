'use client';

import React, { useState, useEffect } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import { Trash2 } from "lucide-react";
import { listarVendas, Venda, ItemVenda } from "@/services/vendas";
import api from "@/services/axios";
import { AxiosError } from "axios";

export default function TodasVendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [filtro, setFiltro] = useState<"todas" | "emitida" | "cancelada">("todas");
  const [modalAberto, setModalAberto] = useState(false);
  const [modalSuperAberto, setModalSuperAberto] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);
  const [loading, setLoading] = useState(true);

  const filtros: Array<"todas" | "emitida" | "cancelada"> = ["todas", "emitida", "cancelada"];

  useEffect(() => {
    async function fetchVendas() {
      setLoading(true);
      const data = await listarVendas();
      setVendas(data);
      setLoading(false);
    }
    fetchVendas();
  }, []);

  const vendasFiltradas =
    filtro === "todas" ? vendas : vendas.filter(v => v.fatura?.status === filtro);

  const apagarVenda = (id: string) => {
    if (!confirm("Tem certeza que deseja apagar esta venda?")) return;
    setVendas(vendas.filter(v => v.id !== id));
  };

  const abrirModalFatura = (vendaId: string) => {
    const venda = vendas.find(v => v.id === vendaId);
    if (!venda) return alert("Venda não encontrada");
    setVendaSelecionada(venda);
    setModalAberto(true);
  };

  const abrirModalFaturaSuper = (vendaId: string) => {
    const venda = vendas.find(v => v.id === vendaId);
    if (!venda) return alert("Venda não encontrada");
    setVendaSelecionada(venda);
    setModalSuperAberto(true);
  };

  const fecharModal = () => {
    setVendaSelecionada(null);
    setModalAberto(false);
    setModalSuperAberto(false);
  };

  const imprimirFatura = () => window.print();

  const emitirFatura = async () => {
    if (!vendaSelecionada || vendaSelecionada.fatura) return;

    try {
      const response = await api.post<{ fatura: Venda['fatura'] }>("/api/faturas/gerar", {
        venda_id: vendaSelecionada.id,
      });

      const vendaAtualizada: Venda = {
        ...vendaSelecionada,
        fatura: response.data.fatura,
      };

      setVendaSelecionada(vendaAtualizada);
      setVendas(prev =>
        prev.map(v => (v.id === vendaAtualizada.id ? vendaAtualizada : v))
      );

      alert("Fatura emitida com sucesso!");
    } catch (err) {
      if (err instanceof AxiosError) {
        alert(err.response?.data?.message || "Erro ao emitir fatura");
      } else {
        alert("Erro ao emitir fatura");
      }
    }
  };

  if (loading)
    return <p className="text-center mt-10 text-gray-600">Carregando vendas...</p>;

  return (
    <MainEmpresa>
      <style>{`
        @media print {
          /* Esconde tudo */
          body * { visibility: hidden; margin: 0; padding: 0; }
          
          /* Define o tamanho da página como papel térmico 80mm */
          @page {
            size: 80mm auto;
            margin: 0;
          }

          /* Centraliza o conteúdo no papel */
          body {
            visibility: hidden;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            background-color: white;
          }

          /* Layout para o Modal Normal (A4) */
          #fatura, #fatura * {
            visibility: visible;
          }
          #fatura {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            visibility: ${modalAberto ? 'visible' : 'hidden'};
          }

          /* Layout para o Cupom (Supermercado) */
          #fatura-super, #fatura-super * {
            visibility: visible;
          }
          #fatura-super {
            visibility: ${modalSuperAberto ? 'visible' : 'hidden'};
            position: absolute;
            top: 0;
            width: 72mm; /* Largura segura para impressoras de 80mm */
            left: 50%;
            transform: translateX(-50%);
            padding: 4mm;
            box-sizing: border-box;
          }
        }

        .font-mono-receipt {
          font-family: 'Courier New', Courier, monospace;
        }
      `}</style>

      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-[#123859]">Todas as Vendas</h1>

        <div className="flex gap-3">
          {filtros.map(status => (
            <button
              key={status}
              onClick={() => setFiltro(status)}
              className={`px-4 py-2 rounded-lg font-semibold ${filtro === status ? "bg-[#123859] text-white" : "bg-white border"}`}
            >
              {status === "todas" ? "Todas" : status === "emitida" ? "Emitidas" : "Canceladas"}
            </button>
          ))}
        </div>

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
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendasFiltradas.map(venda => (
                <tr key={venda.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{venda.id.substring(0, 8)}</td>
                  <td className="p-3">{venda.cliente?.nome ?? "—"}</td>
                  <td className="p-3">{new Date(venda.data).toLocaleDateString("pt-AO")}</td>
                  <td className="p-3 font-semibold">{venda.total.toLocaleString()} Kz</td>
                  <td className="p-3">{venda.user?.name ?? "—"}</td>
                  <td className="p-3 text-xs uppercase font-bold">{venda.fatura?.status ?? "pendente"}</td>
                  <td className="p-3 flex justify-center gap-2">
                    <button
                      className="bg-[#F9941F] text-white px-3 py-1 rounded text-xs hover:opacity-90"
                      onClick={() => abrirModalFatura(venda.id)}
                    >
                      Fatura proforma
                    </button>
                    <button
                      className="bg-[#123859] text-white px-3 py-1 rounded text-xs hover:opacity-90"
                      onClick={() => abrirModalFaturaSuper(venda.id)}
                    >
                      FATURA RECIBO
                    </button>
                    <button onClick={() => apagarVenda(venda.id)} className="ml-2">
                      <Trash2 size={18} className="text-[#F9941F]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======= MODAL Fatura proforma ======= */}
      {modalAberto && vendaSelecionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-4xl rounded-xl p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <div id="fatura" className="p-6 bg-white border">
              <div className="flex justify-between border-b-2 border-gray-100 pb-4 mb-6">
                {/* === LOGO DA EMPRESA === */}
                <div className="flex justify-center mb-4">
                  <img
                    src="/images/3.png" // Substitua pelo caminho da sua logo em public/
                    alt="Logo Empresa"
                    className="w-20 h-auto object-contain print:visible"
                    style={{ display: 'block' }}
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#123859]">MINHA EMPRESA, LDA</h1>
                  <p className="text-sm text-gray-500">Endereço: Luanda, Angola</p>
                  <p className="text-sm text-gray-500">NIF: 123456789 | Tel: +244 9xx xxx xxx</p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-black text-[#F9941F]">FATURA / RECIBO</h2>
                  <p className="text-sm italic">Nº: {vendaSelecionada.fatura?.id ?? "PROVISÓRIO"}</p>
                  <p className="text-sm italic">Data: {new Date().toLocaleDateString("pt-AO")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-bold border-b mb-2">DADOS DO CLIENTE</p>
                  <p><strong>Nome:</strong> {vendaSelecionada.cliente?.nome ?? "Consumidor Final"}</p>
                  <p><strong>NIF:</strong> {vendaSelecionada.cliente?.nif ?? "999999999"}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded text-right">
                  <p className="font-bold border-b mb-2">DADOS DA VENDA</p>
                  <p><strong>Operador:</strong> {vendaSelecionada.user?.name ?? "—"}</p>
                  <p><strong>Moeda:</strong> Kwanzas (AOA)</p>
                </div>
              </div>

              <table className="w-full text-sm mb-6">
                <thead className="bg-[#123859] text-white">
                  <tr>
                    <th className="p-2 text-left">DESCRIÇÃO</th>
                    <th className="p-2 text-center">QTD</th>
                    <th className="p-2 text-right">PREÇO UNIT.</th>
                    <th className="p-2 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {vendaSelecionada.itens.map((item: ItemVenda) => (
                    <tr key={item.id}>
                      <td className="p-2">{item.produto_nome}</td>
                      <td className="p-2 text-center">{item.quantidade}</td>
                      <td className="p-2 text-right">{item.preco_venda.toLocaleString()} Kz</td>
                      <td className="p-2 text-right">{item.subtotal.toLocaleString()} Kz</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex flex-col items-end gap-1">
                <div className="w-64 flex justify-between border-b pb-1 text-gray-600">
                  <span>Subtotal:</span>
                  <span>{vendaSelecionada.total.toLocaleString()} Kz</span>
                </div>
                <div className="w-64 flex justify-between text-xl font-black text-[#123859] mt-2">
                  <span>TOTAL:</span>
                  <span>{vendaSelecionada.total.toLocaleString()} Kz</span>
                </div>
              </div>

              <div className="mt-20 text-center border-t pt-4">
                <p className="text-[10px] text-gray-400 uppercase">
                  Os bens/serviços foram colocados à disposição do adquirente na data e local do documento.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={fecharModal} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg">
                Fechar
              </button>
              {!vendaSelecionada.fatura && (
                <button onClick={emitirFatura} className="px-5 py-2 bg-[#F9941F] text-white rounded-lg font-bold">
                  Emitir Documento
                </button>
              )}
              <button onClick={imprimirFatura} className="px-5 py-2 bg-[#123859] text-white rounded-lg font-bold">
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======= MODAL fatura recibo ======= */}
      {modalSuperAberto && vendaSelecionada && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-[320px] rounded shadow-2xl overflow-hidden flex flex-col">

            <div id="fatura-super" className="p-4 bg-white text-black font-mono-receipt text-[12px] leading-tight">

              {/* === LOGO DA EMPRESA === */}
              <div className="flex justify-center mb-4">
                <img
                  src="/images/3.png" // Substitua pelo caminho da sua logo em public/
                  alt="Logo Empresa"
                  className="w-20 h-auto object-contain print:visible"
                  style={{ display: 'block' }}
                />
              </div>

              <div className="text-center mb-2 uppercase">
                <h1 className="text-base font-bold">MINHA EMPRESA LDA</h1>
                <p>NIF: 123456789</p>
                <p>LUANDA - ANGOLA</p>
                <p className="my-1">--------------------------------</p>
                <p className="font-bold">FATURA / RECIBO</p>
                <p>{vendaSelecionada.fatura?.id ?? "DOC PROVISÓRIO"}</p>
                <p className="my-1">--------------------------------</p>
              </div>

              <div className="mb-2 uppercase text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span>DATA: {new Date().toLocaleDateString("pt-AO")}</span>
                  <span>HORA: {new Date().toLocaleTimeString("pt-AO", { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p>OPERADOR: {vendaSelecionada.user?.name ?? "SISTEMA"}</p>
                <p>CLIENTE: {vendaSelecionada.cliente?.nome ?? "CONSUMIDOR FINAL"}</p>
              </div>

              <p className="my-1">--------------------------------</p>
              <div className="font-bold flex justify-between text-[10px]">
                <span>DESCRIÇÃO</span>
                <span>VALOR</span>
              </div>
              <p className="my-1">--------------------------------</p>

              <div className="space-y-2">
                {vendaSelecionada.itens.map((item: ItemVenda) => (
                  <div key={item.id} className="uppercase">
                    <p>{item.produto_nome}</p>
                    <div className="flex justify-between text-[10px] pl-2">
                      <span>{item.quantidade} UN x {item.preco_venda.toLocaleString()}</span>
                      <span>{item.subtotal.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="my-2 border-t border-dashed border-black"></p>

              <div className="flex justify-between text-base font-bold">
                <span>TOTAL KZ</span>
                <span>{vendaSelecionada.total.toLocaleString()}</span>
              </div>

              <div className="text-center mt-6 uppercase text-[9px] space-y-1">
                <p>Obrigado pela preferência!</p>
                <p>Software de Gestão v1.0</p>
                <p className="font-bold">*** FIM DO DOCUMENTO ***</p>
              </div>
            </div>

            <div className="flex bg-gray-100 border-t print:hidden">
              <button onClick={fecharModal} className="flex-1 p-3 text-xs font-bold text-gray-600 hover:bg-gray-200">
                FECHAR
              </button>
              <button onClick={imprimirFatura} className="flex-1 p-3 text-xs font-bold bg-[#123859] text-white hover:bg-opacity-90">
                IMPRIMIR
              </button>
            </div>
          </div>
        </div>
      )}
    </MainEmpresa>
  );
}