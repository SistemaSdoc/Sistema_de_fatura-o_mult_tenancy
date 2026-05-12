'use client';

import { useLandlordAuth } from '@/context/LandlordAuthContext';
import { useRouter } from 'next/navigation';
import { LogOut, Building2, LayoutDashboard } from 'lucide-react';

export default function DashboardHeader() {
    const { user, logout } = useLandlordAuth();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/landlord/login');
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    };

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                    <Building2 className="text-blue-600" size={28} />
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">FaturaJa – Gestão de Empresas</h1>
                        <p className="text-sm text-gray-500">
                            Bem‑vindo, <span className="font-medium text-gray-700">{user?.name?.split(' ')[0] || 'Super Admin'}</span>
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition duration-200 font-medium"
                >
                    <LogOut size={18} />
                    Sair
                </button>
            </div>
        </header>
    );
}