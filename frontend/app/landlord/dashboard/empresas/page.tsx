'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLandlordAuth } from '@/context/LandlordAuthContext';
import { api } from '@/services/axios';
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

interface Empresa {
    id: string;
    nome: string;
    nif: string;
    email: string;
    status: 'ativo' | 'suspenso';
    db_name: string;
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
        const headers = ['Nome', 'NIF', 'Email', 'Telefone', 'Status', 'Regime Fiscal'];
        const data = empresas.map(emp => [
            emp.nome,
            emp.nif,
            emp.email,
            emp.telefone || '',
            emp.status === 'ativo' ? 'Ativa' : 'Suspensa',
            emp.regime_fiscal,
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
            <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.background }}>
                <div className="text-center">
                    <RefreshCw className="animate-spin w-10 h-10 mx-auto mb-4" style={{ color: colors.primary }} />
                    <p style={{ color: colors.textSecondary }}>A carregar empresas...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
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
                                style={{ backgroundColor: colors.primary, color: '#fff' }}
                            >
                                Tentar novamente
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: colors.background }}>
           <div className="mb-10">
    <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-4">
            <div 
                className="p-3 rounded-2xl transition-all duration-300 hover:scale-110 hover:rotate-6"
                style={{ 
                    background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)`,
                    boxShadow: `0 4px 15px ${colors.primary}20`
                }}
            >
                <Building2 size={32} style={{ color: colors.primary }} />
            </div>
            <div>
                <h1 className="text-4xl font-bold tracking-tight" style={{ color: colors.text }}>
                    Bem‑vindo,{' '}
                    <span 
                        className="bg-gradient-to-r bg-clip-text text-transparent"
                        style={{ 
                            backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text'
                        }}
                    >
                        {user?.name?.split(' ')[0] || 'Super Admin'}
                    </span>
                </h1>
                
            </div>
        </div>
        
        {/* Stats rápidos */}
        <div className="flex gap-3">
            <div className="text-right">
                <p className="text-2xl font-bold" style={{ color: colors.primary }}>24/7</p>
                <p className="text-xs" style={{ color: colors.textSecondary }}>Suporte</p>
            </div>
            <div className="w-px h-10" style={{ backgroundColor: colors.border }}></div>
            <div className="text-right">
                <p className="text-2xl font-bold" style={{ color: colors.success }}>99.9%</p>
                <p className="text-xs" style={{ color: colors.textSecondary }}>Uptime</p>
            </div>
        </div>
    </div>
    
    <p className="text-lg flex items-center gap-2" style={{ color: colors.textSecondary }}>
        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: colors.primary }}></span>
        Gerir todas as empresas do sistema. Aqui podes criar, ativar ou suspender contas.
        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: colors.primary }}></span>
    </p>
</div>
         {/* Cards de resumo - Versão sem conflitos */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div 
        className="relative rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer overflow-hidden"
        style={{ 
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
        }}
    >
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: colors.primary }} />
        <div className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>Total de Empresas</p>
                    <p className="text-3xl font-bold mt-1" style={{ color: colors.text }}>{totalEmpresas}</p>
                </div>
                <div className="p-3 rounded-full" style={{ backgroundColor: `${colors.primary}15` }}>
                    <Building2 size={24} style={{ color: colors.primary }} />
                </div>
            </div>
        </div>
    </div>

    <div 
        className="relative rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer overflow-hidden"
        style={{ 
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
        }}
    >
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: colors.success }} />
        <div className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>Ativas</p>
                    <p className="text-3xl font-bold mt-1" style={{ color: colors.success }}>{ativas}</p>
                </div>
                <div className="p-3 rounded-full" style={{ backgroundColor: `${colors.success}15` }}>
                    <CheckCircle size={24} style={{ color: colors.success }} />
                </div>
            </div>
        </div>
    </div>

    <div 
        className="relative rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer overflow-hidden"
        style={{ 
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
        }}
    >
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: colors.danger }} />
        <div className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>Suspensas</p>
                    <p className="text-3xl font-bold mt-1" style={{ color: colors.danger }}>{suspensas}</p>
                </div>
                <div className="p-3 rounded-full" style={{ backgroundColor: `${colors.danger}15` }}>
                    <XCircle size={24} style={{ color: colors.danger }} />
                </div>
            </div>
        </div>
    </div>
</div>

            {/* Barra de ferramentas */}
            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }} className="mb-6 shadow-lg">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="flex flex-1 gap-4">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={16} style={{ color: colors.textSecondary }} />
                                <Input
                                    placeholder="Buscar por nome, NIF ou email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 transition-all duration-200 focus:ring-2"
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
                                className="px-3 py-2 rounded-md text-sm border focus:outline-none focus:ring-2 transition-all duration-200"
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
                                className="transition-all duration-200 hover:scale-105 cursor-pointer"
                                style={{ 
                                    borderColor: colors.border, 
                                    color: colors.text,
                                    backgroundColor: colors.card
                                }}
                            >
                                <Download size={16} className="mr-2" />
                                Exportar
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabela de empresas */}
            {filteredEmpresas.length === 0 ? (
                <Card style={{ backgroundColor: colors.card, borderColor: colors.border }} className="shadow-lg">
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
                    <div className="overflow-x-auto rounded-xl border shadow-lg" style={{ borderColor: colors.border }}>
                        <table className="min-w-full divide-y" style={{ borderColor: colors.border }}>
                            <thead style={{ backgroundColor: colors.hover }}>
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>Empresa</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>NIF</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>Contacto</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>Regime Fiscal</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>Base Dados</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>Acções</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: colors.border }}>
                                {paginatedEmpresas.map((emp) => (
                                    <tr 
                                        key={emp.id} 
                                        className="transition-all duration-200 hover:bg-opacity-50"
                                        style={{ 
                                            backgroundColor: colors.card
                                        }}
                                        onClick={() => router.push(`/dashboard/empresas/${emp.id}`)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {emp.logo ? (
                                                    <img src={emp.logo} alt={emp.nome} className="w-6 h-6 rounded object-contain" />
                                                ) : (
                                                    <div className="p-1 rounded" style={{ backgroundColor: `${colors.primary}15` }}>
                                                        <Building2 size={14} style={{ color: colors.primary }} />
                                                    </div>
                                                )}
                                                <span className="font-semibold" style={{ color: colors.text }}>{emp.nome}</span>
                                            </div>
                                            {emp.subdomain && (
                                                <div className="text-xs mt-1 flex items-center gap-1" style={{ color: colors.textSecondary }}>
                                                    <Globe size={10} />
                                                    {emp.subdomain}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                <Hash size={12} style={{ color: colors.textSecondary }} />
                                                <span className="font-mono" style={{ color: colors.text }}>{emp.nif}</span>
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
                                            <Badge 
                                                variant="secondary" 
                                                className="capitalize font-medium"
                                                style={{ 
                                                    backgroundColor: `${colors.secondary}15`, 
                                                    color: colors.secondary,
                                                    border: `1px solid ${colors.secondary}30`
                                                }}
                                            >
                                                {emp.regime_fiscal}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <code className="text-xs px-2 py-1 rounded font-mono" style={{ 
                                                backgroundColor: colors.hover, 
                                                color: colors.textSecondary 
                                            }}>
                                                {emp.db_name}
                                            </code>
                                        </td>
                                        
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge 
                                                className={`font-medium px-3 py-1 ${
                                                    emp.status === 'ativo' 
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                }`}
                                            >
                                                {emp.status === 'ativo' ? 'Ativa' : 'Suspensa'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                              
                                                <Button
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        confirmStatusChange(emp);
                                                    }}
                                                    className="transition-all duration-200 hover:scale-105 cursor-pointer"
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
                                    className="transition-all duration-200 hover:scale-105 cursor-pointer"
                                    style={{ 
                                        borderColor: colors.border, 
                                        color: colors.text,
                                        backgroundColor: colors.card
                                    }}
                                >
                                    <ChevronLeft size={14} />
                                    Anterior
                                </Button>
                                <div className="flex gap-1 cursor-pointer">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        
                                        return (
                                            <Button
                                                key={pageNum}
                                                size="sm"
                                                variant={currentPage === pageNum ? "default" : "outline"}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className="transition-all duration-200 cursor-pointer"
                                                style={currentPage === pageNum 
                                                    ? { backgroundColor: colors.primary, color: '#fff' }
                                                    : { 
                                                        borderColor: colors.border, 
                                                        color: colors.text,
                                                        backgroundColor: colors.card
                                                    }
                                                }
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="transition-all duration-200 hover:scale-105 cursor-pointer"
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

            {/* Dialog de confirmação com as cores do tema */}
            <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
                <DialogContent 
                    className="transition-all duration-300"
                    style={{ 
                        backgroundColor: colors.card, 
                        borderColor: colors.border,
                        borderTop: `4px solid ${selectedEmpresa?.status === 'ativo' ? colors.warning : colors.success}`
                    }}
                >
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-full" style={{ 
                                backgroundColor: selectedEmpresa?.status === 'ativo' 
                                    ? `${colors.warning}15` 
                                    : `${colors.success}15`
                            }}>
                                {selectedEmpresa?.status === 'ativo' 
                                    ? <XCircle size={24} style={{ color: colors.warning }} />
                                    : <CheckCircle size={24} style={{ color: colors.success }} />
                                }
                            </div>
                            <DialogTitle className="text-xl font-bold" style={{ color: colors.text }}>
                                {selectedEmpresa?.status === 'ativo' ? 'Suspender Empresa' : 'Ativar Empresa'}
                            </DialogTitle>
                        </div>
                        <DialogDescription style={{ color: colors.textSecondary }}>
                            {selectedEmpresa?.status === 'ativo'
                                ? `Tem certeza que deseja suspender a empresa "${selectedEmpresa?.nome}"? Os utilizadores não poderão aceder ao sistema até ser reativada.`
                                : `Tem certeza que deseja ativar a empresa "${selectedEmpresa?.nome}"? Todas as funcionalidades serão restauradas imediatamente.`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 mt-4">
                        <Button 
                            variant="outline" 
                            onClick={() => setShowStatusDialog(false)}
                            className="transition-all duration-200"
                            style={{ borderColor: colors.border, color: colors.text }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => selectedEmpresa && toggleStatus(selectedEmpresa.id, selectedEmpresa.status)}
                            className="transition-all duration-200 hover:scale-105"
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