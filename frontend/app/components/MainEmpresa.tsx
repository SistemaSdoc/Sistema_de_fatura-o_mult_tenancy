"use client";

import React, { ReactNode, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";
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
    AlertTriangle,
    X,
    Sun,
    Moon,
    TrendingDown,
    AlertCircle,
    Menu,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/authprovider";
import { estoqueService, ResumoEstoque } from "@/services/estoque";
import { produtoService, Produto } from "@/services/produtos";
import { useTheme, useThemeColors } from "@/context/ThemeContext";

/* ===================== TYPES ===================== */
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
    const { user, loading: userLoading, isAdmin, logout: authLogout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const colors = useThemeColors();

    // Sidebar: open by default on desktop, closed on mobile
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState<Record<string, boolean>>({});
    const [isLoaded, setIsLoaded] = useState(false);

    // Logout states
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);
    const [logoutError, setLogoutError] = useState<string | null>(null);

    // Stock notification states
    const [notificacoesAberto, setNotificacoesAberto] = useState(false);
    const [produtosEstoqueBaixo, setProdutosEstoqueBaixo] = useState<Produto[]>([]);
    const [produtosSemEstoque, setProdutosSemEstoque] = useState<Produto[]>([]);
    const [resumoEstoque, setResumoEstoque] = useState<ResumoEstoque | null>(null);
    const [loadingNotificacoes, setLoadingNotificacoes] = useState(false);
    const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
    const [abaAtiva, setAbaAtiva] = useState<"baixo" | "zero">("baixo");

    // User data
    const userName = user?.name || "";
    const userRole = user?.role || "";
    const userEmail = user?.email || "";
    const userInitial = userName.charAt(0).toUpperCase();
    const empresaLogo = companyLogo || user?.empresa?.logo || "/images/3.png";
    const nomeEmpresa = companyName || user?.empresa?.nome || "SDOCA";

    /* ==================== RESPONSIVE DETECTION ==================== */
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // On desktop, sidebar starts open; on mobile, starts closed
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

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    /* ==================== STOCK NOTIFICATIONS ==================== */
    const buscarNotificacoesEstoque = useCallback(async () => {
        setLoadingNotificacoes(true);
        try {
            const resumo = await estoqueService.obterResumo();
            setResumoEstoque(resumo);
            setProdutosEstoqueBaixo(resumo.produtos_criticos || []);

            const responseSemEstoque = await produtoService.listarProdutos({
                sem_estoque: true,
                tipo: "produto",
                paginar: false,
            });

            const produtosSemStock = Array.isArray(responseSemEstoque.produtos)
                ? responseSemEstoque.produtos
                : responseSemEstoque.produtos.data || [];

            setProdutosSemEstoque(produtosSemStock);
            setUltimaAtualizacao(new Date());
        } catch (error) {
            console.error("Erro ao buscar produtos com estoque baixo:", error);
            setProdutosEstoqueBaixo([]);
            setProdutosSemEstoque([]);
        } finally {
            setLoadingNotificacoes(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            buscarNotificacoesEstoque();
            const interval = setInterval(buscarNotificacoesEstoque, 300000);
            return () => clearInterval(interval);
        }
    }, [user, buscarNotificacoesEstoque]);

    /* ==================== SIDEBAR HELPERS ==================== */
    const closeSidebar = () => setSidebarOpen(false);

    const toggleDropdown = (label: string) => {
        setDropdownOpen((prev) => ({ ...prev, [label]: !prev[label] }));
    };

    const handleMainItemClick = (item: MenuItem, e: React.MouseEvent) => {
        if (item.links.length > 0) {
            e.preventDefault();
            toggleDropdown(item.label);
        } else {
            // Close sidebar on mobile after navigation
            if (isMobile) closeSidebar();
        }
    };

    const handleLinkClick = () => {
        if (isMobile) closeSidebar();
    };

    /* ==================== NOTIFICATIONS ==================== */
    const toggleNotificacoes = () => {
        setNotificacoesAberto((prev) => !prev);
        if (!notificacoesAberto) buscarNotificacoesEstoque();
    };

    /* ==================== LOGOUT ==================== */
    const abrirModalLogout = () => {
        setLogoutError(null);
        setLogoutModalOpen(true);
    };

    const fecharModalLogout = () => {
        setLogoutModalOpen(false);
        setLogoutError(null);
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
            setLogoutModalOpen(false);
        }
    };

    /* ==================== NAVIGATION HELPERS ==================== */
    const isActive = (path: string) => pathname === path;

    const isParentActive = (item: MenuItem) => {
        if (pathname === item.path && !item.isGroup) return true;
        return item.links.some((link) => pathname === link.path);
    };

    const temPermissao = (item: MenuItem): boolean => {
        if (!item.roles || item.roles.length === 0) return true;
        return item.roles.includes(userRole);
    };

    /* ==================== MENU ITEMS ==================== */
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
                    ? [{ label: "Nova venda", path: "/dashboard/Vendas/Nova_venda", icon: ShoppingCart }]
                    : userRole === "operador"
                        ? [{ label: "Nova venda", path: "/dashboard/Vendas/Nova_venda", icon: ShoppingCart }]
                        : [
                            { label: "Nova venda", path: "/dashboard/Vendas/Nova_venda", icon: ShoppingCart },
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
                        { label: "Gerar fatura", path: "/dashboard/Faturas/Fatura_Normal", icon: FileText },
                        { label: "Proforma", path: "/dashboard/Faturas/Faturas_Proforma", icon: FileText },
                        { label: "Faturas e recibos", path: "/dashboard/Faturas/Faturas", icon: FileText },
                        { label: "Documentos fiscais", path: "/dashboard/Faturas/DC", icon: FileText },
                    ]
                    : [],
            isGroup: true,
            roles: ["admin", "operador"],
        },
        {
            label: "Clientes",
            icon: Users,
            path: "/dashboard/Clientes/Novo_cliente",
            links: [{ label: "Clientes", path: "/dashboard/Clientes/Novo_cliente", icon: Users }],
            isGroup: true,
            roles: ["admin"],
        },
        {
            label: "Produtos",
            icon: Archive,
            path: "/dashboard/Produtos_servicos",
            links: [
                { label: "Stock", path: "/dashboard/Produtos_servicos/Stock", icon: Package },
                { label: "Categorias", path: "/dashboard/Produtos_servicos/categorias", icon: Package },
                { label: "Fornecedores", path: "/dashboard/Fornecedores/Novo_fornecedor", icon: Truck },
            ],
            isGroup: true,
            roles: ["admin"],
        },
        {
            label: "Relatórios",
            icon: BarChart2,
            path: "/dashboard/relatorios",
            links: [],
            isGroup: true,
            roles: ["admin", "contabilista"],
        },
        ...(isAdmin ? [{
            label: "Configurações",
            icon: Settings,
            path: "/dashboard/configuracoes",
            links: [],
            roles: ["admin", "contabilista", "operador"],
        }] : []),
    ];

    const menuItemsFiltrados = menuItems.filter(temPermissao);
    const totalNotificacoes = produtosEstoqueBaixo.length + produtosSemEstoque.length;

    /* ==================== ANIMATION VARIANTS ==================== */
    const dropdownVariants: Variants = {
        hidden: { opacity: 0, height: 0 },
        visible: {
            opacity: 1,
            height: "auto",
            transition: { duration: 0.25, ease: "easeOut" as const, staggerChildren: 0.04 },
        },
    };

    const dropdownItemVariants: Variants = {
        hidden: { opacity: 0, x: -8 },
        visible: { opacity: 1, x: 0 },
    };

    const notificacaoVariants = {
        hidden: { opacity: 0, y: -8, scale: 0.96 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 30 } },
        exit: { opacity: 0, y: -8, scale: 0.96, transition: { duration: 0.15 } },
    };

    const modalVariants: Variants = {
        hidden: { opacity: 0, scale: 0.92, y: 16 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 30 } },
        exit: { opacity: 0, scale: 0.92, y: 16, transition: { duration: 0.15 } },
    };

    /* ==================== LOADING ==================== */
    if (userLoading) {
        return (
            <div className="flex h-screen items-center justify-center" style={{ backgroundColor: colors.background }}>
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.primary }} />
            </div>
        );
    }

    const currentPageLabel = menuItemsFiltrados.find((item) => isParentActive(item))?.label || "Dashboard";

    /* ==================== RENDER ==================== */
    return (
        <div className="flex h-screen overflow-hidden transition-colors duration-300" style={{ backgroundColor: colors.background }}>

            {/* ====== MOBILE OVERLAY ====== */}
            <AnimatePresence>
                {sidebarOpen && isMobile && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeSidebar}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
                    />
                )}
            </AnimatePresence>

            {/* ====== SIDEBAR ====== */}
            <motion.aside
                initial={false}
                animate={{ x: sidebarOpen ? 0 : isMobile ? "-100%" : 0, width: sidebarOpen ? 260 : isMobile ? 260 : 72 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex flex-col border-r shadow-xl z-40 flex-shrink-0"
                style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    position: isMobile ? "fixed" : "relative",
                    top: isMobile ? 0 : undefined,
                    left: isMobile ? 0 : undefined,
                    bottom: isMobile ? 0 : undefined,
                    height: isMobile ? "100dvh" : "100%",
                }}
            >
                {/* Desktop collapse toggle */}
                {!isMobile && (
                    <motion.button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="rounded-full absolute -right-3 top-8 text-white p-1.5 shadow-lg z-50"
                        style={{ backgroundColor: colors.primary }}
                    >
                        <motion.div animate={{ rotate: sidebarOpen ? 0 : 180 }} transition={{ duration: 0.3 }}>
                            <ChevronLeft size={14} />
                        </motion.div>
                    </motion.button>
                )}

                {/* Logo / Company */}
                <div
                    className="h-16 flex items-center gap-3 px-4 border-b flex-shrink-0 overflow-hidden"
                    style={{ borderColor: colors.border }}
                >
                    {empresaLogo ? (
                        <Image
                            src={empresaLogo}
                            alt="Logo"
                            width={32}
                            height={32}
                            className="object-contain flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                    ) : (
                        <div
                            className="w-8 h-8 text-white flex items-center justify-center font-bold shadow-md flex-shrink-0"
                            style={{ backgroundColor: colors.primary }}
                        >
                            {nomeEmpresa.charAt(0).toUpperCase()}
                        </div>
                    )}

                    <AnimatePresence>
                        {sidebarOpen && (
                            <motion.span
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -8 }}
                                className="font-semibold text-sm whitespace-nowrap truncate"
                                style={{ color: colors.text }}
                            >
                                {nomeEmpresa}
                            </motion.span>
                        )}
                    </AnimatePresence>

                    {/* Mobile close button */}
                    {isMobile && sidebarOpen && (
                        <button onClick={closeSidebar} className="ml-auto p-1" style={{ color: colors.textSecondary }}>
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
                    {isLoaded &&
                        menuItemsFiltrados.map((item, index) => {
                            const active = isParentActive(item);
                            const isOpen = dropdownOpen[item.label];
                            const hasLinks = item.links.length > 0;

                            return (
                                <motion.div
                                    key={item.label}
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.04 }}
                                >
                                    {/* Main item */}
                                    <div
                                        className="flex items-center justify-between px-3 py-2.5 cursor-pointer transition-all duration-200 select-none"
                                        style={{
                                            backgroundColor: active ? colors.secondary : "transparent",
                                            color: active ? "white" : colors.text,
                                        }}
                                        onClick={(e) => handleMainItemClick(item, e)}
                                    >
                                        {hasLinks ? (
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <item.icon
                                                    size={19}
                                                    style={{ color: active ? "white" : colors.secondary, flexShrink: 0 }}
                                                />
                                                <AnimatePresence>
                                                    {sidebarOpen && (
                                                        <motion.span
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="text-sm font-medium whitespace-nowrap truncate"
                                                            style={{ color: active ? "white" : colors.text }}
                                                        >
                                                            {item.label}
                                                        </motion.span>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        ) : (
                                            <Link
                                                href={item.path}
                                                className="flex items-center gap-3 flex-1 min-w-0"
                                                onClick={handleLinkClick}
                                            >
                                                <item.icon
                                                    size={19}
                                                    style={{ color: active ? "white" : colors.secondary, flexShrink: 0 }}
                                                />
                                                <AnimatePresence>
                                                    {sidebarOpen && (
                                                        <motion.span
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="text-sm font-medium whitespace-nowrap truncate"
                                                            style={{ color: active ? "white" : colors.text }}
                                                        >
                                                            {item.label}
                                                        </motion.span>
                                                    )}
                                                </AnimatePresence>
                                            </Link>
                                        )}

                                        {hasLinks && sidebarOpen && (
                                            <motion.div
                                                animate={{ rotate: isOpen ? 180 : 0 }}
                                                transition={{ duration: 0.25 }}
                                                className="flex-shrink-0 ml-1"
                                            >
                                                <ChevronDown size={15} style={{ color: active ? "white" : colors.textSecondary }} />
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Dropdown */}
                                    <AnimatePresence>
                                        {isOpen && sidebarOpen && (
                                            <motion.div
                                                variants={dropdownVariants}
                                                initial="hidden"
                                                animate="visible"
                                                exit="hidden"
                                                className="ml-3 mt-0.5 space-y-0.5 overflow-hidden"
                                            >
                                                {item.links.map((link) => {
                                                    const linkActive = isActive(link.path);
                                                    return (
                                                        <motion.div key={link.path} variants={dropdownItemVariants}>
                                                            <Link href={link.path} onClick={handleLinkClick}>
                                                                <div
                                                                    className="flex items-center gap-3 px-3 py-2 transition-all duration-150"
                                                                    style={{
                                                                        backgroundColor: linkActive ? `${colors.primary}15` : "transparent",
                                                                        borderLeft: linkActive ? `2px solid ${colors.secondary}` : "2px solid transparent",
                                                                    }}
                                                                >
                                                                    {link.icon && (
                                                                        <link.icon
                                                                            size={15}
                                                                            style={{ color: linkActive ? colors.secondary : colors.textSecondary, flexShrink: 0 }}
                                                                        />
                                                                    )}
                                                                    <span
                                                                        className="text-xs truncate"
                                                                        style={{
                                                                            color: linkActive ? colors.text : colors.textSecondary,
                                                                            fontWeight: linkActive ? 600 : 400,
                                                                        }}
                                                                    >
                                                                        {link.label}
                                                                    </span>
                                                                </div>
                                                            </Link>
                                                        </motion.div>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                </nav>

                {/* Logout */}
                <div className="p-2 border-t flex-shrink-0" style={{ borderColor: colors.border }}>
                    <div
                        onClick={abrirModalLogout}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                        <LogOut size={19} className="text-red-500 flex-shrink-0" />
                        <AnimatePresence>
                            {sidebarOpen && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-sm font-medium whitespace-nowrap"
                                    style={{ color: colors.text }}
                                >
                                    Sair do Sistema
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.aside>

            {/* ====== MAIN CONTENT ====== */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Header */}
                <header
                    className="h-14 md:h-16 border-b px-3 md:px-6 flex items-center justify-between shadow-sm flex-shrink-0 relative z-20"
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                    {/* Left: hamburger + page title */}
                    <div className="flex items-center gap-2 md:gap-4 min-w-0">
                        {/* Mobile hamburger */}
                        {isMobile && (
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className=" p-2 flex-shrink-0"
                                style={{ color: colors.primary }}
                                aria-label="Abrir menu"
                            >
                                <Menu size={20} />
                            </button>
                        )}

                        <h1 className="text-base md:text-lg font-bold truncate" style={{ color: colors.text }}>
                            {currentPageLabel}
                        </h1>

                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">

                        {/* Theme toggle */}
                        <button
                            onClick={toggleTheme}
                            className="rounded-full p-2 transition-colors"
                            style={{ backgroundColor: colors.hover, color: colors.text }}
                            aria-label="Alternar tema"
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={theme}
                                    initial={{ y: -12, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 12, opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    {theme === "dark" ? (
                                        <Sun size={18} style={{ color: colors.secondary }} />
                                    ) : (
                                        <Moon size={18} style={{ color: colors.primary }} />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </button>

                        {/* Stock notifications */}
                        {(userRole === "admin" || userRole === "operador") && (
                            <div className="relative">
                                <button
                                    onClick={toggleNotificacoes}
                                    className="relative p-2 transition-colors"
                                    style={{ backgroundColor: notificacoesAberto ? colors.hover : "transparent" }}
                                    aria-label="Notificações de estoque"
                                >
                                    <Bell size={18} style={{ color: colors.primary }} />
                                    {totalNotificacoes > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="rounded-full absolute -top-0.5 -right-0.5 min-w-[16px] h-4 text-white text-[9px] font-bold flex items-center justify-center px-1"
                                            style={{ backgroundColor: produtosSemEstoque.length > 0 ? colors.danger : "#f59e0b" }}
                                        >
                                            {totalNotificacoes > 9 ? "9+" : totalNotificacoes}
                                        </motion.span>
                                    )}
                                </button>

                                <AnimatePresence>
                                    {notificacoesAberto && (
                                        <motion.div
                                            variants={notificacaoVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            className="absolute right-0 top-full mt-2 shadow-2xl border overflow-hidden z-50"
                                            style={{
                                                backgroundColor: colors.card,
                                                borderColor: colors.border,
                                                width: "min(384px, calc(100vw - 16px))",
                                            }}
                                        >
                                            {/* Notification header */}
                                            <div
                                                className="px-4 py-3"
                                                style={{
                                                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${theme === "dark" ? "#1a1a4a" : "#1a4a7a"} 100%)`,
                                                }}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <AlertTriangle size={15} className="text-white" />
                                                        <span className="text-white font-semibold text-sm">Alertas de Stock</span>
                                                    </div>
                                                    <button onClick={() => setNotificacoesAberto(false)} className="text-white/80 hover:text-white">
                                                        <X size={15} />
                                                    </button>
                                                </div>
                                                <div className="flex gap-1 bg-black/20 p-1">
                                                    <button
                                                        onClick={() => setAbaAtiva("baixo")}
                                                        className="flex-1 py-1.5 px-2 text-xs font-medium transition-all flex items-center justify-center gap-1"
                                                        style={{ backgroundColor: abaAtiva === "baixo" ? "rgba(255,255,255,0.2)" : "transparent", color: "white" }}
                                                    >
                                                        <TrendingDown size={11} />
                                                        Baixo ({produtosEstoqueBaixo.length})
                                                    </button>
                                                    <button
                                                        onClick={() => setAbaAtiva("zero")}
                                                        className="flex-1 py-1.5 px-2 text-xs font-medium transition-all flex items-center justify-center gap-1"
                                                        style={{ backgroundColor: abaAtiva === "zero" ? "rgba(255,255,255,0.2)" : "transparent", color: "white" }}
                                                    >
                                                        <AlertCircle size={11} />
                                                        Esgotado ({produtosSemEstoque.length})
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Notification content */}
                                            <div className="max-h-80 overflow-y-auto">
                                                {loadingNotificacoes ? (
                                                    <div className="p-8 flex items-center justify-center">
                                                        <Loader2 className="h-6 w-6 animate-spin" style={{ color: colors.primary }} />
                                                    </div>
                                                ) : abaAtiva === "baixo" ? (
                                                    produtosEstoqueBaixo.length > 0 ? (
                                                        <>
                                                            <div className="p-2 border-b text-center text-xs font-medium"
                                                                style={{ backgroundColor: theme === "dark" ? "#442200" : "#fff7ed", borderColor: colors.border, color: theme === "dark" ? "#ffb347" : "#9a3412" }}>
                                                                Produtos com estoque abaixo do mínimo
                                                            </div>
                                                            {produtosEstoqueBaixo.map((produto, index) => (
                                                                <motion.div
                                                                    key={produto.id}
                                                                    initial={{ opacity: 0, x: -12 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ delay: index * 0.04 }}
                                                                    className="p-3 border-b last:border-b-0 cursor-pointer transition-colors"
                                                                    style={{ borderColor: colors.border }}
                                                                    onClick={() => { setNotificacoesAberto(false); router.push("/dashboard/Produtos_servicos/Stock"); }}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                                                                            style={{ backgroundColor: theme === "dark" ? "#442200" : "#fff7ed", color: theme === "dark" ? "#ffb347" : "#9a3412" }}>
                                                                            <Package size={16} />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-medium truncate" style={{ color: colors.text }}>{produto.nome}</p>
                                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                                <span className="text-xs font-bold" style={{ color: "#f59e0b" }}>{produto.estoque_atual} unid.</span>
                                                                                <span className="text-xs" style={{ color: colors.textSecondary }}>•</span>
                                                                                <span className="text-xs" style={{ color: colors.secondary }}>Mín: {produto.estoque_minimo || 5}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            ))}
                                                        </>
                                                    ) : (
                                                        <div className="p-8 text-center">
                                                            <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center"
                                                                style={{ backgroundColor: theme === "dark" ? "#1a3a1a" : "#dcfce7" }}>
                                                                <Package size={22} style={{ color: theme === "dark" ? "#4ade80" : "#16a34a" }} />
                                                            </div>
                                                            <p className="text-sm font-medium" style={{ color: colors.text }}>Estoque saudável</p>
                                                            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>Nenhum produto com estoque baixo</p>
                                                        </div>
                                                    )
                                                ) : (
                                                    produtosSemEstoque.length > 0 ? (
                                                        <>
                                                            <div className="p-2 border-b text-center text-xs font-medium"
                                                                style={{ backgroundColor: theme === "dark" ? "#442222" : "#fef2f2", borderColor: colors.border, color: theme === "dark" ? "#fca5a5" : "#991b1b" }}>
                                                                Produtos esgotados — reposição urgente
                                                            </div>
                                                            {produtosSemEstoque.map((produto, index) => (
                                                                <motion.div
                                                                    key={produto.id}
                                                                    initial={{ opacity: 0, x: -12 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ delay: index * 0.04 }}
                                                                    className="p-3 border-b last:border-b-0 cursor-pointer transition-colors"
                                                                    style={{ borderColor: colors.border }}
                                                                    onClick={() => { setNotificacoesAberto(false); router.push("/dashboard/Produtos_servicos/Stock"); }}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                                                                            style={{ backgroundColor: theme === "dark" ? "#442222" : "#fef2f2", color: theme === "dark" ? "#fca5a5" : "#dc2626" }}>
                                                                            <AlertCircle size={16} />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-medium truncate" style={{ color: colors.text }}>{produto.nome}</p>
                                                                            <span className="text-xs font-bold px-1.5 py-0.5"
                                                                                style={{ backgroundColor: colors.danger + "20", color: colors.danger }}>
                                                                                ESGOTADO
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            ))}
                                                        </>
                                                    ) : (
                                                        <div className="p-8 text-center">
                                                            <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center"
                                                                style={{ backgroundColor: theme === "dark" ? "#1a3a1a" : "#dcfce7" }}>
                                                                <Package size={22} style={{ color: theme === "dark" ? "#4ade80" : "#16a34a" }} />
                                                            </div>
                                                            <p className="text-sm font-medium" style={{ color: colors.text }}>Tudo em ordem</p>
                                                            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>Nenhum produto esgotado</p>
                                                        </div>
                                                    )
                                                )}

                                                {/* Footer */}
                                                <div className="p-3 border-t" style={{ backgroundColor: theme === "dark" ? "#1a1a1a" : "#f9fafb", borderColor: colors.border }}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs" style={{ color: colors.textSecondary }}>
                                                            Atualizado: {ultimaAtualizacao?.toLocaleTimeString() || "..."}
                                                        </span>
                                                        <button
                                                            onClick={buscarNotificacoesEstoque}
                                                            disabled={loadingNotificacoes}
                                                            className="text-xs disabled:opacity-50"
                                                            style={{ color: colors.primary }}
                                                        >
                                                            {loadingNotificacoes ? "Atualizando..." : "Atualizar"}
                                                        </button>
                                                    </div>

                                                    {resumoEstoque && (
                                                        <div className="grid grid-cols-3 gap-2 mb-3 p-2"
                                                            style={{ backgroundColor: theme === "dark" ? "#2a2a2a" : "#e5e7eb" }}>
                                                            <div className="text-center">
                                                                <p className="text-base font-bold" style={{ color: colors.text }}>{resumoEstoque.totalProdutos}</p>
                                                                <p className="text-[10px]" style={{ color: colors.textSecondary }}>Total</p>
                                                            </div>
                                                            <div className="text-center border-x" style={{ borderColor: colors.border }}>
                                                                <p className="text-base font-bold" style={{ color: "#f59e0b" }}>{resumoEstoque.produtosEstoqueBaixo}</p>
                                                                <p className="text-[10px]" style={{ color: colors.textSecondary }}>Baixo</p>
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-base font-bold" style={{ color: colors.danger }}>{resumoEstoque.produtosSemEstoque}</p>
                                                                <p className="text-[10px]" style={{ color: colors.textSecondary }}>Zero</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <Link href="/dashboard/Produtos_servicos/Stock" onClick={() => setNotificacoesAberto(false)}>
                                                        <div className="flex items-center justify-center gap-2 text-sm font-medium py-2 transition-opacity hover:opacity-90"
                                                            style={{ backgroundColor: colors.primary, color: "white" }}>
                                                            <span>Gerenciar estoque</span>
                                                            <ChevronLeft size={14} className="rotate-180" />
                                                        </div>
                                                    </Link>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Notification overlay closer */}
                        <AnimatePresence>
                            {notificacoesAberto && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setNotificacoesAberto(false)}
                                    className="fixed inset-0 z-40"
                                />
                            )}
                        </AnimatePresence>

                        {/* User avatar */}
                        <div
                            className="rounded-full flex items-center gap-2 pl-2 md:pl-4 border-l"
                            style={{ borderColor: colors.border }}
                        >
                            <div className="hidden md:block text-right">
                                <p className="text-sm font-semibold leading-tight" style={{ color: colors.text }}>{userName}</p>
                                <p className="text-xs capitalize" style={{ color: colors.textSecondary }}>
                                    {userRole === "admin" ? "Administrador" : userRole === "contabilista" ? "Contabilista" : "Operador"}
                                </p>
                            </div>
                            <div
                                className="rounded-full w-8 h-8 md:w-9 md:h-9 text-white flex items-center justify-center text-sm font-bold shadow-md flex-shrink-0"
                                style={{ background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary} 100%)` }}
                            >
                                {userInitial}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-auto p-3 md:p-6">
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="h-full"
                    >
                        {children}
                    </motion.div>
                </main>
            </div>

            {/* ====== LOGOUT MODAL ====== */}
            <AnimatePresence>
                {logoutModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={fecharModalLogout}
                    >
                        <motion.div
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="shadow-2xl w-full max-w-sm overflow-hidden"
                            style={{ backgroundColor: colors.card }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 pb-4 text-center">
                                <h2 className="text-xl font-bold mb-2" style={{ color: colors.text }}>Confirmar Logout</h2>
                                <p className="text-sm" style={{ color: colors.textSecondary }}>
                                    Tem certeza que deseja sair? Você precisará fazer login novamente para acessar sua conta.
                                </p>
                            </div>

                            {logoutError && (
                                <div className="mx-5 mb-4 p-3 text-xs text-center"
                                    style={{ backgroundColor: theme === "dark" ? "#442200" : "#fef3c7", border: `1px solid ${theme === "dark" ? "#854d0e" : "#fbbf24"}`, color: theme === "dark" ? "#fbbf24" : "#92400e" }}>
                                    {logoutError}
                                </div>
                            )}

                            <div className="px-5 py-3 border-y" style={{ backgroundColor: theme === "dark" ? "#1a1a1a" : "#f9fafb", borderColor: colors.border }}>
                                <div className="flex items-center gap-3">
                                    <div className="rounded-full w-9 h-9 text-white flex items-center justify-center text-sm font-bold flex-shrink-0"
                                        style={{ background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary} 100%)` }}>
                                        {userInitial}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-sm truncate" style={{ color: colors.text }}>{userName}</p>
                                        <p className="text-xs truncate" style={{ color: colors.textSecondary }}>{userEmail}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 flex gap-3">
                                <button
                                    onClick={fecharModalLogout}
                                    disabled={logoutLoading}
                                    className="rounded-xl flex-1 py-2.5 px-4 font-medium text-sm disabled:opacity-50 transition-opacity hover:opacity-80"
                                    style={{ backgroundColor: theme === "dark" ? "#333" : "#e5e7eb", color: colors.text }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleLogout}
                                    disabled={logoutLoading}
                                    className="rounded-xl flex-1 py-2.5 px-4 text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                                    style={{ backgroundColor: colors.danger }}
                                >
                                    {logoutLoading ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /><span>Saindo...</span></>
                                    ) : (
                                        <><LogOut size={16} /><span>Sair</span></>
                                    )}
                                </button>
                            </div>

                            <p className="px-5 pb-5 text-center text-xs" style={{ color: colors.textSecondary }}>
                                Ao sair, sua sessão será encerrada e dados não salvos serão perdidos.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}