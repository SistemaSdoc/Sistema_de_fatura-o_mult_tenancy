"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Trash2,
  MoreVertical,
  Package,
  Wrench,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  LayoutGrid,
  Percent,
  Receipt,
  RotateCcw,
  Database,
  PencilLine,
} from "lucide-react";
import { useRouter } from "next/navigation";
import MainEmpresa from "../../../components/MainEmpresa";
import {
  categoriaService,
  Categoria,
  getStatusLabel,
  getTipoLabel,
  getTaxaIVALabel,
  getTaxaIVAColor,
  getCodigoIsencaoLabel,
  CodigoIsencao,
  TaxaIVA,
} from "@/services/categorias";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useThemeColors } from "@/context/ThemeContext";

// Interface para o formulário
interface FormCategoriaData {
  nome: string;
  descricao: string;
  status: "ativo" | "inativo";
  tipo: "produto" | "servico";
  taxa_iva: TaxaIVA;
  sujeito_iva: boolean;
  codigo_isencao: CodigoIsencao | "";
}

const INITIAL_FORM_DATA: FormCategoriaData = {
  nome: "",
  descricao: "",
  status: "ativo",
  tipo: "produto",
  taxa_iva: 14,
  sujeito_iva: true,
  codigo_isencao: "",
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
  error?: string;
};

const getApiError = (error: unknown): ApiError =>
  typeof error === "object" && error !== null ? (error as ApiError) : {};

