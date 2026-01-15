"use client";

import React, { ReactNode, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    Menu,
    Home,
    Building2,
    Users,
    BarChart2,
    Settings,
    LogOut,
    ChevronDown,
    Layers,
} from "lucide-react";

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

interface MainAdminProps {
    children: ReactNode;
    adminName?: string;
    adminAvatar?: string;
    systemName?: string;
}

export default function MainAdmin({
    children,
    adminName = "Super Admin",
    systemName = "FacturaJá - Admin",
}: MainAdminProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState<{ [key: string]: boolean }>({});
    const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const toggleDropdown = (label: string) =>
        setDropdownOpen((prev) => ({ ...prev, [label]: !prev[label] }));
    const toggleAdminDropdown = () => setAdminDropdownOpen((prev) => !prev);

    const menuItems: MenuItem[] = [
        { label: "Dashboard", icon: Home, path: "/admin/dashboard", links: [] },

        {
            label: "Empresas",
            icon: Building2,
            path: "/admin/empresas",
            links: [
                { label: "Nova Empresa", path: "/Dashboard_Admin/register", icon: Building2 },
                { label: "Todas Empresas", path: "/Dashboard_Admin/All_empresas", icon: Layers },
            ],
        },
        {
            label: "Usuários",
            icon: Users,
            path: "/admin/usuarios",
            links: [
                { label: "Todos Usuários", path: "/Dashboard_Admin/All_usuarios", icon: Users },
            ],
        },
        {
            label: "Configurações",
            icon: Settings,
            path: "/Dashboard_Admin/Configuracoes",
            links: [],
        },
    ];

    return (
        <div className="flex h-screen bg-gray-100">

            {/* SIDEBAR */}
            <aside
                className={`bg-[#123859] text-[#F9941F] transition-all duration-500 ${
                    sidebarOpen ? "w-64" : "w-20"
                } flex flex-col relative`}
            >
                {/* Toggle */}
                <button
                    onClick={toggleSidebar}
                    className="absolute top-4 right-[-12px] bg-[#F9941F] text-[#123859] p-1 rounded-full shadow-lg z-20"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Logo / Nome */}
                <div className="flex items-center justify-center h-20 border-b border-[#F9941F]">
                    {sidebarOpen && (
                        <span className="font-bold text-lg">{systemName}</span>
                    )}
                </div>

                {/* MENU */}
                <nav className="flex-1 mt-4">
                    {menuItems.map((item) => (
                        <div key={item.label}>
                            {item.links.length === 0 ? (
                                <Link href={item.path}>
                                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#0f2b4c] cursor-pointer">
                                        <item.icon className="w-5 h-5" />
                                        {sidebarOpen && item.label}
                                    </div>
                                </Link>
                            ) : (
                                <>
                                    <div
                                        onClick={() => toggleDropdown(item.label)}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-[#0f2b4c] cursor-pointer"
                                    >
                                        <item.icon className="w-5 h-5" />
                                        {sidebarOpen && item.label}
                                        {sidebarOpen && (
                                            <ChevronDown
                                                className={`ml-auto transition-transform ${
                                                    dropdownOpen[item.label] ? "rotate-180" : ""
                                                }`}
                                            />
                                        )}
                                    </div>

                                    <AnimatePresence>
                                        {dropdownOpen[item.label] && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="ml-8"
                                            >
                                                {item.links.map((link) => (
                                                    <Link key={link.path} href={link.path}>
                                                        <div className="px-4 py-2 hover:bg-[#0f2b4c] cursor-pointer text-sm">
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

                {/* LOGOUT */}
                <Link href="/logout">
                    <div className="flex items-center gap-2 px-4 py-3 m-4 rounded hover:bg-[#F9941F] hover:text-[#123859] cursor-pointer font-semibold">
                        <LogOut className="w-5 h-5" />
                        {sidebarOpen && "Logout"}
                    </div>
                </Link>
            </aside>

            {/* CONTEÚDO */}
            <div className="flex-1 flex flex-col">
                <header className="h-16 bg-white shadow flex justify-between items-center px-6">
                    <h1 className="font-bold text-[#123859]">{systemName}</h1>

                    <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={toggleAdminDropdown}
                    >
                        <span className="font-medium">{adminName}</span>
                        <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center">
                            {adminName[0]}
                        </div>

                        <AnimatePresence>
                            {adminDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 5 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute right-6 top-14 bg-white shadow rounded w-40"
                                >
                                    <Link href="/logout">
                                        <div className="px-4 py-2 hover:bg-[#F9941F] hover:text-[#123859] cursor-pointer">
                                            Logout
                                        </div>
                                    </Link>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </header>

                <main className="flex-1 p-6 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
