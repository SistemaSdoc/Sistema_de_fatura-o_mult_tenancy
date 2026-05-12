'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLandlordAuth } from '@/context/LandlordAuthContext';
import { api } from '@/services/axios';
import { useThemeColors } from '@/context/ThemeContext';
import { Building2, Plus, AlertCircle, CheckCircle, XCircle, RefreshCw, Database, Calendar } from 'lucide-react';

interface Empresa {
    id: string;
    nome: string;
    nif: string;
    email: string;
    status: 'ativo' | 'suspenso';
    db_name: string;
    data_registro: string;
    regime_fiscal: string;
}

export default function EmpresasDashboard() {
    const { user, loading: authLoading } = useLandlordAuth();
    const router = useRouter();
    const colors = useThemeColors(); // contexto de tema (opcional, usa cores padrão se não existir)
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Redirecionar se não for super admin
    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'super_admin')) {
            router.push('/landlord/login');
        }
    }, [user, authLoading, router]);

    const fetchEmpresas = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/landlord/empresas');
            setEmpresas(response.data.data);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao carregar a lista de empresas');
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: string) => {
        setActionLoading(id);
        try {
            await api.patch(`/api/landlord/empresas/${id}/toggle-status`);
            await fetchEmpresas(); // recarrega a lista
        } catch (err: any) {
            alert(err.response?.data?.message || 'Erro ao alterar status da empresa');
        } finally {
            setActionLoading(null);
        }
    };

    useEffect(() => {
        if (user) fetchEmpresas();
    }, [user]);

    // Cálculos para os cards
    const totalEmpresas = empresas.length;
    const ativas = empresas.filter(e => e.status === 'ativo').length;
    const suspensas = empresas.filter(e => e.status === 'suspenso').length;

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors?.background || '#f9fafb' }}>
                <div className="text-center">
                    <RefreshCw className="animate-spin w-10 h-10 mx-auto mb-4" style={{ color: colors?.primary || '#3b82f6' }} />
                    <p className="text-gray-600">A carregar empresas...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8" style={{ backgroundColor: colors?.background || '#f9fafb' }}>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-center gap-3">
                    <AlertCircle className="text-red-500" size={24} />
                    <div>
                        <p className="font-semibold text-red-700">Erro ao carregar empresas</p>
                        <p className="text-red-600">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: colors?.background || '#f9fafb' }}>
            {/* Cabeçalho com saudação e branding */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2" style={{ color: colors?.text || '#1f2937' }}>
                    Bem‑vindo, {user?.name?.split(' ')[0] || 'Super Admin'} 
                </h1>
                <p className="text-gray-500">
                    Gerir todas as empresas (tenants) do <strong className="font-semibold">FaturaJa</strong>. 
                    Aqui podes criar, activar ou suspender contas de empresas.
                </p>
            </div>

            {/* Cards de resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Total de Empresas</p>
                            <p className="text-3xl font-bold text-gray-800">{totalEmpresas}</p>
                        </div>
                        <Building2 size={40} className="text-blue-500 opacity-70" />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-600 text-sm">Activas</p>
                            <p className="text-3xl font-bold text-green-700">{ativas}</p>
                        </div>
                        <CheckCircle size={40} className="text-green-500" />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-red-500 text-sm">Suspensas</p>
                            <p className="text-3xl font-bold text-red-700">{suspensas}</p>
                        </div>
                        <XCircle size={40} className="text-red-400" />
                    </div>
                </div>
            </div>

            {/* Título da tabela e botão de nova empresa */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-semibold" style={{ color: colors?.text || '#1f2937' }}>
                        Lista de Empresas
                    </h2>
                    <p className="text-sm text-gray-500">Clique em “Suspender” para bloquear o acesso da empresa ao sistema.</p>
                </div>
                <button
                    onClick={() => router.push('/landlord/dashboard/empresas/criar')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition shadow-sm"
                >
                    <Plus size={18} />
                    Nova Empresa
                </button>
            </div>

            {/* Tabela de empresas */}
            {empresas.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                    <Database size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg">Nenhuma empresa registada ainda.</p>
                    <button
                        onClick={() => router.push('/dashboard/empresas/criar')}
                        className="mt-4 text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-1"
                    >
                        <Plus size={16} />
                        Criar a primeira empresa
                    </button>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NIF</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regime Fiscal</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Dados</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acções</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {empresas.map((emp) => (
                                <tr key={emp.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Building2 size={16} className="text-gray-400" />
                                            <span className="font-medium text-gray-900">{emp.nome}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{emp.nif}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{emp.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="capitalize text-sm bg-gray-100 px-2 py-1 rounded-full">
                                            {emp.regime_fiscal}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm font-mono">{emp.db_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm flex items-center gap-1">
                                        <Calendar size={14} />
                                        {new Date(emp.data_registro).toLocaleDateString('pt-PT')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            emp.status === 'ativo' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {emp.status === 'ativo' ? 'Activa' : 'Suspensa'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => toggleStatus(emp.id, emp.status)}
                                            disabled={actionLoading === emp.id}
                                            className={`px-3 py-1.5 rounded-md text-white text-sm font-medium transition-all ${
                                                emp.status === 'ativo'
                                                    ? 'bg-yellow-500 hover:bg-yellow-600'
                                                    : 'bg-green-500 hover:bg-green-600'
                                            } disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1`}
                                        >
                                            {actionLoading === emp.id ? (
                                                <RefreshCw size={14} className="animate-spin" />
                                            ) : (
                                                emp.status === 'ativo' ? 'Suspender' : 'Activar'
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Rodapé com marca SDOCA */}
            <div className="mt-8 text-center text-sm text-gray-400 border-t pt-6">
                <p>© {new Date().getFullYear()} <span className="font-medium">SDOCA</span> – Sistema FaturaJa • Gestão multi‑tenant</p>
            </div>
        </div>
    );
}