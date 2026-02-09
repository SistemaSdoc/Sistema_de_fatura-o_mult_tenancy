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

    return {
        user,
        loading,
        isAdmin: user?.role === 'admin',
        isOperador: user?.role === 'operador',
        isContablista: user?.role === 'contablista'
    };
}