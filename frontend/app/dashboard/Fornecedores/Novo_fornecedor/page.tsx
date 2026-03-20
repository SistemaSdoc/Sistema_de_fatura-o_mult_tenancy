"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit2,
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
  History,
  ShieldAlert,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

  const carregarFornecedores = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ativos, deletados] = await Promise.all([
        fornecedorService.listarFornecedores(),
        fornecedorService.listarFornecedoresDeletados()
      ]);
      setFornecedores(ativos);
      setFornecedoresDeletados(deletados);
    } catch (error: any) {
      console.error('[PAGE] Erro:', error);
      toast.error("Erro ao carregar fornecedores");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarFornecedores();
  }, [carregarFornecedores]);

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
    }
    if (!formData.nif.trim()) {
      novosErrors.nif = "NIF é obrigatório";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarForm()) return;

    setIsSubmitting(true);

    try {
      if (fornecedorSelecionado) {
        await fornecedorService.atualizarFornecedor(fornecedorSelecionado.id, formData);
        toast.success("Fornecedor atualizado!");
      } else {
        await fornecedorService.criarFornecedor(formData);
        toast.success("Fornecedor criado!");
      }
      setIsModalOpen(false);
      carregarFornecedores();
    } catch (error: any) {
      toast.error("Erro ao salvar", {
        description: error.response?.data?.message || "Tente novamente",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletar = async () => {
    if (!fornecedorSelecionado) return;

    try {
      await fornecedorService.deletarFornecedor(fornecedorSelecionado.id);
      toast.success("Fornecedor movido para lixeira!");
      setIsDeleteModalOpen(false);
      carregarFornecedores();
    } catch (error: any) {
      toast.error("Erro ao deletar");
    }
  };

  const handleRestaurar = async () => {
    if (!fornecedorSelecionado) return;

    try {
      await fornecedorService.restaurarFornecedor(fornecedorSelecionado.id);
      toast.success("Fornecedor restaurado!");
      setIsRestoreModalOpen(false);
      carregarFornecedores();
    } catch (error: any) {
      toast.error("Erro ao restaurar");
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
      toast.error("Erro ao deletar permanentemente");
    }
  };

  const stats = {
    ativos: fornecedores.filter((f) => f.status === "ativo").length,
    inativos: fornecedores.filter((f) => f.status === "inativo").length,
    deletados: fornecedoresDeletados.length,
  };

  return (
    <MainEmpresa>
      <div className="p-3 space-y-3">
        {/* Header super compacto */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Fornecedores</h1>
            <p className="text-xs text-gray-500">Gerencie fornecedores nacionais e internacionais</p>
          </div>
          <Button onClick={handleNovo} size="sm" className="h-7 px-2 gap-1 text-xs">
            <Plus className="h-3 w-3" />
            Novo
          </Button>
        </div>

        {/* Barra de ferramentas compacta */}
        <div className="flex items-center gap-2">
          <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="flex-none">
            <TabsList className="h-7 p-0.5">
              <TabsTrigger value="ativos" className="text-xs px-2 py-0.5 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Ativos ({fornecedores.length})
              </TabsTrigger>
              <TabsTrigger value="lixeira" className="text-xs px-2 py-0.5 gap-1">
                <Archive className="h-3 w-3" />
                Lixeira ({fornecedoresDeletados.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Nome, NIF ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-6 h-7 text-xs"
            />
          </div>

          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-24 h-7 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-24 h-7 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Nacional">Nacional</SelectItem>
              <SelectItem value="Internacional">Internacional</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cards de estatísticas ultra compactos */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 dark:bg-gray-800 p-2 flex items-center justify-between border border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-500">Ativos</p>
              <p className="text-lg font-bold text-emerald-600">{stats.ativos}</p>
            </div>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-2 flex items-center justify-between border border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-500">Inativos</p>
              <p className="text-lg font-bold text-amber-600">{stats.inativos}</p>
            </div>
            <XCircle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-2 flex items-center justify-between border border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-500">Lixeira</p>
              <p className="text-lg font-bold text-red-600">{stats.deletados}</p>
            </div>
            <Archive className="h-4 w-4 text-red-500" />
          </div>
        </div>

        {/* Tabela de fornecedores - sem bordas arredondadas */}
        <div className="border border-gray-200 dark:border-gray-700 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          ) : fornecedoresFiltrados.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Truck className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Nenhum fornecedor encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-xs">Fornecedor / NIF</th>
                    <th className="text-left py-2 px-3 font-medium text-xs">Tipo</th>
                    <th className="text-left py-2 px-3 font-medium text-xs">Status</th>
                    <th className="text-left py-2 px-3 font-medium text-xs hidden md:table-cell">Contato</th>
                    <th className="text-right py-2 px-3 font-medium text-xs">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {fornecedoresFiltrados.map((fornecedor) => (
                    <tr key={fornecedor.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-2 px-3">
                        <div className="font-medium text-sm">{fornecedor.nome}</div>
                        <div className="text-xs text-gray-500 font-mono">{formatarNIF(fornecedor.nif)}</div>
                        {fornecedor.deleted_at && (
                          <div className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                            <History className="h-3 w-3" />
                            {new Date(fornecedor.deleted_at).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <Badge className={`${getTipoColor(fornecedor.tipo)} border-0 text-xs px-1.5 py-0`}>
                          {fornecedor.tipo === "Nacional" ? (
                            <Building2 className="mr-1 h-3 w-3" />
                          ) : (
                            <Globe className="mr-1 h-3 w-3" />
                          )}
                          {getTipoLabel(fornecedor.tipo)}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        <Badge className={`${getStatusColor(fornecedor.status)} border-0 text-xs px-1.5 py-0`}>
                          {fornecedor.status === "ativo" ? (
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                          ) : (
                            <XCircle className="mr-1 h-3 w-3" />
                          )}
                          {getStatusLabel(fornecedor.status)}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 hidden md:table-cell">
                        <div className="space-y-0.5 text-xs">
                          {fornecedor.telefone && (
                            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                              <Phone className="h-3 w-3" />
                              {fornecedor.telefone}
                            </div>
                          )}
                          {fornecedor.email && (
                            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">{fornecedor.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {abaAtiva === "ativos" ? (
                            <>
                              <button
                                onClick={() => handleEditar(fornecedor)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                title="Editar"
                              >
                                <Edit2 className="h-4 w-4 text-blue-500" />
                              </button>
                              <button
                                onClick={() => {
                                  setFornecedorSelecionado(fornecedor);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                title="Mover para lixeira"
                              >
                                <Archive className="h-4 w-4 text-amber-500" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setFornecedorSelecionado(fornecedor);
                                  setIsRestoreModalOpen(true);
                                }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                title="Restaurar"
                              >
                                <RotateCcw className="h-4 w-4 text-emerald-500" />
                              </button>
                              <button
                                onClick={() => {
                                  setFornecedorSelecionado(fornecedor);
                                  setIsForceDeleteModalOpen(true);
                                }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                title="Excluir permanentemente"
                              >
                                <Trash className="h-4 w-4 text-red-500" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Formulário */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {fornecedorSelecionado ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-2">
            <div>
              <Label className="text-xs font-medium">Nome *</Label>
              <Input
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className="h-7 text-xs mt-0.5"
              />
              {errors.nome && <p className="text-xs text-red-500 mt-0.5">{errors.nome}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium">NIF *</Label>
                <Input
                  name="nif"
                  value={formData.nif}
                  onChange={handleInputChange}
                  className="h-7 text-xs mt-0.5 font-mono"
                />
                {errors.nif && <p className="text-xs text-red-500 mt-0.5">{errors.nif}</p>}
              </div>
              <div>
                <Label className="text-xs font-medium">Tipo</Label>
                <Select value={formData.tipo} onValueChange={(v) => handleSelectChange("tipo", v)}>
                  <SelectTrigger className="h-7 text-xs mt-0.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nacional">Nacional</SelectItem>
                    <SelectItem value="Internacional">Internacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium">Telefone</Label>
                <Input
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleInputChange}
                  className="h-7 text-xs mt-0.5"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Email</Label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="h-7 text-xs mt-0.5"
                />
                {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email}</p>}
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Endereço</Label>
              <Textarea
                name="endereco"
                value={formData.endereco}
                onChange={handleInputChange}
                rows={2}
                className="text-xs mt-0.5"
              />
            </div>

            <div>
              <Label className="text-xs font-medium">Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleSelectChange("status", v)}>
                <SelectTrigger className="h-7 text-xs mt-0.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} size="sm" className="h-7 text-xs">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} size="sm" className="h-7 text-xs gap-1">
                {isSubmitting ? "Salvando..." : (fornecedorSelecionado ? "Atualizar" : "Criar")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Soft Delete */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-amber-600">
              <Archive className="h-4 w-4" />
              Mover para Lixeira
            </DialogTitle>
            <DialogDescription className="text-sm">
              Mover "{fornecedorSelecionado?.nome}" para a lixeira?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} size="sm" className="h-7 text-xs">
              Cancelar
            </Button>
            <Button onClick={handleDeletar} size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700">
              Mover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Restauração */}
      <Dialog open={isRestoreModalOpen} onOpenChange={setIsRestoreModalOpen}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-emerald-600">
              <RotateCcw className="h-4 w-4" />
              Restaurar
            </DialogTitle>
            <DialogDescription className="text-sm">
              Restaurar "{fornecedorSelecionado?.nome}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsRestoreModalOpen(false)} size="sm" className="h-7 text-xs">
              Cancelar
            </Button>
            <Button onClick={handleRestaurar} size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão Permanente */}
      <Dialog open={isForceDeleteModalOpen} onOpenChange={setIsForceDeleteModalOpen}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              Excluir Permanentemente
            </DialogTitle>
            <DialogDescription className="text-sm">
              Excluir permanentemente "{fornecedorSelecionado?.nome}"?
              <span className="block text-red-500 text-xs mt-1">Esta ação não pode ser desfeita!</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsForceDeleteModalOpen(false)} size="sm" className="h-7 text-xs">
              Cancelar
            </Button>
            <Button onClick={handleForceDelete} size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainEmpresa>
  );
}