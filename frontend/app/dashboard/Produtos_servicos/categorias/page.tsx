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

    const stats = [
        { 
            icon: LayoutGrid, 
            label: "Total", 
            value: categorias.length, 
            color: colors.text,
            bg: `${colors.text}15`
        },
        { 
            icon: CheckCircle2, 
            label: "Ativos", 
            value: categorias.filter(c => c.status === "ativo").length, 
            color: colors.success,
            bg: `${colors.success}15`
        },
        { 
            icon: Package, 
            label: "Produtos", 
            value: categorias.filter(c => c.tipo === "produto").length, 
            color: colors.primary,
            bg: `${colors.primary}15`
        },
        { 
            icon: Wrench, 
            label: "Serviços", 
            value: categorias.filter(c => c.tipo === "servico").length, 
            color: colors.secondary,
            bg: `${colors.secondary}15`
        },
    ];

    return (
        <MainEmpresa>
            <div className="flex flex-col gap-4 p-4 transition-colors duration-300" style={{ backgroundColor: colors.background }}>
                {/* Header + Filtros + Botão - TUDO NA MESMA LINHA */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold" style={{ color: colors.primary }}>
                            Categorias
                        </h1>
                        <p className="text-xs" style={{ color: colors.textSecondary }}>
                            Gerencie categorias de produtos e serviços
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                        {/* Busca */}
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: colors.textSecondary }} />
                            <Input
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-7 h-8 text-xs w-[180px]"
                                style={{
                                    backgroundColor: colors.card,
                                    borderColor: colors.border,
                                    color: colors.text
                                }}
                            />
                        </div>

                        {/* Filtro Status */}
                        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                            <SelectTrigger 
                                className="h-8 text-xs w-[120px]"
                                style={{
                                    backgroundColor: colors.card,
                                    borderColor: colors.border,
                                    color: colors.text
                                }}
                            >
                                <Filter className="mr-1 h-3 w-3" style={{ color: colors.textSecondary }} />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                <SelectItem value="todos" className="text-xs">Todos</SelectItem>
                                <SelectItem value="ativo" className="text-xs">Ativo</SelectItem>
                                <SelectItem value="inativo" className="text-xs">Inativo</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Filtro Tipo */}
                        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                            <SelectTrigger 
                                className="h-8 text-xs w-[120px]"
                                style={{
                                    backgroundColor: colors.card,
                                    borderColor: colors.border,
                                    color: colors.text
                                }}
                            >
                                <Filter className="mr-1 h-3 w-3" style={{ color: colors.textSecondary }} />
                                <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                <SelectItem value="todos" className="text-xs">Todos</SelectItem>
                                <SelectItem value="produto" className="text-xs">Produto</SelectItem>
                                <SelectItem value="servico" className="text-xs">Serviço</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Botão Nova Categoria */}
                        <Button
                            onClick={handleNovo}
                            size="sm"
                            className="h-8 gap-1 text-white text-xs px-3"
                            style={{ backgroundColor: colors.secondary }}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Nova
                        </Button>
                    </div>
                </div>

                {/* Cards de Estatísticas - MAIS COMPACTOS E SEM ROUNDED */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {stats.map(({ icon: Icon, label, value, color, bg }) => (
                        <div key={label} 
                            className="p-2 border flex items-center gap-2"
                            style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                            <div className="p-1.5" style={{ backgroundColor: bg }}>
                                <Icon className="h-3.5 w-3.5" style={{ color }} />
                            </div>
                            <div>
                                <div className="text-xs" style={{ color: colors.textSecondary }}>{label}</div>
                                <div className="text-sm font-bold" style={{ color: colors.text }}>{value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Lista de Categorias - SEM ROUNDED */}
                <div className="border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div 
                                className="h-6 w-6 border-2 border-b-0 border-l-0" 
                                style={{ 
                                    borderColor: colors.primary,
                                    animation: 'spin 1s linear infinite'
                                }}
                            />
                        </div>
                    ) : categoriasFiltradas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <LayoutGrid className="h-8 w-8 mb-2" style={{ color: colors.border }} />
                            <h3 className="text-sm font-semibold" style={{ color: colors.text }}>
                                Nenhuma categoria encontrada
                            </h3>
                            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                                {searchTerm || filtroStatus !== "todos" || filtroTipo !== "todos"
                                    ? "Ajuste os filtros de busca"
                                    : "Clique em 'Nova' para começar"}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b text-xs" style={{ borderColor: colors.border, backgroundColor: colors.hover }}>
                                    <tr>
                                        <th className="text-left py-2 px-3 font-medium" style={{ color: colors.text }}>Nome</th>
                                        <th className="text-left py-2 px-3 font-medium" style={{ color: colors.text }}>Tipo</th>
                                        <th className="text-left py-2 px-3 font-medium" style={{ color: colors.text }}>Status</th>
                                        <th className="text-left py-2 px-3 font-medium hidden md:table-cell" style={{ color: colors.text }}>Descrição</th>
                                        <th className="text-right py-2 px-3 font-medium" style={{ color: colors.text }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-sm" style={{ borderColor: colors.border }}>
                                    {categoriasFiltradas.map((categoria) => (
                                        <tr key={categoria.id} className="hover:bg-opacity-50" style={{ backgroundColor: 'transparent' }}>
                                            <td className="py-2 px-3">
                                                <span className="text-xs font-medium" style={{ color: colors.text }}>{categoria.nome}</span>
                                            </td>
                                            <td className="py-2 px-3">
                                                <Badge
                                                    variant="secondary"
                                                    className="border-0 font-medium text-[10px] px-1.5 py-0.5"
                                                    style={{
                                                        backgroundColor: `${colors.primary}15`,
                                                        color: colors.primary
                                                    }}
                                                >
                                                    {categoria.tipo === "produto" ? (
                                                        <Package className="mr-1 h-2.5 w-2.5" />
                                                    ) : (
                                                        <Wrench className="mr-1 h-2.5 w-2.5" style={{ color: colors.secondary }} />
                                                    )}
                                                    {getTipoLabel(categoria.tipo)}
                                                </Badge>
                                            </td>
                                            <td className="py-2 px-3">
                                                <Badge
                                                    variant="secondary"
                                                    className="border-0 font-medium text-[10px] px-1.5 py-0.5"
                                                    style={{
                                                        backgroundColor: categoria.status === "ativo" ? `${colors.success}15` : `${colors.textSecondary}15`,
                                                        color: categoria.status === "ativo" ? colors.success : colors.textSecondary
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
                                            <td className="py-2 px-3 text-xs hidden md:table-cell max-w-[200px]" style={{ color: colors.textSecondary }}>
                                                {categoria.descricao ? (
                                                    <span className="line-clamp-1">{categoria.descricao}</span>
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
                                                        style={{ 
                                                            backgroundColor: colors.card, 
                                                            borderColor: colors.border 
                                                        }}
                                                    >
                                                        <DropdownMenuItem
                                                            onClick={() => handleEditar(categoria)}
                                                            className="gap-2 cursor-pointer text-xs py-1.5"
                                                            style={{ color: colors.text }}
                                                        >
                                                            <Edit2 className="h-3 w-3" style={{ color: colors.primary }} />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleConfirmarDelete(categoria)}
                                                            className="gap-2 cursor-pointer text-xs py-1.5"
                                                            style={{ color: colors.danger }}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
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
            </div>

            {/* Modal de Formulário - SEM ROUNDED */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent 
                    className="sm:max-w-[450px] p-0"
                    style={{ 
                        backgroundColor: colors.card, 
                        borderColor: colors.border 
                    }}
                >
                    <DialogHeader className="p-4 border-b" style={{ borderColor: colors.border }}>
                        <DialogTitle className="text-base" style={{ color: colors.primary }}>
                            {categoriaSelecionada ? "Editar Categoria" : "Nova Categoria"}
                        </DialogTitle>
                        <DialogDescription className="text-xs" style={{ color: colors.textSecondary }}>
                            {categoriaSelecionada
                                ? "Atualize as informações da categoria"
                                : "Preencha as informações para criar uma nova categoria"}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="p-4 space-y-3">
                        <div className="space-y-1">
                            <Label className="text-xs" style={{ color: colors.text }}>Nome <span style={{ color: colors.danger }}>*</span></Label>
                            <Input
                                name="nome"
                                value={formData.nome}
                                onChange={handleInputChange}
                                placeholder="Ex: Eletrônicos"
                                className="h-8 text-xs"
                                style={{
                                    backgroundColor: colors.card,
                                    borderColor: errors.nome ? colors.danger : colors.border,
                                    color: colors.text
                                }}
                            />
                            {errors.nome && <p className="text-xs" style={{ color: colors.danger }}>{errors.nome}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs" style={{ color: colors.text }}>Tipo</Label>
                                <Select value={formData.tipo} onValueChange={(v) => handleSelectChange("tipo", v)}>
                                    <SelectTrigger className="h-8 text-xs" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                        <SelectItem value="produto" className="text-xs">Produto</SelectItem>
                                        <SelectItem value="servico" className="text-xs">Serviço</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs" style={{ color: colors.text }}>Status</Label>
                                <Select value={formData.status} onValueChange={(v) => handleSelectChange("status", v)}>
                                    <SelectTrigger className="h-8 text-xs" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                        <SelectItem value="ativo" className="text-xs">Ativo</SelectItem>
                                        <SelectItem value="inativo" className="text-xs">Inativo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs" style={{ color: colors.text }}>Descrição</Label>
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
                                    color: colors.text
                                }}
                            />
                        </div>

                        <div className="flex gap-2 pt-2 border-t" style={{ borderColor: colors.border }}>
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}
                                className="flex-1 h-8 text-xs" style={{ borderColor: colors.border, color: colors.textSecondary }}>
                                Cancelar
                            </Button>
                            <Button type="submit" size="sm" disabled={isSubmitting}
                                className="flex-1 h-8 gap-1 text-white text-xs" style={{ backgroundColor: colors.primary }}>
                                {isSubmitting ? (
                                    <>
                                        <div className="h-3 w-3 border-2 border-b-0 border-l-0" style={{ borderColor: 'white', animation: 'spin 1s linear infinite' }} />
                                        Salvando
                                    </>
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

            {/* Modal de Confirmação de Delete - SEM ROUNDED */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent 
                    className="sm:max-w-[350px] p-0"
                    style={{ 
                        backgroundColor: colors.card, 
                        borderColor: colors.border 
                    }}
                >
                    <DialogHeader className="p-4 border-b" style={{ borderColor: colors.border }}>
                        <DialogTitle className="flex items-center gap-2 text-sm" style={{ color: colors.danger }}>
                            <AlertTriangle className="h-4 w-4" />
                            Confirmar Exclusão
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="p-4">
                        <p className="text-xs mb-4" style={{ color: colors.textSecondary }}>
                            Tem certeza que deseja excluir a categoria{" "}
                            <strong style={{ color: colors.text }}>"{categoriaSelecionada?.nome}"</strong>?
                            <br />Esta ação não pode ser desfeita.
                        </p>

                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 h-8 text-xs" style={{ borderColor: colors.border, color: colors.textSecondary }}>
                                Cancelar
                            </Button>
                            <Button size="sm" onClick={handleDeletar}
                                className="flex-1 h-8 gap-1 text-white text-xs" style={{ backgroundColor: colors.danger }}>
                                <Trash2 className="h-3 w-3" />
                                Excluir
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </MainEmpresa>
    );
}