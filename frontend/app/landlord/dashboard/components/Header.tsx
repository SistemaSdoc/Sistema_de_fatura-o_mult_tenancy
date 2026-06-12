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

    return (
        <header 
            className="sticky top-0 z-10 shadow-lg transition-all duration-300"
            style={{ 
                backgroundColor: colors.card,
                borderBottom: `1px solid ${colors.border}`
            }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                {/* Logo e Título */}
                <div 
                    className="flex items-center gap-3 group" 
                
                >
                    {/* Logo com tag img normal */}
                    <img 
                        src="/images/3.png"
                        alt="FaturaJa Logo"
                        className="w-10 h-10 rounded-lg object-contain transition-all duration-300 hover:scale-110"
                    />
                    <div>
                        <h1 
                            className="text-xl font-bold transition-colors duration-200"
                            style={{ color: colors.text }}
                        >
                            FaturaJa – Gestão de Empresas
                        </h1>
                        <p className="text-sm" style={{ color: colors.textSecondary }}>
                            Bem‑vindo,{' '}
                            <span 
                                className="font-medium transition-colors duration-200"
                                style={{ color: colors.primary }}
                            >
                                {user?.name?.split(' ')[0] || 'Super Admin'}
                            </span>
                        </p>
                    </div>
                </div>


                {/* Ações do Header */}
                <div className="flex items-center gap-2">
                     <div className="flex items-center gap-2">
            <div className="text-right">
                <p className="text-sm font-medium" style={{ color: colors.text }}>
                    {user?.name || 'Super Admin'}
                </p>
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                    super_admin@faturaja.com
                </p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" style={{ 
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` 
            }}>
                {user?.name?.charAt(0) || 'A'}
            </div>
        </div>
                    {/* Botão de Toggle Tema */}
                    <button
                        onClick={toggleTheme}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105 cursor-pointer"
                        style={{ 
                            backgroundColor: `${colors.hover}`,
                            color: colors.textSecondary
                        }}
                        title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
                    >
                        {theme === 'light' ? (
                            <>
                                <Moon size={18} />
                                <span className="text-sm font-medium hidden sm:inline">Escuro</span>
                            </>
                        ) : (
                            <>
                                <Sun size={18} />
                                <span className="text-sm font-medium hidden sm:inline">Claro</span>
                            </>
                        )}
                    </button>

                    {/* Botão Logout */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 font-medium shadow-sm cursor-pointer"
                        style={{ 
                            backgroundColor: `${colors.danger}15`,
                            color: colors.danger,
                            border: `1px solid ${colors.danger}30`
                        }}
                    >
                        <LogOut size={18} />
                        <span className="hidden sm:inline">Sair</span>
                    </button>
                </div>
            </div>
        </header>
    );
}