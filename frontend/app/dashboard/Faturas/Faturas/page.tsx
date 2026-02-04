"use client";

import { useEffect, useState, useCallback } from "react";
import MainEmpresa from "@/app/components/MainEmpresa";
import { vendaService,Venda } from "@/services/vendas";

export default function FaturasPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filtro, setFiltro] = useState<
    "todas" | "fatura" | "recibo" | "nota_credito" | "nota_debito"
  >("todas");

  /* ================== CARREGAR VENDAS ================== */
  const carregarVendas = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const data: Venda[] = await vendaService.listarVendas();
      setVendas(data);
    } catch (error) {
      console.error("Erro ao carregar vendas:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarVendas();
  }, [carregarVendas]);

  /* ================== FILTRO ================== */
  const vendasFiltradas: Venda[] =
    filtro === "todas"
      ? vendas
      : vendas.filter((v) => v.tipo_documento === filtro);

  /* ================== UI ================== */
  return (
    <MainEmpresa>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Faturas / Vendas</h1>

        {/* Filtro */}
        <div className="flex gap-3 mb-6">
          {(
            ["todas", "fatura", "recibo", "nota_credito", "nota_debito"] as const
          ).map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFiltro(tipo)}
              className={`px-4 py-2 rounded-md text-sm ${
                filtro === tipo
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              {tipo.replace("_", " ").toUpperCase()}
            </button>
          ))}
        </div>

        {/* Tabela */}
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Nº</th>
                  <th className="p-3 text-left">Série</th>
                  <th className="p-3 text-left">Cliente</th>
                  <th className="p-3 text-left">Tipo</th>
                  <th className="p-3 text-left">Data</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {vendasFiltradas.map((venda) => (
                  <tr key={venda.id} className="border-t">
                    <td className="p-3">{venda.numero}</td>
                    <td className="p-3">{venda.serie}</td>
                    <td className="p-3">
                      {venda.cliente?.nome ?? "Consumidor Final"}
                    </td>
                    <td className="p-3 uppercase">
                      {venda.tipo_documento}
                    </td>
                    <td className="p-3">
                      {new Date(venda.data_venda).toLocaleDateString("pt-AO")}
                    </td>
                    <td className="p-3 text-right">
                      {venda.total.toLocaleString("pt-AO", {
                        style: "currency",
                        currency: "AOA",
                      })}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          venda.status === "faturada"
                            ? "bg-green-100 text-green-700"
                            : venda.status === "cancelada"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {venda.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}

                {vendasFiltradas.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-6 text-center text-gray-500"
                    >
                      Nenhuma venda encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainEmpresa>
  );
}
