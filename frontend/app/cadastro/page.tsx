'use client';

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
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

/* ---------------- ANIMATION VARIANTS ---------------- */
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2,
        },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 15,
        },
    },
};

const logoVariants: Variants = {
    initial: { scale: 0.8, rotateY: -180 },
    animate: {
        scale: 1,
        rotateY: 0,
        transition: {
            type: "spring",
            stiffness: 200,
            damping: 20,
            duration: 0.8,
        }
    },
    hover: {
        rotateX: 10,
        rotateY: -10,
        scale: 1.05,
        transition: {
            type: "spring",
            stiffness: 200,
            damping: 12,
        },
    },
};

const errorVariants: Variants = {
    initial: { opacity: 0, height: 0, scale: 0.9 },
    animate: {
        opacity: 1,
        height: "auto",
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 20,
        }
    },
    exit: {
        opacity: 0,
        height: 0,
        scale: 0.9,
        transition: {
            duration: 0.2,
        }
    },
};

const buttonVariants: Variants = {
    idle: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 },
    loading: {
        scale: [1, 1.02, 1],
        transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
        },
    },
};

const floatingShapeVariants: Variants = {
    animate: {
        y: [-20, 20, -20],
        rotate: [0, 180, 360],
        transition: {
            duration: 20,
            repeat: Infinity,
            ease: "linear",
        },
    },
};

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
            <motion.div className="relative w-full" variants={itemVariants}>
                <motion.div
                    className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 transition-colors duration-300 ${isFocused ? "text-[#F9941F]" : "text-gray-400"}`}
                    animate={{ scale: isFocused ? 1.1 : 1, rotate: isFocused ? [0, -10, 10, 0] : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <Icon size={20} />
                </motion.div>

                {isSelect ? (
                    <select
                        value={value}
                        onChange={onChange}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
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
                    <motion.div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" animate={{ rotate: isFocused ? 180 : 0 }}>
                        <ArrowRight size={16} className="rotate-90" />
                    </motion.div>
                )}

                {showPasswordToggle && onTogglePassword && (
                    <motion.button
                        type="button"
                        onClick={onTogglePassword}
                        disabled={disabled}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#123859] transition-colors disabled:opacity-50"
                        whileHover={disabled ? {} : { scale: 1.1 }}
                        whileTap={disabled ? {} : { scale: 0.9 }}
                    >
                        {type === "password" ? <EyeOff size={20} /> : <Eye size={20} />}
                    </motion.button>
                )}
            </motion.div>
        );
    };

const ToggleSwitch: React.FC<{
    checked: boolean;
    onChange: () => void;
    label: string;
    disabled?: boolean;
}> = ({ checked, onChange, label, disabled = false }) => (
    <motion.div
        className={`flex items-center justify-between w-full p-3 rounded-xl border-2 border-gray-200 bg-white/50 backdrop-blur-sm transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300 cursor-pointer'}`}
        onClick={disabled ? undefined : onChange}
        whileHover={disabled ? {} : { scale: 1.01 }}
        variants={itemVariants}
    >
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${checked ? 'bg-[#F9941F]/10' : 'bg-gray-100'}`}>
                {checked ? <ToggleRight size={20} className="text-[#F9941F]" /> : <ToggleLeft size={20} className="text-gray-400" />}
            </div>
            <span className="text-gray-700 font-medium text-sm">{label}</span>
        </div>
        <div className={`w-12 h-6 rounded-full p-1 transition-colors ${checked ? 'bg-[#F9941F]' : 'bg-gray-300'}`}>
            <motion.div className="w-4 h-4 bg-white rounded-full shadow-sm" animate={{ x: checked ? 24 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
        </div>
    </motion.div>
);

const FloatingShape: React.FC<{ className: string; delay?: number }> = ({ className, delay = 0 }) => (
    <motion.div className={`absolute rounded-full opacity-10 pointer-events-none ${className}`} variants={floatingShapeVariants} animate="animate" style={{ animationDelay: `${delay}s` }} />
);

/* ---------------- MAIN PAGE ---------------- */
export default function RegisterPage(): React.ReactElement {
    const router = useRouter();

    const [formData, setFormData] = useState<RegisterData>({
        name: "",
        email: "",
        password: "",
        role: "operador",
        empresa_id: "",
        ativo: true,
    });

    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [success, setSuccess] = useState<boolean>(false);
    const [isCsrfError, setIsCsrfError] = useState<boolean>(false);

    useEffect(() => {
        if (error) setError("");
        if (isCsrfError) setIsCsrfError(false);
    }, [formData]);

    const handleChange = (field: keyof RegisterData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleToggleAtivo = () => {
        setFormData(prev => ({ ...prev, ativo: !prev.ativo }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
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

            if (err instanceof Error) {
                errorMessage = err.message;

                // Detecta erro 419 específico (CSRF)
                if (errorMessage.includes('419') || errorMessage.includes('CSRF') || errorMessage.includes('token')) {
                    setIsCsrfError(true);
                    errorMessage = "Sessão expirada. Por favor, recarregue a página.";
                }

                // Detecta erro de rede
                if (errorMessage.includes('Network Error') || errorMessage.includes('ERR_CONNECTION_REFUSED')) {
                    errorMessage = "Não foi possível conectar ao servidor. Verifique se o backend está rodando.";
                }
            }

            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReload = () => {
        window.location.reload();
    };

    const roleOptions = [
        { value: "admin", label: "Administrador" },
        { value: "operador", label: "Operador" },
        { value: "contablista", label: "Contablista" },
    ];

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <FloatingShape className="w-96 h-96 bg-[#123859] -top-20 -left-20 blur-3xl" delay={0} />
                <FloatingShape className="w-80 h-80 bg-[#F9941F] -bottom-20 -right-20 blur-3xl" delay={5} />
                <FloatingShape className="w-64 h-64 bg-[#123859] top-1/2 left-1/4 blur-2xl" delay={10} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(#123859 1px, transparent 1px), linear-gradient(90deg, #123859 1px, transparent 1px)`, backgroundSize: '50px 50px' }} />
            </div>

            <motion.div className="relative w-full max-w-md z-10" initial="hidden" animate="visible" variants={containerVariants}>
                <motion.div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 overflow-hidden relative" variants={itemVariants} whileHover={{ boxShadow: "0 25px 50px -12px rgba(18, 56, 89, 0.25)" }}>
                    <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12" initial={{ x: "-200%" }} animate={{ x: "200%" }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 5, ease: "easeInOut" }} />

                    <motion.div className="flex justify-center mb-6" variants={logoVariants} initial="initial" animate="animate" whileHover="hover" style={{ perspective: 1000 }}>
                        <motion.div className="relative" whileHover={{ rotateY: 360 }} transition={{ duration: 0.8 }}>
                            <Image src="/images/3.png" alt="Logo do Sistema" width={80} height={80} className="rounded-2xl cursor-pointer shadow-lg" priority />
                            <motion.div className="absolute inset-0 rounded-2xl bg-[#F9941F]/20 blur-xl -z-10" animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
                        </motion.div>
                    </motion.div>

                    <motion.div className="text-center mb-6" variants={itemVariants}>
                        <h2 className="text-3xl font-bold text-[#123859] mb-2">Criar Conta</h2>
                        <p className="text-gray-500 text-sm">Preencha os dados para se cadastrar</p>
                    </motion.div>

                    {/* Alerta de CSRF */}
                    <AnimatePresence>
                        {isCsrfError && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-r-xl flex flex-col gap-2 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <RefreshCw size={20} className="flex-shrink-0 mt-0.5 animate-spin" />
                                    <div className="text-sm">
                                        <p className="font-medium">Sessão expirada ou CSRF inválido</p>
                                        <p className="text-xs mt-1 opacity-90">O token de segurança expirou. Recarregue a página.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleReload}
                                    className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={16} />
                                    Recarregar Página
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Sucesso */}
                    <AnimatePresence>
                        {success && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-r-xl flex items-center gap-3 shadow-sm">
                                <CheckCircle2 size={20} />
                                <span className="text-sm font-medium">Conta criada com sucesso! Redirecionando...</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Erro */}
                    <AnimatePresence>
                        {error && !success && !isCsrfError && (
                            <motion.div variants={errorVariants} initial="initial" animate="animate" exit="exit" className="mb-4 overflow-hidden">
                                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-xl flex items-center gap-3 shadow-sm">
                                    <AlertCircle size={20} className="flex-shrink-0" />
                                    <span className="text-sm font-medium">{error}</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <InputField type="text" placeholder="Nome completo" value={formData.name} onChange={handleChange("name")} icon={User} disabled={isSubmitting || success} />
                        <InputField type="email" placeholder="Digite seu email" value={formData.email} onChange={handleChange("email")} icon={Mail} disabled={isSubmitting || success} />
                        <InputField type={showPassword ? "text" : "password"} placeholder="Crie uma senha (mín. 6 caracteres)" value={formData.password} onChange={handleChange("password")} icon={Lock} showPasswordToggle onTogglePassword={() => setShowPassword(!showPassword)} disabled={isSubmitting || success} />
                        <InputField type="text" placeholder="Perfil do usuário" value={formData.role} onChange={handleChange("role")} icon={Shield} isSelect options={roleOptions} disabled={isSubmitting || success} />
                        <InputField type="text" placeholder="ID da Empresa (opcional)" value={formData.empresa_id || ""} onChange={handleChange("empresa_id")} icon={Building2} disabled={isSubmitting || success} />
                        <ToggleSwitch checked={formData.ativo ?? true} onChange={handleToggleAtivo} label="Usuário ativo" disabled={isSubmitting || success} />

                        <motion.button type="submit" disabled={isSubmitting || success} className={`w-full py-3.5 mt-2 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden ${isSubmitting || success ? "bg-[#123859]/70 cursor-not-allowed" : "bg-[#123859] hover:bg-[#0f2b4c] hover:shadow-lg hover:shadow-[#123859]/30"}`} variants={buttonVariants} whileHover={isSubmitting || success ? undefined : "hover"} whileTap={isSubmitting || success ? undefined : "tap"}>
                            {isSubmitting ? <><Loader2 size={20} className="animate-spin" /><span>Criando conta...</span></> : success ? <><CheckCircle2 size={20} /><span>Criado!</span></> : <><span>Criar Conta</span><ArrowRight size={20} /></>}
                        </motion.button>
                    </form>

                    <motion.div className="relative my-6" variants={itemVariants}>
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                        <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-gray-400">ou</span></div>
                    </motion.div>

                    <motion.div className="text-center" variants={itemVariants}>
                        <Link href="/login" className="group inline-flex items-center gap-2 text-[#123859] hover:text-[#F9941F] transition-colors font-medium">
                            <LogIn size={18} /><span>Já tem conta? Faça login</span><ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                    </motion.div>
                </motion.div>

                <motion.p className="text-center text-gray-400 text-xs mt-6" variants={itemVariants}>
                    © {new Date().getFullYear()} Sistema. Todos os direitos reservados.
                </motion.p>
            </motion.div>
        </div>
    );
}