'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useThemeColors } from '@/context/ThemeContext';
import { Mail, Loader2, AlertCircle, ArrowLeft, X, CheckCircle } from 'lucide-react';
import { landlordApi } from '@/services/axios';
import Link from 'next/link';
import Image from 'next/image';

// --- Tipagem do tema ---
interface ThemeColors {
    primary: string;
    secondary: string;
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    danger: string;
    success: string;
}

// --- Componente de Notificação Toast ---
interface ToastNotificationProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
    colors: ThemeColors;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ message, type, onClose, colors }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div 
            className="fixed top-3 right-2 left-2 z-50 max-w-[calc(100vw-1rem)] animate-slide-in-right sm:right-6 sm:left-auto sm:max-w-md"
            style={{ 
                backgroundColor: colors.card,
                borderLeft: `4px solid ${type === 'success' ? colors.success : colors.danger}`,
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
            }}
        >
            <div className="flex items-center gap-4 p-4">
                <div className="shrink-0">
                    {type === 'success' ? (
                        <CheckCircle size={24} style={{ color: colors.success }} />
                    ) : (
                        <AlertCircle size={24} style={{ color: colors.danger }} />
                    )}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: colors.text }}>
                        {message}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="shrink-0 transition-opacity hover:opacity-70"
                    style={{ color: colors.textSecondary }}
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};

export default function LoginEmailOnlyPage() {
    const router = useRouter();
    const colors = useThemeColors() as ThemeColors;
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Usamos a instância tenantApi (pois pode não ter tenant definido, mas o controller não exige)
            const response = await landlordApi.post('/login/email-only', { email });
            if (response.data.success) {
                showToast(' Login realizado com sucesso! Redirecionando...', 'success');
                // Redireciona para o dashboard após login bem-sucedido
                setTimeout(() => router.push('/dashboard'), 1500);
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Erro ao fazer login.';
            showToast(` ${errorMessage}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main
            className="min-h-screen flex items-center justify-center p-3 sm:p-4"
            style={{ backgroundColor: colors.background }}
            aria-labelledby="email-login-title"
        >
            {/* Toast Notification */}
            {toast && (
                <ToastNotification
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                    colors={colors}
                />
            )}

            <div
                className="w-full max-w-[min(92vw,28rem)] p-4 sm:p-8 border rounded-2xl shadow-xl"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
                <div className="flex justify-center mb-6">
                    <div className="logo-float">
                        <Image src="/images/3.png" alt="Logo" width={72} height={72} className="rounded-2xl" priority />
                    </div>
                </div>

                <h2 id="email-login-title" className="text-2xl font-bold text-center mb-2" style={{ color: colors.secondary }}>
                    Login com o email
                </h2>
                <p className="text-sm text-center mb-6" style={{ color: colors.textSecondary }}>
                    Digite seu email para acessar o sistema.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                    <div className="relative">
                        <Mail
                            size={20}
                            className="absolute left-3 top-1/2 -translate-y-1/2"
                            style={{ color: colors.textSecondary }}
                        />
                        <input
                            id="email"
                            type="email"
                            placeholder="Seu email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            aria-label="Email"
                            autoComplete="email"
                            className="w-full pl-10 pr-4 py-3 border-2 outline-none transition-all duration-300 min-h-[48px]"
                            style={{
                                backgroundColor: colors.background,
                                color: colors.text,
                                borderColor: colors.border
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 mt-2 font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 hover:opacity-80 disabled:opacity-50 rounded-lg touch-target"
                        style={{ backgroundColor: loading ? `${colors.primary}B3` : colors.primary }}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Entrando...
                            </>
                        ) : (
                            'Entrar com o email'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:underline touch-target"
                        style={{ color: colors.secondary }}
                    >
                        <ArrowLeft size={16} />
                        Voltar ao login
                    </Link>
                </div>
            </div>
        </main>
    );
}