"use client";

import React, { ReactNode, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
    X
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { estoqueService } from "@/services/estoque";
import { Produto } from "@/services/produtos";

/* ===================== TIPOS ===================== */
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
}

interface MainEmpresaProps {
    children: ReactNode;
    companyLogo?: string;
    companyName?: string;
}

/* ===================== CONSTANTES ===================== */
const COLORS = {
    primary: '#123859',
    secondary: '#F9941F',
    background: '#F2F2F2',
    danger: '#dc3545',
    success: '#28a745',
    warning: '#ffc107',
};

/* ===================== COMPONENT ===================== */
export default function MainEmpresa({
    children,
    companyLogo,
    companyName = "Minha Empresa",
}: MainEmpresaProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading: userLoading, isAdmin, logout: authLogout } = useAuth();

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState<Record<string, boolean>>({});
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Estados para logout
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);
    const [logoutError, setLogoutError] = useState<string | null>(null);

    // Estados para notificações de estoque
    const [notificacoesAberto, setNotificacoesAberto] = useState(false);
    const [produtosEstoqueBaixo, setProdutosEstoqueBaixo] = useState<Produto[]>([]);
    const [loadingNotificacoes, setLoadingNotificacoes] = useState(false);
    const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

    // Dados do usuário logado
    const userName = user?.name || "Usuário";
    const userRole = user?.role || "operador";
    const userEmail = user?.email || "";
    const userInitial = userName.charAt(0).toUpperCase();

    // Animação de entrada inicial
    useEffect(() => {
        setIsLoaded(true);
    }, []);

    // Buscar produtos com estoque baixo usando o estoqueService
    const buscarProdutosEstoqueBaixo = useCallback(async () => {
        setLoadingNotificacoes(true);
        try {
            // ✅ Usar o método correto do estoqueService para obter o resumo
            const resumo = await estoqueService.obterResumo();
            
            // ✅ Os produtos críticos já vêm no resumo
            setProdutosEstoqueBaixo(resumo.produtos_criticos || []);
            setUltimaAtualizacao(new Date());
        } catch (error) {
            console.error("Erro ao buscar produtos com estoque baixo:", error);
            setProdutosEstoqueBaixo([]);
        } finally {
            setLoadingNotificacoes(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            buscarProdutosEstoqueBaixo();
            const interval = setInterval(buscarProdutosEstoqueBaixo, 300000); // 5 minutos
            return () => clearInterval(interval);
        }
    }, [user, buscarProdutosEstoqueBaixo]);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
        if (sidebarOpen) {
            setDropdownOpen({});
        }
    };

    const toggleDropdown = (label: string, e?: React.MouseEvent) => {
        e?.preventDefault();
        e?.stopPropagation();

        setDropdownOpen((prev) => ({
            ...prev,
            [label]: !prev[label],
        }));
    };

    const handleMainItemClick = (item: MenuItem, e: React.MouseEvent) => {
        if (item.links.length > 0) {
            e.preventDefault();
            toggleDropdown(item.label);
        } else {
            setDropdownOpen(prev => ({ ...prev, [item.label]: false }));
        }
    };

    const toggleNotificacoes = () => {
        setNotificacoesAberto(!notificacoesAberto);
        if (!notificacoesAberto) {
            buscarProdutosEstoqueBaixo();
        }
    };

    /* ==================== FUNÇÕES DE LOGOUT ==================== */

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

            // Usar o método de logout do hook useAuth
            const result = await authLogout();

            if (result.success) {
                // Redirecionar para página de login
                router.push('/login');
            } else {
                setLogoutError(result.message);
                setTimeout(() => {
                    router.push('/login');
                }, 2000);
            }
        } catch (error) {
            console.error('Erro inesperado no logout:', error);
            setLogoutError('Erro inesperado. Redirecionando...');
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        } finally {
            setLogoutLoading(false);
            setLogoutModalOpen(false);
        }
    };

    /* ==================== FUNÇÕES DE NAVEGAÇÃO ==================== */

    const isActive = (path: string) => pathname === path;

    const isParentActive = (item: MenuItem) => {
        if (pathname === item.path && !item.isGroup) return true;
        return item.links.some(link => pathname === link.path);
    };

    // Menu atualizado com isGroup para itens que são apenas grupos
    const menuItems: MenuItem[] = [
        { label: "Dashboard", icon: Home, path: "/dashboard", links: [] },
        {
            label: "Vendas",
            icon: ShoppingCart,
            path: "/dashboard/Vendas",
            links: [
                { label: "Nova venda", path: "/dashboard/Vendas/Nova_venda", icon: ShoppingCart },
                { label: "Relatórios de vendas", path: "/dashboard/Vendas/relatorios", icon: BarChart2 },
            ],
            isGroup: true,
        },
        {
            label: "Documentos Fiscais",
            icon: FileText,
            path: "/dashboard/Faturas",
            links: [
                { label: "Nova fatura", path: "/dashboard/Faturas/Fatura_Normal", icon: FileText },
                { label: "Nova Fatura Proforma", path: "/dashboard/Faturas/Faturas_Proforma", icon: FileText },
                { label: "Faturas", path: "/dashboard/Faturas/Faturas", icon: FileText },
            ],
            isGroup: true,
        },
        {
            label: "Clientes",
            icon: Users,
            path: "/dashboard/Clientes",
            links: [
                { label: "Clientes", path: "/dashboard/Clientes/Novo_cliente", icon: Users },
            ],
            isGroup: true,
        },
        {
            label: "Produtos / Serviços",
            icon: Archive,
            path: "/dashboard/Produtos_servicos",
            links: [
                { label: "Novo produto/serviço", path: "/dashboard/Produtos_servicos/Novo_produto_servico", icon: Package },
                { label: "Stock", path: "/dashboard/Produtos_servicos/Stock", icon: Package },
                { label: "Nova categoria", path: "/dashboard/Produtos_servicos/categorias", icon: Package },
            ],
            isGroup: true,
        },
        {
            label: "Fornecedores",
            icon: Truck,
            path: "/dashboard/Fornecedores",
            links: [
                { label: "Fornecedores", path: "/dashboard/Fornecedores/Novo_fornecedor", icon: Truck },
            ],
            isGroup: true,
        },
        {
            label: "Relatórios",
            icon: BarChart2,
            path: "/dashboard/relatorios",
            links: [
                { label: "Relatorio", path: "/dashboard/relatorios/diario", icon: BarChart2 },
            ],
            isGroup: true,
        },
        ...(isAdmin ? [{
            label: "Configurações",
            icon: Settings,
            path: "/dashboard/configuracoes",
            links: [],
        }] : []),
    ];

    // Variantes de animação
    const sidebarVariants = {
        open: { width: 260 },
        closed: { width: 80 },
    };

    const menuItemVariants = {
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 },
    };

    const dropdownVariants = {
        hidden: {
            opacity: 0,
            height: 0,
            transition: {
                duration: 0.2,
                ease: "easeInOut"
            }
        },
        visible: {
            opacity: 1,
            height: "auto",
            transition: {
                duration: 0.3,
                ease: "easeOut",
                staggerChildren: 0.05,
                delayChildren: 0.1
            }
        },
    };

    const dropdownItemVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0 },
    };

    const contentVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.4,
                ease: "easeOut"
            }
        },
    };

    const modalVariants = {
        hidden: {
            opacity: 0,
            scale: 0.9,
            y: 20
        },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                type: "spring",
                stiffness: 400,
                damping: 30
            }
        },
        exit: {
            opacity: 0,
            scale: 0.9,
            y: 20,
            transition: {
                duration: 0.2
            }
        }
    };

    const notificacaoVariants = {
        hidden: {
            opacity: 0,
            y: -10,
            scale: 0.95
        },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 30
            }
        },
        exit: {
            opacity: 0,
            y: -10,
            scale: 0.95
        }
    };

    if (userLoading) {
        return (
            <div className="flex h-screen items-center justify-center" style={{ backgroundColor: COLORS.background }}>
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: COLORS.primary }} />
            </div>
        );
    }

    return (
        <div className="flex h-screen" style={{ backgroundColor: COLORS.background, overflow: 'hidden' }}>
            {/* SIDEBAR */}
            <motion.aside
                initial={false}
                animate={sidebarOpen ? "open" : "closed"}
                variants={sidebarVariants}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="bg-white border-r border-gray-200 flex flex-col relative shadow-xl z-20"
            >
                {/* Toggle Button */}
                <motion.button
                    onClick={toggleSidebar}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="absolute -right-3 top-8 text-white p-2 rounded-full shadow-lg hover:opacity-90 transition-colors z-30"
                    style={{ backgroundColor: COLORS.primary }}
                >
                    <motion.div
                        animate={{ rotate: sidebarOpen ? 0 : 180 }}
                        transition={{ duration: 0.3 }}
                    >
                        <ChevronLeft size={16} />
                    </motion.div>
                </motion.button>

                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="h-16 flex items-center gap-3 px-4 border-b overflow-hidden"
                >
                    {companyLogo ? (
                        <Image src={companyLogo} alt="Logo" width={32} height={32} className="rounded-lg" />
                    ) : (
                        <div className="w-8 h-8 text-white rounded-lg flex items-center justify-center font-bold shadow-md"
                            style={{ backgroundColor: COLORS.primary }}>
                            {companyName.charAt(0)}
                        </div>
                    )}

                    <AnimatePresence>
                        {sidebarOpen && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="font-semibold text-sm whitespace-nowrap"
                                style={{ color: COLORS.primary }}
                            >
                                {companyName}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Menu */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
                    <AnimatePresence>
                        {isLoaded && menuItems.map((item, index) => {
                            const active = isParentActive(item);
                            const isOpen = dropdownOpen[item.label];
                            const hasLinks = item.links.length > 0;

                            return (
                                <motion.div
                                    key={item.label}
                                    variants={menuItemVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={{ delay: index * 0.05 }}
                                    onMouseEnter={() => setHoveredItem(item.label)}
                                    onMouseLeave={() => setHoveredItem(null)}
                                >
                                    {/* Item Principal */}
                                    <motion.div
                                        whileHover={{ scale: 1.02, x: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`group flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all duration-300 ${
                                            active ? "text-white shadow-md" : "hover:bg-opacity-10"
                                        }`}
                                        style={active ? { backgroundColor: COLORS.secondary } : {}}
                                    >
                                        {/* Link ou div clicável baseado em hasLinks */}
                                        {hasLinks ? (
                                            <div
                                                className="flex items-center gap-3 flex-1 min-w-0"
                                                onClick={(e) => handleMainItemClick(item, e)}
                                            >
                                                <item.icon
                                                    size={20}
                                                    className={`transition-colors duration-300 ${active ? "text-white" : ""}`}
                                                    style={!active ? { color: COLORS.primary } : {}}
                                                />

                                                <AnimatePresence>
                                                    {sidebarOpen && (
                                                        <motion.span
                                                            initial={{ opacity: 0, width: 0 }}
                                                            animate={{ opacity: 1, width: "auto" }}
                                                            exit={{ opacity: 0, width: 0 }}
                                                            className={`text-sm font-medium whitespace-nowrap overflow-hidden ${
                                                                active ? "text-white" : ""
                                                            }`}
                                                            style={!active ? { color: COLORS.primary } : {}}
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
                                                onClick={(e) => handleMainItemClick(item, e)}
                                            >
                                                <item.icon
                                                    size={20}
                                                    className={`transition-colors duration-300 ${active ? "text-white" : ""}`}
                                                    style={!active ? { color: COLORS.primary } : {}}
                                                />

                                                <AnimatePresence>
                                                    {sidebarOpen && (
                                                        <motion.span
                                                            initial={{ opacity: 0, width: 0 }}
                                                            animate={{ opacity: 1, width: "auto" }}
                                                            exit={{ opacity: 0, width: 0 }}
                                                            className={`text-sm font-medium whitespace-nowrap overflow-hidden ${
                                                                active ? "text-white" : ""
                                                            }`}
                                                            style={!active ? { color: COLORS.primary } : {}}
                                                        >
                                                            {item.label}
                                                        </motion.span>
                                                    )}
                                                </AnimatePresence>
                                            </Link>
                                        )}

                                        {active && (
                                            <motion.div
                                                layoutId="activeIndicator"
                                                className="w-1.5 h-1.5 rounded-full"
                                                style={{ backgroundColor: COLORS.secondary }}
                                            />
                                        )}

                                        {/* Botão de chevron */}
                                        {hasLinks && sidebarOpen && (
                                            <motion.button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleDropdown(item.label);
                                                }}
                                                whileHover={{ scale: 1.2 }}
                                                whileTap={{ scale: 0.9 }}
                                                animate={{ rotate: isOpen ? 180 : 0 }}
                                                transition={{ duration: 0.3 }}
                                                className={`p-1 rounded-full hover:bg-white/20 ml-1 ${
                                                    active ? "text-white" : ""
                                                }`}
                                                style={!active ? { color: COLORS.primary } : {}}
                                            >
                                                <ChevronDown size={16} />
                                            </motion.button>
                                        )}
                                    </motion.div>

                                    {/* Dropdown de sublinks */}
                                    <AnimatePresence>
                                        {isOpen && sidebarOpen && (
                                            <motion.div
                                                variants={dropdownVariants}
                                                initial="hidden"
                                                animate="visible"
                                                exit="hidden"
                                                className="ml-4 mt-1 space-y-1 overflow-hidden"
                                            >
                                                {item.links.map((link, linkIndex) => {
                                                    const linkActive = isActive(link.path);
                                                    return (
                                                        <motion.div
                                                            key={link.path}
                                                            variants={dropdownItemVariants}
                                                            custom={linkIndex}
                                                        >
                                                            <Link href={link.path}>
                                                                <motion.div
                                                                    whileHover={{ x: 8 }}
                                                                    whileTap={{ scale: 0.98 }}
                                                                    className={`group flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                                                                        linkActive ? "border-l-2" : "hover:bg-gray-50"
                                                                    }`}
                                                                    style={
                                                                        linkActive
                                                                            ? {
                                                                                  backgroundColor: `${COLORS.primary}10`,
                                                                                  borderColor: COLORS.secondary,
                                                                              }
                                                                            : {}
                                                                    }
                                                                >
                                                                    {link.icon && (
                                                                        <motion.div
                                                                            initial={{ scale: 0 }}
                                                                            animate={{ scale: 1 }}
                                                                            transition={{ delay: linkIndex * 0.05 }}
                                                                        >
                                                                            <link.icon
                                                                                size={16}
                                                                                className="transition-colors"
                                                                                style={
                                                                                    linkActive
                                                                                        ? { color: COLORS.secondary }
                                                                                        : { color: `${COLORS.primary}60` }
                                                                                }
                                                                            />
                                                                        </motion.div>
                                                                    )}
                                                                    <span
                                                                        className={`text-sm transition-colors ${
                                                                            linkActive ? "font-semibold" : "opacity-70 group-hover:opacity-100"
                                                                        }`}
                                                                        style={linkActive ? { color: COLORS.primary } : { color: COLORS.primary }}
                                                                    >
                                                                        {link.label}
                                                                    </span>

                                                                    {linkActive && (
                                                                        <motion.div
                                                                            layoutId="subActive"
                                                                            className="ml-auto w-1.5 h-1.5 rounded-full"
                                                                            style={{ backgroundColor: COLORS.secondary }}
                                                                        />
                                                                    )}
                                                                </motion.div>
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
                    </AnimatePresence>
                </nav>

                {/* Logout */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="p-3 border-t border-gray-100"
                >
                    <motion.div
                        whileHover={{ scale: 1.02, backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                        whileTap={{ scale: 0.98 }}
                        onClick={abrirModalLogout}
                        className="group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 cursor-pointer"
                    >
                        <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                            <LogOut size={20} className="text-red-500 group-hover:opacity-80 transition-colors" />
                        </motion.div>

                        <AnimatePresence>
                            {sidebarOpen && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="text-sm font-medium whitespace-nowrap"
                                    style={{ color: COLORS.primary }}
                                >
                                    Sair do Sistema
                                </motion.span>
                            )}
                        </AnimatePresence>

                        {!sidebarOpen && (
                            <motion.div
                                initial={{ opacity: 0, x: 10, scale: 0.8 }}
                                whileHover={{ opacity: 1, x: 0, scale: 1 }}
                                className="absolute left-full ml-2 px-3 py-1 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none"
                                style={{ backgroundColor: COLORS.secondary }}
                            >
                                Sair
                            </motion.div>
                        )}
                    </motion.div>
                </motion.div>
            </motion.aside>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <motion.header
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="h-16 bg-white border-b px-6 flex items-center justify-between shadow-sm relative"
                >
                    <div className="flex items-center gap-4">
                        <motion.h1
                            key={pathname}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-lg font-bold"
                            style={{ color: COLORS.primary }}
                        >
                            {menuItems.find(item => isParentActive(item))?.label || "Dashboard"}
                        </motion.h1>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Notificações de Estoque Baixo */}
                        <div className="relative">
                            <motion.button
                                onClick={toggleNotificacoes}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
                                aria-label="Notificações de estoque"
                            >
                                <Bell size={20} style={{ color: COLORS.primary }} />
                                {produtosEstoqueBaixo.length > 0 && (
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -top-1 -right-1 min-w-[18px] h-[18px] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                                        style={{ backgroundColor: COLORS.danger }}
                                    >
                                        {produtosEstoqueBaixo.length > 9 ? '9+' : produtosEstoqueBaixo.length}
                                    </motion.span>
                                )}
                            </motion.button>

                            <AnimatePresence>
                                {notificacoesAberto && (
                                    <motion.div
                                        variants={notificacaoVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                                    >
                                        {/* Header */}
                                        <div
                                            className="px-4 py-3 flex items-center justify-between"
                                            style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, #1a4a7a 100%)` }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle size={16} className="text-white" />
                                                <span className="text-white font-semibold text-sm">Estoque Baixo</span>
                                                <span
                                                    className="text-white text-[10px] px-2 py-0.5 rounded-full font-bold"
                                                    style={{ backgroundColor: COLORS.danger }}
                                                >
                                                    {produtosEstoqueBaixo.length}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setNotificacoesAberto(false)}
                                                className="text-white/80 hover:text-white transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                        {/* Conteúdo */}
                                        <div className="max-h-96 overflow-y-auto">
                                            {loadingNotificacoes ? (
                                                <div className="p-8 flex items-center justify-center">
                                                    <Loader2 className="h-6 w-6 animate-spin" style={{ color: COLORS.primary }} />
                                                </div>
                                            ) : produtosEstoqueBaixo.length > 0 ? (
                                                <>
                                                    <div className="p-3 bg-orange-50 border-b border-orange-100">
                                                        <p className="text-xs text-orange-600 text-center font-medium">
                                                            Os seguintes produtos precisam de reposição urgente
                                                        </p>
                                                    </div>

                                                    {produtosEstoqueBaixo.map((produto, index) => (
                                                        <motion.div
                                                            key={produto.id}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: index * 0.05 }}
                                                            className="p-3 hover:bg-gray-50 transition-colors cursor-pointer group"
                                                            onClick={() => {
                                                                setNotificacoesAberto(false);
                                                                router.push('/dashboard/Produtos_servicos/Stock');
                                                            }}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
                                                                    <Package size={18} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#123859] transition-colors">
                                                                        {produto.nome}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-xs font-bold" style={{ color: COLORS.danger }}>
                                                                            {produto.estoque_atual} unidades
                                                                        </span>
                                                                        <span className="text-xs text-gray-400">•</span>
                                                                        <span className="text-xs font-medium" style={{ color: COLORS.secondary }}>
                                                                            Mín: {produto.estoque_minimo || 5}
                                                                        </span>
                                                                    </div>
                                                                    {produto.codigo && (
                                                                        <p className="text-xs text-gray-400 mt-1">Cód: {produto.codigo}</p>
                                                                    )}
                                                                </div>
                                                                <motion.div
                                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    style={{ color: COLORS.secondary }}
                                                                >
                                                                    <ChevronLeft size={16} className="rotate-180" />
                                                                </motion.div>
                                                            </div>
                                                        </motion.div>
                                                    ))}

                                                    {/* Rodapé com ações */}
                                                    <div className="p-3 bg-gray-50 border-t border-gray-100">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs text-gray-500">
                                                                Atualizado: {ultimaAtualizacao?.toLocaleTimeString() || '...'}
                                                            </span>
                                                            <button
                                                                onClick={buscarProdutosEstoqueBaixo}
                                                                className="text-xs text-[#123859] hover:text-[#F9941F] transition-colors"
                                                                disabled={loadingNotificacoes}
                                                            >
                                                                {loadingNotificacoes ? 'Atualizando...' : 'Atualizar'}
                                                            </button>
                                                        </div>
                                                        <Link href="/dashboard/Produtos_servicos/Stock">
                                                            <motion.div
                                                                whileHover={{ x: 4 }}
                                                                className="flex items-center justify-center gap-2 text-sm font-medium transition-colors w-full py-2 rounded-lg"
                                                                style={{ backgroundColor: COLORS.primary, color: 'white' }}
                                                            >
                                                                <span>Gerenciar estoque</span>
                                                                <ChevronLeft size={16} className="rotate-180" />
                                                            </motion.div>
                                                        </Link>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="p-8 text-center">
                                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                                                        <Package size={24} className="text-green-600" />
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-900">Estoque normal</p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Todos os produtos estão com estoque adequado
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Perfil */}
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="flex items-center gap-3 pl-4 border-l border-gray-200 cursor-pointer"
                        >
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold" style={{ color: COLORS.primary }}>
                                    {userName}
                                </p>
                                <p className="text-xs text-gray-500 capitalize">{userRole}</p>
                            </div>
                            <motion.div
                                whileHover={{ rotate: 360 }}
                                transition={{ duration: 0.5 }}
                                className="w-10 h-10 rounded-full text-white flex items-center justify-center text-sm font-bold shadow-lg"
                                style={{ background: `linear-gradient(135deg, ${COLORS.secondary} 0%, ${COLORS.primary} 100%)` }}
                            >
                                {userInitial}
                            </motion.div>
                        </motion.div>
                    </div>
                </motion.header>

                {/* Conteúdo */}
                <main className="flex-1 overflow-auto p-6 relative">
                    <motion.div
                        key={pathname}
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        className="h-full"
                    >
                        {children}
                    </motion.div>
                </main>
            </div>

            {/* Overlays */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-10 md:hidden"
                    />
                )}
            </AnimatePresence>

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

            {/* MODAL DE CONFIRMAÇÃO DE LOGOUT */}
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
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header do Modal */}
                            <div className="p-6 pb-4">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                                    <LogOut size={32} className="text-red-500" />
                                </div>
                                <h2 className="text-2xl font-bold text-center mb-2" style={{ color: COLORS.primary }}>
                                    Confirmar Logout
                                </h2>
                                <p className="text-gray-600 text-center text-sm">
                                    Tem certeza que deseja sair do sistema? Você precisará fazer login novamente para acessar sua conta.
                                </p>
                            </div>

                            {/* Mensagem de erro (se houver) */}
                            {logoutError && (
                                <div className="mx-6 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-xs text-yellow-700 text-center">{logoutError}</p>
                                </div>
                            )}

                            {/* Informações do usuário */}
                            <div className="px-6 py-4 bg-gray-50 border-y border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-full text-white flex items-center justify-center text-sm font-bold shadow-md"
                                        style={{ background: `linear-gradient(135deg, ${COLORS.secondary} 0%, ${COLORS.primary} 100%)` }}
                                    >
                                        {userInitial}
                                    </div>
                                    <div>
                                        <p className="font-medium" style={{ color: COLORS.primary }}>
                                            {userName}
                                        </p>
                                        <p className="text-xs text-gray-500">{userEmail}</p>
                                        <p className="text-xs text-gray-400 capitalize">Perfil: {userRole}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Ações */}
                            <div className="p-6 flex gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={fecharModalLogout}
                                    disabled={logoutLoading}
                                    className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                                >
                                    Cancelar
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleLogout}
                                    disabled={logoutLoading}
                                    className="flex-1 py-3 px-4 text-white rounded-xl hover:opacity-90 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                    style={{ backgroundColor: COLORS.danger }}
                                >
                                    {logoutLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Saindo...</span>
                                        </>
                                    ) : (
                                        <>
                                            <LogOut size={18} />
                                            <span>Sair</span>
                                        </>
                                    )}
                                </motion.button>
                            </div>

                            {/* Aviso de segurança */}
                            <div className="px-6 pb-6 text-center">
                                <p className="text-xs text-gray-400">
                                    Ao sair, sua sessão será encerrada e todos os dados não salvos serão perdidos.
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}