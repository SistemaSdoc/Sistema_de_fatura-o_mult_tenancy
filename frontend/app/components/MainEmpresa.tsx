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
    Truck
} from "lucide-react";
import { label } from "framer-motion/client";

interface DropdownLink {
    label: string;
    path: string;
    icon?: any;
}

interface MenuItem {
    label: string;
    icon: any;
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

export default function MainEmpresa({
    children,
    userName = "Admin",
    userAvatar,
    companyLogo,
    companyName = "Minha Empresa",
}: MainEmpresaProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState<{ [key: string]: boolean }>({});
    const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const toggleDropdown = (label: string) =>
        setDropdownOpen((prev) => ({ ...prev, [label]: !prev[label] }));
    const toggleAdminDropdown = () => setAdminDropdownOpen((prev) => !prev);

    const menuItems: MenuItem[] = [
        { label: "Dashboard", icon: Home, path: "/dashboard", links: [] },
        {
            label: "Vendas",
            icon: ShoppingCart,
            path: "/vendas",
            links: [
                { label: "Nova venda", path: "/dashboard/Vendas/Nova_venda", icon: ShoppingCart },
                { label: "Relatórios de vendas", path: "/dashboard/Vendas/relatorios", icon: BarChart2 },
            ],
        },
        {
            label: "Faturas",
            icon: FileText,
            path: "/faturas",
            links: [
                { label: "Faturas", path: "dashboard/Faturas/Faturas", icon: FileText },
                { label: "Relatórios de faturas", path: "/dashboard/Faturas/relatorios", icon: BarChart2 },
            ],
        },
        {
            label: "Clientes",
            icon: Users,
            path: "/clientes",
            links: [
                { label: "Novo cliente", path: "dashboard/Clientes/Novo_cliente", icon: Users },
                { label: "Total de clientes", path: "dashboard/Clientes/Total_clientes", icon: Users },
            ],
        },
        {
            label: "Produtos ou Serviços",
            icon: Archive,
            path: "/Produtos_servicos",
            links: [
                { label: "Novo produto/serviço", path: "dashboard/Produtos_servicos/Novo_produto_servico", icon: Package },
                { label: "Stock", path: "dashboard/Produtos_servicos/Stock", icon: Package },
            ],
        },

        {
            label: "Fornecedores",
            icon: Truck,
            path: "/fornecedores",
            links: [
                { label: "Novo fornecedor", path: "dashboard/Fornecedores/Novo_fornecedor", icon: Truck },
                { label: "Total de fornecedores", path: "dashboard/Fornecedores/Total_fornecedores", icon: Briefcase },
            ],
        },
        {
            label: "Relatórios",
            icon: BarChart2,
            path: "/relatorios",
            links: [
                { label: "Diário", path: "dashboard/relatorios/diario", icon: BarChart2 },
                { label: "Mensal", path: "dashboard/relatorios/mensal", icon: BarChart2 },
                { label: "Anual", path: "dashboard/relatorios/anual", icon: BarChart2 },
            ],
        },
        { label: "Configurações", icon: Menu, path: "/configuracoes", links: [] },
    ];

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside
                className={`bg-[#123859] text-[#F9941F] transition-all duration-500 ${sidebarOpen ? "w-64" : "w-20"
                    } flex flex-col relative`}
            >
                {/* Toggle sidebar button */}
                <button
                    onClick={toggleSidebar}
                    className="absolute top-4 right-[-12px] bg-[#F9941F] text-[#123859] p-1 rounded-full shadow-lg hover:bg-yellow-600 transition-all duration-300 z-20"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Logo da empresa */}
                <div className="flex flex-col items-center justify-center h-24 border-b border-[#F9941F] p-2">
                    {companyLogo && (
                        <motion.img
                            src={companyLogo}
                            alt="Logo Empresa"
                            className="object-cover rounded-full"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            style={{ width: sidebarOpen ? 64 : 40, height: sidebarOpen ? 64 : 40 }}
                        />
                    )}
                </div>

