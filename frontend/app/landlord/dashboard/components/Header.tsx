'use client';

import { useLandlordAuth } from '@/context/LandlordAuthContext';
import { useRouter } from 'next/navigation';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useTheme, useThemeColors } from '@/context/ThemeContext';

export default function DashboardHeader() {
    const { user, logout } = useLandlordAuth();
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const colors = useThemeColors();

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/landlord/login');
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    };

    const initial = (user?.name?.charAt(0) || 'A').toUpperCase();

    return (
        <header
            className="sticky top-0 z-20 backdrop-blur-md transition-colors duration-300"
            style={{
                backgroundColor: `${colors.card}E6`,
                borderBottom: `1px solid ${colors.border}`,
            }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
                {/* Logo e Título */}
                <div className="flex items-center gap-3 min-w-0">
                    <img
                        src="/images/3.png"
                        alt="FaturaJa Logo"
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-contain shrink-0 transition-transform duration-300 hover:scale-110"
                    />
                    <div className="min-w-0 leading-tight">
                        <h1
                            className="text-base sm:text-xl font-bold truncate"
                            style={{ color: colors.text }}
                        >
                            FaturaJá <span className="hidden sm:inline">– Gestão de Empresas</span>
                        </h1>
                        <p className="text-xs sm:text-sm hidden sm:block truncate" style={{ color: colors.textSecondary }}>
                            Bem‑vindo,{' '}
                            <span className="font-medium" style={{ color: colors.primary }}>
                                Super Admin
                            </span>
                        </p>
                    </div>
                </div>

                {/* Ações do Header */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {/* Perfil completo (desktop) */}
                    <div
                        className="hidden md:flex items-center gap-3 pr-3 mr-1 border-r"
                        style={{ borderColor: colors.border }}
                    >
                        <div className="text-right leading-tight">
                            <p className="text-sm font-medium" style={{ color: colors.text }}>
                                {user?.name || 'Super Admin'}
                            </p>
                            <p className="text-xs" style={{ color: colors.textSecondary }}>
                                {user?.email || 'super_admin@faturaja.com'}
                            </p>
                        </div>
                        <div
                            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-sm"
                            style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
                        >
                            {initial}
                        </div>
                    </div>

                    {/* Avatar (mobile) */}
                    <div
                        className="md:hidden w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
                        title={user?.name || 'Super Admin'}
                    >
                        {initial}
                    </div>

                    {/* Botão de Toggle Tema */}
                    <button
                        onClick={toggleTheme}
                        className="flex items-center justify-center w-9 h-9 sm:w-auto sm:px-3 sm:py-2 transition-all duration-200 hover:scale-105 cursor-pointer gap-2"
                        style={{
                            color: colors.textSecondary,
                        }}
                        title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
                    >
                        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                    </button>

                    {/* Botão Logout */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center w-9 h-9 sm:w-auto sm:px-4 sm:py-2 rounded-lg transition-all duration-200 hover:scale-105 font-medium shadow-sm cursor-pointer gap-2"
                        style={{
                            backgroundColor: `${colors.danger}15`,
                            color: colors.danger,
                            border: `1px solid ${colors.danger}30`,
                        }}
                        title="Sair"
                    >
                        <LogOut size={18} />
                        <span className="hidden sm:inline">Sair</span>
                    </button>
                </div>
            </div>
        </header>
    );
}