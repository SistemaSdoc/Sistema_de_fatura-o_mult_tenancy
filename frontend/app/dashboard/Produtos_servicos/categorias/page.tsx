// src/app/(dashboard)/categorias/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    MoreVertical,
    Package,
    Wrench,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    LayoutGrid
} from "lucide-react";
import MainEmpresa from "../../../components/MainEmpresa";
import {
    categoriaService,
    Categoria,
    getStatusLabel,
    getTipoLabel
} from "@/services/categorias";
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
import { useThemeColors } from "@/context/ThemeContext";

// Interface para o formulário
interface FormCategoriaData {
    nome: string;
    descricao: string;
    status: "ativo" | "inativo";
    tipo: "produto" | "servico";
}

const INITIAL_FORM_DATA: FormCategoriaData = {
    nome: "",
    descricao: "",
    status: "ativo",
    tipo: "produto",
};

export default function CategoriasPage() {
    const colors = useThemeColors();
    
    // Estados
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [categoriasFiltradas, setCategoriasFiltradas] = useState<Categoria[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filtroStatus, setFiltroStatus] = useState<string>("todos");
    const [filtroTipo, setFiltroTipo] = useState<string>("todos");

    // Estados do modal/formulário
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [categoriaSelecionada, setCategoriaSelecionada] = useState<Categoria | null>(null);
    const [formData, setFormData] = useState<FormCategoriaData>(INITIAL_FORM_DATA);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof FormCategoriaData, string>>>({});

    // Carregar categorias
    const carregarCategorias = async () => {
        try {
            setIsLoading(true);
            const data = await categoriaService.listarCategorias();
            setCategorias(data);
            setCategoriasFiltradas(data);
        } catch (error: any) {
            toast.error("Erro ao carregar categorias", {
                description: error.response?.data?.message || "Tente novamente mais tarde",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        carregarCategorias();
    }, []);

    // Filtrar categorias
    useEffect(() => {
        let filtradas = categorias;

        if (searchTerm) {
            filtradas = filtradas.filter((cat) =>
                cat.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                cat.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filtroStatus !== "todos") {
            filtradas = filtradas.filter((cat) => cat.status === filtroStatus);
        }

        if (filtroTipo !== "todos") {
            filtradas = filtradas.filter((cat) => cat.tipo === filtroTipo);
        }

        setCategoriasFiltradas(filtradas);
    }, [searchTerm, filtroStatus, filtroTipo, categorias]);

    // Handlers do formulário
    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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

    const validarForm = (): boolean => {
        const novosErrors: Partial<Record<keyof FormCategoriaData, string>> = {};

        if (!formData.nome.trim()) {
            novosErrors.nome = "Nome é obrigatório";
        } else if (formData.nome.length > 255) {
            novosErrors.nome = "Nome deve ter no máximo 255 caracteres";
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
        });
        setErrors({});
        setIsModalOpen(true);
    };

    const handleConfirmarDelete = (categoria: Categoria) => {
        setCategoriaSelecionada(categoria);
        setIsDeleteModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validarForm()) return;

        setIsSubmitting(true);

        try {
            if (categoriaSelecionada) {
                await categoriaService.atualizarCategoria(
                    categoriaSelecionada.id,
                    formData
                );
                toast.success("Categoria atualizada com sucesso!");
            } else {
                await categoriaService.criarCategoria(formData);
                toast.success("Categoria criada com sucesso!");
            }

            setIsModalOpen(false);
            carregarCategorias();
        } catch (error: any) {
            const message = error.response?.data?.message || "Erro ao salvar categoria";
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
        if (!categoriaSelecionada) return;

        try {
            await categoriaService.deletarCategoria(categoriaSelecionada.id);
            toast.success("Categoria deletada com sucesso!");
            setIsDeleteModalOpen(false);
            carregarCategorias();
        } catch (error: any) {
            toast.error("Erro ao deletar", {
                description: error.response?.data?.message || "Não foi possível deletar",
            });
        }
    };

    const stats = {
        total: categorias.length,
        ativos: categorias.filter((c) => c.status === "ativo").length,
        inativos: categorias.filter((c) => c.status === "inativo").length,
        produtos: categorias.filter((c) => c.tipo === "produto").length,
        servicos: categorias.filter((c) => c.tipo === "servico").length,
    };

    return (
        <MainEmpresa>
            <div className="flex flex-col gap-6 p-6 transition-colors duration-300" style={{ backgroundColor: colors.background }}>
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold" style={{ color: colors.primary }}>
                            Categorias
                        </h1>
                        <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
                            Gerencie as categorias de produtos e serviços do sistema
                        </p>
                    </div>
                    <Button
                        onClick={handleNovo}
                        className="gap-2 text-white"
                        style={{ backgroundColor: colors.secondary }}
                    >
                        <Plus className="h-4 w-4" />
                        Nova Categoria
                    </Button>
                </div>

                {/* Cards de Estatísticas */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                                Total Categorias
                            </CardTitle>
                            <LayoutGrid className="h-4 w-4" style={{ color: colors.textSecondary }} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold" style={{ color: colors.text }}>
                                {stats.total}
                            </div>
                        </CardContent>
                    </Card>

                    <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                                Ativas
                            </CardTitle>
                            <CheckCircle2 className="h-4 w-4" style={{ color: colors.success }} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold" style={{ color: colors.success }}>
                                {stats.ativos}
                            </div>
                        </CardContent>
                    </Card>

                    <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                                Produtos
                            </CardTitle>
                            <Package className="h-4 w-4" style={{ color: colors.primary }} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold" style={{ color: colors.primary }}>
                                {stats.produtos}
                            </div>
                        </CardContent>
                    </Card>

                    <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                                Serviços
                            </CardTitle>
                            <Wrench className="h-4 w-4" style={{ color: colors.secondary }} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold" style={{ color: colors.secondary }}>
                                {stats.servicos}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filtros */}
                <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-4 md:flex-row">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: colors.textSecondary }} />
                                <Input
                                    placeholder="Buscar por nome ou descrição..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                    style={{
                                        backgroundColor: colors.card,
                                        borderColor: colors.border,
                                        color: colors.text
                                    }}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                                    <SelectTrigger 
                                        className="w-[140px]"
                                        style={{
                                            backgroundColor: colors.card,
                                            borderColor: colors.border,
                                            color: colors.text
                                        }}
                                    >
                                        <Filter className="mr-2 h-4 w-4" style={{ color: colors.textSecondary }} />
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                        <SelectItem value="todos" style={{ color: colors.text }}>Todos Status</SelectItem>
                                        <SelectItem value="ativo" style={{ color: colors.success }}>Ativo</SelectItem>
                                        <SelectItem value="inativo" style={{ color: colors.textSecondary }}>Inativo</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                                    <SelectTrigger 
                                        className="w-[140px]"
                                        style={{
                                            backgroundColor: colors.card,
                                            borderColor: colors.border,
                                            color: colors.text
                                        }}
                                    >
                                        <Filter className="mr-2 h-4 w-4" style={{ color: colors.textSecondary }} />
                                        <SelectValue placeholder="Tipo" />
                                    </SelectTrigger>
                                    <SelectContent style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                        <SelectItem value="todos" style={{ color: colors.text }}>Todos Tipos</SelectItem>
                                        <SelectItem value="produto" style={{ color: colors.primary }}>Produto</SelectItem>
                                        <SelectItem value="servico" style={{ color: colors.secondary }}>Serviço</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Lista de Categorias */}
                <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <CardHeader className="border-b" style={{ borderColor: colors.border }}>
                        <CardTitle className="text-lg" style={{ color: colors.text }}>
                            Lista de Categorias
                            <span className="ml-2 text-sm font-normal" style={{ color: colors.textSecondary }}>
                                ({categoriasFiltradas.length})
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div 
                                    className="h-8 w-8 animate-spin rounded-full border-b-2" 
                                    style={{ borderColor: colors.primary }}
                                />
                            </div>
                        ) : categoriasFiltradas.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <LayoutGrid className="h-12 w-12 mb-4" style={{ color: colors.border }} />
                                <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
                                    Nenhuma categoria encontrada
                                </h3>
                                <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
                                    {searchTerm || filtroStatus !== "todos" || filtroTipo !== "todos"
                                        ? "Tente ajustar os filtros de busca"
                                        : "Clique em 'Nova Categoria' para começar"}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b" style={{ borderColor: colors.border, backgroundColor: colors.hover }}>
                                        <tr>
                                            <th className="text-left py-3 px-4 font-medium text-sm" style={{ color: colors.primary }}>
                                                Nome
                                            </th>
                                            <th className="text-left py-3 px-4 font-medium text-sm" style={{ color: colors.primary }}>
                                                Tipo
                                            </th>
                                            <th className="text-left py-3 px-4 font-medium text-sm" style={{ color: colors.primary }}>
                                                Status
                                            </th>
                                            <th className="text-left py-3 px-4 font-medium text-sm hidden md:table-cell" style={{ color: colors.primary }}>
                                                Descrição
                                            </th>
                                            <th className="text-right py-3 px-4 font-medium text-sm" style={{ color: colors.primary }}>
                                                Ações
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: colors.border }}>
                                        {categoriasFiltradas.map((categoria) => (
                                            <tr
                                                key={categoria.id}
                                                className="transition-colors hover:bg-opacity-50"
                                                style={{ backgroundColor: 'transparent' }}
                                            >
                                                <td className="py-3 px-4">
                                                    <div className="font-medium" style={{ color: colors.text }}>
                                                        {categoria.nome}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge
                                                        variant="secondary"
                                                        className="border-0 font-medium"
                                                        style={{
                                                            backgroundColor: `${colors.primary}20`,
                                                            color: colors.primary
                                                        }}
                                                    >
                                                        {categoria.tipo === "produto" ? (
                                                            <Package className="mr-1 h-3 w-3" />
                                                        ) : (
                                                            <Wrench className="mr-1 h-3 w-3" style={{ color: colors.secondary }} />
                                                        )}
                                                        {getTipoLabel(categoria.tipo)}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge
                                                        variant="secondary"
                                                        className="border-0 font-medium"
                                                        style={{
                                                            backgroundColor: categoria.status === "ativo" ? `${colors.success}20` : `${colors.textSecondary}20`,
                                                            color: categoria.status === "ativo" ? colors.success : colors.textSecondary
                                                        }}
                                                    >
                                                        {categoria.status === "ativo" ? (
                                                            <CheckCircle2 className="mr-1 h-3 w-3" />
                                                        ) : (
                                                            <XCircle className="mr-1 h-3 w-3" />
                                                        )}
                                                        {getStatusLabel(categoria.status)}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4 text-sm hidden md:table-cell max-w-xs" style={{ color: colors.textSecondary }}>
                                                    {categoria.descricao ? (
                                                        <span className="line-clamp-1">
                                                            {categoria.descricao}
                                                        </span>
                                                    ) : (
                                                        <span className="italic" style={{ color: colors.textSecondary }}>
                                                            Sem descrição
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0"
                                                                style={{ color: colors.textSecondary }}
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent 
                                                            align="end" 
                                                            className="w-40"
                                                            style={{ 
                                                                backgroundColor: colors.card, 
                                                                borderColor: colors.border 
                                                            }}
                                                        >
                                                            <DropdownMenuItem
                                                                onClick={() => handleEditar(categoria)}
                                                                className="gap-2 cursor-pointer"
                                                                style={{ color: colors.text }}
                                                            >
                                                                <Edit2 className="h-4 w-4" style={{ color: colors.primary }} />
                                                                Editar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleConfirmarDelete(categoria)}
                                                                className="gap-2 cursor-pointer"
                                                                style={{ color: colors.danger }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
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
                    </CardContent>
                </Card>
            </div>

            {/* Modal de Formulário */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent 
                    className="sm:max-w-[500px]"
                    style={{ 
                        backgroundColor: colors.card, 
                        borderColor: colors.border 
                    }}
                >
                    <DialogHeader>
                        <DialogTitle style={{ color: colors.primary }}>
                            {categoriaSelecionada ? "Editar Categoria" : "Nova Categoria"}
                        </DialogTitle>
                        <DialogDescription style={{ color: colors.textSecondary }}>
                            {categoriaSelecionada
                                ? "Atualize as informações da categoria abaixo."
                                : "Preencha as informações para criar uma nova categoria."
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="nome" style={{ color: colors.text }}>
                                Nome <span style={{ color: colors.danger }}>*</span>
                            </Label>
                            <Input
                                id="nome"
                                name="nome"
                                value={formData.nome}
                                onChange={handleInputChange}
                                placeholder="Ex: Eletrônicos"
                                style={{
                                    backgroundColor: colors.card,
                                    borderColor: errors.nome ? colors.danger : colors.border,
                                    color: colors.text
                                }}
                                className={errors.nome ? "border-red-500" : ""}
                            />
                            {errors.nome && (
                                <p className="text-sm" style={{ color: colors.danger }}>{errors.nome}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label style={{ color: colors.text }}>Tipo</Label>
                                <Select
                                    value={formData.tipo}
                                    onValueChange={(value) => handleSelectChange("tipo", value as "produto" | "servico")}
                                >
                                    <SelectTrigger 
                                        style={{
                                            backgroundColor: colors.card,
                                            borderColor: colors.border,
                                            color: colors.text
                                        }}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                        <SelectItem value="produto">
                                            <div className="flex items-center gap-2">
                                                <Package className="h-4 w-4" style={{ color: colors.primary }} />
                                                <span style={{ color: colors.text }}>Produto</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="servico">
                                            <div className="flex items-center gap-2">
                                                <Wrench className="h-4 w-4" style={{ color: colors.secondary }} />
                                                <span style={{ color: colors.text }}>Serviço</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label style={{ color: colors.text }}>Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) => handleSelectChange("status", value as "ativo" | "inativo")}
                                >
                                    <SelectTrigger 
                                        style={{
                                            backgroundColor: colors.card,
                                            borderColor: colors.border,
                                            color: colors.text
                                        }}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                        <SelectItem value="ativo">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4" style={{ color: colors.success }} />
                                                <span style={{ color: colors.text }}>Ativo</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="inativo">
                                            <div className="flex items-center gap-2">
                                                <XCircle className="h-4 w-4" style={{ color: colors.textSecondary }} />
                                                <span style={{ color: colors.text }}>Inativo</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="descricao" style={{ color: colors.text }}>
                                Descrição
                            </Label>
                            <Textarea
                                id="descricao"
                                name="descricao"
                                value={formData.descricao}
                                onChange={handleInputChange}
                                placeholder="Descreva a categoria (opcional)..."
                                rows={3}
                                style={{
                                    backgroundColor: colors.card,
                                    borderColor: colors.border,
                                    color: colors.text
                                }}
                                className="resize-none"
                            />
                        </div>

                        <DialogFooter className="pt-4 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                                disabled={isSubmitting}
                                style={{
                                    borderColor: colors.border,
                                    color: colors.textSecondary
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="gap-2 text-white"
                                style={{ backgroundColor: colors.primary }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div 
                                            className="h-4 w-4 animate-spin rounded-full border-b-2" 
                                            style={{ borderColor: 'white' }}
                                        />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4" />
                                        {categoriaSelecionada ? "Atualizar" : "Criar"}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal de Confirmação de Delete */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent 
                    className="sm:max-w-[400px]"
                    style={{ 
                        backgroundColor: colors.card, 
                        borderColor: colors.border 
                    }}
                >
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2" style={{ color: colors.danger }}>
                            <AlertTriangle className="h-5 w-5" />
                            Confirmar Exclusão
                        </DialogTitle>
                        <DialogDescription style={{ color: colors.textSecondary }}>
                            Tem certeza que deseja excluir a categoria{" "}
                            <strong style={{ color: colors.text }}>"{categoriaSelecionada?.nome}"</strong>?
                            <br />
                            Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="pt-4 gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteModalOpen(false)}
                            style={{
                                borderColor: colors.border,
                                color: colors.textSecondary
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeletar}
                            className="gap-2 text-white"
                            style={{ backgroundColor: colors.danger }}
                        >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainEmpresa>
    );
}