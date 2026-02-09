
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MainEmpresa from "../../../components/MainEmpresa";
import {
  clienteService,
  Cliente,
  TipoCliente,
  CriarClienteInput,
  formatarNIF,
  getTipoClienteLabel,
  getTipoClienteColor
} from "@/services/clientes";
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";

// ===== COMPONENTES AUXILIARES =====

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-[#123859]">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading?: boolean;
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, loading }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {loading ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== FORMULÁRIO DE CLIENTE =====

interface FormClienteProps {
  cliente?: Cliente | null;
  onSubmit: (dados: CriarClienteInput) => void;
  onCancel: () => void;
  loading?: boolean;
}

function FormCliente({ cliente, onSubmit, onCancel, loading }: FormClienteProps) {
  const [formData, setFormData] = useState<CriarClienteInput>({
    nome: "",
    nif: "",
    tipo: "consumidor_final",
    telefone: "",
    email: "",
    endereco: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (cliente) {
      setFormData({
        nome: cliente.nome,
        nif: cliente.nif || "",
        tipo: cliente.tipo,
        telefone: cliente.telefone || "",
        email: cliente.email || "",
        endereco: cliente.endereco || "",
      });
    }
  }, [cliente]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome?.trim()) {
      newErrors.nome = "Nome é obrigatório";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }
    if (formData.nif && formData.nif.length < 10) {
      newErrors.nif = "NIF inválido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tipo de Cliente */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Tipo de Cliente
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label
            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              formData.tipo === "consumidor_final"
                ? "border-[#123859] bg-[#123859]/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="tipo"
              value="consumidor_final"
              checked={formData.tipo === "consumidor_final"}
              onChange={handleChange}
              className="hidden"
            />
            <User className={`w-5 h-5 ${formData.tipo === "consumidor_final" ? "text-[#123859]" : "text-gray-400"}`} />
            <div>
              <div className={`font-medium ${formData.tipo === "consumidor_final" ? "text-[#123859]" : "text-gray-700"}`}>
                Consumidor Final
              </div>
              <div className="text-xs text-gray-500">Particular</div>
            </div>
          </label>

          <label
            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              formData.tipo === "empresa"
                ? "border-[#F9941F] bg-[#F9941F]/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="tipo"
              value="empresa"
              checked={formData.tipo === "empresa"}
              onChange={handleChange}
              className="hidden"
            />
            <Building2 className={`w-5 h-5 ${formData.tipo === "empresa" ? "text-[#F9941F]" : "text-gray-400"}`} />
            <div>
              <div className={`font-medium ${formData.tipo === "empresa" ? "text-[#F9941F]" : "text-gray-700"}`}>
                Empresa
              </div>
              <div className="text-xs text-gray-500">Pessoa jurídica</div>
            </div>
          </label>
        </div>
      </div>

      {/* Nome */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nome {formData.tipo === "empresa" ? "da Empresa" : "Completo"} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="nome"
          value={formData.nome}
          onChange={handleChange}
          placeholder={formData.tipo === "empresa" ? "Ex: Empresa XYZ, Lda" : "Ex: João Silva"}
          className={`w-full px-4 py-2.5 rounded-lg border ${
            errors.nome ? "border-red-500" : "border-gray-300"
          } focus:ring-2 focus:ring-[#123859] outline-none transition-all`}
        />
        {errors.nome && <p className="mt-1 text-sm text-red-500">{errors.nome}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* NIF */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            NIF {formData.tipo === "empresa" && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            name="nif"
            value={formData.nif}
            onChange={handleChange}
            placeholder="000000000LA000"
            className={`w-full px-4 py-2.5 rounded-lg border ${
              errors.nif ? "border-red-500" : "border-gray-300"
            } focus:ring-2 focus:ring-[#123859] outline-none transition-all`}
          />
          {errors.nif && <p className="mt-1 text-sm text-red-500">{errors.nif}</p>}
        </div>

        {/* Telefone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefone
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              name="telefone"
              value={formData.telefone}
              onChange={handleChange}
              placeholder="+244 900 000 000"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="email@exemplo.com"
            className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${
              errors.email ? "border-red-500" : "border-gray-300"
            } focus:ring-2 focus:ring-[#123859] outline-none transition-all`}
          />
        </div>
        {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
      </div>

      {/* Endereço */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Endereço
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <textarea
            name="endereco"
            value={formData.endereco}
            onChange={handleChange}
            rows={3}
            placeholder="Rua, número, bairro, cidade..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] outline-none transition-all resize-none"
          />
        </div>
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-[#123859] hover:bg-[#1a4d7a] text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {cliente ? "Atualizar" : "Criar"} Cliente
        </button>
      </div>
    </form>
  );
}

// ===== PÁGINA PRINCIPAL =====

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  // Modais
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [modalConfirmAberto, setModalConfirmAberto] = useState(false);

  // Cliente selecionado
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);

  // Loading de ações
  const [loadingAcao, setLoadingAcao] = useState(false);

  useEffect(() => {
    carregarClientes();
  }, []);

  useEffect(() => {
    const termo = busca.toLowerCase();
    const filtrados = clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(termo) ||
        (c.nif && c.nif.toLowerCase().includes(termo)) ||
        (c.email && c.email.toLowerCase().includes(termo)) ||
        (c.telefone && c.telefone.includes(termo))
    );
    setClientesFiltrados(filtrados);
  }, [busca, clientes]);

  async function carregarClientes() {
    setLoading(true);
    try {
      console.log('[PAGE] Carregando clientes...');
      const data = await clienteService.listarClientes();
      console.log('[PAGE] Clientes recebidos:', data.length);
      setClientes(data);
      setClientesFiltrados(data);
    } catch (error) {
      console.error('[PAGE] Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  }

  function abrirCriar() {
    setClienteSelecionado(null);
    setModalFormAberto(true);
  }

  function abrirEditar(cliente: Cliente) {
    setClienteSelecionado(cliente);
    setModalFormAberto(true);
  }

  function abrirDetalhes(cliente: Cliente) {
    setClienteSelecionado(cliente);
    setModalDetalhesAberto(true);
  }

  function abrirExcluir(cliente: Cliente) {
    setClienteSelecionado(cliente);
    setModalConfirmAberto(true);
  }

  async function handleSubmit(dados: CriarClienteInput) {
    setLoadingAcao(true);
    try {
      if (clienteSelecionado) {
        await clienteService.atualizarCliente(clienteSelecionado.id, dados);
      } else {
        await clienteService.criarCliente(dados);
      }
      setModalFormAberto(false);
      await carregarClientes();
    } catch (error: any) {
      alert(error.response?.data?.message || "Erro ao salvar cliente");
    } finally {
      setLoadingAcao(false);
    }
  }

  async function handleExcluir() {
    if (!clienteSelecionado) return;

    setLoadingAcao(true);
    try {
      console.log('[PAGE] Iniciando exclusão do cliente:', clienteSelecionado.id);
      
      await clienteService.deletarCliente(clienteSelecionado.id);
      
      console.log('[PAGE] Cliente deletado com sucesso, aguardando...');
      
      // Aguarda para garantir que o backend processou
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('[PAGE] Recarregando lista de clientes...');
      await carregarClientes();
      
      console.log('[PAGE] Lista recarregada. Total:', clientes.length);
      
      setModalConfirmAberto(false);
      setClienteSelecionado(null);
    } catch (error: any) {
      console.error('[PAGE] Erro ao excluir:', error);
      alert(error.response?.data?.message || "Erro ao excluir cliente");
    } finally {
      setLoadingAcao(false);
    }
  }

  return (
    <MainEmpresa>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#123859]">Clientes</h1>
            <p className="text-gray-500 mt-1">Gerencie seus clientes e empresas</p>
          </div>
          <button
            onClick={abrirCriar}
            className="flex items-center gap-2 px-4 py-2 bg-[#F9941F] text-white rounded-lg hover:bg-[#e08516] transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Novo Cliente
          </button>
        </div>

        {/* Estatísticas rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#123859]/10 rounded-lg">
                <Users className="w-6 h-6 text-[#123859]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{clientes.length}</p>
                <p className="text-sm text-gray-500">Total de Clientes</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {clientes.filter((c) => c.tipo === "empresa").length}
                </p>
                <p className="text-sm text-gray-500">Empresas</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-lg">
                <User className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {clientes.filter((c) => c.tipo === "consumidor_final").length}
                </p>
                <p className="text-sm text-gray-500">Consumidores Finais</p>
              </div>
            </div>
          </div>
        </div>

        {/* Busca */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, NIF, email ou telefone..."
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] outline-none transition-all"
            />
          </div>
        </div>

        {/* Lista de Clientes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[#123859]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="py-4 px-6 text-left font-semibold text-gray-700 uppercase text-xs">Cliente</th>
                    <th className="py-4 px-6 text-left font-semibold text-gray-700 uppercase text-xs">Tipo</th>
                    <th className="py-4 px-6 text-left font-semibold text-gray-700 uppercase text-xs">Contacto</th>
                    <th className="py-4 px-6 text-left font-semibold text-gray-700 uppercase text-xs">NIF</th>
                    <th className="py-4 px-6 text-center font-semibold text-gray-700 uppercase text-xs">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clientesFiltrados.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            cliente.tipo === "empresa" ? "bg-blue-100" : "bg-gray-100"
                          }`}>
                            {cliente.tipo === "empresa" ? (
                              <Building2 className="w-5 h-5 text-blue-600" />
                            ) : (
                              <User className="w-5 h-5 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{cliente.nome}</div>
                            {cliente.email && (
                              <div className="text-xs text-gray-500">{cliente.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTipoClienteColor(cliente.tipo)}`}>
                          {getTipoClienteLabel(cliente.tipo)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {cliente.telefone ? (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Phone className="w-3.5 h-3.5" />
                            {cliente.telefone}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-mono text-gray-600">
                        {formatarNIF(cliente.nif)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => abrirDetalhes(cliente)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => abrirEditar(cliente)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => abrirExcluir(cliente)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {clientesFiltrados.length === 0 && (
                <div className="text-center py-16">
                  <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">
                    {busca ? "Nenhum cliente encontrado para a busca" : "Nenhum cliente cadastrado"}
                  </p>
                  {busca && (
                    <button
                      onClick={() => setBusca("")}
                      className="mt-2 text-[#123859] hover:underline"
                    >
                      Limpar busca
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Formulário (Criar/Editar) */}
      <Modal
        isOpen={modalFormAberto}
        onClose={() => setModalFormAberto(false)}
        title={clienteSelecionado ? "Editar Cliente" : "Novo Cliente"}
      >
        <FormCliente
          cliente={clienteSelecionado}
          onSubmit={handleSubmit}
          onCancel={() => setModalFormAberto(false)}
          loading={loadingAcao}
        />
      </Modal>

      {/* Modal de Detalhes */}
      <Modal
        isOpen={modalDetalhesAberto}
        onClose={() => setModalDetalhesAberto(false)}
        title="Detalhes do Cliente"
      >
        {clienteSelecionado && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                clienteSelecionado.tipo === "empresa" ? "bg-blue-100" : "bg-gray-100"
              }`}>
                {clienteSelecionado.tipo === "empresa" ? (
                  <Building2 className="w-8 h-8 text-blue-600" />
                ) : (
                  <User className="w-8 h-8 text-gray-600" />
                )}
              </div>
              <div>
                <h4 className="text-xl font-semibold text-gray-900">{clienteSelecionado.nome}</h4>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${getTipoClienteColor(clienteSelecionado.tipo)}`}>
                  {getTipoClienteLabel(clienteSelecionado.tipo)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Telefone</p>
                    <p className="font-medium">{clienteSelecionado.telefone || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium">{clienteSelecionado.email || "-"}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Data de Registro</p>
                    <p className="font-medium">
                      {new Date(clienteSelecionado.data_registro).toLocaleDateString("pt-PT")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">NIF</p>
                    <p className="font-medium font-mono">{formatarNIF(clienteSelecionado.nif)}</p>
                  </div>
                </div>
              </div>
            </div>

            {clienteSelecionado.endereco && (
              <div className="flex items-start gap-3 text-gray-600 pt-4 border-t border-gray-200">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Endereço</p>
                  <p className="font-medium">{clienteSelecionado.endereco}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-6">
              <button
                onClick={() => {
                  setModalDetalhesAberto(false);
                  abrirEditar(clienteSelecionado);
                }}
                className="flex-1 px-4 py-2.5 bg-[#123859] hover:bg-[#1a4d7a] text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={modalConfirmAberto}
        onClose={() => setModalConfirmAberto(false)}
        onConfirm={handleExcluir}
        title="Excluir Cliente"
        message={`Tem certeza que deseja excluir o cliente "${clienteSelecionado?.nome}"? Esta ação não pode ser desfeita.`}
        loading={loadingAcao}
      />
    </MainEmpresa>
  );
}