                {/* Menu */}
                <nav className="flex-1 mt-4">
                    {menuItems.map((item) => (
                        <div key={item.label} className="relative">
                            {item.links.length === 0 ? (
                                <Link href={item.path} className="block">
                                    <motion.div
                                        whileHover={{ scale: 1.03 }}
                                        className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-300 hover:bg-[#0f2b4c]"
                                    >
                                        <item.icon className="w-5 h-5 text-[#F9941F]" />
                                        {sidebarOpen && <span className="font-medium">{item.label}</span>}
                                    </motion.div>
                                </Link>
                            ) : (
                                <div>
                                    <motion.div
                                        whileHover={{ scale: 1.03 }}
                                        className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-300 hover:bg-[#0f2b4c]"
                                        onClick={() => toggleDropdown(item.label)}
                                    >
                                        <item.icon className="w-5 h-5 text-[#F9941F]" />
                                        {sidebarOpen && <span className="font-medium">{item.label}</span>}
                                        {sidebarOpen && (
                                            <ChevronDown
                                                className={`w-4 h-4 ml-auto transition-transform duration-300 ${dropdownOpen[item.label] ? "rotate-180" : ""
                                                    }`}
                                            />
                                        )}
                                    </motion.div>

                                    {/* Dropdown */}
                                    <AnimatePresence>
                                        {dropdownOpen[item.label] && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.3 }}
                                                className={`${sidebarOpen
                                                    ? "ml-8 mt-1 rounded-b-md"
                                                    : "absolute left-full top-0 bg-[#123859] min-w-[200px] shadow-lg rounded-md z-30"
                                                    }`}
                                            >
                                                {item.links.map((link) => (
                                                    <Link key={link.path} href={link.path}>
                                                        <motion.div
                                                            whileHover={{ scale: 1.05 }}
                                                            className="flex items-center gap-2 px-4 py-2 hover:bg-[#0f2b4c] cursor-pointer text-[#F9941F] transition-colors duration-200"
                                                        >
                                                            {link.icon && <link.icon className="w-4 h-4" />}
                                                            <span>{link.label}</span>
                                                        </motion.div>
                                                    </Link>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                {/* Logout no final do sidebar */}
                <Link href="/logout">
                    <motion.div
                        whileHover={{ scale: 1.05, backgroundColor: "#F9941F", color: "#123859" }}
                        className="flex items-center gap-2 font-semibold px-4 py-2 rounded cursor-pointer transition-all duration-200 m-4 mt-auto"
                    >
                        <LogOut className="w-5 h-5" /> {sidebarOpen && "Logout"}
                    </motion.div>
                </Link>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col">
                {/* Navbar */}
                <header className="h-16 bg-white shadow flex items-center justify-between px-6 border-b border-gray-200">
                    <div className="font-bold text-xl text-[#123859]">{companyName}</div>
                    <div className="flex items-center gap-4 relative">
                        <input
                            type="text"
                            placeholder="Pesquisar empresa..."
                            className="px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F9941F] transition-all duration-300"
                        />

                        {/* Admin */}
                        <div
                            className="flex items-center gap-2 cursor-pointer relative"
                            onClick={toggleAdminDropdown}
                        >
                            <span className="hidden md:block font-medium">{userName}</span>
                            <div className="w-10 h-10 rounded-full overflow-hidden">
                                {userAvatar ? (
                                    <img
                                        src={userAvatar}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="bg-gray-300 w-full h-full flex items-center justify-center text-white font-bold">
                                        {userName[0]}
                                    </span>
                                )}
                            </div>

                            {/* Dropdown Admin */}
                            <AnimatePresence>
                                {adminDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 5 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3 }}
                                        className="absolute right-0 mt-12 w-40 bg-white border border-gray-200 shadow-lg rounded-md z-30 overflow-hidden"
                                    >
                                        <Link href="/logout">
                                            <motion.div
                                                whileHover={{
                                                    scale: 1.05,
                                                    backgroundColor: "#F9941F",
                                                    color: "#123859",
                                                }}
                                                className="px-4 py-2 cursor-pointer font-semibold transition-all duration-200"
                                            >
                                                Logout
                                            </motion.div>
                                        </Link>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-6">{children}</main>
            </div>
        </div>
    );
}
