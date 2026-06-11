'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLandlordAuth } from '@/context/LandlordAuthContext';
import { api } from '@/services/axios';
<<<<<<< HEAD
import { useThemeColors } from '@/context/ThemeContext';
import { 
    Building2, Plus, AlertCircle, CheckCircle, XCircle, 
    RefreshCw, Database, Calendar, Search, Filter, 
    Eye, Power, Download, ChevronLeft, ChevronRight,
    Mail, Phone, MapPin, Globe, Hash
} from 'lucide-react';
import { toast } from 'sonner';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
=======
import { useThemeColors, useTheme } from "@/context/ThemeContext";
import { Building2, Plus, AlertCircle, CheckCircle, XCircle, RefreshCw, Database, Calendar } from 'lucide-react';
>>>>>>> c9f9505 (Fase tenant&0040)

interface Empresa {
    id: string;
    nome: string;
    nif: string;
    email: string;
    status: 'ativo' | 'suspenso';
    db_name: string;
    data_registro: string;
    regime_fiscal: string;
    telefone?: string;
    endereco?: string;
    subdomain?: string;
    logo?: string | null;
}

export default function EmpresasDashboard() {
    const { user, loading: authLoading } = useLandlordAuth();
    const router = useRouter();
    const colors = useThemeColors();
    
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [filteredEmpresas, setFilteredEmpresas] = useState<Empresa[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'suspenso'>('todos');
    const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
    const [showStatusDialog, setShowStatusDialog] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

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
            const data = response.data.data || response.data;
            setEmpresas(data);
            setFilteredEmpresas(data);
            setError('');
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || 'Erro ao carregar a lista de empresas';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: string) => {
        setActionLoading(id);
        try {
            const response = await api.patch(`/api/landlord/empresas/${id}/toggle-status`);
            
            toast.success(response.data.message || 'Status alterado com sucesso');
            
            if (response.data.redirect_to_login) {
                toast.warning('Empresa suspensa. Redirecionando para o login...');
                setTimeout(() => {
                    window.location.href = '/landlord/login';
                }, 1500);
            } else {
                await fetchEmpresas();
            }
            
            setShowStatusDialog(false);
            setSelectedEmpresa(null);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao alterar status da empresa');
        } finally {
            setActionLoading(null);
        }
    };

    const confirmStatusChange = (empresa: Empresa) => {
        setSelectedEmpresa(empresa);
        setShowStatusDialog(true);
    };

    useEffect(() => {
        if (user) fetchEmpresas();
    }, [user]);

    // Filtros e busca
    useEffect(() => {
        let filtered = [...empresas];
        
        if (searchTerm) {
            filtered = filtered.filter(emp => 
                emp.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.nif.includes(searchTerm) ||
                emp.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        if (statusFilter !== 'todos') {
            filtered = filtered.filter(emp => emp.status === statusFilter);
        }
        
        setFilteredEmpresas(filtered);
        setCurrentPage(1);
    }, [searchTerm, statusFilter, empresas]);

    // Paginação
    const totalPages = Math.ceil(filteredEmpresas.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedEmpresas = filteredEmpresas.slice(startIndex, startIndex + itemsPerPage);

    const totalEmpresas = empresas.length;
    const ativas = empresas.filter(e => e.status === 'ativo').length;
    const suspensas = empresas.filter(e => e.status === 'suspenso').length;

    const exportToCSV = () => {
        const headers = ['Nome', 'NIF', 'Email', 'Telefone', 'Status', 'Regime Fiscal', 'Data Registro'];
        const data = empresas.map(emp => [
            emp.nome,
            emp.nif,
            emp.email,
            emp.telefone || '',
            emp.status === 'ativo' ? 'Ativa' : 'Suspensa',
            emp.regime_fiscal,
            new Date(emp.data_registro).toLocaleDateString('pt-PT')
        ]);
        
        const csvContent = [headers, ...data].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `empresas_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Exportação concluída');
    };

    if (authLoading || loading) {
        return (
<<<<<<< HEAD
            <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.background }}>
                <div className="text-center">
                    <RefreshCw className="animate-spin w-10 h-10 mx-auto mb-4" style={{ color: colors.primary }} />
                    <p style={{ color: colors.textSecondary }}>A carregar empresas...</p>
=======
            <div className="flex items-center justify-center min-h-screen" style={{backgroundColor: colors.border  }}>
                <div className="text-center">
                    <RefreshCw className="animate-spin w-10 h-10 mx-auto mb-4" style={{ color: colors.background }} />
                    <p className="text-gray-600">A carregar empresas...</p>
>>>>>>> c9f9505 (Fase tenant&0040)
                </div>
            </div>
        );
    }

    if (error) {
        return (
<<<<<<< HEAD
            <div className="min-h-screen p-8" style={{ backgroundColor: colors.background }}>
                <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="text-red-500" size={24} />
                            <div className="flex-1">
                                <p className="font-semibold mb-1" style={{ color: colors.text }}>Erro ao carregar empresas</p>
                                <p className="text-sm" style={{ color: colors.textSecondary }}>{error}</p>
                            </div>
                            <Button 
                                onClick={fetchEmpresas} 
                                style={{ backgroundColor: colors.primary }}
                            >
                                Tentar novamente
                            </Button>
                        </div>
                    </CardContent>
                </Card>
=======
            <div className="p-8" style={{ backgroundColor: colors.danger }}>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-center gap-3">
                    <AlertCircle className="text-red-500" size={24} />
                    <div>
                        <p className="font-semibold text-red-700">Erro ao carregar empresas</p>
                        <p className="text-red-600">{error}</p>
                    </div>
                </div>
>>>>>>> c9f9505 (Fase tenant&0040)
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: colors.background }}>
<<<<<<< HEAD
            {/* Cabeçalho */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2" style={{ color: colors.text }}>
                    Bem‑vindo, {user?.name?.split(' ')[0] || 'Super Admin'}
                </h1>
                <p style={{ color: colors.textSecondary }}>
                    Gerir todas as empresas do sistema. Aqui podes criar, ativar ou suspender contas.
=======
            {/* Cabeçalho com saudação e branding */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2" style={{ color: colors.fp }}>
                    Bem‑vindo, {user?.name?.split(' ')[0] || 'Super Admin'} 
                </h1>
                <p className="text-gray-500" style={{ color: colors.textSecondary }}>
                    Gerir todas as empresas (tenants) do <strong className="font-semibold">FaturaJa</strong>. 
                    Aqui podes criar, activar ou suspender contas de empresas.
>>>>>>> c9f9505 (Fase tenant&0040)
                </p>
            </div>

            {/* Cards de resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
<<<<<<< HEAD
                <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>Total de Empresas</p>
                                <p className="text-3xl font-bold mt-1" style={{ color: colors.text }}>{totalEmpresas}</p>
                            </div>
                            <div className="p-3 rounded-full" style={{ backgroundColor: `${colors.primary}10` }}>
                                <Building2 size={24} style={{ color: colors.primary }} />
                            </div>
=======
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm" style={{ color: colors.secondary }}>Total de Empresas</p>
                            <p className="text-3xl font-bold text-gray-800" style={{ color: colors.secondary }}>{totalEmpresas}</p>
>>>>>>> c9f9505 (Fase tenant&0040)
                        </div>
                    </CardContent>
                </Card>

                <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>Ativas</p>
                                <p className="text-3xl font-bold mt-1" style={{ color: colors.success }}>{ativas}</p>
                            </div>
                            <div className="p-3 rounded-full" style={{ backgroundColor: `${colors.success}20` }}>
                                <CheckCircle size={24} style={{ color: colors.success }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>Suspensas</p>
                                <p className="text-3xl font-bold mt-1" style={{ color: colors.danger }}>{suspensas}</p>
                            </div>
                            <div className="p-3 rounded-full" style={{ backgroundColor: `${colors.danger}20` }}>
                                <XCircle size={24} style={{ color: colors.danger }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

<<<<<<< HEAD
            {/* Barra de ferramentas */}
            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }} className="mb-6">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="flex flex-1 gap-4">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={16} style={{ color: colors.textSecondary }} />
                                <Input
                                    placeholder="Buscar por nome, NIF ou email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                    style={{
                                        backgroundColor: colors.background,
                                        borderColor: colors.border,
                                        color: colors.text
                                    }}
                                />
                            </div>
                            
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="px-3 py-2 rounded-md text-sm border focus:outline-none focus:ring-2"
                                style={{
                                    backgroundColor: colors.background,
                                    borderColor: colors.border,
                                    color: colors.text,
                                    outline: 'none'
                                }}
                            >
                                <option value="todos">Todos os status</option>
                                <option value="ativo">Ativas</option>
                                <option value="suspenso">Suspensas</option>
                            </select>
                        </div>
                        
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={exportToCSV}
                                style={{ 
                                    borderColor: colors.border, 
                                    color: colors.text,
                                    backgroundColor: colors.card
                                }}
                            >
                                <Download size={16} className="mr-2" />
                                Exportar
                            </Button>
                            
                            <Button
                                onClick={() => router.push('/dashboard/empresas/criar')}
                                style={{ backgroundColor: colors.primary }}
                            >
                                <Plus size={16} className="mr-2" />
                                Nova Empresa
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabela de empresas */}
            {filteredEmpresas.length === 0 ? (
                <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <CardContent className="p-12 text-center">
                        <Database size={48} className="mx-auto mb-4" style={{ color: colors.textSecondary }} />
                        <p className="text-lg font-medium mb-1" style={{ color: colors.text }}>Nenhuma empresa encontrada</p>
                        <p style={{ color: colors.textSecondary }}>
                            {searchTerm || statusFilter !== 'todos' 
                                ? 'Tente ajustar os filtros de busca'
                                : 'Clique em "Nova Empresa" para criar a primeira empresa'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: colors.border }}>
                        <table className="min-w-full divide-y" style={{ borderColor: colors.border }}>
                            <thead style={{ backgroundColor: colors.hover }}>
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.textSecondary }}>Empresa</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.textSecondary }}>NIF</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.textSecondary }}>Contacto</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.textSecondary }}>Regime Fiscal</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.textSecondary }}>Base Dados</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.textSecondary }}>Registo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.textSecondary }}>Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.textSecondary }}>Acções</th>
=======
            {/* Título da tabela e botão de nova empresa */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-semibold" style={{ color: colors.hover }}>
                        Lista de Empresas
                    </h2>
                    <p className="text-sm text-gray-500" style={{ color: colors.textSecondary }}>
                        Clique em “Suspender” para bloquear o acesso da empresa ao sistema.
                    </p>
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
                        className="mt-4 text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-1" >
                        <Plus size={16} />
                        Criar a primeira empresa
                    </button>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white  shadow-sm border border-gray-100">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead style={{ backgroundColor: colors.fp }} >
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ color: colors.hover }}>Empresa</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ color: colors.hover }}>NIF</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ color: colors.hover }}>Contacto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ color: colors.hover }}>Regime Fiscal</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ color: colors.hover }}>Base Dados</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ color: colors.hover }}>Registo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ color: colors.hover }}>Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ color: colors.hover }}>Acções</th>
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
>>>>>>> c9f9505 (Fase tenant&0040)
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: colors.border }}>
                                {paginatedEmpresas.map((emp) => (
                                    <tr key={emp.id} className="transition-colors" style={{ backgroundColor: colors.card }}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {emp.logo ? (
                                                    <img src={emp.logo} alt={emp.nome} className="w-6 h-6 rounded object-contain" />
                                                ) : (
                                                    <Building2 size={16} style={{ color: colors.textSecondary }} />
                                                )}
                                                <span className="font-medium" style={{ color: colors.text }}>{emp.nome}</span>
                                            </div>
                                            {emp.subdomain && (
                                                <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                                                    <Globe size={10} className="inline mr-1" />
                                                    {emp.subdomain}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                <Hash size={12} style={{ color: colors.textSecondary }} />
                                                <span style={{ color: colors.text }}>{emp.nif}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1 text-sm" style={{ color: colors.text }}>
                                                    <Mail size={12} style={{ color: colors.textSecondary }} />
                                                    {emp.email}
                                                </div>
                                                {emp.telefone && (
                                                    <div className="flex items-center gap-1 text-xs" style={{ color: colors.textSecondary }}>
                                                        <Phone size={10} />
                                                        {emp.telefone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge variant="secondary" className="capitalize" style={{ backgroundColor: colors.hover, color: colors.text }}>
                                                {emp.regime_fiscal}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <code className="text-xs px-2 py-1 rounded" style={{ 
                                                backgroundColor: colors.hover, 
                                                color: colors.textSecondary 
                                            }}>
                                                {emp.db_name}
                                            </code>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1 text-sm" style={{ color: colors.textSecondary }}>
                                                <Calendar size={12} />
                                                {new Date(emp.data_registro).toLocaleDateString('pt-PT')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge className={emp.status === 'ativo' 
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                            }>
                                                {emp.status === 'ativo' ? 'Ativa' : 'Suspensa'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => router.push(`/dashboard/empresas/${emp.id}`)}
                                                    style={{ 
                                                        borderColor: colors.border, 
                                                        color: colors.text,
                                                        backgroundColor: colors.card
                                                    }}
                                                >
                                                    <Eye size={14} className="mr-1" />
                                                    Ver
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => confirmStatusChange(emp)}
                                                    style={{
                                                        backgroundColor: emp.status === 'ativo' ? colors.warning : colors.success,
                                                        color: 'white'
                                                    }}
                                                    disabled={actionLoading === emp.id}
                                                >
                                                    {actionLoading === emp.id ? (
                                                        <RefreshCw size={14} className="animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Power size={14} className="mr-1" />
                                                            {emp.status === 'ativo' ? 'Suspender' : 'Ativar'}
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginação */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-6">
                            <div className="text-sm" style={{ color: colors.textSecondary }}>
                                Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredEmpresas.length)} de {filteredEmpresas.length}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    style={{ 
                                        borderColor: colors.border, 
                                        color: colors.text,
                                        backgroundColor: colors.card
                                    }}
                                >
                                    <ChevronLeft size={14} />
                                    Anterior
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{ 
                                        borderColor: colors.border, 
                                        color: colors.text,
                                        backgroundColor: colors.card
                                    }}
                                >
                                    Próxima
                                    <ChevronRight size={14} />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Dialog de confirmação */}
            <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
                <DialogContent style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <DialogHeader>
                        <DialogTitle style={{ color: colors.text }}>
                            {selectedEmpresa?.status === 'ativo' ? 'Suspender Empresa' : 'Ativar Empresa'}
                        </DialogTitle>
                        <DialogDescription style={{ color: colors.textSecondary }}>
                            {selectedEmpresa?.status === 'ativo'
                                ? `Tem certeza que deseja suspender a empresa "${selectedEmpresa?.nome}"? Os utilizadores não poderão aceder ao sistema até ser reativada.`
                                : `Tem certeza que deseja ativar a empresa "${selectedEmpresa?.nome}"? Todas as funcionalidades serão restauradas imediatamente.`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowStatusDialog(false)}
                            style={{ borderColor: colors.border, color: colors.text }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => selectedEmpresa && toggleStatus(selectedEmpresa.id, selectedEmpresa.status)}
                            style={{
                                backgroundColor: selectedEmpresa?.status === 'ativo' ? colors.warning : colors.success,
                                color: 'white'
                            }}
                        >
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}