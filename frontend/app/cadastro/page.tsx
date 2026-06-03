'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    AlertCircle,
    Loader2,
    User,
    Building2,
    Shield,
    ToggleLeft,
    ToggleRight,
    LogIn,
    RefreshCw,
    CheckCircle2
} from "lucide-react";
import { registerUser, RegisterData } from "@/services/User";

/* ---------------- COMPONENTS ---------------- */
const InputField: React.FC<{
    type: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    icon: React.ElementType;
    showPasswordToggle?: boolean;
    onTogglePassword?: () => void;
    isSelect?: boolean;
    options?: { value: string; label: string }[];
    disabled?: boolean;
}> = ({
    type,
    placeholder,
    value,
    onChange,
    icon: Icon,
    showPasswordToggle = false,
    onTogglePassword,
    isSelect = false,
    options = [],
    disabled = false,
}) => {
    const [isFocused, setIsFocused] = useState<boolean>(false);

    return (
        <div className="relative w-full transition-all duration-300">
            <div className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 transition-transform duration-300 ${isFocused ? "scale-110 text-[#F9941F]" : "text-gray-400"}`}> 
                <Icon size={20} />
            </div>

            {isSelect ? (
                <select
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    aria-label={placeholder}
                    title={placeholder}
                    required
                    disabled={disabled}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 bg-white/50 backdrop-blur-sm transition-all duration-300 outline-none appearance-none ${isFocused ? "border-[#F9941F] shadow-lg shadow-[#F9941F]/20 bg-white" : "border-gray-200 hover:border-gray-300"} ${disabled ? "opacity-50 cursor-not-allowed" : ""} text-gray-800`}
                >
                    <option value="" disabled>{placeholder}</option>
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            ) : (
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    required
                    disabled={disabled}
                    className={`w-full pl-10 pr-${showPasswordToggle ? '12' : '4'} py-3 rounded-xl border-2 bg-white/50 backdrop-blur-sm transition-all duration-300 outline-none ${isFocused ? "border-[#F9941F] shadow-lg shadow-[#F9941F]/20 bg-white" : "border-gray-200 hover:border-gray-300"} ${disabled ? "opacity-50 cursor-not-allowed" : ""} placeholder:text-gray-400 text-gray-800`}
                />
            )}

            {isSelect && (
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-300 ${isFocused ? 'rotate-180' : 'rotate-0'}`}>
                    <ArrowRight size={16} className="rotate-90" />
                </div>
            )}

            {showPasswordToggle && onTogglePassword && (
                <button
                    type="button"
                    onClick={onTogglePassword}
                    disabled={disabled}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#123859] transition-transform duration-300 disabled:opacity-50"
                >
                    {type === "password" ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            )}
        </div>
    );
};

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; label: string; disabled?: boolean }> = ({ checked, onChange, label, disabled = false }) => (
    <div
        className={`flex items-center justify-between w-full p-3 rounded-xl border-2 border-gray-200 bg-white/50 backdrop-blur-sm transition-all duration-300 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300 cursor-pointer'}`}
        onClick={disabled ? undefined : onChange}
    >
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${checked ? 'bg-[#F9941F]/10' : 'bg-gray-100'}`}>
                {checked ? <ToggleRight size={20} className="text-[#F9941F]" /> : <ToggleLeft size={20} className="text-gray-400" />}
            </div>
            <span className="text-gray-700 font-medium text-sm">{label}</span>
        </div>
        <div className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${checked ? 'bg-[#F9941F]' : 'bg-gray-300'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
        </div>
    </div>
);

/* ---------------- MAIN PAGE ---------------- */
export default function RegisterPage(): React.ReactElement {
    const router = useRouter();

    const [formData, setFormData] = useState<RegisterData>({ name: "", email: "", password: "", role: "operador", empresa_id: "", ativo: true });
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [success, setSuccess] = useState<boolean>(false);
    const [isCsrfError, setIsCsrfError] = useState<boolean>(false);

    useEffect(() => {
        if (error) setError("");
        if (isCsrfError) setIsCsrfError(false);
    }, [error, isCsrfError]);

    const handleChange = (field: keyof RegisterData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData(prev => ({ ...prev, [field]: e.target.value }));
    const handleToggleAtivo = () => setFormData(prev => ({ ...prev, ativo: !prev.ativo }));

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setIsCsrfError(false);
        setIsSubmitting(true);

        try {
            await registerUser(formData);
            setSuccess(true);
            setTimeout(() => router.push("/login"), 2000);
        } catch (err: unknown) {
            let errorMessage = "Ocorreu um erro ao criar a conta";
            if (err instanceof Error) errorMessage = err.message;
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const roleOptions = [
        { value: "admin", label: "Administrador" },
        { value: "operador", label: "Operador" },
        { value: "contablista", label: "Contablista" },
    ];

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200">
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(#123859_1px,transparent_1px),linear-gradient(90deg,#123859_1px,transparent_1px)] bg-[length:50px_50px] pointer-events-none" />

            <div className="relative w-full max-w-md z-10 transition-all duration-300">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 overflow-hidden relative">
                    <div className="flex justify-center mb-6 relative">
                        <Image src="/images/3.png" alt="Logo do Sistema" width={80} height={80} className="rounded-2xl cursor-pointer shadow-lg" priority />
                    </div>

                    <div className="text-center mb-6">
                        <h2 className="text-3xl font-bold text-[#123859] mb-2">Criar Conta</h2>
                        <p className="text-gray-500 text-sm">Preencha os dados para se cadastrar</p>
                    </div>

                    {isCsrfError && (
                        <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-r-xl flex flex-col gap-2 shadow-sm transition-all duration-300">
                            <div className="flex items-start gap-3">
                                <RefreshCw size={20} className="flex-shrink-0 mt-0.5 animate-spin" />
                                <div className="text-sm">
                                    <p className="font-medium">Sessão expirada ou CSRF inválido</p>
                                    <p className="text-xs mt-1 opacity-90">O token de segurança expirou. Recarregue a página.</p>
                                </div>
                            </div>
                            <button onClick={() => window.location.reload()} className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                                <RefreshCw size={16} /> Recarregar Página
                            </button>
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-r-xl flex items-center gap-3 shadow-sm transition-opacity duration-300">
                            <CheckCircle2 size={20} /> Conta criada com sucesso! Redirecionando...
                        </div>
                    )}

                    {error && !success && !isCsrfError && (
                        <div className="mb-4 overflow-hidden bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-xl flex items-center gap-3 shadow-sm transition-all duration-300">
                            <AlertCircle size={20} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <InputField type="text" placeholder="Nome completo" value={formData.name} onChange={handleChange("name")} icon={User} disabled={isSubmitting || success} />
                        <InputField type="email" placeholder="Digite seu email" value={formData.email} onChange={handleChange("email")} icon={Mail} disabled={isSubmitting || success} />
                        <InputField type={showPassword ? "text" : "password"} placeholder="Crie uma senha (mín. 6 caracteres)" value={formData.password} onChange={handleChange("password")} icon={Lock} showPasswordToggle onTogglePassword={() => setShowPassword(!showPassword)} disabled={isSubmitting || success} />
                        <InputField type="text" placeholder="Perfil do usuário" value={formData.role} onChange={handleChange("role")} icon={Shield} isSelect options={roleOptions} disabled={isSubmitting || success} />
                        <InputField type="text" placeholder="ID da Empresa (opcional)" value={formData.empresa_id || ""} onChange={handleChange("empresa_id")} icon={Building2} disabled={isSubmitting || success} />
                        <ToggleSwitch checked={formData.ativo ?? true} onChange={handleToggleAtivo} label="Usuário ativo" disabled={isSubmitting || success} />

                        <button type="submit" disabled={isSubmitting || success} className={`w-full py-3.5 mt-2 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-transform duration-300 ${isSubmitting || success ? "bg-[#123859]/70 cursor-not-allowed" : "bg-[#123859] hover:bg-[#0f2b4c] hover:scale-105 hover:shadow-lg hover:shadow-[#123859]/30"}`}>
                            {isSubmitting ? <><Loader2 size={20} className="animate-spin" /><span>Criando conta...</span></> : success ? <><CheckCircle2 size={20} /><span>Criado!</span></> : <><span>Criar Conta</span><ArrowRight size={20} /></>}
                        </button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                        <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-gray-400">ou</span></div>
                    </div>

                    <div className="text-center">
                        <Link href="/login" className="group inline-flex items-center gap-2 text-[#123859] hover:text-[#F9941F] transition-colors font-medium">
                            <LogIn size={18} /><span>Já tem conta? Faça login</span><ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                    </div>
                </div>

                <p className="text-center text-gray-400 text-xs mt-6">© {new Date().getFullYear()} Sistema. Todos os direitos reservados.</p>
            </div>
        </div>
    );
}
