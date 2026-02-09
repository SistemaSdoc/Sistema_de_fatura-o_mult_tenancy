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
    getStatusColor,
    getTipoColor,
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
            <div className="flex flex-col gap-6 p-6">

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                            Categorias
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                            Gerencie as categorias de produtos e serviços do sistema
                        </p>
                    </div>
                    <Button
                        onClick={handleNovo}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <Plus className="h-4 w-4" />
                        Nova Categoria
                    </Button>
                </div>

                {/* Cards de Estatísticas */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-slate-200 dark:border-slate-700">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Total Categorias
                            </CardTitle>
                            <LayoutGrid className="h-4 w-4 text-slate-500" />
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
                                Ativas
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
                                Produtos
                            </CardTitle>
                            <Package className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                                {stats.produtos}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-slate-700">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Serviços
                            </CardTitle>
                            <Wrench className="h-4 w-4 text-violet-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-violet-600">
                                {stats.servicos}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filtros */}
                <Card className="border-slate-200 dark:border-slate-700">
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-4 md:flex-row">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    placeholder="Buscar por nome ou descrição..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                />
                            </div>
                            <div className="flex gap-2">
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
                                    <SelectTrigger className="w-[140px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                        <Filter className="mr-2 h-4 w-4 text-slate-500" />
                                        <SelectValue placeholder="Tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos Tipos</SelectItem>
                                        <SelectItem value="produto">Produto</SelectItem>
                                        <SelectItem value="servico">Serviço</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Lista de Categorias */}
                <Card className="border-slate-200 dark:border-slate-700">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                        <CardTitle className="text-lg text-slate-900 dark:text-slate-100">
                            Lista de Categorias
                            <span className="ml-2 text-sm font-normal text-slate-500">
                                ({categoriasFiltradas.length})
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
                            </div>
                        ) : categoriasFiltradas.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <LayoutGrid className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                    Nenhuma categoria encontrada
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                                    {searchTerm || filtroStatus !== "todos" || filtroTipo !== "todos"
                                        ? "Tente ajustar os filtros de busca"
                                        : "Clique em 'Nova Categoria' para começar"}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                                        <tr className="border-b border-slate-200 dark:border-slate-700">
                                            <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300 text-sm">
                                                Nome
                                            </th>
                                            <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300 text-sm">
                                                Tipo
                                            </th>
                                            <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300 text-sm">
                                                Status
                                            </th>
                                            <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300 text-sm hidden md:table-cell">
                                                Descrição
                                            </th>
                                            <th className="text-right py-3 px-4 font-medium text-slate-700 dark:text-slate-300 text-sm">
                                                Ações
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {categoriasFiltradas.map((categoria) => (
                                            <tr
                                                key={categoria.id}
                                                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                            >
                                                <td className="py-3 px-4">
                                                    <div className="font-medium text-slate-900 dark:text-slate-100">
                                                        {categoria.nome}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge
                                                        variant="secondary"
                                                        className={`${getTipoColor(categoria.tipo)} border-0 font-medium`}
                                                    >
                                                        {categoria.tipo === "produto" ? (
                                                            <Package className="mr-1 h-3 w-3" />
                                                        ) : (
                                                            <Wrench className="mr-1 h-3 w-3" />
                                                        )}
                                                        {getTipoLabel(categoria.tipo)}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge
                                                        variant="secondary"
                                                        className={`${getStatusColor(categoria.status)} border-0 font-medium`}
                                                    >
                                                        {categoria.status === "ativo" ? (
                                                            <CheckCircle2 className="mr-1 h-3 w-3" />
                                                        ) : (
                                                            <XCircle className="mr-1 h-3 w-3" />
                                                        )}
                                                        {getStatusLabel(categoria.status)}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-sm hidden md:table-cell max-w-xs">
                                                    {categoria.descricao ? (
                                                        <span className="line-clamp-1">
                                                            {categoria.descricao}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 dark:text-slate-600 italic">
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
                                                                className="h-8 w-8 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-40">
                                                            <DropdownMenuItem
                                                                onClick={() => handleEditar(categoria)}
                                                                className="gap-2 cursor-pointer"
                                                            >
                                                                <Edit2 className="h-4 w-4 text-blue-500" />
                                                                Editar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleConfirmarDelete(categoria)}
                                                                className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
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
                <DialogContent className="sm:max-w-[500px] border-slate-200 dark:border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900 dark:text-slate-100">
                            {categoriaSelecionada ? "Editar Categoria" : "Nova Categoria"}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 dark:text-slate-400">
                            {categoriaSelecionada
                                ? "Atualize as informações da categoria abaixo."
                                : "Preencha as informações para criar uma nova categoria."
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="nome" className="text-slate-700 dark:text-slate-300">
                                Nome <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="nome"
                                name="nome"
                                value={formData.nome}
                                onChange={handleInputChange}
                                placeholder="Ex: Eletrônicos"
                                className={`bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 ${errors.nome ? "border-red-500 focus-visible:ring-red-500" : ""
                                    }`}
                            />
                            {errors.nome && (
                                <p className="text-sm text-red-500">{errors.nome}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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
                                        <SelectItem value="produto">
                                            <div className="flex items-center gap-2">
                                                <Package className="h-4 w-4 text-blue-500" />
                                                Produto
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="servico">
                                            <div className="flex items-center gap-2">
                                                <Wrench className="h-4 w-4 text-violet-500" />
                                                Serviço
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

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
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="descricao" className="text-slate-700 dark:text-slate-300">
                                Descrição
                            </Label>
                            <Textarea
                                id="descricao"
                                name="descricao"
                                value={formData.descricao}
                                onChange={handleInputChange}
                                placeholder="Descreva a categoria (opcional)..."
                                rows={3}
                                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 resize-none"
                            />
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
                <DialogContent className="sm:max-w-[400px] border-slate-200 dark:border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Confirmar Exclusão
                        </DialogTitle>
                        <DialogDescription className="text-slate-600 dark:text-slate-400">
                            Tem certeza que deseja excluir a categoria{" "}
                            <strong className="text-slate-900 dark:text-slate-100">"{categoriaSelecionada?.nome}"</strong>?
                            <br />
                            Esta ação não pode ser desfeita.
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
                            variant="destructive"
                            onClick={handleDeletar}
                            className="gap-2 bg-red-600 hover:bg-red-700"
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