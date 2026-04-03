"use client";

import React, { ReactNode, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Home,
    FileText,
    Users,
    BarChart2,
    LogOut,
    ChevronDown,
    ShoppingCart,
    Package,
    Archive,
    Truck,
    ChevronLeft,
    Settings,
    Bell,
    Loader2,
    X,
    Sun,
    Moon,
    Menu,
    AlertCircle,
    TrendingDown,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/authprovider";
import { estoqueService, ResumoEstoque } from "@/services/estoque";
import { produtoService, Produto } from "@/services/produtos";
import { useTheme, useThemeColors } from "@/context/ThemeContext";

interface DropdownLink {
    label: string;
    path: string;
    icon?: LucideIcon;
}

interface MenuItem {
    label: string;
    icon: LucideIcon;
    path: string;
    links: DropdownLink[];
    isGroup?: boolean;
    roles?: string[];
}

interface MainEmpresaProps {
    children: ReactNode;
    companyLogo?: string;
    companyName?: string;
}

export default function MainEmpresa({
    children,
    companyLogo,
    companyName,
}: MainEmpresaProps) {
    const pathname = usePathname();
    const router = useRouter();

    const { user, loading: userLoading, logout: authLogout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const colors = useThemeColors();

    // State management
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState<Record<string, boolean>>({});
    const [isLoaded, setIsLoaded] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);
    const [logoutError, setLogoutError] = useState<string | null>(null);
    const [notificacoesAberto, setNotificacoesAberto] = useState(false);
    const [produtosEstoqueBaixo, setProdutosEstoqueBaixo] = useState<Produto[]>([]);
    const [produtosSemEstoque, setProdutosSemEstoque] = useState<Produto[]>([]);
    const [loadingNotificacoes, setLoadingNotificacoes] = useState(false);
    const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
    const [abaAtiva, setAbaAtiva] = useState<"baixo" | "zero">("baixo");
    const [modalAnimating, setModalAnimating] = useState(false);
    const [panelAnimating, setPanelAnimating] = useState(false);

    // User data
    const userName = user?.name || "";
    const userRole = user?.role || "";
    const userEmail = user?.email || "";
    const userInitial = userName.charAt(0).toUpperCase();
    const empresaLogo = companyLogo || user?.empresa?.logo || "/images/mwamba.jpeg";
    const nomeEmpresa = companyName || user?.empresa?.nome || "MWAMBA";

    // Responsive detection
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) {
                setSidebarOpen(true);
            } else {
                setSidebarOpen(false);
            }
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Fechar sidebar ao mudar de rota no mobile
    useEffect(() => {
        if (isMobile) {
            setSidebarOpen(false);
        }
    }, [pathname, isMobile]);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    // Stock notifications
    const buscarNotificacoesEstoque = useCallback(async () => {
        if (!user) return;

        setLoadingNotificacoes(true);
        try {
            const resumo = await estoqueService.obterResumo();
            const produtosCriticos = resumo.produtos_criticos || [];
            setProdutosEstoqueBaixo(
                produtosCriticos.filter((p: Produto) => p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo)
            );

            const responseSemEstoque = await produtoService.listarProdutos({
                sem_estoque: true,
                tipo: "produto",
                paginar: false,
            });

            const produtosSemStock = Array.isArray(responseSemEstoque.produtos)
                ? responseSemEstoque.produtos
                : responseSemEstoque.produtos.data || [];

            setProdutosSemEstoque(produtosSemStock.filter((p: Produto) => p.estoque_atual === 0));
            setUltimaAtualizacao(new Date());
        } catch (error) {
            console.error("Erro ao buscar produtos com estoque baixo:", error);
            setProdutosEstoqueBaixo([]);
            setProdutosSemEstoque([]);
        } finally {
            setLoadingNotificacoes(false);
        }
    }, [user]);

    useEffect(() => {
        if (user && (userRole === "admin" || userRole === "operador")) {
            buscarNotificacoesEstoque();
            const interval = setInterval(buscarNotificacoesEstoque, 300000);
            return () => clearInterval(interval);
        }
    }, [user, userRole, buscarNotificacoesEstoque]);

    // Helpers
    const closeSidebar = () => setSidebarOpen(false);

    const toggleDropdown = (label: string) => {
        setDropdownOpen((prev) => ({ ...prev, [label]: !prev[label] }));
    };

    const handleMainItemClick = (item: MenuItem, e: React.MouseEvent) => {
        if (item.links.length > 0) {
            e.preventDefault();
            toggleDropdown(item.label);
        } else {
            if (isMobile) closeSidebar();
        }
    };

    const handleLinkClick = () => {
        if (isMobile) closeSidebar();
    };

    const toggleNotificacoes = () => {
        if (!notificacoesAberto) {
            setNotificacoesAberto(true);
            setPanelAnimating(true);
            setTimeout(() => setPanelAnimating(false), 200);
            buscarNotificacoesEstoque();
        } else {
            setPanelAnimating(true);
            setTimeout(() => {
                setNotificacoesAberto(false);
                setPanelAnimating(false);
            }, 150);
        }
    };

    // Logout handlers com animação
    const abrirModalLogout = () => {
        setLogoutError(null);
        setModalAnimating(true);
        setLogoutModalOpen(true);
        setTimeout(() => setModalAnimating(false), 200);
    };

    const fecharModalLogout = () => {
        setModalAnimating(true);
        setTimeout(() => {
            setLogoutModalOpen(false);
            setLogoutError(null);
            setModalAnimating(false);
        }, 150);
    };

    const handleLogout = async () => {
        try {
            setLogoutLoading(true);
            setLogoutError(null);
            const result = await authLogout();
            if (result.success) {
                router.push("/login");
            } else {
                setLogoutError(result.message || "Erro ao fazer logout");
                setTimeout(() => router.push("/login"), 2000);
            }
        } catch {
            setLogoutError("Erro inesperado. Redirecionando...");
            setTimeout(() => router.push("/login"), 2000);
        } finally {
            setLogoutLoading(false);
            fecharModalLogout();
        }
    };

    // Navigation helpers
    const isActive = (path: string) => pathname === path;

    const isParentActive = (item: MenuItem) => {
        if (pathname === item.path && !item.isGroup) return true;
        return item.links.some((link) => pathname === link.path);
    };

    const temPermissao = (item: MenuItem): boolean => {
        if (!item.roles || item.roles.length === 0) return true;
        return item.roles.includes(userRole);
    };

    // Menu items
    const menuItems: MenuItem[] = [
        {
            label: "Dashboard",
            icon: Home,
            path: "/dashboard",
            links: [],
            roles: ["admin", "contabilista", "operador"],
        },
        {
            label: "Vendas",
            icon: ShoppingCart,
            path: "/dashboard/Vendas",
            links:
                userRole === "admin"
                    ? [
                        { label: "Venda a pronto", path: "/dashboard/Vendas/Nova_venda", icon: ShoppingCart },
                        { label: "Kilape", path: "/dashboard/Faturas/Fatura_Normal", icon: FileText },
                        { label: "Proforma", path: "/dashboard/Faturas/Faturas_Proforma", icon: FileText },
                    ]
                    : userRole === "operador"
                        ? [{ label: "Venda a pronto", path: "/dashboard/Vendas/Nova_venda", icon: ShoppingCart },
                        { label: "Venda a prazo", path: "/dashboard/Faturas/Fatura_Normal", icon: FileText },
                        { label: "Proforma", path: "/dashboard/Faturas/Faturas_Proforma", icon: FileText },]
                        : [
                            
                        ],
            isGroup: true,
            roles: ["admin", "operador"],
        },
        {
            label: "Doc. Fiscais",
            icon: FileText,
            path: "/dashboard/Faturas",
            links:
                userRole === "operador" || userRole === "admin"
                    ? [
                        { label: "Documentos fiscais", path: "/dashboard/Faturas/Faturas", icon: FileText },
                        { label: "Outro", path: "/dashboard/Faturas/DC", icon: FileText },
                    ]
                    : [],
            isGroup: true,
            roles: ["admin", "operador"],
        },
        {
            label: "Stock",
            icon: Archive,
            path: "/dashboard/Produtos_servicos",
            links: [
                { label: "Stock", path: "/dashboard/Produtos_servicos/Stock", icon: Package },
                { label: "Categorias", path: "/dashboard/Produtos_servicos/categorias", icon: Package },
                { label: "Fornecedores", path: "/dashboard/Fornecedores/Novo_fornecedor", icon: Truck },
            ],
            isGroup: true,
            roles: ["admin", "operador"],
        },
        {
            label: "Clientes",
            icon: Users,
            path: "/dashboard/Clientes/Novo_cliente",
            links: [],
            roles: ["admin"],
        },
        {
            label: "Relatórios",
            icon: BarChart2,
            path: "/dashboard/relatorios",
            links: [],
            roles: ["admin", "contabilista"],
        },
        ...(userRole === "admin"
            ? [{
                label: "Configurações",
                icon: Settings,
                path: "/dashboard/configuracoes",
                links: [],
                roles: ["admin"],
            }]
            : []),
    ];

    const menuItemsFiltrados = menuItems.filter(temPermissao);
    const totalNotificacoes = produtosEstoqueBaixo.length + produtosSemEstoque.length;

    // Loading
    if (userLoading) {
        return (
            <div className="flex items-center justify-center w-screen h-screen" style={{ backgroundColor: colors.background }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const currentPageLabel = menuItemsFiltrados.find((item) => isParentActive(item))?.label || "Dashboard";

    return (
        <div className="flex w-screen h-screen overflow-hidden" style={{ backgroundColor: colors.background }}>
            {/* Mobile overlay com fade animation */}
            {sidebarOpen && isMobile && (
                <div
                    onClick={closeSidebar}
                    className="fixed inset-0 z-30 transition-opacity duration-300 animate-fade-in"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
                />
            )}

            {/* Sidebar */}
            <aside
                className="fixed left-0 top-0 z-40 flex flex-col h-screen transition-all duration-300 border-r md:relative md:z-0"
                style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    width: sidebarOpen ? (isMobile ? "280px" : "260px") : (isMobile ? "0" : "72px"),
                    transform: sidebarOpen || !isMobile ? "translateX(0)" : isMobile ? "translateX(-100%)" : "translateX(0)",
                }}
            >
                {/* Desktop collapse button */}
                {!isMobile && (
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="absolute -right-3 top-8 z-50 p-1.5 text-white transition-transform hover:scale-110 active:scale-95"
                        style={{ backgroundColor: colors.primary }}
                    >
                        <ChevronLeft size={14} style={{ transform: sidebarOpen ? "rotate(0)" : "rotate(180deg)", transition: "transform 0.3s" }} />
                    </button>
                )}

                {/* Logo section */}
                <div
                    className="flex items-center gap-3 h-16 px-4 border-b flex-shrink-0"
                    style={{ borderColor: colors.border }}
                >
                    {empresaLogo ? (
                        <Image
                            src={empresaLogo}
                            alt="Logo"
                            width={32}
                            height={32}
                            className="flex-shrink-0 object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                    ) : (
                        <div
                            className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm font-bold text-white"
                            style={{ backgroundColor: colors.primary }}
                        >
                            {nomeEmpresa.charAt(0).toUpperCase()}
                        </div>
                    )}

                    {sidebarOpen && (
                        <span className="text-sm font-semibold truncate" style={{ color: colors.text }}>
                            {nomeEmpresa}
                        </span>
                    )}

                    {isMobile && sidebarOpen && (
                        <button
                            onClick={closeSidebar}
                            className="p-1 ml-auto transition-transform hover:scale-110 active:scale-95"
                            style={{ color: colors.text }}
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
                    {isLoaded &&
                        menuItemsFiltrados.map((item) => {
                            const active = isParentActive(item);
                            const isOpen = dropdownOpen[item.label];
                            const hasLinks = item.links.length > 0;

                            return (
                                <div key={item.label}>
                                    <div
                                        className="flex items-center justify-between px-3 py-2.5 transition-all duration-200 cursor-pointer select-none hover:translate-x-1 active:scale-98"
                                        style={{
                                            backgroundColor: active ? colors.secondary : "transparent",
                                            color: active ? "white" : colors.text,
                                        }}
                                        onClick={(e) => handleMainItemClick(item, e)}
                                    >
                                        {hasLinks ? (
                                            <div className="flex items-center flex-1 gap-3 min-w-0">
                                                <item.icon size={19} style={{ color: active ? "white" : colors.secondary, flexShrink: 0 }} />
                                                {sidebarOpen && (
                                                    <span className="text-sm font-medium truncate" style={{ color: active ? "white" : colors.text }}>
                                                        {item.label}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <Link
                                                href={item.path}
                                                className="flex items-center flex-1 gap-3 min-w-0"
                                                onClick={handleLinkClick}
                                            >
                                                <item.icon size={19} style={{ color: active ? "white" : colors.secondary, flexShrink: 0 }} />
                                                {sidebarOpen && (
                                                    <span className="text-sm font-medium truncate" style={{ color: active ? "white" : colors.text }}>
                                                        {item.label}
                                                    </span>
                                                )}
                                            </Link>
                                        )}

                                        {hasLinks && sidebarOpen && (
                                            <div
                                                className="flex-shrink-0 ml-1 transition-transform duration-250"
                                                style={{
                                                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                                                }}
                                            >
                                                <ChevronDown size={15} style={{ color: active ? "white" : colors.textSecondary }} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Dropdown com slide animation */}
                                    {isOpen && sidebarOpen && (
                                        <div className="ml-3 mt-1 space-y-1 overflow-hidden animate-slide-down">
                                            {item.links.map((link) => {
                                                const linkActive = isActive(link.path);
                                                return (
                                                    <Link key={link.path} href={link.path} onClick={handleLinkClick}>
                                                        <div
                                                            className="flex items-center gap-3 px-3 py-2 border-l-2 transition-all hover:translate-x-1"
                                                            style={{
                                                                borderColor: linkActive ? colors.primary : "transparent",
                                                                backgroundColor: linkActive ? `${colors.primary}15` : "transparent",
                                                            }}
                                                        >
                                                            {link.icon && (
                                                                <link.icon
                                                                    size={15}
                                                                    style={{
                                                                        color: linkActive ? colors.text : colors.text,
                                                                        flexShrink: 0
                                                                    }}
                                                                />
                                                            )}
                                                            <span
                                                                className="text-xs truncate"
                                                                style={{
                                                                    color: linkActive ? colors.text : colors.textSecondary,
                                                                    fontWeight: linkActive ? "600" : "400",
                                                                }}
                                                            >
                                                                {link.label}
                                                            </span>
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </nav>

                {/* Logout button */}
                <div className="p-2 border-t flex-shrink-0" style={{ borderColor: colors.border }}>
                    <div
                        onClick={abrirModalLogout}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all hover:translate-x-1 active:scale-98"
                        style={{
                            backgroundColor: "transparent",
                        }}
                    >
                        <LogOut size={19} className="flex-shrink-0 text-red-500" />
                        {sidebarOpen && (
                            <span className="text-sm font-medium" style={{ color: colors.text }}>
                                Sair
                            </span>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex flex-col flex-1 w-full overflow-hidden">
                {/* Header */}
                <header
                    className="flex items-center justify-between gap-3 px-3 h-14 border-b shadow-sm md:h-16 md:px-6 flex-shrink-0"
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        {isMobile && (
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="p-2 transition-transform hover:scale-110 active:scale-95 flex-shrink-0"
                                style={{ color: colors.primary }}
                            >
                                <Menu size={20} />
                            </button>
                        )}
                        <h1 className="text-sm font-bold truncate md:text-base" style={{ color: colors.text }}>
                            {currentPageLabel}
                        </h1>
                    </div>

                    {/* Header actions */}
                    <div className="flex items-center gap-1 flex-shrink-0 md:gap-2">
                        {/* Theme toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 transition-all hover:scale-110 active:scale-95"
                            style={{ backgroundColor: colors.hover, color: colors.text }}
                        >
                            {theme === "dark" ? (
                                <Sun size={16} className="md:w-[18px] md:h-[18px]" style={{ color: colors.secondary }} />
                            ) : (
                                <Moon size={16} className="md:w-[18px] md:h-[18px]" style={{ color: colors.primary }} />
                            )}
                        </button>

                        {/* Notifications */}
                        {(userRole === "admin" || userRole === "operador") && (
                            <div className="relative">
                                <button
                                    onClick={toggleNotificacoes}
                                    className="relative p-2 transition-all hover:scale-110 active:scale-95"
                                    style={{ backgroundColor: notificacoesAberto ? colors.hover : "transparent" }}
                                >
                                    <Bell size={16} className="md:w-[18px] md:h-[18px]" style={{ color: colors.secondary }} />
                                    {totalNotificacoes > 0 && (
                                        <span
                                            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] text-[10px] font-bold flex items-center justify-center px-1 text-white animate-pulse"
                                            style={{ backgroundColor: produtosSemEstoque.length > 0 ? colors.danger : "#f59e0b" }}
                                        >
                                            {totalNotificacoes > 9 ? "9+" : totalNotificacoes}
                                        </span>
                                    )}
                                </button>

                                {/* Notification panel com slide animation */}
                                {notificacoesAberto && (
                                    <>
                                        <div
                                            className={`absolute right-0 z-50 mt-2 overflow-hidden border shadow-lg transition-all duration-200 ${panelAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                                                }`}
                                            style={{
                                                backgroundColor: colors.card,
                                                borderColor: colors.border,
                                                width: "min(380px, calc(100vw - 20px))",
                                                transformOrigin: "top right",
                                            }}
                                        >
                                            {/* Header */}
                                            <div className="p-3 border-b" style={{ borderColor: colors.border }}>
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-sm font-semibold" style={{ color: colors.text }}>
                                                        Alertas
                                                    </h3>
                                                    <button
                                                        onClick={() => setNotificacoesAberto(false)}
                                                        className="p-1 transition-transform hover:scale-110 active:scale-95"
                                                    >
                                                        <X size={16} style={{ color: colors.textSecondary }} />
                                                    </button>
                                                </div>
                                                {ultimaAtualizacao && (
                                                    <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                                                        {ultimaAtualizacao.toLocaleTimeString("pt-PT")}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Tabs */}
                                            <div className="flex border-b" style={{ borderColor: colors.border }}>
                                                <button
                                                    onClick={() => setAbaAtiva("baixo")}
                                                    className="flex-1 py-2 px-3 text-xs font-medium transition-all hover:scale-105"
                                                    style={{
                                                        color: abaAtiva === "baixo" ? colors.text : colors.textSecondary,
                                                        borderBottom: abaAtiva === "baixo" ? `2px solid ${colors.secondary}` : "none",
                                                    }}
                                                >
                                                    Baixo ({produtosEstoqueBaixo.length})
                                                </button>
                                                <button
                                                    onClick={() => setAbaAtiva("zero")}
                                                    className="flex-1 py-2 px-3 text-xs font-medium transition-all hover:scale-105"
                                                    style={{
                                                        color: abaAtiva === "zero" ? colors.text : colors.textSecondary,
                                                        borderBottom: abaAtiva === "zero" ? `2px solid ${colors.secondary}` : "none",
                                                    }}
                                                >
                                                    Zero ({produtosSemEstoque.length})
                                                </button>
                                            </div>

                                            {/* Content */}
                                            <div className="max-h-80 overflow-y-auto">
                                                {loadingNotificacoes ? (
                                                    <div className="flex items-center justify-center py-6">
                                                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: colors.primary }} />
                                                    </div>
                                                ) : abaAtiva === "baixo" && produtosEstoqueBaixo.length > 0 ? (
                                                    <div style={{ borderColor: colors.border }} className="divide-y">
                                                        {produtosEstoqueBaixo.map((produto, idx) => (
                                                            <div
                                                                key={produto.id}
                                                                className="p-3 transition-all hover:translate-x-1"
                                                                style={{ animation: `fadeIn 0.2s ease-out ${idx * 0.03}s forwards` }}
                                                            >
                                                                <div className="flex gap-2">
                                                                    <div className="p-1.5 flex-shrink-0" style={{ backgroundColor: colors.warning }}>
                                                                        <TrendingDown size={14} className="text-white" />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-xs font-medium truncate" style={{ color: colors.text }}>
                                                                            {produto.nome}
                                                                        </p>
                                                                        <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                                                                            {produto.estoque_atual} / {produto.estoque_minimo}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : abaAtiva === "zero" && produtosSemEstoque.length > 0 ? (
                                                    <div style={{ borderColor: colors.border }} className="divide-y">
                                                        {produtosSemEstoque.map((produto, idx) => (
                                                            <div
                                                                key={produto.id}
                                                                className="p-3 transition-all hover:translate-x-1"
                                                                style={{ animation: `fadeIn 0.2s ease-out ${idx * 0.03}s forwards` }}
                                                            >
                                                                <div className="flex gap-2">
                                                                    <div className="p-1.5 flex-shrink-0" style={{ backgroundColor: colors.danger }}>
                                                                        <AlertCircle size={14} className="text-white" />
                                                                    </div>
                                                                    <p className="text-xs font-medium truncate" style={{ color: colors.text }}>
                                                                        {produto.nome}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-8 text-center">
                                                        <p className="text-xs" style={{ color: colors.textSecondary }}>
                                                            Sem alertas
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer */}
                                            <div className="p-2 border-t text-center" style={{ borderColor: colors.border }}>
                                                <button
                                                    onClick={buscarNotificacoesEstoque}
                                                    disabled={loadingNotificacoes}
                                                    className="text-xs font-medium transition-all hover:scale-105 disabled:opacity-50"
                                                    style={{ color: colors.text }}
                                                >
                                                    {loadingNotificacoes ? "Atualizando..." : "Atualizar"}
                                                </button>
                                            </div>
                                        </div>
                                        <div
                                            onClick={() => setNotificacoesAberto(false)}
                                            className="fixed inset-0 z-40"
                                        />
                                    </>
                                )}
                            </div>
                        )}

                        {/* Close notifications overlay */}
                        {notificacoesAberto && (
                            <div
                                onClick={() => setNotificacoesAberto(false)}
                                className="fixed inset-0 z-40"
                            />
                        )}

                        {/* User avatar */}
                        <div
                            className="flex items-center gap-2 pl-2 border-l md:pl-3 flex-shrink-0"
                            style={{ borderColor: colors.border }}
                        >
                            <div className="hidden text-right md:block">
                                <p className="text-xs font-semibold leading-tight" style={{ color: colors.text }}>
                                    {userName.split(" ")[0]}
                                </p>
                                <p className="text-[10px]" style={{ color: colors.textSecondary }}>
                                    {userRole === "admin" ? "Admin" : userRole === "contabilista" ? "Contab." : "Op."}
                                </p>
                            </div>
                            <div
                                className="flex items-center justify-center w-7 h-7 text-xs font-bold text-white md:w-8 md:h-8 flex-shrink-0 transition-transform hover:scale-105"
                                style={{ background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary} 100%)` }}
                            >
                                {userInitial}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-auto p-3 md:p-6">
                    <div className="animate-fade-in">
                        {children}
                    </div>
                </main>
            </div>

            {/* Logout modal com animação */}
            {logoutModalOpen && (
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${modalAnimating ? 'opacity-0' : 'opacity-100'
                        }`}
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
                    onClick={fecharModalLogout}
                >
                    <div
                        className={`w-full max-w-sm overflow-hidden shadow-lg transition-all duration-200 ${modalAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
                            }`}
                        style={{ backgroundColor: colors.card }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b text-center md:p-6 md:pb-4" style={{ borderColor: colors.border }}>
                            <h2 className="text-lg font-bold md:text-xl" style={{ color: colors.text }}>
                                Confirmar
                            </h2>
                            <p className="text-xs mt-1 md:text-sm" style={{ color: colors.textSecondary }}>
                                Deseja sair da sua conta?
                            </p>
                        </div>

                        {logoutError && (
                            <div
                                className="p-2 mx-4 mb-3 text-xs text-center animate-shake"
                                style={{
                                    backgroundColor: theme === "dark" ? "#442200" : "#fef3c7",
                                    border: `1px solid ${theme === "dark" ? "#854d0e" : "#fbbf24"}`,
                                    color: theme === "dark" ? "#fbbf24" : "#92400e"
                                }}
                            >
                                {logoutError}
                            </div>
                        )}

                        <div className="p-3 border-b md:p-4" style={{ backgroundColor: theme === "dark" ? "#1a1a1a" : "#f9fafb", borderColor: colors.border }}>
                            <div className="flex items-center gap-2">
                                <div
                                    className="flex items-center justify-center w-7 h-7 text-xs font-bold text-white flex-shrink-0"
                                    style={{ background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary} 100%)` }}
                                >
                                    {userInitial}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-medium truncate md:text-sm" style={{ color: colors.text }}>
                                        {userName}
                                    </p>
                                    <p className="text-[10px] truncate md:text-xs" style={{ color: colors.textSecondary }}>
                                        {userEmail}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 p-3 md:gap-3 md:p-4">
                            <button
                                onClick={fecharModalLogout}
                                disabled={logoutLoading}
                                className="flex-1 py-2 px-3 text-xs font-medium transition-all hover:scale-105 active:scale-95 md:text-sm"
                                style={{ backgroundColor: theme === "dark" ? "#333" : "#e5e7eb", color: colors.text }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleLogout}
                                disabled={logoutLoading}
                                className="flex-1 py-2 px-3 text-xs font-medium text-white transition-all flex items-center justify-center gap-1 hover:scale-105 active:scale-95 md:text-sm"
                                style={{ backgroundColor: colors.danger }}
                            >
                                {logoutLoading ? (
                                    <><Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" /></>
                                ) : (
                                    <><LogOut size={14} className="md:w-[16px] md:h-[16px]" /><span className="hidden sm:inline">Sair</span></>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: scale(0.95) translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out forwards;
                }
                
                .animate-slide-down {
                    animation: slideDown 0.2s ease-out forwards;
                }
                
                .animate-shake {
                    animation: shake 0.3s ease-in-out;
                }
                
                .hover\\:scale-105:hover {
                    transform: scale(1.05);
                }
                
                .active\\:scale-95:active {
                    transform: scale(0.95);
                }
                
                .active\\:scale-98:active {
                    transform: scale(0.98);
                }
                
                .hover\\:translate-x-1:hover {
                    transform: translateX(4px);
                }
                
                .transition-all {
                    transition-property: all;
                    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .duration-200 {
                    transition-duration: 200ms;
                }
                
                .duration-250 {
                    transition-duration: 250ms;
                }
                
                .duration-300 {
                    transition-duration: 300ms;
                }
            `}</style>
        </div>
    );
}