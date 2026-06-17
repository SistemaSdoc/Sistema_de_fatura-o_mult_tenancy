"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLandlordAuth } from "@/context/LandlordAuthContext";
import { api } from "@/services/axios";
import { useThemeColors } from "@/context/ThemeContext";
import {
    Building2,
    Plus,
    AlertCircle,
    CheckCircle,
    XCircle,
    RefreshCw,
    Database,
    Search,
    Filter,
    Eye,
    Power,
    Download,
    ChevronLeft,
    ChevronRight,
    Mail,
    Phone,
    Globe,
    Hash,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Empresa {
    id: string;
    nome: string;
    nif: string;
    email: string;
    status: "ativo" | "suspenso";
    db_name: string;
    regime_fiscal: string;
    telefone?: string;
    endereco?: string;
    subdomain?: string;
    logo?: string | null;
}

export default function EmpresasDashboard() {
    const { user, loading: authLoading } = useLandlordAuth();
    const router = useRouter();
    const colors = useThemeColors();

    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [filteredEmpresas, setFilteredEmpresas] = useState<Empresa[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<
        "todos" | "ativo" | "suspenso"
    >("todos");
    const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
    const [showStatusDialog, setShowStatusDialog] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Redirecionar se não for super admin
    useEffect(() => {
        if (!authLoading && (!user || user.role !== "super_admin")) {
            router.push("/landlord/login");
        }
    }, [user, authLoading, router]);

    const fetchEmpresas = async () => {
        setLoading(true);
        try {
            const response = await api.get("/api/landlord/empresas");
            const data = response.data.data || response.data;
            setEmpresas(data);
            setFilteredEmpresas(data);
            setError("");
        } catch (err: any) {
            const errorMsg =
                err.response?.data?.message || "Erro ao carregar a lista de empresas";
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: string) => {
        setActionLoading(id);
        try {
            const response = await api.patch(
                `/api/landlord/empresas/${id}/toggle-status`,
            );

            toast.success(response.data.message || "Status alterado com sucesso");

            if (response.data.redirect_to_login) {
                toast.warning("Empresa suspensa. Redirecionando para o login...");
                setTimeout(() => {
                    window.location.href = "/landlord/login";
                }, 1500);
            } else {
                await fetchEmpresas();
            }

            setShowStatusDialog(false);
            setSelectedEmpresa(null);
        } catch (err: any) {
            toast.error(
                err.response?.data?.message || "Erro ao alterar status da empresa",
            );
        } finally {
            setActionLoading(null);
        }
    };

    const confirmStatusChange = (empresa: Empresa) => {
        setSelectedEmpresa(empresa);
        setShowStatusDialog(true);
    };

    useEffect(() => {
        if (user) fetchEmpresas();
    }, [user]);

    // Filtros e busca
    useEffect(() => {
        let filtered = [...empresas];

        if (searchTerm) {
            filtered = filtered.filter(
                (emp) =>
                    emp.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    emp.nif.includes(searchTerm) ||
                    emp.email.toLowerCase().includes(searchTerm.toLowerCase()),
            );
        }

        if (statusFilter !== "todos") {
            filtered = filtered.filter((emp) => emp.status === statusFilter);
        }

        setFilteredEmpresas(filtered);
        setCurrentPage(1);
    }, [searchTerm, statusFilter, empresas]);

    // Paginação
    const totalPages = Math.ceil(filteredEmpresas.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedEmpresas = filteredEmpresas.slice(
        startIndex,
        startIndex + itemsPerPage,
    );

    const totalEmpresas = empresas.length;
    const ativas = empresas.filter((e) => e.status === "ativo").length;
    const suspensas = empresas.filter((e) => e.status === "suspenso").length;

    const exportToCSV = () => {
        const headers = [
            "Nome",
            "NIF",
            "Email",
            "Telefone",
            "Status",
            "Regime Fiscal",
        ];
        const data = empresas.map((emp) => [
            emp.nome,
            emp.nif,
            emp.email,
            emp.telefone || "",
            emp.status === "ativo" ? "Ativa" : "Suspensa",
            emp.regime_fiscal,
        ]);

        const csvContent = [headers, ...data]
            .map((row) => row.join(","))
            .join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute(
            "download",
            `empresas_${new Date().toISOString().split("T")[0]}.csv`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Exportação concluída");
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[70vh]">
                <div className="text-center">
                    <RefreshCw
                        className="animate-spin w-10 h-10 mx-auto mb-4"
                        style={{ color: colors.primary }}
                    />
                    <p style={{ color: colors.textSecondary }}>A carregar empresas...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Card
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <AlertCircle className="text-red-500 shrink-0" size={24} />
                        <div className="flex-1">
                            <p className="font-semibold mb-1" style={{ color: colors.text }}>
                                Erro ao carregar empresas
                            </p>
                            <p className="text-sm" style={{ color: colors.textSecondary }}>
                                {error}
                            </p>
                        </div>
                        <Button
                            onClick={fetchEmpresas}
                            className="w-full sm:w-auto"
                            style={{ backgroundColor: colors.primary, color: "#fff" }}
                        >
                            Tentar novamente
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h1
                            className="text-2xl sm:text-3xl font-bold tracking-tight"
                            style={{ color: colors.secondary }}
                        >
                            Bem‑vindo,{" "}
                            <span
                                className="text-2xl sm:text-3xl font-bold tracking-tight"
                                style={{ color: colors.secondary }}
                            >
                                {user?.name?.split(" ")[0] || "Super Admin"}
                            </span>
                        </h1>
                        <p
                            className="text-sm sm:text-base flex items-center gap-2 mt-1"
                            style={{ color: colors.textSecondary }}
                        >
                            Gerir todas as empresas do sistema
                        </p>
                    </div>
                </div>

             
            </div>

            {/* Cards de resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div
                    className="relative transition-all duration-300 hover:scale-[1.02] hover:shadow-xl overflow-hidden"
                    style={{
                        backgroundColor: colors.card,
                        border:
                            statusFilter === "todos"
                                ? `1px solid ${colors.primary}`
                                : `1px solid ${colors.border}`,
                    }}
                >
                    <div
                        className="absolute left-0 top-0 bottom-0 w-1"
                        style={{ backgroundColor: colors.primary }}
                    />
                    <div className="p-5 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p
                                    className="text-sm font-medium"
                                    style={{ color: colors.textSecondary }}
                                >
                                    Total de Empresas
                                </p>
                                <p
                                    className="text-3xl font-bold mt-1"
                                    style={{ color: colors.primary }}
                                >
                                    {totalEmpresas}
                                </p>
                            </div>
                            <div
                                className="p-3 rounded-full"
                                style={{ backgroundColor: `${colors.primary}15` }}
                            >
                                <Building2 size={24} style={{ color: colors.primary }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className="relative transition-all duration-300 hover:scale-[1.02] hover:shadow-xl overflow-hidden"
                    style={{
                        backgroundColor: colors.card,
                        border:
                            statusFilter === "ativo"
                                ? `1px solid ${colors.success}`
                                : `1px solid ${colors.border}`,
                    }}
                    
                >
                    <div
                        className="absolute left-0 top-0 bottom-0 w-1"
                        style={{ backgroundColor: colors.success }}
                    />
                    <div className="p-5 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p
                                    className="text-sm font-medium"
                                    style={{ color: colors.textSecondary }}
                                >
                                    Ativas
                                </p>
                                <p
                                    className="text-3xl font-bold mt-1"
                                    style={{ color: colors.success }}
                                >
                                    {ativas}
                                </p>
                            </div>
                            <div
                                className="p-3 rounded-full"
                                style={{ backgroundColor: `${colors.success}15` }}
                            >
                                <CheckCircle size={24} style={{ color: colors.success }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className="relative transition-all duration-300 hover:scale-[1.02] hover:shadow-xl overflow-hidden"
                    style={{
                        backgroundColor: colors.card,
                        border:
                            statusFilter === "suspenso"
                                ? `1px solid ${colors.secondary}`
                                : `1px solid ${colors.border}`,
                    }}
                    
                >
                    <div
                        className="absolute left-0 top-0 bottom-0 w-1"
                        style={{ backgroundColor: colors.secondary }}
                    />
                    <div className="p-5 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p
                                    className="text-sm font-medium"
                                    style={{ color: colors.textSecondary }}
                                >
                                    Suspensas
                                </p>
                                <p
                                    className="text-3xl font-bold mt-1"
                                    style={{ color: colors.secondary }}
                                >
                                    {suspensas}
                                </p>
                            </div>
                            <div
                                className="p-3 rounded-full"
                                style={{ backgroundColor: `${colors.secondary}15` }}
                            >
                                <XCircle size={24} style={{ color: colors.secondary }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Barra de ferramentas */}
            <Card
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                className="shadow-sm"
            >
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-between">
                        <div className="flex flex-col sm:flex-row flex-1 gap-3">
                            <div className="relative flex-1 sm:max-w-sm">
                                <Search
                                    className="absolute left-3 top-1/2 transform -translate-y-1/2"
                                    size={16}
                                    style={{ color: colors.textSecondary }}
                                />
                                <Input
                                    placeholder="Buscar por nome, NIF ou email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 transition-all duration-200 focus:ring-2"
                                    style={{
                                        backgroundColor: colors.background,
                                        borderColor: colors.border,
                                        color: colors.text,
                                    }}
                                />
                            </div>

                            <div className="relative">
                                <Filter
                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                                    size={14}
                                    style={{ color: colors.textSecondary }}
                                />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                    className="w-full sm:w-auto pl-9 pr-3 py-2 text-sm border focus:outline-none "
                                    style={{
                                        backgroundColor: colors.background,
                                        borderColor: colors.border,
                                        color: colors.text,
                                        outline: "none",
                                    }}
                                >
                                    <option value="todos">Todos os status</option>
                                    <option value="ativo">Ativas</option>
                                    <option value="suspenso">Suspensas</option>
                                </select>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            onClick={exportToCSV}
                            className="transition-all duration-200 hover:scale-105 cursor-pointer w-full sm:w-auto"
                            style={{
                                borderColor: colors.border,
                                color: colors.text,
                                backgroundColor: colors.card,
                            }}
                        >
                            <Download size={16} className="mr-2" />
                            Exportar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Lista de empresas */}
            {filteredEmpresas.length === 0 ? (
                <Card
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                    className="shadow-sm"
                >
                    <CardContent className="p-12 text-center">
                        <Database
                            size={48}
                            className="mx-auto mb-4"
                            style={{ color: colors.textSecondary }}
                        />
                        <p
                            className="text-lg font-medium mb-1"
                            style={{ color: colors.text }}
                        >
                            Nenhuma empresa encontrada
                        </p>
                        <p style={{ color: colors.textSecondary }}>
                            {searchTerm || statusFilter !== "todos"
                                ? "Tente ajustar os filtros de busca"
                                : 'Clique em "Nova Empresa" para criar a primeira empresa'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Tabela (desktop) */}
                    <div
                        className="hidden lg:block overflow-x-auto  border shadow-sm"
                        style={{ borderColor: colors.border }}
                    >
                        <table
                            className="min-w-full divide-y"
                            style={{ borderColor: colors.border }}
                        >
                            <thead style={{ backgroundColor: colors.primary }}>
                                <tr>
                                    <th
                                        className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                                        style={{ color: '#fff'}}
                                    >
                                        Empresa
                                    </th>
                                    <th
                                        className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                                        style={{ color: '#fff'}}
                                    >
                                        NIF
                                    </th>
                                    <th
                                        className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                                        style={{ color: '#fff'}}
                                    >
                                        Contacto
                                    </th>
                                    <th
                                        className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                                        style={{ color: '#fff'}}
                                    >
                                        Regime Fiscal
                                    </th>
                                    <th
                                        className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                                        style={{ color: '#fff'}}
                                    >
                                        Base Dados
                                    </th>
                                    <th
                                        className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                                        style={{ color: '#fff'}}
                                    >
                                        Status
                                    </th>
                                    <th
                                        className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                                        style={{ color: '#fff'}}
                                    >
                                        Acções
                                    </th>
                                </tr>
                            </thead>
                            <tbody
                                className="divide-y"
                                style={{ borderColor: colors.border }}
                            >
                                {paginatedEmpresas.map((emp) => (
                                    <tr
                                        key={emp.id}
                                        className="transition-colors duration-150 cursor-pointer"
                                        style={{ backgroundColor: colors.card }}
                                        onMouseEnter={(e) =>
                                            (e.currentTarget.style.backgroundColor = colors.hover)
                                        }
                                        onMouseLeave={(e) =>
                                            (e.currentTarget.style.backgroundColor = colors.card)
                                        }
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">

                                                <span
                                                    className="font-semibold"
                                                    style={{ color: colors.text }}
                                                >
                                                    {emp.nome}
                                                </span>
                                            </div>
                                            {emp.subdomain && (
                                                <div
                                                    className="text-xs mt-1 flex items-center gap-1"
                                                    style={{ color: colors.textSecondary }}
                                                >
                                                    <Globe size={10} />
                                                    {emp.subdomain}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                <Hash
                                                    size={12}
                                                    style={{ color: colors.textSecondary }}
                                                />
                                                <span
                                                    className="font-mono"
                                                    style={{ color: colors.text }}
                                                >
                                                    {emp.nif}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div
                                                    className="flex items-center gap-1 text-sm"
                                                    style={{ color: colors.text }}
                                                >
                                                    <Mail
                                                        size={12}
                                                        style={{ color: colors.textSecondary }}
                                                    />
                                                    {emp.email}
                                                </div>
                                                {emp.telefone && (
                                                    <div
                                                        className="flex items-center gap-1 text-xs"
                                                        style={{ color: colors.textSecondary }}
                                                    >
                                                        <Phone size={10} />
                                                        {emp.telefone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge
                                                variant="secondary"
                                                className="capitalize font-medium"
                                                style={{
                                                    backgroundColor: `${colors.secondary}15`,
                                                    color: colors.secondary,
                                                    border: `1px solid ${colors.secondary}30`,
                                                }}
                                            >
                                                {emp.regime_fiscal}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <code
                                                className="text-xs px-2 py-1 rounded font-mono"
                                                style={{
                                                    backgroundColor: colors.hover,
                                                    color: colors.textSecondary,
                                                }}
                                            >
                                                {emp.db_name}
                                            </code>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge
                                                style={{
                                                    backgroundColor:
                                                        emp.status === "ativo"
                                                            ? `${colors.success}15`
                                                            : `${colors.danger}15`,
                                                    color:
                                                        emp.status === "ativo"
                                                            ? colors.success
                                                            : colors.danger,
                                                    border: `1px solid ${emp.status === "ativo" ? colors.success : colors.danger}30`,
                                                }}
                                                className="font-medium px-3 py-1"
                                            >
                                                {emp.status === "ativo" ? "Ativa" : "Suspensa"}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div
                                                className="flex gap-2"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Button
                                                    size="sm"
                                                    onClick={() => confirmStatusChange(emp)}
                                                    className="transition-all duration-200 hover:scale-105 cursor-pointer"
                                                    style={{
                                                        backgroundColor:
                                                            emp.status === "ativo"
                                                                ? colors.primary
                                                                : colors.secondary,
                                                        color: "white",
                                                    }}
                                                    disabled={actionLoading === emp.id}
                                                >
                                                    {actionLoading === emp.id ? (
                                                        <RefreshCw size={14} className="animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Power size={14} className="mr-1" />
                                                            {emp.status === "ativo" ? "Suspender" : "Ativar"}
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Cartões (mobile / tablet) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
                        {paginatedEmpresas.map((emp) => (
                            <Card
                                key={emp.id}
                                className="shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer"
                                style={{
                                    backgroundColor: colors.card,
                                    borderColor: colors.border,
                                }}
                                onClick={() =>
                                    router.push(`/landlord/dashboard/empresas/${emp.id}`)
                                }
                            >
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="min-w-0">
                                                <p
                                                    className="font-semibold truncate"
                                                    style={{ color: colors.text }}
                                                >
                                                    {emp.nome}
                                                </p>
                                                {emp.subdomain && (
                                                    <p
                                                        className="text-xs flex items-center gap-1 truncate"
                                                        style={{ color: colors.textSecondary }}
                                                    >
                                                        <Globe size={10} className="shrink-0" />
                                                        {emp.subdomain}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <Badge
                                            style={{
                                                backgroundColor:
                                                    emp.status === "ativo"
                                                        ? `${colors.success}15`
                                                        : `${colors.danger}15`,
                                                color:
                                                    emp.status === "ativo"
                                                        ? colors.success
                                                        : colors.danger,
                                                border: `1px solid ${emp.status === "ativo" ? colors.success : colors.danger}30`,
                                            }}
                                            className="font-medium shrink-0"
                                        >
                                            {emp.status === "ativo" ? "Ativa" : "Suspensa"}
                                        </Badge>
                                    </div>

                                    <div
                                        className="grid grid-cols-1 gap-1.5 text-sm"
                                        style={{ color: colors.text }}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <Hash size={12} style={{ color: colors.textSecondary }} />
                                            <span className="font-mono">{emp.nif}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 truncate">
                                            <Mail
                                                size={12}
                                                style={{ color: colors.textSecondary }}
                                                className="shrink-0"
                                            />
                                            <span className="truncate">{emp.email}</span>
                                        </div>
                                        {emp.telefone && (
                                            <div className="flex items-center gap-1.5">
                                                <Phone
                                                    size={12}
                                                    style={{ color: colors.textSecondary }}
                                                />
                                                {emp.telefone}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between gap-2 pt-1">
                                        <Badge
                                            variant="secondary"
                                            className="capitalize font-medium"
                                            style={{
                                                backgroundColor: `${colors.secondary}15`,
                                                color: colors.secondary,
                                                border: `1px solid ${colors.secondary}30`,
                                            }}
                                        >
                                            {emp.regime_fiscal}
                                        </Badge>
                                        <code
                                            className="text-xs px-2 py-1 rounded font-mono truncate max-w-[40%]"
                                            style={{
                                                backgroundColor: colors.hover,
                                                color: colors.textSecondary,
                                            }}
                                        >
                                            {emp.db_name}
                                        </code>
                                    </div>

                                    <div
                                        className="flex gap-2 pt-1"
                                        onClick={(e) => e.stopPropagation()}
                                    >

                                        <Button
                                            size="sm"
                                            onClick={() => confirmStatusChange(emp)}
                                            className="flex-1 transition-all duration-200 cursor-pointer"
                                            style={{
                                                backgroundColor:
                                                    emp.status === "ativo"
                                                        ? colors.warning
                                                        : colors.success,
                                                color: "white",
                                            }}
                                            disabled={actionLoading === emp.id}
                                        >
                                            {actionLoading === emp.id ? (
                                                <RefreshCw size={14} className="animate-spin" />
                                            ) : (
                                                <>
                                                    <Power size={14} className="mr-1" />
                                                    {emp.status === "ativo" ? "Suspender" : "Ativar"}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Paginação */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                            <div
                                className="text-sm text-center sm:text-left"
                                style={{ color: colors.textSecondary }}
                            >
                                Mostrando {startIndex + 1} -{" "}
                                {Math.min(startIndex + itemsPerPage, filteredEmpresas.length)}{" "}
                                de {filteredEmpresas.length}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="transition-all duration-200 hover:scale-105 cursor-pointer"
                                    style={{
                                        borderColor: colors.border,
                                        color: colors.text,
                                        backgroundColor: colors.card,
                                    }}
                                >
                                    <ChevronLeft size={14} />
                                    <span className="hidden sm:inline ml-1">Anterior</span>
                                </Button>
                                <div className="hidden sm:flex gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }

                                        return (
                                            <Button
                                                key={pageNum}
                                                size="sm"
                                                variant={
                                                    currentPage === pageNum ? "default" : "outline"
                                                }
                                                onClick={() => setCurrentPage(pageNum)}
                                                className="transition-all duration-200 cursor-pointer"
                                                style={
                                                    currentPage === pageNum
                                                        ? { backgroundColor: colors.primary, color: "#fff" }
                                                        : {
                                                            borderColor: colors.border,
                                                            color: colors.text,
                                                            backgroundColor: colors.card,
                                                        }
                                                }
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <span
                                    className="sm:hidden text-sm font-medium"
                                    style={{ color: colors.text }}
                                >
                                    {currentPage} / {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                                    }
                                    disabled={currentPage === totalPages}
                                    className="transition-all duration-200 hover:scale-105 cursor-pointer"
                                    style={{
                                        borderColor: colors.border,
                                        color: colors.text,
                                        backgroundColor: colors.card,
                                    }}
                                >
                                    <span className="hidden sm:inline mr-1">Próxima</span>
                                    <ChevronRight size={14} />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Dialog de confirmação */}
            <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
                <DialogContent
                    className="transition-all duration-300"
                    style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderTop: `4px solid ${selectedEmpresa?.status === "ativo" ? colors.primary : colors.secondary}`,
                    }}
                >
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div
                                className="p-2 rounded-full"
                                style={{
                                    backgroundColor:
                                        selectedEmpresa?.status === "ativo"
                                            ? `${colors.primary}15`
                                            : `${colors.secondary}15`,
                                }}
                            >
                                {selectedEmpresa?.status === "ativo" ? (
                                    <XCircle size={24} style={{ color: colors.primary }} />
                                ) : (
                                    <CheckCircle size={24} style={{ color: colors.secondary }} />
                                )}
                            </div>
                            <DialogTitle
                                className="text-xl font-bold"
                                style={{ color: colors.text }}
                            >
                                {selectedEmpresa?.status === "ativo"
                                    ? "Suspender Empresa"
                                    : "Ativar Empresa"}
                            </DialogTitle>
                        </div>
                        <DialogDescription style={{ color: colors.textSecondary }}>
                            {selectedEmpresa?.status === "ativo"
                                ? `Tem certeza que deseja suspender a empresa "${selectedEmpresa?.nome}"? Os utilizadores não poderão aceder ao sistema até ser reativada.`
                                : `Tem certeza que deseja ativar a empresa "${selectedEmpresa?.nome}"? Todas as funcionalidades serão restauradas imediatamente.`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 mt-4 flex-col sm:flex-row">
                        <Button
                            variant="outline"
                            onClick={() => setShowStatusDialog(false)}
                            className="transition-all duration-200 w-full sm:w-auto"
                            style={{ borderColor: colors.border, color: colors.text }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={() =>
                                selectedEmpresa &&
                                toggleStatus(selectedEmpresa.id, selectedEmpresa.status)
                            }
                            className="transition-all duration-200 hover:scale-105 w-full sm:w-auto"
                            style={{
                                backgroundColor:
                                    selectedEmpresa?.status === "ativo"
                                        ? colors.primary
                                        : colors.secondary,
                                color: "white",
                            }}
                        >
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
