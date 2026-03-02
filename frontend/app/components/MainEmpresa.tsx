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
    X,
    Sun,
    Moon,
    TrendingDown,
    AlertCircle
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { estoqueService, ResumoEstoque } from "@/services/estoque";
import { produtoService, Produto, estaEstoqueBaixo, estaSemEstoque } from "@/services/produtos";
import { useTheme, useThemeColors } from "@/context/ThemeContext";

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
    roles?: string[];
}

interface MainEmpresaProps {
    children: ReactNode;
    companyLogo?: string;
    companyName?: string;
}

/* ===================== COMPONENT ===================== */
export default function MainEmpresa({
    children,
    companyLogo,
    companyName = "Minha Empresa",
}: MainEmpresaProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading: userLoading, logout: authLogout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const colors = useThemeColors();

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
    const [produtosSemEstoque, setProdutosSemEstoque] = useState<Produto[]>([]);
    const [resumoEstoque, setResumoEstoque] = useState<ResumoEstoque | null>(null);
    const [loadingNotificacoes, setLoadingNotificacoes] = useState(false);
    const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
    const [abaAtiva, setAbaAtiva] = useState<'baixo' | 'zero'>('baixo');

    // Dados do usuário logado
    const userName = user?.name || "Usuário";
    const userRole = user?.role || "operador";
    const userEmail = user?.email || "";
    const userInitial = userName.charAt(0).toUpperCase();

    // Animação de entrada inicial
    useEffect(() => {
        setIsLoaded(true);
    }, []);

    // Buscar produtos com estoque baixo e sem estoque
    const buscarNotificacoesEstoque = useCallback(async () => {
        setLoadingNotificacoes(true);
        try {
            // Buscar resumo do estoque (inclui produtos críticos)
            const resumo = await estoqueService.obterResumo();
            setResumoEstoque(resumo);

            // Produtos críticos do resumo (estoque baixo)
            setProdutosEstoqueBaixo(resumo.produtos_criticos || []);

            // Buscar produtos sem estoque especificamente
            const responseSemEstoque = await produtoService.listarProdutos({
                sem_estoque: true,
                tipo: 'produto', // Apenas produtos, não serviços
                paginar: false
            });

            // Extrair array de produtos da resposta paginada ou não
            const produtosSemStock = Array.isArray(responseSemEstoque.produtos)
                ? responseSemEstoque.produtos
                : responseSemEstoque.produtos.data || [];

            setProdutosSemEstoque(produtosSemStock);
            setUltimaAtualizacao(new Date());

        } catch (error) {
            console.error("Erro ao buscar notificações de estoque:", error);
            setProdutosEstoqueBaixo([]);
            setProdutosSemEstoque([]);
        } finally {
            setLoadingNotificacoes(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            buscarNotificacoesEstoque();
            // Atualizar a cada 5 minutos
            const interval = setInterval(buscarNotificacoesEstoque, 300000);
            return () => clearInterval(interval);
        }
    }, [user, buscarNotificacoesEstoque]);

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
            buscarNotificacoesEstoque();
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
            const result = await authLogout();

            if (result.success) {
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

    const temPermissao = (item: MenuItem): boolean => {
        if (!item.roles || item.roles.length === 0) return true;
        return item.roles.includes(userRole);
    };

    // Menu base com roles definidas
    const menuItems: MenuItem[] = [
        {
            label: "Dashboard",
            icon: Home,
            path: "/dashboard",
            links: [],
            roles: ['admin', 'contabilista', 'operador']
        },
        {
            label: "Vendas",
            icon: ShoppingCart,
            path: "/dashboard/Vendas",
            links: userRole === 'contabilista'
                ? [
                    { label: "Relatórios de vendas", path: "/dashboard/Vendas/relatorios", icon: BarChart2 }
                ]
                : userRole === 'operador'
                    ? [
                        { label: "Nova venda", path: "/dashboard/Vendas/Nova_venda", icon: ShoppingCart }
                    ]
                    : [
                        { label: "Nova venda", path: "/dashboard/Vendas/Nova_venda", icon: ShoppingCart },
                        { label: "Relatórios de vendas", path: "/dashboard/Vendas/relatorios", icon: BarChart2 }
                    ],
            isGroup: true,
            roles: ['admin', 'contabilista', 'operador']
        },
        {
            label: "Documentos Fiscais",
            icon: FileText,
            path: "/dashboard/Faturas",
            links: userRole === 'operador' || userRole === 'admin'
                ? [
                    { label: "Nova fatura", path: "/dashboard/Faturas/Fatura_Normal", icon: FileText },
                    { label: "Nova Fatura Proforma", path: "/dashboard/Faturas/Faturas_Proforma", icon: FileText },
                    { label: "Faturas", path: "/dashboard/Faturas/Faturas", icon: FileText }
                ]
                : [],
            isGroup: true,
            roles: ['admin', 'operador']
        },
        {
            label: "Clientes",
            icon: Users,
            path: "/dashboard/Clientes",
            links: [
                { label: "Clientes", path: "/dashboard/Clientes/Novo_cliente", icon: Users }
            ],
            isGroup: true,
            roles: ['admin']
        },
        {
            label: "Produtos / Serviços",
            icon: Archive,
            path: "/dashboard/Produtos_servicos",
            links: [
                { label: "Stock", path: "/dashboard/Produtos_servicos/Stock", icon: Package },
                { label: "Nova categoria", path: "/dashboard/Produtos_servicos/categorias", icon: Package },
                { label: "Fornecedores", path: "/dashboard/Fornecedores/Novo_fornecedor", icon: Truck },
            ],
            isGroup: true,
            roles: ['admin']
        },
        {
            label: "Relatórios",
            icon: BarChart2,
            path: "/dashboard/relatorios",
            isGroup: true,
            roles: ['admin', 'contabilista'],
            links: []
        },
        {
            label: "Configurações",
            icon: Settings,
            path: "/dashboard/configuracoes",
            links: userRole === 'admin'
                ? [
                    { label: "Perfil", path: "/dashboard/configuracoes/perfil", icon: Users },
                    { label: "Empresa", path: "/dashboard/configuracoes/empresa", icon: Settings },
                    { label: "Usuários", path: "/dashboard/configuracoes/usuarios", icon: Users },
                    { label: "Permissões", path: "/dashboard/configuracoes/permissoes", icon: Settings }
                ]
                : userRole === 'contabilista'
                    ? [
                        { label: "Perfil", path: "/dashboard/configuracoes/perfil", icon: Users },
                        { label: "Empresa", path: "/dashboard/configuracoes/empresa", icon: Settings }
                    ]
                    : [
                        { label: "Perfil", path: "/dashboard/configuracoes/perfil", icon: Users }
                    ],
            isGroup: true,
            roles: ['admin', 'contabilista', 'operador']
        }
    ];

    const menuItemsFiltrados = menuItems.filter(item => temPermissao(item));

    // Total de notificações (estoque baixo + sem estoque)
    const totalNotificacoes = produtosEstoqueBaixo.length + produtosSemEstoque.length;

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
                ease: [0.42, 0, 0.58, 1]
            }
        },
        visible: {
            opacity: 1,
            height: "auto",
            transition: {
                duration: 0.3,
                ease: [0.34, 1.56, 0.64, 1],
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
                type: "spring" as const,
                stiffness: 300,
                damping: 30
            }
        },
        exit: {
            opacity: 0,
            y: -10,
            scale: 0.95,
            transition: {
                duration: 0.2
            }
        }
    };

    if (userLoading) {
        return (
            <div className="flex h-screen items-center justify-center" style={{ backgroundColor: colors.background }}>
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.primary }} />
            </div>
        );
    }

    return (
        <div className="flex h-screen transition-colors duration-300" style={{ backgroundColor: colors.background, overflow: 'hidden' }}>
            {/* SIDEBAR */}
            <motion.aside
                initial={false}
                animate={sidebarOpen ? "open" : "closed"}
                variants={sidebarVariants}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="border-r flex flex-col relative shadow-xl z-20"
                style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border
                }}
            >
                {/* Toggle Button */}
                <motion.button
                    onClick={toggleSidebar}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="absolute -right-3 top-8 text-white p-2 rounded-full shadow-lg hover:opacity-90 transition-colors z-30"
                    style={{ backgroundColor: colors.primary }}
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
                    style={{ borderColor: colors.border }}
                >
                    {companyLogo ? (
                        <Image src={companyLogo} alt="Logo" width={32} height={32} className="rounded-lg" />
                    ) : (
                        <div className="w-8 h-8 text-white rounded-lg flex items-center justify-center font-bold shadow-md"
                            style={{ backgroundColor: colors.primary }}>
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
                                style={{ color: colors.text }}
                            >
                                {companyName}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Menu */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
                    <AnimatePresence>
                        {isLoaded && menuItemsFiltrados.map((item, index) => {
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
                                        className={`group flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all duration-300`}
                                        style={{
                                            backgroundColor: active ? colors.secondary : 'transparent',
                                            color: active ? 'white' : colors.text
                                        }}
                                    >
                                        {/* Link ou div clicável baseado em hasLinks */}
                                        {hasLinks ? (
                                            <div
                                                className="flex items-center gap-3 flex-1 min-w-0"
                                                onClick={(e) => handleMainItemClick(item, e)}
                                            >
                                                <item.icon
                                                    size={20}
                                                    className="transition-colors duration-300"
                                                    style={{ color: active ? 'white' : colors.primary }}
                                                />

                                                <AnimatePresence>
                                                    {sidebarOpen && (
                                                        <motion.span
                                                            initial={{ opacity: 0, width: 0 }}
                                                            animate={{ opacity: 1, width: "auto" }}
                                                            exit={{ opacity: 0, width: 0 }}
                                                            className="text-sm font-medium whitespace-nowrap overflow-hidden"
                                                            style={{ color: active ? 'white' : colors.text }}
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
                                                    className="transition-colors duration-300"
                                                    style={{ color: active ? 'white' : colors.primary }}
                                                />

                                                <AnimatePresence>
                                                    {sidebarOpen && (
                                                        <motion.span
                                                            initial={{ opacity: 0, width: 0 }}
                                                            animate={{ opacity: 1, width: "auto" }}
                                                            exit={{ opacity: 0, width: 0 }}
                                                            className="text-sm font-medium whitespace-nowrap overflow-hidden"
                                                            style={{ color: active ? 'white' : colors.text }}
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
                                                style={{ backgroundColor: 'white' }}
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
                                                className="p-1 rounded-full hover:bg-white/20 ml-1"
                                                style={{ color: active ? 'white' : colors.text }}
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
                                                                    className={`group flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200`}
                                                                    style={{
                                                                        backgroundColor: linkActive ? `${colors.primary}10` : 'transparent',
                                                                        borderLeft: linkActive ? `2px solid ${colors.secondary}` : 'none'
                                                                    }}
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
                                                                                style={{
                                                                                    color: linkActive ? colors.secondary : colors.textSecondary
                                                                                }}
                                                                            />
                                                                        </motion.div>
                                                                    )}
                                                                    <span
                                                                        className={`text-sm transition-colors ${linkActive ? 'font-semibold' : ''}`}
                                                                        style={{
                                                                            color: linkActive ? colors.text : colors.textSecondary
                                                                        }}
                                                                    >
                                                                        {link.label}
                                                                    </span>

                                                                    {linkActive && (
                                                                        <motion.div
                                                                            layoutId="subActive"
                                                                            className="ml-auto w-1.5 h-1.5 rounded-full"
                                                                            style={{ backgroundColor: colors.secondary }}
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
                    className="p-3 border-t"
                    style={{ borderColor: colors.border }}
                >
                    <motion.div
                        whileHover={{ scale: 1.02, backgroundColor: theme === 'dark' ? '#333333' : 'rgba(239, 68, 68, 0.1)' }}
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
                                    style={{ color: colors.text }}
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
                                style={{ backgroundColor: colors.secondary }}
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
                    className="h-16 border-b px-6 flex items-center justify-between shadow-sm relative"
                    style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border
                    }}
                >
                    <div className="flex items-center gap-4">
                        <motion.h1
                            key={pathname}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-lg font-bold"
                            style={{ color: colors.text }}
                        >
                            {menuItemsFiltrados.find(item => isParentActive(item))?.label || "Dashboard"}
                        </motion.h1>

                        {/* Badge de Role */}
                        <span
                            className="hidden md:inline-block text-xs px-2 py-1 rounded-full"
                            style={{
                                backgroundColor: userRole === 'admin' ? colors.secondary + '20' :
                                    userRole === 'contabilista' ? colors.primary + '20' : colors.border,
                                color: userRole === 'admin' ? colors.secondary :
                                    userRole === 'contabilista' ? colors.primary : colors.textSecondary
                            }}
                        >
                            {userRole === 'admin' ? 'Administrador' :
                                userRole === 'contabilista' ? 'Contabilista' : 'Operador'}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Botão de Toggle do Tema */}
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={toggleTheme}
                            className="p-2 rounded-full transition-colors relative group"
                            style={{
                                backgroundColor: colors.hover,
                                color: colors.text
                            }}
                            aria-label="Alternar tema"
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={theme}
                                    initial={{ y: -20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 20, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {theme === 'dark' ? (
                                        <Sun size={20} style={{ color: colors.secondary }} />
                                    ) : (
                                        <Moon size={20} style={{ color: colors.primary }} />
                                    )}
                                </motion.div>
                            </AnimatePresence>

                            {/* Tooltip */}
                            <motion.div
                                initial={{ opacity: 0, x: 10, scale: 0.8 }}
                                whileHover={{ opacity: 1, x: 0, scale: 1 }}
                                className="absolute right-full mr-2 px-2 py-1 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none"
                                style={{ backgroundColor: colors.primary }}
                            >
                                {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                            </motion.div>
                        </motion.button>

                        {/* Notificações de Estoque */}
                        {(userRole === 'admin' || userRole === 'operador') && (
                            <div className="relative">
                                <motion.button
                                    onClick={toggleNotificacoes}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="relative p-2 rounded-full transition-colors group"
                                    style={{
                                        backgroundColor: notificacoesAberto ? colors.hover : 'transparent',
                                        color: colors.text
                                    }}
                                    aria-label="Notificações de estoque"
                                >
                                    <Bell size={20} style={{ color: colors.primary }} />
                                    {totalNotificacoes > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                                            style={{
                                                backgroundColor: produtosSemEstoque.length > 0 ? colors.danger : '#f59e0b'
                                            }}
                                        >
                                            {totalNotificacoes > 9 ? '9+' : totalNotificacoes}
                                        </motion.span>
                                    )}

                                    {/* Tooltip */}
                                    <motion.div
                                        initial={{ opacity: 0, x: 10, scale: 0.8 }}
                                        whileHover={{ opacity: 1, x: 0, scale: 1 }}
                                        className="absolute right-full mr-2 px-2 py-1 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none"
                                        style={{ backgroundColor: colors.primary }}
                                    >
                                        Notificações de Stock
                                    </motion.div>
                                </motion.button>

                                <AnimatePresence>
                                    {notificacoesAberto && (
                                        <motion.div
                                            variants={notificacaoVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            className="absolute right-0 top-full mt-2 w-96 rounded-xl shadow-2xl border overflow-hidden z-50"
                                            style={{
                                                backgroundColor: colors.card,
                                                borderColor: colors.border
                                            }}
                                        >
                                            {/* Header com Tabs */}
                                            <div
                                                className="px-4 py-3"
                                                style={{
                                                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${theme === 'dark' ? '#1a1a4a' : '#1a4a7a'} 100%)`
                                                }}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <AlertTriangle size={16} className="text-white" />
                                                        <span className="text-white font-semibold text-sm">Alertas de Stock</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setNotificacoesAberto(false)}
                                                        className="text-white/80 hover:text-white transition-colors"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>

                                                {/* Tabs */}
                                                <div className="flex gap-1 bg-black/20 rounded-lg p-1">
                                                    <button
                                                        onClick={() => setAbaAtiva('baixo')}
                                                        className="flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1"
                                                        style={{
                                                            backgroundColor: abaAtiva === 'baixo' ? 'rgba(255,255,255,0.2)' : 'transparent',
                                                            color: 'white'
                                                        }}
                                                    >
                                                        <TrendingDown size={12} />
                                                        Baixo ({produtosEstoqueBaixo.length})
                                                    </button>
                                                    <button
                                                        onClick={() => setAbaAtiva('zero')}
                                                        className="flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1"
                                                        style={{
                                                            backgroundColor: abaAtiva === 'zero' ? 'rgba(255,255,255,0.2)' : 'transparent',
                                                            color: 'white'
                                                        }}
                                                    >
                                                        <AlertCircle size={12} />
                                                        Esgotado ({produtosSemEstoque.length})
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Conteúdo */}
                                            <div className="max-h-96 overflow-y-auto">
                                                {loadingNotificacoes ? (
                                                    <div className="p-8 flex items-center justify-center">
                                                        <Loader2 className="h-6 w-6 animate-spin" style={{ color: colors.primary }} />
                                                    </div>
                                                ) : abaAtiva === 'baixo' ? (
                                                    // Aba: Estoque Baixo
                                                    produtosEstoqueBaixo.length > 0 ? (
                                                        <>
                                                            <div className="p-3 border-b" style={{
                                                                backgroundColor: theme === 'dark' ? '#442200' : '#fff7ed',
                                                                borderColor: colors.border
                                                            }}>
                                                                <p className="text-xs text-center font-medium" style={{
                                                                    color: theme === 'dark' ? '#ffb347' : '#9a3412'
                                                                }}>
                                                                    Produtos com estoque abaixo do mínimo
                                                                </p>
                                                            </div>

                                                            {produtosEstoqueBaixo.map((produto, index) => (
                                                                <motion.div
                                                                    key={produto.id}
                                                                    initial={{ opacity: 0, x: -20 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ delay: index * 0.05 }}
                                                                    className="p-3 transition-colors cursor-pointer group border-b last:border-b-0"
                                                                    style={{
                                                                        borderColor: colors.border,
                                                                        backgroundColor: 'transparent'
                                                                    }}
                                                                    onClick={() => {
                                                                        setNotificacoesAberto(false);
                                                                        router.push('/dashboard/Produtos_servicos/Stock');
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.currentTarget.style.backgroundColor = theme === 'dark' ? colors.hover : '#f9fafb';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                                    }}
                                                                >
                                                                    <div className="flex items-start gap-3">
                                                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                                                            style={{
                                                                                backgroundColor: theme === 'dark' ? '#442200' : '#fff7ed',
                                                                                color: theme === 'dark' ? '#ffb347' : '#9a3412'
                                                                            }}
                                                                        >
                                                                            <Package size={18} />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-medium truncate transition-colors"
                                                                                style={{ color: colors.text }}
                                                                            >
                                                                                {produto.nome}
                                                                            </p>
                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                <span className="text-xs font-bold" style={{ color: '#f59e0b' }}>
                                                                                    {produto.estoque_atual} unid.
                                                                                </span>
                                                                                <span className="text-xs" style={{ color: colors.textSecondary }}>•</span>
                                                                                <span className="text-xs font-medium" style={{ color: colors.secondary }}>
                                                                                    Mín: {produto.estoque_minimo || 5}
                                                                                </span>
                                                                            </div>
                                                                            {produto.categoria && (
                                                                                <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                                                                                    {produto.categoria.nome}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <motion.div
                                                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            style={{ color: colors.secondary }}
                                                                        >
                                                                            <ChevronLeft size={16} className="rotate-180" />
                                                                        </motion.div>
                                                                    </div>
                                                                </motion.div>
                                                            ))}
                                                        </>
                                                    ) : (
                                                        <div className="p-8 text-center">
                                                            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                                                                style={{ backgroundColor: theme === 'dark' ? '#1a3a1a' : '#dcfce7' }}
                                                            >
                                                                <Package size={24} style={{ color: theme === 'dark' ? '#4ade80' : '#16a34a' }} />
                                                            </div>
                                                            <p className="text-sm font-medium" style={{ color: colors.text }}>
                                                                Estoque saudável
                                                            </p>
                                                            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                                                                Nenhum produto com estoque baixo
                                                            </p>
                                                        </div>
                                                    )
                                                ) : (
                                                    // Aba: Sem Estoque
                                                    produtosSemEstoque.length > 0 ? (
                                                        <>
                                                            <div className="p-3 border-b" style={{
                                                                backgroundColor: theme === 'dark' ? '#442222' : '#fef2f2',
                                                                borderColor: colors.border
                                                            }}>
                                                                <p className="text-xs text-center font-medium" style={{
                                                                    color: theme === 'dark' ? '#fca5a5' : '#991b1b'
                                                                }}>
                                                                    Produtos esgotados - reposição urgente necessária
                                                                </p>
                                                            </div>

                                                            {produtosSemEstoque.map((produto, index) => (
                                                                <motion.div
                                                                    key={produto.id}
                                                                    initial={{ opacity: 0, x: -20 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ delay: index * 0.05 }}
                                                                    className="p-3 transition-colors cursor-pointer group border-b last:border-b-0"
                                                                    style={{
                                                                        borderColor: colors.border,
                                                                        backgroundColor: 'transparent'
                                                                    }}
                                                                    onClick={() => {
                                                                        setNotificacoesAberto(false);
                                                                        router.push('/dashboard/Produtos_servicos/Stock');
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.currentTarget.style.backgroundColor = theme === 'dark' ? colors.hover : '#f9fafb';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                                    }}
                                                                >
                                                                    <div className="flex items-start gap-3">
                                                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                                                            style={{
                                                                                backgroundColor: theme === 'dark' ? '#442222' : '#fef2f2',
                                                                                color: theme === 'dark' ? '#fca5a5' : '#dc2626'
                                                                            }}
                                                                        >
                                                                            <AlertCircle size={18} />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-medium truncate transition-colors"
                                                                                style={{ color: colors.text }}
                                                                            >
                                                                                {produto.nome}
                                                                            </p>
                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                                                                    style={{
                                                                                        backgroundColor: colors.danger + '20',
                                                                                        color: colors.danger
                                                                                    }}
                                                                                >
                                                                                    ESGOTADO
                                                                                </span>
                                                                                <span className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                                                                                    Mín: {produto.estoque_minimo || 5}
                                                                                </span>
                                                                            </div>
                                                                            {produto.categoria && (
                                                                                <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                                                                                    {produto.categoria.nome}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <motion.div
                                                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            style={{ color: colors.secondary }}
                                                                        >
                                                                            <ChevronLeft size={16} className="rotate-180" />
                                                                        </motion.div>
                                                                    </div>
                                                                </motion.div>
                                                            ))}
                                                        </>
                                                    ) : (
                                                        <div className="p-8 text-center">
                                                            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                                                                style={{ backgroundColor: theme === 'dark' ? '#1a3a1a' : '#dcfce7' }}
                                                            >
                                                                <Package size={24} style={{ color: theme === 'dark' ? '#4ade80' : '#16a34a' }} />
                                                            </div>
                                                            <p className="text-sm font-medium" style={{ color: colors.text }}>
                                                                Tudo em ordem
                                                            </p>
                                                            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                                                                Nenhum produto esgotado
                                                            </p>
                                                        </div>
                                                    )
                                                )}

                                                {/* Rodapé com ações */}
                                                <div className="p-3 border-t" style={{
                                                    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f9fafb',
                                                    borderColor: colors.border
                                                }}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs" style={{ color: colors.textSecondary }}>
                                                            Atualizado: {ultimaAtualizacao?.toLocaleTimeString() || '...'}
                                                        </span>
                                                        <button
                                                            onClick={buscarNotificacoesEstoque}
                                                            className="text-xs transition-colors"
                                                            style={{
                                                                color: colors.primary,
                                                                opacity: loadingNotificacoes ? 0.5 : 1
                                                            }}
                                                            disabled={loadingNotificacoes}
                                                        >
                                                            {loadingNotificacoes ? 'Atualizando...' : 'Atualizar'}
                                                        </button>
                                                    </div>

                                                    {/* Resumo rápido */}
                                                    {resumoEstoque && (
                                                        <div className="grid grid-cols-3 gap-2 mb-3 p-2 rounded-lg"
                                                            style={{ backgroundColor: theme === 'dark' ? '#2a2a2a' : '#e5e7eb' }}
                                                        >
                                                            <div className="text-center">
                                                                <p className="text-lg font-bold" style={{ color: colors.text }}>
                                                                    {resumoEstoque.totalProdutos}
                                                                </p>
                                                                <p className="text-[10px]" style={{ color: colors.textSecondary }}>Total</p>
                                                            </div>
                                                            <div className="text-center border-x"
                                                                style={{ borderColor: colors.border }}
                                                            >
                                                                <p className="text-lg font-bold" style={{ color: '#f59e0b' }}>
                                                                    {resumoEstoque.produtosEstoqueBaixo}
                                                                </p>
                                                                <p className="text-[10px]" style={{ color: colors.textSecondary }}>Baixo</p>
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-lg font-bold" style={{ color: colors.danger }}>
                                                                    {resumoEstoque.produtosSemEstoque}
                                                                </p>
                                                                <p className="text-[10px]" style={{ color: colors.textSecondary }}>Zero</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <Link href="/dashboard/Produtos_servicos/Stock">
                                                        <motion.div
                                                            whileHover={{ x: 4 }}
                                                            className="flex items-center justify-center gap-2 text-sm font-medium transition-colors w-full py-2 rounded-lg"
                                                            style={{
                                                                backgroundColor: colors.primary,
                                                                color: 'white'
                                                            }}
                                                        >
                                                            <span>Gerenciar estoque</span>
                                                            <ChevronLeft size={16} className="rotate-180" />
                                                        </motion.div>
                                                    </Link>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Perfil */}
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="flex items-center gap-3 pl-4 border-l cursor-pointer group relative"
                            style={{ borderColor: colors.border }}
                        >
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold" style={{ color: colors.text }}>
                                    {userName}
                                </p>
                                <p className="text-xs capitalize" style={{ color: colors.textSecondary }}>
                                    {userRole === 'admin' ? 'Administrador' :
                                        userRole === 'contabilista' ? 'Contabilista' : 'Operador'}
                                </p>
                            </div>
                            <motion.div
                                whileHover={{ rotate: 360 }}
                                transition={{ duration: 0.5 }}
                                className="w-10 h-10 rounded-full text-white flex items-center justify-center text-sm font-bold shadow-lg"
                                style={{
                                    background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary} 100%)`
                                }}
                            >
                                {userInitial}
                            </motion.div>

                            {/* Tooltip do perfil para mobile */}
                            <motion.div
                                initial={{ opacity: 0, x: 10, scale: 0.8 }}
                                whileHover={{ opacity: 1, x: 0, scale: 1 }}
                                className="absolute right-full mr-2 px-2 py-1 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none sm:hidden"
                                style={{ backgroundColor: colors.primary }}
                            >
                                Meu Perfil
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
                            className="rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                            style={{ backgroundColor: colors.card }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header do Modal */}
                            <div className="p-6 pb-4">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: theme === 'dark' ? '#442222' : '#fee2e2' }}
                                >
                                    <LogOut size={32} className="text-red-500" />
                                </div>
                                <h2 className="text-2xl font-bold text-center mb-2" style={{ color: colors.text }}>
                                    Confirmar Logout
                                </h2>
                                <p className="text-center text-sm" style={{ color: colors.textSecondary }}>
                                    Tem certeza que deseja sair do sistema? Você precisará fazer login novamente para acessar sua conta.
                                </p>
                            </div>

                            {/* Mensagem de erro (se houver) */}
                            {logoutError && (
                                <div className="mx-6 mb-4 p-3 rounded-lg"
                                    style={{
                                        backgroundColor: theme === 'dark' ? '#442200' : '#fef3c7',
                                        border: `1px solid ${theme === 'dark' ? '#854d0e' : '#fbbf24'}`
                                    }}
                                >
                                    <p className="text-xs text-center" style={{ color: theme === 'dark' ? '#fbbf24' : '#92400e' }}>
                                        {logoutError}
                                    </p>
                                </div>
                            )}

                            {/* Informações do usuário */}
                            <div className="px-6 py-4 border-y" style={{
                                backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f9fafb',
                                borderColor: colors.border
                            }}>
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-full text-white flex items-center justify-center text-sm font-bold shadow-md"
                                        style={{
                                            background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary} 100%)`
                                        }}
                                    >
                                        {userInitial}
                                    </div>
                                    <div>
                                        <p className="font-medium" style={{ color: colors.text }}>
                                            {userName}
                                        </p>
                                        <p className="text-xs" style={{ color: colors.textSecondary }}>{userEmail}</p>
                                        <p className="text-xs capitalize" style={{ color: colors.textSecondary }}>
                                            Perfil: {userRole === 'admin' ? 'Administrador' :
                                                userRole === 'contabilista' ? 'Contabilista' : 'Operador'}
                                        </p>
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
                                    className="flex-1 py-3 px-4 rounded-xl transition-colors font-medium disabled:opacity-50"
                                    style={{
                                        backgroundColor: theme === 'dark' ? '#333333' : '#e5e7eb',
                                        color: colors.text
                                    }}
                                >
                                    Cancelar
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleLogout}
                                    disabled={logoutLoading}
                                    className="flex-1 py-3 px-4 text-white rounded-xl hover:opacity-90 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                    style={{ backgroundColor: colors.danger }}
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
                                <p className="text-xs" style={{ color: colors.textSecondary }}>
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