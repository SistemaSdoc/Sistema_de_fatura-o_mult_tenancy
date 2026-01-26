"use client";

import React, { ReactNode, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    Menu,
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
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import Image from "next/image";

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
    userAvatar?: string;
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
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState<Record<string, boolean>>({});
    const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    const toggleDropdown = (label: string) => {
        setDropdownOpen((prev) => ({
            ...prev,
            [label]: !prev[label],
        }));
    };

    /* ===================== MENU ===================== */
    const menuItems: MenuItem[] = [
        { label: "Dashboard", icon: Home, path: "/dashboard", links: [] },
        {
            label: "Vendas",
            icon: ShoppingCart,
            path: "/dashboard/Vendas/relatorios",
            links: [
                { label: "Nova venda", path: "/dashboard/Vendas/Nova_venda", icon: ShoppingCart },
            ],
        },
        {
            label: "Faturas",
            icon: FileText,
            path: "/dashboard/Faturas/Faturas",
            links: [
                { label: "Relatório das faturas", path: "/dashboard/Faturas/relatorios", icon: BarChart2 },
            ],
        },
        {
            label: "Clientes",
            icon: Users,
            path: "/dashboard/Clientes/Total_clientes",
            links: [
                { label: "Novo cliente", path: "/dashboard/Clientes/Novo_cliente", icon: Users },
            ],
        },
        {
            label: "Produtos / Serviços",
            icon: Archive,
            path: "/dashboard/Produtos_servicos/Stock",
            links: [
                {
                    label: "Novo produto / serviço",
                    path: "/dashboard/Produtos_servicos/Novo_produto_servico",
                    icon: Package,
                },
            ],
        },
        {
            label: "Fornecedores",
            icon: Truck,
            path: "/dashboard/Fornecedores/Total_fornecedores",
            links: [
                { label: "Novo fornecedor", path: "/dashboard/Fornecedores/Novo_fornecedor", icon: Truck },
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
        { label: "Configurações", icon: Menu, path: "/dashboard/configuracoes", links: [] },
    ];

    /* ===================== JSX ===================== */
    return (
        <div className="flex h-screen bg-gray-100">
            {/* SIDEBAR */}
            <aside
                className={`bg-white text-[#F9941F] transition-all duration-300 ${sidebarOpen ? "w-64" : "w-20"
                    } flex flex-col relative`}
            >
                {/* Toggle */}
                <button
                    onClick={toggleSidebar}
                    className="absolute top-4 -right-3 bg-white text-[#123859] p-1 rounded-full shadow z-20 hover:bg-[#F9941F]"
                >
                    <Menu size={18} />
                </button>

                {/* Logo */}
                <div className="h-20 flex items-center justify-center border-b border-[#F9941F]/40">
                    {companyLogo ? (
                        <Image
                            src={companyLogo}
                            alt="Logo"
                            width={sidebarOpen ? 56 : 36}
                            height={sidebarOpen ? 56 : 36}
                            className="rounded-full"
                        />
                    ) : (
                        <span className="font-bold text-lg">
                            {sidebarOpen ? companyName : companyName.charAt(0)}
                        </span>
                    )}
                </div>

                {/* Menu */}
                <nav className="flex-1 mt-4">
                    {menuItems.map((item) => (
                        <div key={item.label}>
                            {item.links.length === 0 ? (
                                <Link href={item.path}>
                                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#0f2b4c] cursor-pointer">
                                        <item.icon size={20} />
                                        {sidebarOpen && <span>{item.label}</span>}
                                    </div>
                                </Link>
                            ) : (
                                <>
                                    {/* ITEM PRINCIPAL */}
                                    <div className="flex items-center px-4 py-3 hover:bg-[#0f2b4c]">
                                        <Link
                                            href={item.path}
                                            className="flex items-center gap-3 flex-1"
                                        >
                                            <item.icon size={20} />
                                            {sidebarOpen && <span>{item.label}</span>}
                                        </Link>

                                        {/* BOTÃO DROPDOWN */}
                                        {sidebarOpen && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleDropdown(item.label);
                                                }}
                                                className="p-1 hover:bg-[#123859] rounded"
                                            >
                                                <ChevronDown
                                                    size={16}
                                                    className={`transition ${dropdownOpen[item.label] ? "rotate-180" : ""
                                                        }`}
                                                />
                                            </button>
                                        )}
                                    </div>

                                    {/* SUBMENU */}
                                    <AnimatePresence>
                                        {dropdownOpen[item.label] && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="ml-8"
                                            >
                                                {item.links.map((link) => (
                                                    <Link key={link.path} href={link.path}>
                                                        <div className="px-4 py-2 hover:bg-[#0f2b4c] text-sm flex gap-2">
                                                            {link.icon && <link.icon size={14} />}
                                                            {link.label}
                                                        </div>
                                                    </Link>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </>
                            )}
                        </div>
                    ))}
                </nav>

                {/* Logout */}
                <Link href="/logout">
                    <div className="px-4 py-3 m-4 flex gap-2 hover:bg-[#F9941F] hover:text-[#123859] rounded">
                        <LogOut size={18} />
                        {sidebarOpen && "Logout"}
                    </div>
                </Link>
            </aside>

            {/* MAIN */}
            <div className="flex-1 flex flex-col">
                <header className="h-16 bg-white shadow px-6 flex items-center justify-between">
                    <h1 className="font-bold text-[#123859]">{companyName}</h1>
                    <div className="flex items-center gap-3 cursor-pointer">
                        <span>{userName}</span>
                        <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center">
                            {userName[0]}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-6">{children}</main>
            </div>
        </div>
    );
}
