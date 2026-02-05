"use client";

import React, { ReactNode, useState, useEffect } from "react";
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
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";

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
}

interface MainEmpresaProps {
    children: ReactNode;
    userName?: string;
    companyLogo?: string;
    companyName?: string;
}

/* ===================== COMPONENT ===================== */
export default function MainEmpresa({
    children,
    userName = "Admin",
    companyLogo,
    companyName = "Minha Empresa",
}: MainEmpresaProps) {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState<Record<string, boolean>>({});
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Animação de entrada inicial
    useEffect(() => {
        setIsLoaded(true);
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
        // Fechar todos os dropdowns ao colapsar
        if (sidebarOpen) {
            setDropdownOpen({});
        }
    };

    const toggleDropdown = (label: string) => {
        setDropdownOpen((prev) => ({
            ...prev,
            [label]: !prev[label],
        }));
    };

    const isActive = (path: string) => pathname === path;
    const isParentActive = (item: MenuItem) => {
        if (pathname === item.path) return true;
        return item.links.some(link => pathname === link.path);
    };

    /* ===================== MENU ===================== */
    const menuItems: MenuItem[] = [
        { label: "Dashboard", icon: Home, path: "/dashboard", links: [] },
        {
            label: "Vendas",
            icon: ShoppingCart,
            path: "#",
            links: [
                { label: "Nova venda", path: "/dashboard/Vendas/Nova_venda", icon: ShoppingCart },
                { label: "Relatórios de vendas", path: "/dashboard/Vendas/relatorios", icon: BarChart2 },
            ],
        },
        {
            label: "Faturas",
            icon: FileText,
            path: "#",
            links: [
                { label: "Faturas", path: "/dashboard/Faturas/Faturas", icon: FileText },
                { label: "Relatório das faturas", path: "/dashboard/Faturas/relatorios", icon: BarChart2 },
            ],
        },
        {
            label: "Clientes",
            icon: Users,
            path: "#",
            links: [
                { label: "Novo cliente", path: "/dashboard/Clientes/Novo_cliente", icon: Users },
                { label: "Total clientes", path: "/dashboard/Clientes/Total_clientes", icon: Users },
            ],
        },
        {
            label: "Produtos / Serviços",
            icon: Archive,
            path: "#",
            links: [
                { label: "Novo produto/serviço", path: "/dashboard/Produtos_servicos/Novo_produto_servico", icon: Package },
                { label: "Stock", path: "/dashboard/Produtos_servicos/Stock", icon: Package },
            ],
        },
        {
            label: "Fornecedores",
            icon: Truck,
            path: "#",
            links: [
                { label: "Novo fornecedor", path: "/dashboard/Fornecedores/Novo_fornecedor", icon: Truck },
                { label: "Todos fornecedores", path: "/dashboard/Fornecedores/Total_fornecedores", icon: Truck },
            ],
        },
        {
            label: "Relatórios",
            icon: BarChart2,
            path: "#",
            links: [
                { label: "Diário", path: "/dashboard/relatorios/diario", icon: BarChart2 },
                { label: "Mensal", path: "/dashboard/relatorios/mensal", icon: BarChart2 },
                { label: "Anual", path: "/dashboard/relatorios/anual", icon: BarChart2 },
            ],
        },
        {
            label: "Configurações",
            icon: Settings,
            path: "/dashboard/configuracoes",
            links: [],
        },
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

    return (
        <div className="flex h-screen bg-[#F2F2F2] overflow-hidden">
            {/* SIDEBAR */}
            <motion.aside
                initial={false}
                animate={sidebarOpen ? "open" : "closed"}
                variants={sidebarVariants}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="bg-white border-r border-gray-200 flex flex-col relative shadow-xl z-20"
            >
                {/* Toggle Button com animação de pulso */}
                <motion.button
                    onClick={toggleSidebar}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="absolute -right-3 top-8 bg-[#123859] text-white p-2 rounded-full shadow-lg hover:bg-[#F9941F] transition-colors z-30"
                >
                    <motion.div
                        animate={{ rotate: sidebarOpen ? 0 : 180 }}
                        transition={{ duration: 0.3 }}
                    >
                        <ChevronLeft size={16} />
                    </motion.div>
                </motion.button>

                {/* Logo com animação de entrada */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="h-16 flex items-center gap-3 px-4 border-b overflow-hidden"
                >

                        {companyLogo ? (
                            <Image src={companyLogo} alt="Logo" width={32} height={32} className="rounded-lg" />
                        ) : (
                            <div className="w-8 h-8 bg-[#123859] text-white rounded-lg flex items-center justify-center font-bold shadow-md">
                                {companyName.charAt(0)}
                            </div>
                        )}

                    <AnimatePresence>
                        {sidebarOpen && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="font-semibold text-[#123859] text-sm whitespace-nowrap"
                            >
                                {companyName}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Menu com stagger animation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
                    <AnimatePresence>
                        {isLoaded && menuItems.map((item, index) => {
                            const active = isParentActive(item);
                            const isOpen = dropdownOpen[item.label];

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
                                    {/* Item principal */}
                                    <motion.div
                                        whileHover={{ scale: 1.02, x: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`group flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all duration-300 ${active
                                                ? "bg-[#F9941F] text-white shadow-md"
                                                : "hover:bg-[#F9941F]/10"
                                            }`}
                                    >
                                        <Link href={item.path} className="flex items-center gap-3 flex-1 min-w-0">
                                                <item.icon
                                                    size={20}
                                                    className={`transition-colors duration-300 ${active ? "text-white" : "text-[#123859] group-hover:text-[#F9941F]"
                                                        }`}
                                                />

                                            <AnimatePresence>
                                                {sidebarOpen && (
                                                    <motion.span
                                                        initial={{ opacity: 0, width: 0 }}
                                                        animate={{ opacity: 1, width: "auto" }}
                                                        exit={{ opacity: 0, width: 0 }}
                                                        className={`text-sm font-medium whitespace-nowrap overflow-hidden ${active ? "text-white" : "text-[#123859]"
                                                            }`}
                                                    >
                                                        {item.label}
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </Link>

                                        {/* Indicador de ativo */}
                                        {active && (
                                            <motion.div
                                                layoutId="activeIndicator"
                                                className="w-1.5 h-1.5 rounded-full bg-[#F9941F]"
                                            />
                                        )}

                                        {item.links.length > 0 && sidebarOpen && (
                                            <motion.button
                                                onClick={() => toggleDropdown(item.label)}
                                                whileHover={{ scale: 1.2 }}
                                                whileTap={{ scale: 0.9 }}
                                                animate={{ rotate: isOpen ? 180 : 0 }}
                                                transition={{ duration: 0.3 }}
                                                className={`p-1 rounded-full hover:bg-white/20 ${active ? "text-white" : "text-[#123859]"}`}
                                            >
                                                <ChevronDown size={16} />
                                            </motion.button>
                                        )}
                                    </motion.div>

                                    {/* Submenu com animação melhorada */}
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
                                                                    whileHover={{ x: 8, backgroundColor: "rgba(249, 148, 31, 0.1)" }}
                                                                    whileTap={{ scale: 0.98 }}
                                                                    className={`group flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${linkActive
                                                                            ? "bg-[#123859]/10 border-l-2 border-[#F9941F]"
                                                                            : "hover:bg-gray-50"
                                                                        }`}
                                                                >
                                                                    {link.icon && (
                                                                        <motion.div
                                                                            initial={{ scale: 0 }}
                                                                            animate={{ scale: 1 }}
                                                                            transition={{ delay: linkIndex * 0.05 }}
                                                                        >
                                                                            <link.icon
                                                                                size={16}
                                                                                className={`transition-colors ${linkActive ? "text-[#F9941F]" : "text-[#123859]/60 group-hover:text-[#F9941F]"
                                                                                    }`}
                                                                            />
                                                                        </motion.div>
                                                                    )}
                                                                    <span className={`text-sm transition-colors ${linkActive
                                                                            ? "text-[#123859] font-semibold"
                                                                            : "text-[#123859]/70 group-hover:text-[#123859]"
                                                                        }`}>
                                                                        {link.label}
                                                                    </span>

                                                                    {linkActive && (
                                                                        <motion.div
                                                                            layoutId="subActive"
                                                                            className="ml-auto w-1.5 h-1.5 rounded-full bg-[#F9941F]"
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

                {/* Logout com animação */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="p-3 border-t border-gray-100"
                >
                    <Link href="/logout">
                        <motion.div
                            whileHover={{ scale: 1.02, backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                            whileTap={{ scale: 0.98 }}
                            className="group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 cursor-pointer"
                        >
                            <motion.div
                                whileHover={{ rotate: 360 }}
                                transition={{ duration: 0.5 }}
                            >
                                <LogOut
                                    size={20}
                                    className="text-red-500 group-hover:text-[#F9941F] transition-colors"
                                />
                            </motion.div>

                            <AnimatePresence>
                                {sidebarOpen && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="text-sm font-medium text-[#123859] group-hover:text-[#F9941F] whitespace-nowrap"
                                    >
                                        Sair do Sistema
                                    </motion.span>
                                )}
                            </AnimatePresence>

                            {/* Tooltip quando fechado */}
                            {!sidebarOpen && (
                                <motion.div
                                    initial={{ opacity: 0, x: 10, scale: 0.8 }}
                                    whileHover={{ opacity: 1, x: 0, scale: 1 }}
                                    className="absolute left-full ml-2 px-3 py-1 bg-[#F9941F] text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none"
                                >
                                    Sair
                                </motion.div>
                            )}
                        </motion.div>
                    </Link>
                </motion.div>
            </motion.aside>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header melhorado */}
                <motion.header
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="h-16 bg-white border-b px-6 flex items-center justify-between shadow-sm"
                >
                    {/* Breadcrumb / Título */}
                    <div className="flex items-center gap-4">
                        <motion.h1
                            key={pathname}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-lg font-bold text-[#123859]"
                        >
                            {menuItems.find(item => isParentActive(item))?.label || "Dashboard"}
                        </motion.h1>
                    </div>

                    {/* Ações do header */}
                    <div className="flex items-center gap-4">

                        {/* Notificações */}
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <Bell size={20} className="text-[#123859]" />
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-1 right-1 w-2 h-2 bg-[#F9941F] rounded-full"
                            />
                        </motion.button>

                        {/* Perfil do usuário */}
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="flex items-center gap-3 pl-4 border-l border-gray-200 cursor-pointer"
                        >
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-[#123859]">{userName}</p>
                                <p className="text-xs text-gray-500">Administrador</p>
                            </div>
                            <motion.div
                                whileHover={{ rotate: 360 }}
                                transition={{ duration: 0.5 }}
                                className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F9941F] to-[#123859] text-white flex items-center justify-center text-sm font-bold shadow-lg"
                            >
                                {userName[0]}
                            </motion.div>
                        </motion.div>
                    </div>
                </motion.header>

                {/* Conteúdo principal com animação */}
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

            {/* Overlay para mobile quando sidebar aberta */}
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
        </div>
    );
}