export default function CategoriasPage() {
  const colors = useThemeColors();

  // Estados principais
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasDeletadas, setCategoriasDeletadas] = useState<Categoria[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("ativas");
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroStatus] = useState<string>("todos");
  const [filtroTipo] = useState<string>("todos");
  const [filtroIVA] = useState<string>("todos");

  // Estados do modal/formulário
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isForceDeleteModalOpen, setIsForceDeleteModalOpen] = useState(false);
  const [categoriaSelecionada, setCategoriaSelecionada] =
    useState<Categoria | null>(null);
  const [formData, setFormData] =
    useState<FormCategoriaData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormCategoriaData, string>>
  >({});

  // Carregar categorias ativas
  const carregarCategorias = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await categoriaService.listarCategorias();
      setCategorias(response.categorias);
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error("Erro ao carregar categorias", {
        description:
          apiError.response?.data?.message || "Tente novamente mais tarde",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar categorias deletadas
  const carregarCategoriasDeletadas = useCallback(async () => {
    try {
      const response = await categoriaService.listarCategoriasDeletadas();
      setCategoriasDeletadas(response.categorias);
    } catch (error: unknown) {
      console.error("Erro ao carregar categorias deletadas:", error);
    }
  }, []);

  const router = useRouter();

  useEffect(() => {
    carregarCategorias();
    carregarCategoriasDeletadas();
  }, [carregarCategorias, carregarCategoriasDeletadas]);

  // Filtrar categorias ativas
  const categoriasFiltradas = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();
    let filtradas = categorias;

    if (termo) {
      filtradas = filtradas.filter(
        (cat) =>
          cat.nome.toLowerCase().includes(termo) ||
          cat.descricao?.toLowerCase().includes(termo),
      );
    }

    if (filtroStatus !== "todos") {
      filtradas = filtradas.filter((cat) => cat.status === filtroStatus);
    }

    if (filtroTipo !== "todos") {
      filtradas = filtradas.filter((cat) => cat.tipo === filtroTipo);
    }

    if (filtroIVA !== "todos") {
      if (filtroIVA === "isento") {
        filtradas = filtradas.filter(
          (cat) => !cat.sujeito_iva || cat.taxa_iva === 0,
        );
      } else {
        filtradas = filtradas.filter(
          (cat) => cat.taxa_iva === Number(filtroIVA),
        );
      }
    }

    return filtradas;
  }, [searchTerm, filtroStatus, filtroTipo, filtroIVA, categorias]);

  // Handlers do formulário
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormCategoriaData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormCategoriaData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSujeitoIVAChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      sujeito_iva: checked,
      taxa_iva: checked ? prev.taxa_iva : 0,
      codigo_isencao: checked ? "" : prev.codigo_isencao,
    }));
  };

  const handleTaxaIVAChange = (value: string) => {
    const taxa = Number(value) as TaxaIVA;
    setFormData((prev) => ({
      ...prev,
      taxa_iva: taxa,
      sujeito_iva: taxa === 0 ? false : true,
      codigo_isencao: taxa === 0 ? prev.codigo_isencao : "",
    }));
  };

  const validarForm = (): boolean => {
    const novosErrors: Partial<Record<keyof FormCategoriaData, string>> = {};

    if (!formData.nome.trim()) {
      novosErrors.nome = "Nome é obrigatório";
    } else if (formData.nome.length > 255) {
      novosErrors.nome = "Nome deve ter no máximo 255 caracteres";
    }

    if (!formData.sujeito_iva && !formData.codigo_isencao) {
      novosErrors.codigo_isencao =
        "Código de isenção é obrigatório para categorias isentas";
    }

    setErrors(novosErrors);
    return Object.keys(novosErrors).length === 0;
  };

  const handleNovo = () => {
    setCategoriaSelecionada(null);
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEditar = (categoria: Categoria) => {
    setCategoriaSelecionada(categoria);
    setFormData({
      nome: categoria.nome,
      descricao: categoria.descricao || "",
      status: categoria.status,
      tipo: categoria.tipo,
      taxa_iva: categoria.taxa_iva as TaxaIVA,
      sujeito_iva: categoria.sujeito_iva,
      codigo_isencao: categoria.codigo_isencao || "",
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validarForm()) return;

    setIsSubmitting(true);

    try {
      const dadosParaEnviar = {
        nome: formData.nome,
        descricao: formData.descricao || undefined,
        status: formData.status,
        tipo: formData.tipo,
        taxa_iva: formData.taxa_iva,
        sujeito_iva: formData.sujeito_iva,
      };

      if (categoriaSelecionada) {
        await categoriaService.atualizarCategoria(
          categoriaSelecionada.id,
          dadosParaEnviar,
        );
        toast.success("Categoria atualizada com sucesso!");
      } else {
        await categoriaService.criarCategoria(dadosParaEnviar);
        toast.success("Categoria criada com sucesso!");
      }

      setIsModalOpen(false);
      await carregarCategorias();
      await carregarCategoriasDeletadas();
    } catch (error: unknown) {
      const apiError = getApiError(error);
      const message =
        apiError.response?.data?.message || "Erro ao salvar categoria";
      toast.error("Erro ao salvar", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmarDelete = (categoria: Categoria) => {
    setCategoriaSelecionada(categoria);
    setIsDeleteModalOpen(true);
  };

  const handleDeletar = async () => {
    if (!categoriaSelecionada) return;

    try {
      await categoriaService.deletarCategoria(categoriaSelecionada.id);
      toast.success("Categoria movida para a lixeira!");
      setIsDeleteModalOpen(false);
      await carregarCategorias();
      await carregarCategoriasDeletadas();
    } catch (error: unknown) {
      const apiError = getApiError(error);
      const message =
        apiError.response?.data?.message || "Não foi possível deletar";

      if (apiError.error === "produtos_activos") {
        toast.error("Não é possível eliminar", {
          description: message,
          duration: 6000,
        });
      } else {
        toast.error("Erro ao deletar", { description: message });
      }
    }
  };

  const handleConfirmarRestore = (categoria: Categoria) => {
    setCategoriaSelecionada(categoria);
    setIsRestoreModalOpen(true);
  };

  const handleRestaurar = async () => {
    if (!categoriaSelecionada) return;

    try {
      await categoriaService.restaurarCategoria(categoriaSelecionada.id);
      toast.success("Categoria restaurada com sucesso!");
      setIsRestoreModalOpen(false);
      await carregarCategorias();
      await carregarCategoriasDeletadas();
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error("Erro ao restaurar", {
        description: apiError.response?.data?.message || "Tente novamente",
      });
    }
  };

  const handleConfirmarForceDelete = (categoria: Categoria) => {
    setCategoriaSelecionada(categoria);
    setIsForceDeleteModalOpen(true);
  };

  const handleForceDelete = async () => {
    if (!categoriaSelecionada) return;

    try {
      await categoriaService.forcarDeleteCategoria(categoriaSelecionada.id);
      toast.success("Categoria excluída permanentemente!");
      setIsForceDeleteModalOpen(false);
      await carregarCategorias();
      await carregarCategoriasDeletadas();
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error("Erro ao excluir permanentemente", {
        description: apiError.response?.data?.message || "Tente novamente",
      });
    }
  };

  const stats = useMemo(() => ({
    ativas: {
      total: categorias.length,
      ativos: categorias.filter((c) => c.status === "ativo").length,
      produtos: categorias.filter((c) => c.tipo === "produto").length,
      servicos: categorias.filter((c) => c.tipo === "servico").length,
    },
    lixeira: {
      total: categoriasDeletadas.length,
    },
  }), [categorias, categoriasDeletadas.length]);

  return (
    <MainEmpresa>
      <div
        className="flex flex-col gap-4 p-4 transition-colors duration-300"
        style={{ backgroundColor: colors.background }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: colors.secondary }}
            >
              Categorias
            </h1>
            <p className="text-xs" style={{ color: colors.textSecondary }}>
              Gerencie categorias de produtos e serviços
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNovo}
              className="flex items-center gap-2 px-4 py-2 text-white transition-colors text-sm font-medium hover:opacity-90"
              style={{ backgroundColor: colors.secondary }}
            >
              <Plus className="w-4 h-4" />
              Nova categoria
            </button>

            <button
              onClick={() =>
                router.push("/dashboard/Produtos_servicos/Stock")
              }
              className="flex items-center gap-2 px-4 py-2 text-white transition-colors text-sm font-medium hover:opacity-90"
              style={{ backgroundColor: colors.primary }}
            >
              <Plus className="w-4 h-4" />
              Nova produto/serviço
            </button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent"
            style={{ borderColor: colors.border }}
          >
            <TabsTrigger
              value="ativas"
              className="data-[state=active]:border-b-2 rounded-none px-4 py-2 text-xs"
              style={{
                color:
                  activeTab === "ativas"
                    ? colors.primary
                    : colors.textSecondary,
                borderBottomColor:
                  activeTab === "ativas" ? colors.primary : "transparent",
              }}
            >
              Ativas ({stats.ativas.total})
            </TabsTrigger>
            <TabsTrigger
              value="lixeira"
              className="data-[state=active]:border-b-2 rounded-none px-4 py-2 text-xs"
              style={{
                color:
                  activeTab === "lixeira"
                    ? colors.primary
                    : colors.textSecondary,
                borderBottomColor:
                  activeTab === "lixeira" ? colors.primary : "transparent",
              }}
            >
              Lixeira ({stats.lixeira.total})
            </TabsTrigger>
          </TabsList>

          {/* Conteúdo - Categorias Ativas */}
          <TabsContent value="ativas" className="mt-4 space-y-4">
            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search
                  className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                  style={{ color: colors.textSecondary }}
                />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 h-8 text-xs w-[180px]"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                />
              </div>
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div
                className="p-2 border flex items-center gap-2"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                }}
              >
                <div
                  className="p-1.5"
                  style={{ backgroundColor: `${colors.text}15` }}
                >
                  <LayoutGrid
                    className="h-3.5 w-3.5"
                    style={{ color: colors.text }}
                  />
                </div>
                <div>
                  <div
                    className="text-xs"
                    style={{ color: colors.textSecondary }}
                  >
                    Total
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: colors.text }}
                  >
                    {stats.ativas.total}
                  </div>
                </div>
              </div>
              <div
                className="p-2 border flex items-center gap-2"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                }}
              >
                <div
                  className="p-1.5"
                  style={{ backgroundColor: `${colors.success}15` }}
                >
                  <CheckCircle2
                    className="h-3.5 w-3.5"
                    style={{ color: colors.success }}
                  />
                </div>
                <div>
                  <div
                    className="text-xs"
                    style={{ color: colors.textSecondary }}
                  >
                    Ativos
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: colors.text }}
                  >
                    {stats.ativas.ativos}
                  </div>
                </div>
              </div>
              <div
                className="p-2 border flex items-center gap-2"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                }}
              >
                <div
                  className="p-1.5"
                  style={{ backgroundColor: `${colors.primary}15` }}
                >
                  <Package
                    className="h-3.5 w-3.5"
                    style={{ color: colors.primary }}
                  />
                </div>
                <div>
                  <div
                    className="text-xs"
                    style={{ color: colors.textSecondary }}
                  >
                    Produtos
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: colors.text }}
                  >
                    {stats.ativas.produtos}
                  </div>
                </div>
              </div>
              <div
                className="p-2 border flex items-center gap-2"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                }}
              >
                <div
                  className="p-1.5"
                  style={{ backgroundColor: `${colors.secondary}15` }}
                >
                  <Wrench
                    className="h-3.5 w-3.5"
                    style={{ color: colors.secondary }}
                  />
                </div>
                <div>
                  <div
                    className="text-xs"
                    style={{ color: colors.textSecondary }}
                  >
                    Serviços
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: colors.text }}
                  >
                    {stats.ativas.servicos}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabela de Categorias Ativas */}
            <div
              className="border"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
              }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div
                    className="h-6 w-6 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: colors.primary }}
                  />
                </div>
              ) : categoriasFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <LayoutGrid
                    className="h-8 w-8 mb-2"
                    style={{ color: colors.border }}
                  />
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: colors.text }}
                  >
                    Nenhuma categoria encontrada
                  </h3>
                  <p
                    className="text-xs mt-1"
                    style={{ color: colors.textSecondary }}
                  >
                    Clique em Nova Categoria para começar
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead
                      className="border-b text-xs"
                      style={{
                        borderColor: colors.border,
                        backgroundColor: colors.hover,
                      }}
                    >
                      <tr>
                        <th
                          className="text-left py-2 px-3 font-medium"
                          style={{ color: colors.text }}
                        >
                          Nome
                        </th>
                        <th
                          className="text-left py-2 px-3 font-medium"
                          style={{ color: colors.text }}
                        >
                          Tipo
                        </th>
                        <th
                          className="text-left py-2 px-3 font-medium"
                          style={{ color: colors.text }}
                        >
                          Status
                        </th>
                        <th
                          className="text-left py-2 px-3 font-medium"
                          style={{ color: colors.text }}
                        >
                          IVA
                        </th>
                        <th
                          className="text-left py-2 px-3 font-medium hidden md:table-cell"
                          style={{ color: colors.text }}
                        >
                          Descrição
                        </th>
                        <th
                          className="text-right py-2 px-3 font-medium"
                          style={{ color: colors.text }}
                        >
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody
                      className="divide-y text-sm"
                      style={{ borderColor: colors.border }}
                    >
                      {categoriasFiltradas.map((categoria) => (
                        <tr
                          key={categoria.id}
                          className="hover:bg-opacity-50"
                          style={{ backgroundColor: "transparent" }}
                        >
                          <td className="py-2 px-3">
                            <span
                              className="text-xs font-medium"
                              style={{ color: colors.text }}
                            >
                              {categoria.nome}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <Badge
                              variant="secondary"
                              className="border-0 font-medium text-[10px] px-1.5 py-0.5"
                              style={{
                                backgroundColor: `${colors.secondary}15`,
                                color: colors.text,
                              }}
                            >
                              {getTipoLabel(categoria.tipo)}
                            </Badge>
                          </td>
                          <td className="py-2 px-3">
                            <Badge
                              variant="secondary"
                              className="border-0 font-medium text-[10px] px-1.5 py-0.5"
                              style={{
                                backgroundColor:
                                  categoria.status === "ativo"
                                    ? `${colors.success}15`
                                    : `${colors.textSecondary}15`,
                                color:
                                  categoria.status === "ativo"
                                    ? colors.success
                                    : colors.textSecondary,
                              }}
                            >
                              {categoria.status === "ativo" ? (
                                <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                              ) : (
                                <XCircle className="mr-1 h-2.5 w-2.5" />
                              )}
                              {getStatusLabel(categoria.status)}
                            </Badge>
                          </td>
                          <td className="py-2 px-3">
                            <Badge
                              variant="secondary"
                              className="border-0 font-medium text-[10px] px-1.5 py-0.5"
                              style={{
                                backgroundColor: `${getTaxaIVAColor(categoria.taxa_iva).replace("text-", "").replace("700", "100")}15`,
                                color: colors.text,
                              }}
                              title={
                                categoria.codigo_isencao
                                  ? getCodigoIsencaoLabel(
                                      categoria.codigo_isencao,
                                    ) || ""
                                  : ""
                              }
                            >
                              <Percent className="mr-1 h-2.5 w-2.5" />
                              {getTaxaIVALabel(
                                categoria.taxa_iva,
                                categoria.sujeito_iva,
                              )}
                            </Badge>
                          </td>
                          <td
                            className="py-2 px-3 text-xs hidden md:table-cell max-w-[200px]"
                            style={{ color: colors.textSecondary }}
                          >
                            {categoria.descricao ? (
                              <span className="line-clamp-1">
                                {categoria.descricao}
                              </span>
                            ) : (
                              <span className="italic">—</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  style={{ color: colors.textSecondary }}
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-32 min-w-0"
                              >
                                <DropdownMenuItem
                                  onClick={() => handleEditar(categoria)}
                                  className="gap-2 cursor-pointer text-xs py-1.5"
                                  style={{ color: colors.text }}
                                >
                                  <PencilLine
                                    className="h-3 w-3"
                                    style={{ color: colors.text }}
                                  />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleConfirmarDelete(categoria)
                                  }
                                  className="gap-2 cursor-pointer text-xs py-1.5"
                                  style={{ color: colors.secondary }}
                                >
                                  <Trash2
                                    className="h-3 w-3"
                                    style={{ color: colors.secondary }}
                                  />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Conteúdo - Lixeira */}
          <TabsContent value="lixeira" className="mt-4">
            <div
              className="border"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
              }}
            >
              {categoriasDeletadas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Database
                    className="h-8 w-8 mb-2"
                    style={{ color: colors.border }}
                  />
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: colors.text }}
                  >
                    Lixeira vazia
                  </h3>
                  <p
                    className="text-xs mt-1"
                    style={{ color: colors.textSecondary }}
                  >
                    Nenhuma categoria foi excluída
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead
                      className="border-b text-xs"
                      style={{
                        borderColor: colors.border,
                        backgroundColor: colors.hover,
                      }}
                    >
                      <tr>
                        <th
                          className="text-left py-2 px-3 font-medium"
                          style={{ color: colors.text }}
                        >
                          Nome
                        </th>
                        <th
                          className="text-left py-2 px-3 font-medium"
                          style={{ color: colors.text }}
                        >
                          Tipo
                        </th>
                        <th
                          className="text-left py-2 px-3 font-medium"
                          style={{ color: colors.text }}
                        >
                          Data exclusão
                        </th>
                        <th
                          className="text-right py-2 px-3 font-medium"
                          style={{ color: colors.text }}
                        >
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody
                      className="divide-y text-sm"
                      style={{ borderColor: colors.border }}
                    >
                      {categoriasDeletadas.map((categoria) => (
                        <tr key={categoria.id}>
                          <td className="py-2 px-3">
                            <span
                              className="text-xs font-medium"
                              style={{ color: colors.text }}
                            >
                              {categoria.nome}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <Badge
                              variant="secondary"
                              className="border-0 font-medium text-[10px] px-1.5 py-0.5"
                              style={{
                                backgroundColor: `${colors.secondary}15`,
                                color: colors.text,
                              }}
                            >
                              {getTipoLabel(categoria.tipo)}
                            </Badge>
                          </td>
                          <td
                            className="py-2 px-3 text-xs"
                            style={{ color: colors.textSecondary }}
                          >
                            {categoria.deleted_at
                              ? new Date(
                                  categoria.deleted_at,
                                ).toLocaleDateString("pt-AO")
                              : "-"}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleConfirmarRestore(categoria)
                                }
                                className="h-7 w-7 p-0"
                                title="Restaurar"
                                style={{ color: colors.success }}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                              {/* Botao de excluir 
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleConfirmarForceDelete(categoria)}
                                                                className="h-7 w-7 p-0"
                                                                title="Excluir permanentemente"
                                                                style={{ color: colors.danger }}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>*/}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Formulário */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className="sm:max-w-[500px] p-0"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <DialogHeader
            className="p-4 border-b"
            style={{ borderColor: colors.border }}
          >
            <DialogTitle
              className="text-base"
              style={{ color: colors.secondary }}
            >
              {categoriaSelecionada ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
            <DialogDescription
              className="text-xs"
              style={{ color: colors.textSecondary }}
            >
              {categoriaSelecionada
                ? "Atualize as informações da categoria"
                : "Preencha as informações para criar uma nova categoria"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs" style={{ color: colors.text }}>
                Nome <span style={{ color: colors.danger }}>*</span>
              </Label>
              <Input
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                placeholder="Ex: Eletrônicos"
                className="h-8 text-xs"
                style={{
                  backgroundColor: colors.card,
                  borderColor: errors.nome ? colors.danger : colors.border,
                  color: colors.text,
                }}
              />
              {errors.nome && (
                <p className="text-xs" style={{ color: colors.danger }}>
                  {errors.nome}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs" style={{ color: colors.text }}>
                  Tipo
                </Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) => handleSelectChange("tipo", v)}
                >
                  <SelectTrigger
                    className="h-8 text-xs"
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    }}
                  >
                    <SelectItem value="produto" className="text-xs">
                      Produto
                    </SelectItem>
                    <SelectItem value="servico" className="text-xs">
                      Serviço
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs" style={{ color: colors.text }}>
                  Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => handleSelectChange("status", v)}
                >
                  <SelectTrigger
                    className="h-8 text-xs"
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    }}
                  >
                    <SelectItem value="ativo" className="text-xs">
                      Ativo
                    </SelectItem>
                    <SelectItem value="inativo" className="text-xs">
                      Inativo
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Configuração de IVA */}
            <div
              className="space-y-3 pt-2 border-t"
              style={{ borderColor: colors.border }}
            >
              <div className="flex items-center justify-between">
                <Label
                  className="text-xs font-medium flex items-center gap-1"
                  style={{ color: colors.text }}
                >
                  <Receipt
                    className="h-3.5 w-3.5"
                    style={{ color: colors.primary }}
                  />
                  Configuração de IVA
                </Label>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs"
                    style={{ color: colors.textSecondary }}
                  >
                    {formData.sujeito_iva ? "Sujeito a IVA" : "Isento de IVA"}
                  </span>
                  <Switch
                    checked={formData.sujeito_iva}
                    onCheckedChange={handleSujeitoIVAChange}
                    style={{
                      backgroundColor: formData.sujeito_iva
                        ? colors.primary
                        : colors.border,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs" style={{ color: colors.text }}>
                  Taxa de IVA
                </Label>
                <Select
                  value={String(formData.taxa_iva)}
                  onValueChange={handleTaxaIVAChange}
                  disabled={!formData.sujeito_iva}
                >
                  <SelectTrigger
                    className="h-8 text-xs"
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: !formData.sujeito_iva ? 0.5 : 1,
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    }}
                  >
                    <SelectItem value="14" className="text-xs">
                      14% - Taxa Geral
                    </SelectItem>
                    <SelectItem value="5" className="text-xs">
                      5% - Cesta Básica
                    </SelectItem>
                    <SelectItem value="0" className="text-xs">
                      0% - Isento
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!formData.sujeito_iva && (
                <div className="space-y-1">
                  <Label className="text-xs" style={{ color: colors.text }}>
                    Código de Isenção{" "}
                    <span style={{ color: colors.danger }}>*</span>
                  </Label>
                  <Select
                    value={formData.codigo_isencao}
                    onValueChange={(v) =>
                      handleSelectChange("codigo_isencao", v)
                    }
                  >
                    <SelectTrigger
                      className="h-8 text-xs"
                      style={{
                        backgroundColor: colors.card,
                        borderColor: errors.codigo_isencao
                          ? colors.danger
                          : colors.border,
                      }}
                    >
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent
                      style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      }}
                    >
                      <SelectItem value="M00" className="text-xs">
                        M00 - Não sujeito a IVA
                      </SelectItem>
                      <SelectItem value="M01" className="text-xs">
                        M01 - Isento artigo 6.º do CIVA
                      </SelectItem>
                      <SelectItem value="M02" className="text-xs">
                        M02 - Isento artigo 7.º do CIVA
                      </SelectItem>
                      <SelectItem value="M03" className="text-xs">
                        M03 - Isento artigo 8.º do CIVA
                      </SelectItem>
                      <SelectItem value="M04" className="text-xs">
                        M04 - Isento artigo 9.º do CIVA
                      </SelectItem>
                      <SelectItem value="M05" className="text-xs">
                        M05 - Isento artigo 10.º do CIVA
                      </SelectItem>
                      <SelectItem value="M06" className="text-xs">
                        M06 - Isento artigo 11.º do CIVA
                      </SelectItem>
                      <SelectItem value="M99" className="text-xs">
                        M99 - Outras isenções
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.codigo_isencao && (
                    <p className="text-xs" style={{ color: colors.danger }}>
                      {errors.codigo_isencao}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs" style={{ color: colors.text }}>
                Descrição
              </Label>
              <Textarea
                name="descricao"
                value={formData.descricao}
                onChange={handleInputChange}
                placeholder="Descrição (opcional)..."
                rows={2}
                className="text-xs resize-none"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              />
            </div>

            <div
              className="flex gap-2 pt-2 border-t"
              style={{ borderColor: colors.border }}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="flex-1 h-8 text-xs"
                style={{
                  borderColor: colors.border,
                  color: colors.textSecondary,
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="flex-1 h-8 gap-1 text-white text-xs"
                style={{ backgroundColor: colors.primary }}
              >
                {isSubmitting ? (
                  <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    {categoriaSelecionada ? "Atualizar" : "Criar"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Delete */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent
          className="sm:max-w-[350px] p-0"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <DialogHeader
            className="p-4 border-b"
            style={{ borderColor: colors.border }}
          >
            <DialogTitle
              className="flex items-center gap-2 text-sm"
              style={{ color: colors.danger }}
            >
              <AlertTriangle className="h-4 w-4" />
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-xs mb-4" style={{ color: colors.textSecondary }}>
              Tem certeza que deseja excluir a categoria{" "}
              <strong style={{ color: colors.text }}>
                {categoriaSelecionada?.nome}
              </strong>
              ?
              <br />A categoria será movida para a lixeira.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 h-8 text-xs"
                style={{
                  borderColor: colors.border,
                  color: colors.textSecondary,
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleDeletar}
                className="flex-1 h-8 gap-1 text-white text-xs"
                style={{ backgroundColor: colors.danger }}
              >
                <Trash2 className="h-3 w-3" />
                Excluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Restaurar */}
      <Dialog open={isRestoreModalOpen} onOpenChange={setIsRestoreModalOpen}>
        <DialogContent
          className="sm:max-w-[350px] p-0"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <DialogHeader
            className="p-4 border-b"
            style={{ borderColor: colors.border }}
          >
            <DialogTitle
              className="flex items-center gap-2 text-sm"
              style={{ color: colors.success }}
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar Categoria
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-xs mb-4" style={{ color: colors.textSecondary }}>
              Tem certeza que deseja restaurar a categoria{" "}
              <strong style={{ color: colors.text }}>
                {categoriaSelecionada?.nome}
              </strong>
              ?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRestoreModalOpen(false)}
                className="flex-1 h-8 text-xs"
                style={{
                  borderColor: colors.border,
                  color: colors.textSecondary,
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleRestaurar}
                className="flex-1 h-8 gap-1 text-white text-xs"
                style={{ backgroundColor: colors.success }}
              >
                <RotateCcw className="h-3 w-3" />
                Restaurar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Delete Permanente */}
      <Dialog
        open={isForceDeleteModalOpen}
        onOpenChange={setIsForceDeleteModalOpen}
      >
        <DialogContent
          className="sm:max-w-[350px] p-0"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <DialogHeader
            className="p-4 border-b"
            style={{ borderColor: colors.border }}
          >
            <DialogTitle
              className="flex items-center gap-2 text-sm"
              style={{ color: colors.danger }}
            >
              <AlertTriangle className="h-4 w-4" />
              Excluir Permanentemente
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-xs mb-4" style={{ color: colors.textSecondary }}>
              Tem certeza que deseja excluir{" "}
              <strong style={{ color: colors.text }}>
                {categoriaSelecionada?.nome}
              </strong>{" "}
              permanentemente?
              <br />
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsForceDeleteModalOpen(false)}
                className="flex-1 h-8 text-xs"
                style={{
                  borderColor: colors.border,
                  color: colors.textSecondary,
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleForceDelete}
                className="flex-1 h-8 gap-1 text-white text-xs"
                style={{ backgroundColor: colors.danger }}
              >
                <Trash2 className="h-3 w-3" />
                Excluir Permanentemente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainEmpresa>
  );
}
