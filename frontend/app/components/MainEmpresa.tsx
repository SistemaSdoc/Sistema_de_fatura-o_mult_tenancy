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
    Briefcase,
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
        {
            label: "Dashboard",
            icon: Home,
            path: "/dashboard",
            links: [],
        },
        {
            label: "Vendas",
            icon: ShoppingCart,
            path: "/dashboard/Vendas",
            links: [
                {
                    label: "Nova venda",
                    path: "/dashboard/Vendas/Nova_venda",
                    icon: ShoppingCart,
                },
                {
                    label: "Relatórios de vendas",
                    path: "/dashboard/Vendas/relatorios",
                    icon: BarChart2,
                },
            ],
        },
        {
            label: "Faturas",
            icon: FileText,
            path: "/dashboard/Faturas",
            links: [
                {
                    label: "Faturas",
                    path: "/dashboard/Faturas/Faturas",
                    icon: FileText,
                },
                {
                    label: "Relatórios de faturas",
                    path: "/dashboard/Faturas/relatorios",
                    icon: BarChart2,
                },
            ],
        },
        {
            label: "Clientes",
            icon: Users,
            path: "/dashboard/Clientes",
            links: [
                {
                    label: "Novo cliente",
                    path: "/dashboard/Clientes/Novo_cliente",
                    icon: Users,
                },
                {
                    label: "Total de clientes",
                    path: "/dashboard/Clientes/Total_clientes",
                    icon: Users,
                },
            ],
        },
        {
            label: "Produtos / Serviços",
            icon: Archive,
            path: "/dashboard/Produtos_servicos",
            links: [
                {
                    label: "Novo produto / serviço",
                    path: "/dashboard/Produtos_servicos/Novo_produto_servico",
                    icon: Package,
                },
                {
                    label: "Stock",
                    path: "/dashboard/Produtos_servicos/Stock",
                    icon: Package,
                },
            ],
        },
        {
            label: "Fornecedores",
            icon: Truck,
            path: "/dashboard/Fornecedores",
            links: [
                {
                    label: "Novo fornecedor",
                    path: "/dashboard/Fornecedores/Novo_fornecedor",
                    icon: Truck,
                },
                {
                    label: "Total de fornecedores",
                    path: "/dashboard/Fornecedores/Total_fornecedores",
                    icon: Briefcase,
                },
            ],
        },
        {
            label: "Relatórios",
            icon: BarChart2,
            path: "/dashboard/relatorios",
            links: [
                {
                    label: "Diário",
                    path: "/dashboard/relatorios/diario",
                    icon: BarChart2,
                },
                {
                    label: "Mensal",
                    path: "/dashboard/relatorios/mensal",
                    icon: BarChart2,
                },
                {
                    label: "Anual",
                    path: "/dashboard/relatorios/anual",
                    icon: BarChart2,
                },
            ],
        },
        {
            label: "Configurações",
            icon: Menu,
            path: "/dashboard/configuracoes",
            links: [],
        },
    ];

    /* ===================== JSX ===================== */
    return (
        <div className="flex h-screen bg-gray-100">
            {/* SIDEBAR */}
            <aside
                className={`bg-[#123859] text-[#F9941F] transition-all duration-300 ${sidebarOpen ? "w-64" : "w-20"
                    } flex flex-col relative`}
            >
                {/* Toggle */}
                <button
                    type="button"
                    onClick={toggleSidebar}
                    aria-label="Abrir / Fechar menu lateral"
                    className="absolute top-4 -right-3 bg-[#F9941F] text-[#123859] p-1 rounded-full shadow z-20 hover:bg-[#e68918] transition"
                >
                    <Menu size={18} />
                </button>


                {/* Logo */}
                <div className="h-20 flex items-center justify-center border-b border-[#F9941F]/40">
                    {companyLogo ? (
                        <Image
                            src={companyLogo}
                            alt="Logo da Empresa"
                            width={sidebarOpen ? 56 : 36}
                            height={sidebarOpen ? 56 : 36}
                            className="rounded-full object-cover transition-all duration-300"
                            priority
                        />
                    ) : (
                        <span className="font-bold text-lg text-[#F9941F]">
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
                                    <div
                                        onClick={() => toggleDropdown(item.label)}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-[#0f2b4c] cursor-pointer"
                                    >
                                        <item.icon size={20} />
                                        {sidebarOpen && <span>{item.label}</span>}
                                        {sidebarOpen && (
                                            <ChevronDown
                                                size={16}
                                                className={`ml-auto transition ${dropdownOpen[item.label]
                                                    ? "rotate-180"
                                                    : ""
                                                    }`}
                                            />
                                        )}
                                    </div>

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
                                                        <div className="px-4 py-2 hover:bg-[#0f2b4c] text-sm cursor-pointer flex gap-2">
                                                            {link.icon && (
                                                                <link.icon size={14} />
                                                            )}
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
                    <div className="px-4 py-3 m-4 flex gap-2 hover:bg-[#F9941F] hover:text-[#123859] rounded cursor-pointer">
                        <LogOut size={18} />
                        {sidebarOpen && "Logout"}
                    </div>
                </Link>
            </aside>

            {/* MAIN */}
            <div className="flex-1 flex flex-col">
                <header className="h-16 bg-white shadow px-6 flex items-center justify-between">
                    <h1 className="font-bold text-[#123859]">{companyName}</h1>

                    <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                    >
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
