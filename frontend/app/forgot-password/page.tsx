'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useThemeColors } from '@/context/ThemeContext';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { ToastNotification } from '@/components/ToastNotification';
import { landAuthApi } from '@/services/axios';

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
    warning: string;
    info?: string;
}



export default function ForgotPasswordPage() {
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
            // Usamos landAuthApi (landlordApi) pois não precisa de headers de tenant
            await landAuthApi.api.post('/api/password/email', { email });
            showToast(' Link enviado! Verifique seu e-mail.', 'success');
            setEmail('');
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Ocorreu um erro. Tente novamente.';
            showToast(` ${errorMessage}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main
            className="min-h-screen flex items-center justify-center p-3 sm:p-4"
            style={{ backgroundColor: colors.background }}
            aria-labelledby="forgot-password-title"
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
                {/* Logo com animação */}
                <div className="flex justify-center mb-6">
                    <div className="logo-float">
                        <Image
                            src="/images/3.png"
                            alt="Logo"
                            width={72}
                            height={72}
                            className="rounded-2xl"
                            priority
                        />
                    </div>
                </div>

                <h2 id="forgot-password-title" className="text-2xl font-bold text-center mb-2" style={{ color: colors.secondary }}>
                    Recupere a sua senha
                </h2>
                <p className="text-sm text-center mb-6" style={{ color: colors.textSecondary }}>
                    Enviaremos um link para redefinir sua senha.
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
                            placeholder="Digite seu e-mail"
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
                        style={{ backgroundColor: colors.primary }}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            'Enviar link'
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