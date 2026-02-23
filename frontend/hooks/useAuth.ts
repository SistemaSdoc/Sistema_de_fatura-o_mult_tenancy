// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { authService, User } from '@/services/auth';
import { toast } from 'sonner';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const userData = await authService.getMe();
                setUser(userData);
            } catch (error) {
                console.error('Erro ao carregar usuário:', error);
                toast.error('Erro ao carregar dados do usuário');
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    // Função de logout que usa o authService
    const logout = async () => {
        try {
            setLoading(true);
            const result = await authService.simpleLogout();
            
            if (result.success) {
                setUser(null);
                toast.success('Logout realizado com sucesso');
                // Redirecionamento será feito pelo componente
            } else {
                toast.error(result.message || 'Erro ao fazer logout');
            }
            
            return result;
        } catch (error) {
            console.error('Erro no logout:', error);
            toast.error('Erro ao fazer logout');
            return { success: false, message: 'Erro ao fazer logout' };
        } finally {
            setLoading(false);
        }
    };

    return {
        user,
        loading,
        logout, // <-- ADICIONADO
        isAdmin: user?.role === 'admin',
        isOperador: user?.role === 'operador',
        isContablista: user?.role === 'contablista'
    };
}