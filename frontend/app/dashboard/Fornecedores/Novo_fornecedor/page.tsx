"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit2,
  MoreVertical,
  Building2,
  Globe,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Truck,
  Archive,
  RotateCcw,
  Trash,
  History
} from "lucide-react";
import MainEmpresa from "../../../components/MainEmpresa";
import {
  fornecedorService,
  Fornecedor,
  getStatusColor,
  getTipoColor,
  getStatusLabel,
  getTipoLabel,
  formatarNIF
} from "@/services/fornecedores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FormFornecedorData {
  nome: string;
  nif: string;
  telefone: string;
  email: string;
  endereco: string;
  tipo: "Nacional" | "Internacional";
  status: "ativo" | "inativo";
}

const INITIAL_FORM_DATA: FormFornecedorData = {
  nome: "",
  nif: "",
  telefone: "",
  email: "",
  endereco: "",
  tipo: "Nacional",
  status: "ativo",
};

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedoresDeletados, setFornecedoresDeletados] = useState<Fornecedor[]>([]);
  const [fornecedoresFiltrados, setFornecedoresFiltrados] = useState<Fornecedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [abaAtiva, setAbaAtiva] = useState<string>("ativos");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isForceDeleteModalOpen, setIsForceDeleteModalOpen] = useState(false);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<Fornecedor | null>(null);
  const [formData, setFormData] = useState<FormFornecedorData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormFornecedorData, string>>>({});

  const carregarFornecedores = async () => {
    try {
      setIsLoading(true);
      const [ativos, deletados] = await Promise.all([
        fornecedorService.listarFornecedores(),
        fornecedorService.listarFornecedoresDeletados()
      ]);
      setFornecedores(ativos);
      setFornecedoresDeletados(deletados);
    } catch (error: any) {
      toast.error("Erro ao carregar fornecedores", {
        description: error.response?.data?.message || "Tente novamente mais tarde",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarFornecedores();
  }, []);

  useEffect(() => {
    let filtrados = abaAtiva === "ativos" ? fornecedores : fornecedoresDeletados;

    if (searchTerm) {
      filtrados = filtrados.filter((f) =>
        f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.nif.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filtroStatus !== "todos") {
      filtrados = filtrados.filter((f) => f.status === filtroStatus);
    }

    if (filtroTipo !== "todos") {
      filtrados = filtrados.filter((f) => f.tipo === filtroTipo);
    }

    setFornecedoresFiltrados(filtrados);
  }, [searchTerm, filtroStatus, filtroTipo, fornecedores, fornecedoresDeletados, abaAtiva]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormFornecedorData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormFornecedorData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validarForm = (): boolean => {
    const novosErrors: Partial<Record<keyof FormFornecedorData, string>> = {};

    if (!formData.nome.trim()) {
      novosErrors.nome = "Nome é obrigatório";
    } else if (formData.nome.length > 255) {
      novosErrors.nome = "Nome deve ter no máximo 255 caracteres";
    }

    if (!formData.nif.trim()) {
      novosErrors.nif = "NIF é obrigatório";
    } else if (formData.nif.length > 50) {
      novosErrors.nif = "NIF deve ter no máximo 50 caracteres";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      novosErrors.email = "Email inválido";
    }

    setErrors(novosErrors);
    return Object.keys(novosErrors).length === 0;
  };

  const handleNovo = () => {
    setFornecedorSelecionado(null);
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEditar = (fornecedor: Fornecedor) => {
    setFornecedorSelecionado(fornecedor);
    setFormData({
      nome: fornecedor.nome,
      nif: fornecedor.nif,
      telefone: fornecedor.telefone || "",
      email: fornecedor.email || "",
      endereco: fornecedor.endereco || "",
      tipo: fornecedor.tipo,
      status: fornecedor.status,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleConfirmarDelete = (fornecedor: Fornecedor) => {
    setFornecedorSelecionado(fornecedor);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmarRestore = (fornecedor: Fornecedor) => {
    setFornecedorSelecionado(fornecedor);
    setIsRestoreModalOpen(true);
  };

  const handleConfirmarForceDelete = (fornecedor: Fornecedor) => {
    setFornecedorSelecionado(fornecedor);
    setIsForceDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validarForm()) return;

    setIsSubmitting(true);

    try {
      if (fornecedorSelecionado) {
        await fornecedorService.atualizarFornecedor(
          fornecedorSelecionado.id,
          formData
        );
        toast.success("Fornecedor atualizado com sucesso!");
      } else {
        await fornecedorService.criarFornecedor(formData);
        toast.success("Fornecedor criado com sucesso!");
      }

      setIsModalOpen(false);
      carregarFornecedores();
    } catch (error: any) {
      const message = error.response?.data?.message || "Erro ao salvar fornecedor";
      const errors = error.response?.data?.errors;

      if (errors) {
        const formattedErrors: Record<string, string> = {};
        Object.keys(errors).forEach((key) => {
          formattedErrors[key] = errors[key][0];
        });
        setErrors(formattedErrors);
      }

      toast.error("Erro ao salvar", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletar = async () => {
    if (!fornecedorSelecionado) return;

    try {
      await fornecedorService.deletarFornecedor(fornecedorSelecionado.id);
      toast.success("Fornecedor movido para a lixeira!");
      setIsDeleteModalOpen(false);
      carregarFornecedores();
    } catch (error: any) {
      toast.error("Erro ao deletar", {
        description: error.response?.data?.message || "Não foi possível deletar",
      });
    }
  };

  const handleRestaurar = async () => {
    if (!fornecedorSelecionado) return;

    try {
      await fornecedorService.restaurarFornecedor(fornecedorSelecionado.id);
      toast.success("Fornecedor restaurado com sucesso!");
      setIsRestoreModalOpen(false);
      carregarFornecedores();
    } catch (error: any) {
      toast.error("Erro ao restaurar", {
        description: error.response?.data?.message || "Não foi possível restaurar",
      });
    }
  };

  const handleForceDelete = async () => {
    if (!fornecedorSelecionado) return;

    try {
      await fornecedorService.deletarFornecedorPermanente(fornecedorSelecionado.id);
      toast.success("Fornecedor removido permanentemente!");
      setIsForceDeleteModalOpen(false);
      carregarFornecedores();
    } catch (error: any) {
      toast.error("Erro ao deletar", {
        description: error.response?.data?.message || "Não foi possível remover permanentemente",
      });
    }
  };

  const stats = {
    total: fornecedores.length + fornecedoresDeletados.length,
    ativos: fornecedores.filter((f) => f.status === "ativo").length,
    inativos: fornecedores.filter((f) => f.status === "inativo").length,
    nacionais: fornecedores.filter((f) => f.tipo === "Nacional").length,
    internacionais: fornecedores.filter((f) => f.tipo === "Internacional").length,
    deletados: fornecedoresDeletados.length,
  };

  const renderTabelaFornecedores = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 dark:bg-slate-800/50">
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300 text-sm">
              Nome / NIF
            </th>
            <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300 text-sm">
              Tipo
            </th>
            <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300 text-sm">
              Status
            </th>
            <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300 text-sm hidden lg:table-cell">
              Contato
            </th>
            <th className="text-right py-3 px-4 font-medium text-slate-700 dark:text-slate-300 text-sm">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {fornecedoresFiltrados.map((fornecedor) => (
            <tr
              key={fornecedor.id}
              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <td className="py-3 px-4">
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {fornecedor.nome}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                  {formatarNIF(fornecedor.nif)}
                </div>
                {fornecedor.deleted_at && (
                  <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <History className="h-3 w-3" />
                    Deletado em: {new Date(fornecedor.deleted_at).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </td>
              <td className="py-3 px-4">
                <Badge
                  variant="secondary"
                  className={`${getTipoColor(fornecedor.tipo)} border-0 font-medium`}
                >
                  {fornecedor.tipo === "Nacional" ? (
                    <Building2 className="mr-1 h-3 w-3" />
                  ) : (
                    <Globe className="mr-1 h-3 w-3" />
                  )}
                  {getTipoLabel(fornecedor.tipo)}
                </Badge>
              </td>
              <td className="py-3 px-4">
                <Badge
                  variant="secondary"
                  className={`${getStatusColor(fornecedor.status)} border-0 font-medium`}
                >
                  {fornecedor.status === "ativo" ? (
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                  ) : (
                    <XCircle className="mr-1 h-3 w-3" />
                  )}
                  {getStatusLabel(fornecedor.status)}
                </Badge>
              </td>
              <td className="py-3 px-4 hidden lg:table-cell">
                <div className="space-y-1 text-sm">
                  {fornecedor.telefone && (
                    <div className="flex items-center text-slate-600 dark:text-slate-400">
                      <Phone className="h-3 w-3 mr-2 text-slate-400" />
                      {fornecedor.telefone}
                    </div>
                  )}
                  {fornecedor.email && (
                    <div className="flex items-center text-slate-600 dark:text-slate-400">
                      <Mail className="h-3 w-3 mr-2 text-slate-400" />
                      <span className="truncate max-w-[200px]">{fornecedor.email}</span>
                    </div>
                  )}
                  {!fornecedor.telefone && !fornecedor.email && (
                    <span className="text-slate-400 dark:text-slate-600 italic text-sm">
                      Sem contato
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {abaAtiva === "ativos" ? (
                      <>
                        <DropdownMenuItem
                          onClick={() => handleEditar(fornecedor)}
                          className="gap-2 cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4 text-blue-500" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleConfirmarDelete(fornecedor)}
                          className="gap-2 cursor-pointer text-amber-600 focus:text-amber-600 focus:bg-amber-50"
                        >
                          <Archive className="h-4 w-4" />
                          Mover para Lixeira
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem
                          onClick={() => handleConfirmarRestore(fornecedor)}
                          className="gap-2 cursor-pointer text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Restaurar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleConfirmarForceDelete(fornecedor)}
                          className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash className="h-4 w-4" />
                          Excluir Permanentemente
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <MainEmpresa>
      <div className="flex flex-col gap-6 p-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Fornecedores
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Gerencie os fornecedores nacionais e internacionais
            </p>
          </div>
          <Button
            onClick={handleNovo}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4" />
            Novo Fornecedor
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Total
              </CardTitle>
              <Truck className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.total}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Ativos
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {stats.ativos}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Nacionais
              </CardTitle>
              <Building2 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.nacionais}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Internacionais
              </CardTitle>
              <Globe className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {stats.internacionais}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700 border-red-200 dark:border-red-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
                Na Lixeira
              </CardTitle>
              <Archive className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.deletados}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs e Filtros */}
        <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="w-full">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <TabsList className="bg-slate-100 dark:bg-slate-800">
              <TabsTrigger value="ativos" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Ativos ({fornecedores.length})
              </TabsTrigger>
              <TabsTrigger value="lixeira" className="gap-2 text-red-600 data-[state=active]:bg-red-50 data-[state=active]:text-red-700">
                <Archive className="h-4 w-4" />
                Lixeira ({fornecedoresDeletados.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar por nome, NIF ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[140px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <Filter className="mr-2 h-4 w-4 text-slate-500" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-[160px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <Filter className="mr-2 h-4 w-4 text-slate-500" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Tipos</SelectItem>
                  <SelectItem value="Nacional">Nacional</SelectItem>
                  <SelectItem value="Internacional">Internacional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="ativos" className="mt-0">
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg text-slate-900 dark:text-slate-100">
                  Fornecedores Ativos
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({fornecedoresFiltrados.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
                  </div>
                ) : fornecedoresFiltrados.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Truck className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Nenhum fornecedor encontrado
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                      {searchTerm || filtroStatus !== "todos" || filtroTipo !== "todos"
                        ? "Tente ajustar os filtros de busca"
                        : "Clique em 'Novo Fornecedor' para começar"}
                    </p>
                  </div>
                ) : (
                  renderTabelaFornecedores()
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lixeira" className="mt-0">
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader className="border-b border-red-100 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/20">
                <CardTitle className="text-lg text-red-900 dark:text-red-100 flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  Lixeira
                  <span className="ml-2 text-sm font-normal text-red-600 dark:text-red-400">
                    ({fornecedoresFiltrados.length} itens)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600" />
                  </div>
                ) : fornecedoresFiltrados.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Archive className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Lixeira vazia
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                      Não há fornecedores deletados
                    </p>
                  </div>
                ) : (
                  renderTabelaFornecedores()
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Formulário */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">
              {fornecedorSelecionado ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              {fornecedorSelecionado
                ? "Atualize as informações do fornecedor abaixo."
                : "Preencha as informações para cadastrar um novo fornecedor."
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-4">

            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-slate-700 dark:text-slate-300">
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                placeholder="Nome da empresa ou pessoa"
                className={`bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 ${errors.nome ? "border-red-500 focus-visible:ring-red-500" : ""
                  }`}
              />
              {errors.nome && (
                <p className="text-sm text-red-500">{errors.nome}</p>
              )}
            </div>

            {/* NIF e Tipo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nif" className="text-slate-700 dark:text-slate-300">
                  NIF <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nif"
                  name="nif"
                  value={formData.nif}
                  onChange={handleInputChange}
                  placeholder="0000000000"
                  className={`bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono ${errors.nif ? "border-red-500 focus-visible:ring-red-500" : ""
                    }`}
                />
                {errors.nif && (
                  <p className="text-sm text-red-500">{errors.nif}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => handleSelectChange("tipo", value)}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nacional">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-500" />
                        Nacional
                      </div>
                    </SelectItem>
                    <SelectItem value="Internacional">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-amber-500" />
                        Internacional
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contato */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefone" className="text-slate-700 dark:text-slate-300">
                  Telefone
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="telefone"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    placeholder="+244 900 000 000"
                    className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="email@empresa.com"
                    className={`pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 ${errors.email ? "border-red-500 focus-visible:ring-red-500" : ""
                      }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-2">
              <Label htmlFor="endereco" className="text-slate-700 dark:text-slate-300">
                Endereço
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Textarea
                  id="endereco"
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleInputChange}
                  placeholder="Rua, número, bairro, cidade..."
                  rows={2}
                  className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 resize-none"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleSelectChange("status", value)}
              >
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Ativo
                    </div>
                  </SelectItem>
                  <SelectItem value="inativo">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Inativo
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {fornecedorSelecionado ? "Atualizar" : "Criar"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Soft Delete */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px] border-amber-200 dark:border-amber-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Archive className="h-5 w-5" />
              Mover para Lixeira
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Tem certeza que deseja mover o fornecedor{" "}
              <strong className="text-slate-900 dark:text-slate-100">"{fornecedorSelecionado?.nome}"</strong>{" "}
              para a lixeira?
              <br />
              <span className="text-sm text-slate-500">
                Você poderá restaurá-lo posteriormente.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="border-slate-200 dark:border-slate-700"
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={handleDeletar}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Archive className="h-4 w-4" />
              Mover para Lixeira
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Restauração */}
      <Dialog open={isRestoreModalOpen} onOpenChange={setIsRestoreModalOpen}>
        <DialogContent className="sm:max-w-[400px] border-emerald-200 dark:border-emerald-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <RotateCcw className="h-5 w-5" />
              Restaurar Fornecedor
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Tem certeza que deseja restaurar o fornecedor{" "}
              <strong className="text-slate-900 dark:text-slate-100">"{fornecedorSelecionado?.nome}"</strong>?
              <br />
              <span className="text-sm text-slate-500">
                O fornecedor voltará a aparecer na lista de ativos.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setIsRestoreModalOpen(false)}
              className="border-slate-200 dark:border-slate-700"
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={handleRestaurar}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão Permanente */}
      <Dialog open={isForceDeleteModalOpen} onOpenChange={setIsForceDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px] border-red-200 dark:border-red-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Excluir Permanentemente
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Tem certeza que deseja excluir permanentemente o fornecedor{" "}
              <strong className="text-slate-900 dark:text-slate-100">"{fornecedorSelecionado?.nome}"</strong>?
              <br />
              <span className="text-sm text-red-500 font-medium">
                ⚠️ Esta ação não pode ser desfeita!
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setIsForceDeleteModalOpen(false)}
              className="border-slate-200 dark:border-slate-700"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleForceDelete}
              className="gap-2 bg-red-600 hover:bg-red-700"
            >
              <Trash className="h-4 w-4" />
              Excluir Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainEmpresa>
  );
}