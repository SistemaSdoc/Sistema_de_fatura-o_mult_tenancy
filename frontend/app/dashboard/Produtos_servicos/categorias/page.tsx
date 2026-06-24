"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  LayoutGrid,
  RotateCcw,
  PencilLine,
  Trash2,
  History,
  Percent,
  Receipt,
  MoreVertical,
} from "lucide-react";
import MainEmpresa from "../../../components/MainEmpresa";
import {
  categoriaService,
  Categoria,
  getStatusLabel,
  getTaxaIVALabel,
  getTaxaIVAColor,
  getCodigoIsencaoLabel,
  CodigoIsencao,
  TaxaIVA,
} from "@/services/categorias";
import { useThemeColors } from "@/context/ThemeContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";

/* ─── Tipos ──────────────────────────────────────────────────────── */
interface FormCategoriaData {
  nome: string;
  descricao: string;
  status: "ativo" | "inativo";
  taxa_iva: TaxaIVA;
  sujeito_iva: boolean;
  codigo_isencao: CodigoIsencao | "";
}

const INITIAL_FORM: FormCategoriaData = {
  nome: "",
  descricao: "",
  status: "ativo",
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

/* ─── Loading States ─────────────────────────────────────────────── */
function LoadingStats({ colors }: { colors: any }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="p-4 border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10"
              style={{ backgroundColor: colors.border }}
            />
            <div className="space-y-1.5">
              <div
                className="h-5 w-10"
                style={{ backgroundColor: colors.border }}
              />
              <div
                className="h-3.5 w-14"
                style={{ backgroundColor: colors.border }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingTabela({ colors }: { colors: any }) {
  return (
    <div
      className="border overflow-hidden"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
    >
      <div className="h-11" style={{ backgroundColor: colors.primary }} />
      <div className="divide-y" style={{ borderColor: colors.border }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5">
            <div
              className="w-9 h-9"
              style={{ backgroundColor: colors.border }}
            />
            <div className="flex-1 space-y-1.5">
              <div
                className="h-3.5 w-36"
                style={{ backgroundColor: colors.border }}
              />
              <div
                className="h-3 w-28"
                style={{ backgroundColor: colors.border }}
              />
            </div>
            <div
              className="w-20 h-6"
              style={{ backgroundColor: colors.border }}
            />
            <div
              className="w-20 h-6"
              style={{ backgroundColor: colors.border }}
            />
            <div
              className="w-28 h-4"
              style={{ backgroundColor: colors.border }}
            />
            <div className="flex gap-1.5">
              {[...Array(2)].map((_, j) => (
                <div
                  key={j}
                  className="w-8 h-8"
                  style={{ backgroundColor: colors.border }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════════ */
export default function CategoriasPage() {
  const colors = useThemeColors();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasDeletadas, setCategoriasDeletadas] = useState<Categoria[]>([]);
  const [categoriasFiltradas, setCategoriasFiltradas] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "inativo">("todos");
  const [filtroIVA, setFiltroIVA] = useState<string>("todos");
  const [abaAtiva, setAbaAtiva] = useState<"ativos" | "lixeira">("ativos");

  // Estados dos modais (mantidos originais)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isForceDeleteModalOpen, setIsForceDeleteModalOpen] = useState(false);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<Categoria | null>(null);
  const [formData, setFormData] = useState<FormCategoriaData>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormCategoriaData, string>>>({});

  /* ── Filtro local ── */
  useEffect(() => {
    const lista = abaAtiva === "ativos" ? categorias : categoriasDeletadas;
    const t = busca.toLowerCase();
    setCategoriasFiltradas(
      lista.filter((c) => {
        const matchBusca =
          c.nome.toLowerCase().includes(t) ||
          (c.descricao && c.descricao.toLowerCase().includes(t));
        const matchStatus =
          filtroStatus === "todos" || c.status === filtroStatus;
        const matchIVA =
          filtroIVA === "todos" ||
          (filtroIVA === "isento" && (!c.sujeito_iva || c.taxa_iva === 0)) ||
          c.taxa_iva === Number(filtroIVA);
        return matchBusca && matchStatus && matchIVA;
      })
    );
  }, [busca, filtroStatus, filtroIVA, categorias, categoriasDeletadas, abaAtiva]);

  /* ── Carregar ── */
  const carregarCategorias = useCallback(async () => {
    try {
      setLoading(true);
      const response = await categoriaService.listarCategorias();
      setCategorias(response.categorias);
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error("Erro ao carregar categorias", {
        description:
          apiError.response?.data?.message || "Tente novamente mais tarde",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarCategoriasDeletadas = useCallback(async () => {
    try {
      const response = await categoriaService.listarCategoriasDeletadas();
      setCategoriasDeletadas(response.categorias);
    } catch (error: unknown) {
      console.error("Erro ao carregar categorias deletadas:", error);
    }
  }, []);

  useEffect(() => {
    carregarCategorias();
    carregarCategoriasDeletadas();
  }, [carregarCategorias, carregarCategoriasDeletadas]);

  /* ── Handlers do formulário (mantidos originais) ── */
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
    setFormData(INITIAL_FORM);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEditar = (categoria: Categoria) => {
    setCategoriaSelecionada(categoria);
    setFormData({
      nome: categoria.nome,
      descricao: categoria.descricao || "",
      status: categoria.status,
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

  /* ── Estatísticas ── */
  const stats = [
    {
      icon: LayoutGrid,
      label: "Total",
      value: categorias.length,
      color: colors.text,
    },
    {
      icon: CheckCircle,
      label: "Ativos",
      value: categorias.filter((c) => c.status === "ativo").length,
      color: colors.success,
    },
    {
      icon: Package,
      label: "Produtos",
      value: categorias.length,
      color: colors.primary,
    },
    {
      icon: Trash2,
      label: "Lixeira",
      value: categoriasDeletadas.length,
      color: colors.secondary,
    },
  ];

  /* ── Lista atual ── */
  const listaVazia =
    abaAtiva === "ativos" ? categorias.length === 0 : categoriasDeletadas.length === 0;

  return (
    <MainEmpresa>
      <div
        className="space-y-4 max-w-7xl mx-auto pb-6 transition-colors duration-300"
        style={{ backgroundColor: colors.background }}
      >
        {/* ── Cabeçalho ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: colors.secondary }}>
              Categorias
            </h1>
            <p className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
              Gerencie categorias de produtos
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Abas */}
            <div
              className="flex border"
              style={{ borderColor: colors.border, backgroundColor: colors.card }}
            >
              {(["ativos", "lixeira"] as const).map((aba) => (
                <button
                  key={aba}
                  onClick={() => setAbaAtiva(aba)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: abaAtiva === aba ? colors.primary : "transparent",
                    color: abaAtiva === aba ? "#fff" : colors.textSecondary,
                  }}
                >
                  {aba === "ativos" ? (
                    <LayoutGrid className="w-4 h-4" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {aba === "ativos"
                    ? `Ativos (${categorias.length})`
                    : `Lixeira (${categoriasDeletadas.length})`}
                </button>
              ))}
            </div>

            {/* Pesquisa */}
            <div className="relative flex-1 min-w-[200px]">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: colors.textSecondary }}
              />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome, descrição…"
                className="w-full pl-9 pr-4 py-2 border outline-none text-sm"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              />
            </div>


            {/* Novo */}
            {abaAtiva === "ativos" && (
              <button
                onClick={handleNovo}
                className="flex items-center gap-1.5 px-4 py-2 text-white text-sm font-medium"
                style={{ backgroundColor: colors.primary }}
              >
                <Plus className="w-4 h-4" />
                Nova categoria
              </button>
            )}
          </div>
        </div>

        {/* ── Stats ── */}
        {loading ? (
          <LoadingStats colors={colors} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map(({ icon: Icon, label, value, color }) => (
              <div
                key={label}
                className="p-4 border"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2" style={{ backgroundColor: `${color}18` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <p
                      className="text-xl font-bold leading-none"
                      style={{ color: colors.text }}
                    >
                      {value}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
                      {label}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabela ── */}
        {loading ? (
          <LoadingTabela colors={colors} />
        ) : listaVazia ? (
          <div
            className="border text-center py-14"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <LayoutGrid
              className="w-14 h-14 mx-auto mb-3"
              style={{ color: colors.border }}
            />
            <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
              {abaAtiva === "ativos"
                ? "Nenhuma categoria encontrada."
                : "Nenhuma categoria na lixeira."}
            </p>
            {abaAtiva === "ativos" && (
              <button
                onClick={handleNovo}
                className="px-4 py-2 text-white text-sm"
                style={{ backgroundColor: colors.primary }}
              >
                Cadastrar primeira categoria
              </button>
            )}
          </div>
        ) : (
          <div
            className="border overflow-hidden shadow-sm"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: colors.primary }}>
                    {["Categoria", "Status", "IVA", "Descrição", "Ações"].map(
                      (h, i) => (
                        <th
                          key={h}
                          className={`py-3 px-5 font-semibold text-white text-xs uppercase tracking-wider ${
                            i === 4 ? "text-center" : "text-left"
                          }`}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: colors.border }}>
                  {categoriasFiltradas.map((c) => (
                    <tr
                      key={c.id}
                      className="transition-colors"
                      style={{
                        backgroundColor:
                          c.status === "inativo"
                            ? `${colors.hover}80`
                            : "transparent",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = colors.hover)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          c.status === "inativo"
                            ? `${colors.hover}80`
                            : "transparent")
                      }
                    >
                      {/* Categoria */}
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor: `${colors.primary}20`,
                            }}
                          >
                            <Package
                              className="w-4 h-4"
                              style={{ color: colors.primary }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div
                              className="font-medium text-sm truncate"
                              style={{ color: colors.text }}
                            >
                              {c.nome}
                            </div>
                            {c.deleted_at && (
                              <div
                                className="text-xs flex items-center gap-1 mt-0.5"
                                style={{ color: colors.danger }}
                              >
                                <History className="w-3 h-3" />
                                {new Date(c.deleted_at).toLocaleDateString("pt-PT")}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-5">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium"
                          style={{
                            backgroundColor:
                              c.status === "ativo"
                                ? `${colors.success}18`
                                : `${colors.textSecondary}18`,
                            color:
                              c.status === "ativo"
                                ? colors.success
                                : colors.textSecondary,
                          }}
                        >
                          {c.status === "ativo" ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {getStatusLabel(c.status)}
                        </span>
                      </td>

                      {/* IVA */}
                      <td className="py-3 px-5">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: `${getTaxaIVAColor(c.taxa_iva).replace("text-", "").replace("700", "100")}20`,
                            color: colors.text,
                          }}
                          title={
                            c.codigo_isencao
                              ? getCodigoIsencaoLabel(c.codigo_isencao) || ""
                              : ""
                          }
                        >
                          <Percent className="w-3 h-3" />
                          {getTaxaIVALabel(c.taxa_iva, c.sujeito_iva)}
                        </span>
                      </td>

                      {/* Descrição */}
                      <td className="py-3 px-5">
                        <span
                          className="text-sm line-clamp-1 max-w-[200px]"
                          style={{ color: colors.textSecondary }}
                        >
                          {c.descricao || <span className="italic">—</span>}
                        </span>
                      </td>

                      {/* Ações - Menu de três pontos */}
                      <td className="py-3 px-5">
                        <div className="flex items-center justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="p-2 transition-colors hover:opacity-70"
                                style={{ color: colors.textSecondary }}
                                title="Ações"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-36"
                              style={{
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                              }}
                            >
                              {abaAtiva === "ativos" ? (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleEditar(c)}
                                    className="gap-2 cursor-pointer text-xs py-2"
                                    style={{ color: colors.text }}
                                  >
                                    <PencilLine className="h-3.5 w-3.5" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleConfirmarDelete(c)}
                                    className="gap-2 cursor-pointer text-xs py-2"
                                    style={{ color: colors.warning }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" style={{ color: colors.warning }}/>
                                    Mover para lixeira
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleConfirmarRestore(c)}
                                    className="gap-2 cursor-pointer text-xs py-2"
                                    style={{ color: colors.success }}
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Restaurar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleConfirmarForceDelete(c)}
                                    className="gap-2 cursor-pointer text-xs py-2"
                                    style={{ color: colors.secondary }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Excluir permanentemente
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Sem resultados na pesquisa */}
              {categoriasFiltradas.length === 0 && busca && (
                <div className="text-center py-12">
                  <Search
                    className="w-12 h-12 mx-auto mb-3"
                    style={{ color: colors.border }}
                  />
                  <p className="text-sm" style={{ color: colors.textSecondary }}>
                    Nenhuma categoria encontrada para busca
                  </p>
                  <button
                    onClick={() => setBusca("")}
                    className="mt-2 text-sm underline"
                    style={{ color: colors.primary }}
                  >
                    Limpar pesquisa
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAIS ORIGINAIS DE CATEGORIAS (MANTIDOS) ── */}

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
                    <CheckCircle className="h-3 w-3" />
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
              style={{ color: colors.secondary }}
            >
              <AlertCircle className="h-4 w-4" />
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
                style={{ backgroundColor: colors.secondary }}
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
              <AlertCircle className="h-4 w-4" />
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