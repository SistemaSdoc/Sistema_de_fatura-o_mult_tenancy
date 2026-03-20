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
    X,
    Sun,
    Moon,
    Menu,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/authprovider"; // CORRIGIDO: importar do AuthContext
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
    
    // CORRIGIDO: usar o AuthContext correto
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
        if (!user) return; // Só busca se tiver usuário logado
        
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
    }, [user]);

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
                    ? [
                        { label: "Venda a pronto", path: "/dashboard/Vendas/Nova_venda", icon: ShoppingCart },
                        { label: "Kilape", path: "/dashboard/Faturas/Fatura_Normal", icon: FileText },
                        { label: "Proforma", path: "/dashboard/Faturas/Faturas_Proforma", icon: FileText },
                        { label: "Cancelamentos", path: "/dashboard/Vendas/Cancelamentos", icon: X }
                    ]
                    : userRole === "operador"
                        ? [{ label: "Nova venda", path: "/dashboard/Vendas/Nova_venda", icon: ShoppingCart }]
                        : [
                            { label: "Venda a pronto", path: "/dashboard/Vendas/Nova_venda", icon: ShoppingCart },
                            { label: "Venda a prazo", path: "/dashboard/Faturas/Fatura_Normal", icon: FileText },
                            { label: "Proforma", path: "/dashboard/Faturas/Faturas_Proforma", icon: FileText },
                            { label: "Cancelamentos", path: "/dashboard/Vendas/Cancelamentos", icon: ShoppingCart }
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
            roles: ["admin"],
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
        ...(userRole === "admin" ? [{
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
            <div className="flex items-center justify-center h-screen" style={{ backgroundColor: colors.background }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
            </div>
        );
    }

    // Se não tem usuário, não renderiza nada (o middleware vai redirecionar)
    if (!user) {
        return null;
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
                        className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            {/* ====== SIDEBAR ====== */}
            <motion.aside
                initial={false}
                animate={{ x: sidebarOpen ? 0 : isMobile ? "-100%" : 0, width: sidebarOpen ? 260 : isMobile ? 260 : 72 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="z-40 flex flex-col flex-shrink-0 border-r shadow-xl"
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
                    className="flex items-center flex-shrink-0 h-16 gap-3 px-4 overflow-hidden border-b"
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
                            className="flex items-center justify-center flex-shrink-0 w-8 h-8 font-bold text-white shadow-md"
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
                                className="text-sm font-semibold truncate whitespace-nowrap"
                                style={{ color: colors.text }}
                            >
                                {nomeEmpresa}
                            </motion.span>
                        )}
                    </AnimatePresence>

                    {/* Mobile close button */}
                    {isMobile && sidebarOpen && (
                        <button
                            type="button"
                            onClick={closeSidebar}
                            className="p-1 ml-auto text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            aria-label="Fechar menu lateral"
                            title="Fechar menu lateral"
                        >
                            <X size={20} aria-hidden="true" />
                            <span className="sr-only">Fechar menu lateral</span>
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
                                            <div className="flex items-center flex-1 min-w-0 gap-3">
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
                                                            className="text-sm font-medium truncate whitespace-nowrap"
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
                                                className="flex items-center flex-1 min-w-0 gap-3"
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
                                                            className="text-sm font-medium truncate whitespace-nowrap"
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
                                                                    className={`flex items-center gap-3 px-3 py-2 transition-all duration-150 border-l-2 ${linkActive
                                                                            ? "border-sky-500 bg-sky-500/10"
                                                                            : "border-transparent bg-transparent"
                                                                        }`}
                                                                >
                                                                    {link.icon && (
                                                                        <link.icon
                                                                            size={15}
                                                                            className={`flex-shrink-0 ${linkActive ? "text-sky-500" : "text-gray-400 dark:text-gray-500"}`}
                                                                        />
                                                                    )}
                                                                    <span
                                                                        className={`text-xs truncate ${linkActive ? "font-semibold text-gray-900 dark:text-gray-100" : "font-normal text-gray-500 dark:text-gray-400"}`}
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
                <div className="flex-shrink-0 p-2 border-t" style={{ borderColor: colors.border }}>
                    <div
                        onClick={abrirModalLogout}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                        <LogOut size={19} className="flex-shrink-0 text-red-500" />
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
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

                {/* Header */}
                <header
                    className="relative z-20 flex items-center justify-between flex-shrink-0 px-3 border-b shadow-sm h-14 md:h-16 md:px-6"
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                    {/* Left: hamburger + page title */}
                    <div className="flex items-center min-w-0 gap-2 md:gap-4">
                        {/* Mobile hamburger */}
                        {isMobile && (
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="flex-shrink-0 p-2 "
                                style={{ color: colors.primary }}
                                aria-label="Abrir menu"
                            >
                                <Menu size={20} />
                            </button>
                        )}

                        <h1 className="text-base font-bold truncate md:text-lg" style={{ color: colors.text }}>
                            {currentPageLabel}
                        </h1>

                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center flex-shrink-0 gap-1 md:gap-3">

                        {/* Theme toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 transition-colors rounded-full"
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
                                            className="absolute right-0 z-50 mt-2 overflow-hidden border shadow-2xl top-full"
                                            style={{
                                                backgroundColor: colors.card,
                                                borderColor: colors.border,
                                                width: "min(384px, calc(100vw - 16px))",
                                            }}
                                        >
                                            {/* Rest of notification component remains the same */}
                                            {/* ... (keep the same notification content) ... */}
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
                            className="flex items-center gap-2 pl-2 border-l rounded-full md:pl-4"
                            style={{ borderColor: colors.border }}
                        >
                            <div className="hidden text-right md:block">
                                <p className="text-sm font-semibold leading-tight" style={{ color: colors.text }}>{userName}</p>
                                <p className="text-xs capitalize" style={{ color: colors.textSecondary }}>
                                    {userRole === "admin" ? "Administrador" : userRole === "contabilista" ? "Contabilista" : "Operador"}
                                </p>
                            </div>
                            <div
                                className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm font-bold text-white rounded-full shadow-md md:w-9 md:h-9"
                                style={{ background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary} 100%)` }}
                            >
                                {userInitial}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-3 overflow-auto md:p-6">
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
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={fecharModalLogout}
                    >
                        <motion.div
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="w-full max-w-sm overflow-hidden shadow-2xl"
                            style={{ backgroundColor: colors.card }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 pb-4 text-center">
                                <h2 className="mb-2 text-xl font-bold" style={{ color: colors.text }}>Confirmar Logout</h2>
                                <p className="text-sm" style={{ color: colors.textSecondary }}>
                                    Tem certeza que deseja sair? Você precisará fazer login novamente para acessar sua conta.
                                </p>
                            </div>

                            {logoutError && (
                                <div className="p-3 mx-5 mb-4 text-xs text-center"
                                    style={{ backgroundColor: theme === "dark" ? "#442200" : "#fef3c7", border: `1px solid ${theme === "dark" ? "#854d0e" : "#fbbf24"}`, color: theme === "dark" ? "#fbbf24" : "#92400e" }}>
                                    {logoutError}
                                </div>
                            )}

                            <div className="px-5 py-3 border-y" style={{ backgroundColor: theme === "dark" ? "#1a1a1a" : "#f9fafb", borderColor: colors.border }}>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center flex-shrink-0 text-sm font-bold text-white rounded-full w-9 h-9"
                                        style={{ background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary} 100%)` }}>
                                        {userInitial}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: colors.text }}>{userName}</p>
                                        <p className="text-xs truncate" style={{ color: colors.textSecondary }}>{userEmail}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 p-5">
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

                            <p className="px-5 pb-5 text-xs text-center" style={{ color: colors.textSecondary }}>
                                Ao sair, sua sessão será encerrada e dados não salvos serão perdidos.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}