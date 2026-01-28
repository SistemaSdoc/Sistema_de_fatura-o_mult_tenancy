
"use client";

import React, { useEffect, useState } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import { Trash2, Edit, X } from "lucide-react";
import { clienteService } from "@/services/vendas";

type Cliente = {
  id: string; 
  name: string;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  tipo: "empresa" | "consumidor_final";
  nif?: string | null;
};

export default function TotalClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "empresa" | "consumidor_final">("todos");
  const [loading, setLoading] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  // Modal de edição
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [formNome, setFormNome] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formEndereco, setFormEndereco] = useState("");
  const [formTipo, setFormTipo] = useState<"empresa" | "consumidor_final">("consumidor_final");
  const [formNIF, setFormNIF] = useState("");
  const [salvando, setSalvando] = useState(false);

  // ✅ Buscar clientes do backend
  const carregarClientes = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await clienteService.listar();

      const clientesComTipo: Cliente[] = data.map((c) => ({
        id: c.id,
        name: c.nome ?? c.name ?? "Sem nome",
        telefone: c.telefone ?? null,
        email: c.email ?? null,
        endereco: c.endereco ?? null,
        tipo: c.tipo ?? "consumidor_final",
        nif: c.nif ?? null,
      }));

      setClientes(clientesComTipo);
    } catch (error: unknown) {
      setErro("Erro ao carregar clientes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarClientes();
  }, []);

  // ✅ Filtrar por tipo
  const clientesFiltrados =
    filtroTipo === "todos" ? clientes : clientes.filter((c) => c.tipo === filtroTipo);

  const apagarCliente = async (id: string): Promise<void> => {
    if (!confirm("Tem certeza que deseja apagar este cliente?")) return;

    try {
      await clienteService.deletar(id);
      setClientes((prev) => prev.filter((c) => c.id !== id));
      alert("Cliente apagado com sucesso!");
    } catch (error: unknown) {
      alert("Erro ao apagar cliente");
      console.error(error);
    }
  };

  const abrirEdicao = (cliente: Cliente) => {
    setClienteEditando(cliente);
    setFormNome(cliente.name);
    setFormTelefone(cliente.telefone ?? "");
    setFormEmail(cliente.email ?? "");
    setFormEndereco(cliente.endereco ?? "");
    setFormTipo(cliente.tipo);
    setFormNIF(cliente.nif ?? "");
  };

  const salvarEdicao = async () => {
    if (!clienteEditando) return;

    if (!formNome.trim()) {
      alert("Nome é obrigatório");
      return;
    }

    if (formTipo === "empresa" && !formNIF.trim()) {
      alert("NIF é obrigatório para empresas");
      return;
    }

    try {
      setSalvando(true);
      await clienteService.atualizar(clienteEditando.id, {
        nome: formNome,
        telefone: formTelefone || null,
        email: formEmail || null,
        endereco: formEndereco || null,
        tipo: formTipo,
        nif: formNIF || null,
      });

      setClientes((prev) =>
        prev.map((c) =>
          c.id === clienteEditando.id
            ? {
                ...c,
                name: formNome,
                telefone: formTelefone || null,
                email: formEmail || null,
                endereco: formEndereco || null,
                tipo: formTipo,
                nif: formNIF || null,
              }
            : c
        )
      );

      alert("Cliente atualizado com sucesso!");
      fecharModal();
    } catch (error: unknown) {
      alert("Erro ao atualizar cliente");
      console.error(error);
    } finally {
      setSalvando(false);
    }
  };

  const fecharModal = () => setClienteEditando(null);

  return (
    <MainEmpresa>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-[#123859]">Total de Clientes</h1>

        {loading && <p className="text-gray-500">Carregando clientes...</p>}
        {erro && <p className="text-red-600">{erro}</p>}

        {/* Filtro por tipo */}
        <div className="flex gap-3 mb-4">
          {["todos", "empresa", "consumidor_final"].map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(tipo as "todos" | "empresa" | "consumidor_final")}
              className={`px-4 py-2 rounded-lg font-semibold ${
                filtroTipo === tipo ? "bg-[#123859] text-white" : "bg-white border"
              }`}
            >
              {tipo === "todos" && "Todos"}
              {tipo === "empresa" && "Empresas"}
              {tipo === "consumidor_final" && "Consumidor final"}
            </button>
          ))}
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm text-gray-500">Total de Clientes</p>
            <p className="text-xl font-bold">{clientes.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm text-gray-500">Empresas</p>
            <p className="text-xl font-bold">
              {clientes.filter((c) => c.tipo === "empresa").length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm text-gray-500">Consumidor Final</p>
            <p className="text-xl font-bold">
              {clientes.filter((c) => c.tipo === "consumidor_final").length}
            </p>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#123859] text-white">
              <tr>
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">Nome</th>
                <th className="p-3 text-left">Telefone</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Endereço</th>
                <th className="p-3 text-left">Tipo</th>
                <th className="p-3 text-left">NIF</th>
                <th className="p-3 text-left">Ações</th>
              </tr>
            </thead>

            <tbody>
              {clientesFiltrados.map((cliente) => (
                <tr key={cliente.id} className="border-b">
                  <td className="p-3">{cliente.id}</td>
                  <td className="p-3">{cliente.name}</td>
                  <td className="p-3">{cliente.telefone ?? "-"}</td>
                  <td className="p-3">{cliente.email ?? "-"}</td>
                  <td className="p-3">{cliente.endereco ?? "-"}</td>
                  <td className="p-3">{cliente.tipo}</td>
                  <td className="p-3">{cliente.nif ?? "-"}</td>
                  <td className="p-3 flex gap-2">
                    <button
                      className="text-green-600 flex items-center gap-1"
                      onClick={() => abrirEdicao(cliente)}
                    >
                      <Edit size={16} /> Editar
                    </button>

                    <button
                      className="text-red-600 flex items-center gap-1"
                      onClick={() => apagarCliente(cliente.id)}
                    >
                      <Trash2 size={16} /> Apagar
                    </button>
                  </td>
                </tr>
              ))}

              {clientesFiltrados.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-gray-500">
                    Nenhum cliente encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal de Edição */}
        {clienteEditando && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow p-6 w-full max-w-md relative">
              <button
                type="button"
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                onClick={fecharModal}
                aria-label="Fechar modal"
              >
                <X size={20} />
              </button>

              <h2 className="text-xl font-bold mb-4">Editar Cliente</h2>

              <div className="space-y-3">
                <div>
                  <label htmlFor="nome" className="block text-sm font-semibold mb-1">Nome *</label>
                  <input
                    id="nome"
                    type="text"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-[#123859]"
                  />
                </div>

                <div>
                  <label htmlFor="telefone" className="block text-sm font-semibold mb-1">Telefone</label>
                  <input
                    id="telefone"
                    type="text"
                    value={formTelefone}
                    onChange={(e) => setFormTelefone(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold mb-1">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label htmlFor="endereco" className="block text-sm font-semibold mb-1">Endereço</label>
                  <textarea
                    id="endereco"
                    value={formEndereco}
                    onChange={(e) => setFormEndereco(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                  />
                </div>

                <div>
                  <label htmlFor="tipo" className="block text-sm font-semibold mb-1">Tipo de Cliente</label>
                  <select
                    id="tipo"
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value as "empresa" | "consumidor_final")}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="consumidor_final">consumidor_final</option>
                    <option value="empresa">Empresa</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="nif" className="block text-sm font-semibold mb-1">
                    NIF {formTipo === "empresa" && "*"}
                  </label>
                  <input
                    id="nif"
                    type="text"
                    value={formNIF}
                    onChange={(e) => setFormNIF(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={salvarEdicao}
                    disabled={salvando}
                    className="bg-[#123859] text-white px-6 py-2 rounded font-semibold hover:bg-[#0f2a4a] transition disabled:opacity-50"
                  >
                    {salvando ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainEmpresa>
  );
}
