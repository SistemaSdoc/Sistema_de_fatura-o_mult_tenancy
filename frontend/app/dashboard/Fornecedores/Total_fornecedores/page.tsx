"use client";

import React, { useEffect, useState } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import { Trash2, Edit, X } from "lucide-react";
import { fornecedorService } from "@/services/vendas";

export type Fornecedor = {
  id: string;
  nome: string;
  nif?: string;
  telefone?: string | null;
  email?: string;
  endereco?: string | null;
};

export default function TotalFornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(false);

  // Paginação
  const [pagina, setPagina] = useState(1);
  const [ultimaPagina, setUltimaPagina] = useState(1);

  // Banner
  const [banner, setBanner] = useState<{
    tipo: "success" | "error";
    texto: string;
  } | null>(null);

  // Modal edição
  const [modalEditar, setModalEditar] = useState(false);
  const [fornecedorSelecionado, setFornecedorSelecionado] =
    useState<Fornecedor | null>(null);

  const mostrarBanner = (tipo: "success" | "error", texto: string) => {
    setBanner({ tipo, texto });
    setTimeout(() => setBanner(null), 4000);
  };

  // 🔄 Carregar fornecedores
const carregarFornecedores = async (page = 1) => {
  try {
    setLoading(true);

    const response = await fornecedorService.listar({ page });

    setFornecedores(response?.data ?? []);
    setPagina(response?.current_page ?? 1);
    setUltimaPagina(response?.last_page ?? 1);

  } catch {
    mostrarBanner("error", "Erro ao carregar fornecedores");
    setFornecedores([]);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    carregarFornecedores();
  }, []);

  // 🗑️ Apagar
  const apagarFornecedor = async (id: string) => {
    if (!confirm("Deseja mesmo apagar este fornecedor?")) return;

    try {
      await fornecedorService.deletar(id);
      setFornecedores((prev) => prev.filter((f) => f.id !== id));
      mostrarBanner("success", "Fornecedor removido com sucesso");
    } catch {
      mostrarBanner("error", "Erro ao remover fornecedor");
    }
  };

  // ✏️ Editar
  const abrirEditar = (fornecedor: Fornecedor) => {
    setFornecedorSelecionado(fornecedor);
    setModalEditar(true);
  };

  const salvarEdicao = async () => {
    if (!fornecedorSelecionado) return;

    try {
      const atualizado = await fornecedorService.atualizar(
        fornecedorSelecionado.id,
        fornecedorSelecionado
      );

      setFornecedores((prev) =>
        prev.map((f) => (f.id === atualizado.id ? atualizado : f))
      );

      setModalEditar(false);
      mostrarBanner("success", "Fornecedor atualizado");
    } catch (error: any) {
      mostrarBanner(
        "error",
        error?.response?.data?.message || "Erro ao atualizar fornecedor"
      );
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!fornecedorSelecionado) return;
    const { name, value } = e.target;
    setFornecedorSelecionado({ ...fornecedorSelecionado, [name]: value });
  };

  return (
    <MainEmpresa>
      <div className="p-6 space-y-6">

        {/* BANNER */}
        {banner && (
          <div
            className={`w-full max-w-5xl mx-auto px-4 py-3 rounded-lg font-semibold ${
              banner.tipo === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {banner.texto}
          </div>
        )}

        <h1 className="text-2xl font-bold text-[#123859]">
          Fornecedores
        </h1>

        {/* TABELA */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#123859] text-white">
              <tr>
                <th className="p-3 text-left">Nome</th>
                <th className="p-3 text-left">NIF</th>
                <th className="p-3 text-left">Telefone</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Endereço</th>
                <th className="p-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {fornecedores.map((f) => (
                <tr key={f.id} className="border-b">
                  <td className="p-3">{f.nome}</td>
                  <td className="p-3">{f.nif}</td>
                  <td className="p-3">{f.telefone || "-"}</td>
                  <td className="p-3">{f.email}</td>
                  <td className="p-3">{f.endereco || "-"}</td>
                  <td className="p-3 flex gap-3">
                    <button
                      className="text-green-600 flex items-center gap-1"
                      onClick={() => abrirEditar(f)}
                    >
                      <Edit size={16} /> Editar
                    </button>
                    <button
                      className="text-red-600 flex items-center gap-1"
                      onClick={() => apagarFornecedor(f.id)}
                    >
                      <Trash2 size={16} /> Apagar
                    </button>
                  </td>
                </tr>
              ))}

              {fornecedores.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-4 text-center text-gray-500"
                  >
                    Nenhum fornecedor encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINAÇÃO */}
        <div className="flex justify-center gap-2">
          <button
            disabled={pagina === 1}
            onClick={() => carregarFornecedores(pagina - 1)}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Anterior
          </button>

          <span className="px-4 py-2 font-semibold">
            Página {pagina} de {ultimaPagina}
          </span>

          <button
            disabled={pagina === ultimaPagina}
            onClick={() => carregarFornecedores(pagina + 1)}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Próxima
          </button>
        </div>

        {/* MODAL EDITAR */}
        {modalEditar && fornecedorSelecionado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl w-full max-w-md p-6 relative space-y-3">
              <button
                className="absolute top-3 right-3 text-gray-500"
                aria-label="Fechar modal"
                onClick={() => setModalEditar(false)}
              >
                <X size={20} />
              </button>

              <h2 className="text-xl font-bold text-[#123859]">
                Editar Fornecedor
              </h2>

              <input
                name="nome"
                value={fornecedorSelecionado.nome}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
                placeholder="Nome"
              />
              <input
                name="nif"
                value={fornecedorSelecionado.nif || ""}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
                placeholder="NIF"
              />
              <input
                name="telefone"
                value={fornecedorSelecionado.telefone || ""}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
                placeholder="Telefone"
              />
              <input
                name="email"
                value={fornecedorSelecionado.email || ""}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
                placeholder="Email"
              />
              <input
                name="endereco"
                value={fornecedorSelecionado.endereco || ""}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
                placeholder="Endereço"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="px-4 py-2 border rounded"
                  onClick={() => setModalEditar(false)}
                >
                  Cancelar
                </button>
                <button
                  className="px-4 py-2 bg-[#123859] text-white rounded"
                  onClick={salvarEdicao}
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainEmpresa>
  );
}
