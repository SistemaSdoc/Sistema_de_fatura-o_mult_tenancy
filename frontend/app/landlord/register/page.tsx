// app/landlord/register/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/services/axios';
import { useThemeColors } from '@/context/ThemeContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2, UserPlus, User } from 'lucide-react';
import { AxiosError } from 'axios';

// ============================================================
// COMPONENTE INPUT FIELD (mesmo do login)
// ============================================================
interface InputFieldProps {
    type: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    icon: React.ElementType;
    showPasswordToggle?: boolean;
    onTogglePassword?: () => void;
    colors: any;
    error?: string | null;
    id?: string;
    disabled?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
    type,
    placeholder,
    value,
    onChange,
    icon: Icon,
    showPasswordToggle = false,
    onTogglePassword,
    colors,
    error = null,
    id,
    disabled = false,
}) => {
    const [isFocused, setIsFocused] = useState<boolean>(false);

    return (
        <div className="relative w-full">
            <div
                className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 transition-transform duration-300`}
                style={{ color: isFocused ? colors.secondary : colors.textSecondary }}
            >
                <Icon size={20} />
            </div>

            <input
                id={id}
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={disabled}
                className={`w-full pl-10 pr-${showPasswordToggle ? '12' : '4'} py-3 rounded-xl border-2 outline-none transition-all duration-300 ${
                    error ? 'border-red-500' : ''
                }`}
                style={{
                    backgroundColor: isFocused ? colors.card : `${colors.card}80`,
                    borderColor: error ? colors.danger : (isFocused ? colors.secondary : colors.border),
                    color: colors.text,
                    boxShadow: isFocused ? `0 10px 15px -3px ${colors.secondary}20` : 'none',
                }}
                aria-describedby={error ? `${id}-error` : undefined}
            />

            {showPasswordToggle && onTogglePassword && (
                <button
                    type="button"
                    onClick={onTogglePassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-transform hover:scale-110 active:scale-90"
                    style={{ color: colors.textSecondary }}
                    aria-label={type === 'password' ? 'Mostrar senha' : 'Ocultar senha'}
                >
                    {type === 'password' ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            )}

            {error && (
                <p id={`${id}-error`} className="text-xs mt-1 flex items-center gap-1" style={{ color: colors.danger }}>
                    <AlertCircle size={12} />
                    {error}
                </p>
            )}
        </div>
    );
};

// ============================================================
// COMPONENTE: MEDIDOR DE FORÇA DA SENHA
// ============================================================
function calcularForcaSenha(senha: string) {
    if (!senha) return { nivel: 0, label: '', cor: '#e5e7eb' };
    let pontos = 0;
    if (senha.length >= 8) pontos++;
    if (senha.length >= 12) pontos++;
    if (/[A-Z]/.test(senha) && /[a-z]/.test(senha)) pontos++;
    if (/[0-9]/.test(senha)) pontos++;
    if (/[^A-Za-z0-9]/.test(senha)) pontos++;

    if (pontos <= 1) return { nivel: 1, label: 'Fraca', cor: '#ef4444' };
    if (pontos <= 3) return { nivel: 2, label: 'Razoável', cor: '#f59e0b' };
    return { nivel: 3, label: 'Forte', cor: '#22c55e' };
}

function PasswordStrengthMeter({ password }: { password: string }) {
    const colors = useThemeColors();
    const { nivel, label, cor } = useMemo(() => calcularForcaSenha(password), [password]);

    if (!password) return null;

    return (
        <div className="mt-1.5 space-y-1">
            <div className="flex gap-1 h-1.5">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="flex-1 rounded-full transition-colors duration-300"
                        style={{ backgroundColor: i <= nivel ? cor : colors.border }}
                    />
                ))}
            </div>
            <p className="text-xs font-medium" style={{ color: cor }}>
                {label}
            </p>
        </div>
    );
}

// ============================================================
// PÁGINA PRINCIPAL DE REGISTO
// ============================================================
export default function LandlordRegisterPage() {
    const router = useRouter();
    const colors = useThemeColors();

    // Estados do formulário
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

    // Validações em tempo real
    const validateField = useCallback((field: string, value: string): string | null => {
        if (!value.trim()) return 'Este campo é obrigatório.';
        if (field === 'name' && value.trim().length < 2) return 'Nome deve ter pelo menos 2 caracteres.';
        if (field === 'email' && !/\S+@\S+\.\S+/.test(value)) return 'Email inválido.';
        if (field === 'password' && value.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
        if (field === 'password_confirmation' && value !== form.password) return 'As senhas não coincidem.';
        return null;
    }, [form.password]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        // Limpa erro geral ao digitar
        if (error) setError('');
        // Validação em tempo real
        const err = validateField(name, value);
        setFieldErrors((prev) => ({ ...prev, [name]: err || '' }));
    };

    // Efeito para revalidar a confirmação quando a senha muda
    useEffect(() => {
        if (form.password_confirmation) {
            const err = validateField('password_confirmation', form.password_confirmation);
            setFieldErrors((prev) => ({ ...prev, password_confirmation: err || '' }));
        }
    }, [form.password, form.password_confirmation, validateField]);

    // Submissão
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setFieldErrors({});

        // Valida todos os campos antes de submeter
        const errors: { [key: string]: string } = {};
        for (const [key, value] of Object.entries(form)) {
            const err = validateField(key, value);
            if (err) errors[key] = err;
        }
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setIsLoading(true);
        try {
            // CSRF cookie (se necessário)
            await api.get('/sanctum/csrf-cookie');
            await api.post('/api/landlord/register', form);
            setSuccess('Registo efetuado com sucesso! Redirecionando...');
            // Limpa formulário
            setForm({ name: '', email: '', password: '', password_confirmation: '' });
            // Redireciona após 2 segundos
            setTimeout(() => {
                router.push('/landlord/login');
            }, 2000);
        } catch (err: unknown) {
            let errorMessage = 'Erro ao registar. Tente novamente.';
            if (err instanceof AxiosError) {
                const data = err.response?.data;
                if (data?.message) errorMessage = data.message;
                // Erros de validação do backend (ex: email já existe)
                if (data?.errors) {
                    const firstError = Object.values(errors).flat()[0]; // flat() achata todos os arrays
                    if (firstError) errorMessage = firstError;
                    // Preenche os erros de campo
                    setFieldErrors(data.errors);
                }
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Força da senha (para exibir)
    const passwordStrength = useMemo(() => calcularForcaSenha(form.password), [form.password]);

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-300"
            style={{ backgroundColor: colors.background }}
        >
            {/* Grid decorativa */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(${colors.primary} 1px, transparent 1px), linear-gradient(90deg, ${colors.primary} 1px, transparent 1px)`,
                    backgroundSize: '50px 50px',
                }}
            />

            <div className="relative w-full max-w-md z-10">
                <div
                    className="backdrop-blur-xl border p-8 overflow-hidden relative transition-shadow duration-300"
                    style={{
                        backgroundColor: `${colors.card}CC`,
                        borderColor: colors.border,
                    }}
                >
                    {/* LOGO */}
                    <div className="flex justify-center mb-6">
                        <Image
                            src="/images/3.png"
                            alt="Logo do Sistema"
                            width={80}
                            height={80}
                            className="rounded-2xl cursor-pointer"
                            priority
                        />
                    </div>

                    {/* Título */}
                    <div className="text-center mb-6">
                        <h2 className="text-3xl font-bold mb-2" style={{ color: colors.secondary }}>Criar Conta</h2>
                        <p className="text-sm" style={{ color: colors.textSecondary }}>Registo para administradores</p>
                    </div>

                    {/* Mensagem de erro geral */}
                    {error && (
                        <div
                            className="mb-4 border-l-4 p-4 rounded-r-xl flex items-center gap-3 shadow-sm"
                            style={{ backgroundColor: `${colors.danger}20`, borderColor: colors.danger, color: colors.danger }}
                            role="alert"
                            aria-live="polite"
                        >
                            <AlertCircle size={20} />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    {/* Mensagem de sucesso */}
                    {success && (
                        <div
                            className="mb-4 border-l-4 p-4 rounded-r-xl flex items-center gap-3 shadow-sm"
                            style={{ backgroundColor: '#22c55e20', borderColor: '#22c55e', color: '#22c55e' }}
                            role="status"
                            aria-live="polite"
                        >
                            <AlertCircle size={20} />
                            <span className="text-sm font-medium">{success}</span>
                        </div>
                    )}

                    {/* Formulário */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {/* Nome */}
                        <InputField
                            id="name"
                            type="text"
                            placeholder="Digite seu nome completo"
                            value={form.name}
                            onChange={handleChange}
                            icon={User}
                            colors={colors}
                            error={fieldErrors.name}
                            disabled={isLoading}
                        />

                        {/* Email */}
                        <InputField
                            id="email"
                            type="email"
                            placeholder="Digite seu email"
                            value={form.email}
                            onChange={handleChange}
                            icon={Mail}
                            colors={colors}
                            error={fieldErrors.email}
                            disabled={isLoading}
                        />

                        {/* Senha */}
                        <InputField
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Crie uma senha (mín. 8 caracteres)"
                            value={form.password}
                            onChange={handleChange}
                            icon={Lock}
                            showPasswordToggle
                            onTogglePassword={() => setShowPassword(!showPassword)}
                            colors={colors}
                            error={fieldErrors.password}
                            disabled={isLoading}
                        />
                        <PasswordStrengthMeter password={form.password} />

                        {/* Confirmação de senha */}
                        <InputField
                            id="password_confirmation"
                            type={showConfirm ? 'text' : 'password'}
                            placeholder="Confirme sua senha"
                            value={form.password_confirmation}
                            onChange={handleChange}
                            icon={Lock}
                            showPasswordToggle
                            onTogglePassword={() => setShowConfirm(!showConfirm)}
                            colors={colors}
                            error={fieldErrors.password_confirmation}
                            disabled={isLoading}
                        />

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-3.5 mt-2 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300`}
                            style={{ backgroundColor: isLoading ? `${colors.primary}B3` : colors.primary }}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    A registar...
                                </>
                            ) : (
                                <>
                                    Criar Conta
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divisor e link para login */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t" style={{ borderColor: colors.border }}></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4" style={{ backgroundColor: colors.card, color: colors.textSecondary }}>ou</span>
                        </div>
                    </div>

                    <div className="text-center">
                        <Link
                            href="/landlord/login"
                            className="group inline-flex items-center gap-2 transition-colors font-medium"
                            style={{ color: colors.secondary }}
                        >
                            <UserPlus size={18} />
                            Já tem conta? Faça login
                            <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs mt-6" style={{ color: colors.textSecondary }}>
                    © {new Date().getFullYear()} SDOCA. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
}