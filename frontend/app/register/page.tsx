"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useThemeColors } from "@/context/ThemeContext";
import { api } from "@/services/axios";
import { AxiosError } from "axios";
import Link from "next/link";
import {
    Building2,
    FileText,
    Mail,
    Briefcase,
    User,
    Lock,
    ArrowLeft,
    AlertCircle,
    CheckCircle,
    Loader2,
    ChevronRight,
    Phone,
    MapPin,
    Upload,
    Banknote,
    X,
    ChevronLeft,
    ChevronDown,
    UserPlus,
    ArrowRight,
    Globe,
    Landmark,
    CreditCard,
    Database,
    Server,
    Users,
} from "lucide-react";

// --- Tipagem local do tema ---
interface ThemeColors {
    primary: string;
    secondary: string;
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    danger: string;
    hover?: string;
    success: string;
}

// --- Tipagem do formulário ---
interface FormData {
    nome: string;
    nif: string;
    email: string;
    telefone: string;
    endereco: string;
    regime_fiscal: "simplificado" | "geral";
    sujeito_iva: boolean;
    nome_banco?: string | null;
    numero_conta?: string | null;
    iban?: string | null;
    logo: string;
    subdomain: string;
    modo: "colectivo" | "singular";
    admin_name: string;
    admin_email: string;
    admin_password: string;
}

// --- Componente de Input ---
interface InputFieldProps {
    name: string;
    icon: React.ElementType;
    type?: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    colors: ThemeColors;
    required?: boolean;
    isSelect?: boolean;
    options?: { value: string; label: string }[];
    prefix?: string;
    maxLength?: number;
    disabled?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
    name,
    icon: Icon,
    type = "text",
    placeholder,
    value,
    onChange,
    colors,
    required = false,
    isSelect = false,
    options = [],
    prefix,
    maxLength,
    disabled = false,
}) => {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <div className="relative w-full">
            <Icon
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: isFocused ? colors.secondary : colors.textSecondary }}
            />
            {prefix && (
                <div className="absolute left-9 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: colors.textSecondary }}>
                    {prefix}
                </div>
            )}
            {isSelect ? (
                <>
                    <select
                        name={name}
                        value={value}
                        onChange={onChange}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        required={required}
                        disabled={disabled}
                        className="w-full pl-10 pr-9 py-3 border outline-none text-sm transition-colors appearance-none"
                        style={{
                            backgroundColor: disabled ? `${colors.border}40` : colors.card,
                            borderColor: isFocused ? colors.secondary : colors.border,
                            color: colors.text,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                        }}
                    >
                        <option value="" disabled>{placeholder}</option>
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <ChevronDown
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: colors.textSecondary }}
                    />
                </>
            ) : (
                <input
                    type={type}
                    name={name}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    required={required}
                    disabled={disabled}
                    inputMode={type === "number" ? "numeric" : undefined}
                    className="w-full pl-10 pr-4 py-3 border outline-none text-sm transition-colors"
                    style={{
                        backgroundColor: disabled ? `${colors.border}40` : colors.card,
                        borderColor: isFocused ? colors.secondary : colors.border,
                        color: colors.text,
                        cursor: disabled ? 'not-allowed' : 'default',
                        paddingLeft: prefix ? '3.75rem' : undefined,
                    }}
                    maxLength={maxLength}
                />
            )}
        </div>
    );
};

// --- Componente de Notificação Toast ---
interface ToastNotificationProps {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
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

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle size={22} style={{ color: colors.success }} />;
            case 'error':
                return <AlertCircle size={22} style={{ color: colors.danger }} />;
            case 'warning':
                return <AlertCircle size={22} style={{ color: colors.secondary }} />;
            case 'info':
                return <CheckCircle size={22} style={{ color: colors.primary }} />;
            default:
                return <CheckCircle size={22} style={{ color: colors.success }} />;
        }
    };

    const getBorderColor = () => {
        switch (type) {
            case 'success':
                return colors.success;
            case 'error':
                return colors.danger;
            case 'warning':
                return colors.secondary;
            case 'info':
                return colors.primary;
            default:
                return colors.success;
        }
    };

    return (
        <div
            className="fixed top-4 left-4 right-4 sm:top-6 sm:right-6 sm:left-auto z-50 w-auto sm:w-full sm:max-w-md animate-slide-in-right"
            style={{
                backgroundColor: colors.card,
                borderLeft: `4px solid ${getBorderColor()}`,
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
            }}
        >
            <div className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
                <div className="flex-shrink-0">
                    {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium break-words" style={{ color: colors.text }}>
                        {message}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="flex-shrink-0 transition-opacity hover:opacity-70"
                    style={{ color: colors.textSecondary }}
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};

export default function RegisterCompanyPage() {
    const router = useRouter();
    const colors = useThemeColors() as ThemeColors;

    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormData>({
        nome: "",
        nif: "",
        email: "",
        telefone: "",
        endereco: "",
        regime_fiscal: "simplificado",
        sujeito_iva: false,
        nome_banco: "",
        numero_conta: "",
        iban: "",
        logo: "",
        subdomain: "",
        modo: "colectivo",
        admin_name: "",
        admin_email: "",
        admin_password: "",
    });

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        setToast({ message, type });
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const value =
            e.target.type === "checkbox"
                ? (e.target as HTMLInputElement).checked
                : e.target.value;
        setForm({ ...form, [e.target.name]: value });
    };

    const handleIvaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setForm({
            ...form,
            sujeito_iva: isChecked,
            regime_fiscal: isChecked ? "geral" : "simplificado"
        });
    };

    const handleRegimeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = e.target.value as "simplificado" | "geral";
        setForm({
            ...form,
            regime_fiscal: value,
            sujeito_iva: value === "geral"
        });
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            showToast("Por favor, selecione um arquivo de imagem válido.", "error");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            showToast("A imagem deve ter no máximo 2MB.", "error");
            return;
        }
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
    };

    const removeLogo = () => {
        setLogoFile(null);
        if (logoPreview) {
            URL.revokeObjectURL(logoPreview);
            setLogoPreview(null);
        }
    };

    const refreshCsrf = async () => {
        try {
            await api.get("/sanctum/csrf-cookie");
            await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
            console.error("[CSRF] Erro:", error);
        }
    };

    const uploadLogo = async (file: File): Promise<string> => {
        const uploadFormData = new FormData();
        uploadFormData.append("logo", file);
        await refreshCsrf();
        const response = await api.post("/api/upload-temp-logo", uploadFormData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        if (response.data.success) return response.data.logo_url;
        throw new Error(response.data.message || "Falha no upload");
    };

    const validateStep1 = (): boolean => {
        if (!form.nome.trim()) {
            showToast("Nome da empresa é obrigatório", "error");
            return false;
        }

        if (!form.nif.trim()) {
            showToast("NIF é obrigatório", "error");
            return false;
        }
        const nifClean = form.nif.replace(/\D/g, '');
        if (nifClean.length !== 10) {
            showToast("NIF deve ter exatamente 10 dígitos numéricos.", "error");
            return false;
        }

        if (!form.email.trim()) {
            showToast("Email da empresa é obrigatório", "error");
            return false;
        }
        if (!form.telefone.trim()) {
            showToast("Telefone é obrigatório", "error");
            return false;
        }
        if (!form.endereco.trim()) {
            showToast("Endereço é obrigatório", "error");
            return false;
        }
        if (!form.subdomain.trim()) {
            showToast("Subdomínio é obrigatório", "error");
            return false;
        }

        const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
        if (!subdomainRegex.test(form.subdomain)) {
            showToast("Subdomínio inválido. Use apenas letras minúsculas, números e hífen (não pode começar ou terminar com hífen).", "error");
            return false;
        }

        return true;
    };

    const handleNextStep = () => {
        if (validateStep1()) setStep(2);
    };

    const handlePrevStep = () => {
        setStep(1);
    };

    const toggleModo = (modo: "colectivo" | "singular") => {
        setForm({ ...form, modo });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.admin_name.trim()) {
            showToast("Nome do administrador é obrigatório", "error");
            return;
        }
        if (!form.admin_email.trim()) {
            showToast("Email do administrador é obrigatório", "error");
            return;
        }
        if (!form.admin_password || form.admin_password.length < 8) {
            showToast("Senha deve ter no mínimo 8 caracteres", "error");
            return;
        }

        setLoading(true);

        try {
            await refreshCsrf();

            let logoUrl = "";
            if (logoFile) {
                setUploadingLogo(true);
                logoUrl = await uploadLogo(logoFile);
                setUploadingLogo(false);
            }

            const submitData = {
                nome: form.nome,
                nif: form.nif.replace(/\D/g, ''),
                email: form.email,
                telefone: form.telefone,
                endereco: form.endereco,
                regime_fiscal: form.regime_fiscal,
                sujeito_iva: form.sujeito_iva,
                nome_banco: form.nome_banco,
                numero_conta: form.numero_conta,
                iban: form.iban,
                logo: logoUrl || "images/3.png",
                subdomain: form.subdomain.toLowerCase().trim(),
                modo: form.modo,
                admin_name: form.admin_name,
                admin_email: form.admin_email,
                admin_password: form.admin_password,
            };

            await api.post("/api/empresas", submitData);

            showToast(" Empresa criada com sucesso! Redirecionando para o login...", "success");

            setTimeout(() => router.push("/login"), 3000);
        } catch (err: unknown) {
            let errorMessage = "Erro ao criar empresa. Verifique os dados e tente novamente.";
            if (err instanceof AxiosError && err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }
            showToast(` ${errorMessage}`, "error");
        } finally {
            setLoading(false);
            setUploadingLogo(false);
        }
    };

    const regimeOptions = [
        { value: "simplificado", label: "Regime Simplificado" },
        { value: "geral", label: "Regime Geral" },
    ];

    return (
        <div className="min-h-screen w-full overflow-x-hidden px-3 py-6 sm:px-4 sm:py-12" style={{ backgroundColor: colors.background }}>
            {/* Toast Notification */}
            {toast && (
                <ToastNotification
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                    colors={colors}
                />
            )}

            <div className="mx-auto w-full max-w-5xl">
                <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <button onClick={() => router.back()} className="shrink-0 p-2 transition-opacity hover:opacity-70" style={{ color: colors.primary }}>
                            <ArrowLeft size={24} />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold sm:text-2xl md:text-3xl" style={{ color: colors.secondary }}>
                                Criar nova empresa
                            </h1>
                            <p className="mt-1 text-xs sm:mt-2 sm:text-sm md:text-base" style={{ color: colors.textSecondary }}>
                                Preencha os dados abaixo para começar a usar o FaturaJá
                            </p>
                        </div>
                    </div>
                </div>

                {/* STEP INDICATOR */}
                <div className="mb-6 flex flex-row border-b sm:mb-8" style={{ borderColor: colors.border }}>
                    <div className="flex-1 py-3 text-center">
                        <div className={`inline-flex flex-col items-center gap-1 text-xs font-medium sm:flex-row sm:gap-2 sm:text-sm ${step === 1 ? "opacity-100" : "opacity-50"}`} style={{ color: step === 1 ? colors.primary : colors.text }}>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs" style={{ backgroundColor: step === 1 ? colors.primary : colors.border, color: step === 1 ? "white" : colors.text }}>
                                1
                            </span>
                            <span className="leading-tight">Dados da Empresa</span>
                        </div>
                    </div>
                    <div className="flex-1 py-3 text-center">
                        <div className={`inline-flex flex-col items-center gap-1 text-xs font-medium sm:flex-row sm:gap-2 sm:text-sm ${step === 2 ? "opacity-100" : "opacity-50"}`} style={{ color: step === 2 ? colors.primary : colors.text }}>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs" style={{ backgroundColor: step === 2 ? colors.primary : colors.border, color: step === 2 ? "white" : colors.text }}>
                                2
                            </span>
                            <span className="leading-tight">Administrador do sistema</span>
                        </div>
                    </div>
                </div>

                <div className="border shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="p-4 sm:p-6 md:p-8">
                            {step === 1 && (
                                <div className="space-y-6">
                                    {/* LOGO */}
                                    <div>
                                        <label className="mb-2 block text-sm font-medium" style={{ color: colors.text }}>Logo da Empresa</label>
                                        <div className="flex flex-wrap items-center gap-4">
                                            {logoPreview ? (
                                                <div className="relative shrink-0">
                                                    <Image src={logoPreview} alt="Logo" width={64} height={64} className="border object-cover" style={{ borderColor: colors.border }} />
                                                    <button type="button" onClick={removeLogo} className="absolute -right-2 -top-2 p-1 text-white" style={{ background: colors.secondary }}>
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="hover:border-primary flex h-16 w-16 shrink-0 cursor-pointer flex-col items-center justify-center border-2 border-dashed" style={{ borderColor: colors.border }}>
                                                    <Upload size={20} style={{ color: colors.text }} />
                                                    <span className="mt-1 text-xs" style={{ color: colors.textSecondary }}>Upload</span>
                                                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                                                </label>
                                            )}
                                            <div className="flex min-w-0 items-center gap-4">
                                                <div className="hidden h-10 w-px sm:block" style={{ backgroundColor: colors.border }} />
                                                <span className="text-xs" style={{ color: colors.textSecondary }}>Adicione a logo da tua empresa (JPG/PNG até 2MB)</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CAMPOS DA EMPRESA */}
                                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                        <InputField name="nome" icon={Building2} placeholder="Nome da empresa *" value={form.nome} onChange={handleChange} colors={colors} required />
                                        <InputField name="nif" icon={FileText} placeholder="NIF (10 dígitos) *" value={form.nif} onChange={(e) => { const raw = e.target.value.replace(/\D/g, '').slice(0, 10); setForm({ ...form, nif: raw }); }} colors={colors} required maxLength={10} />
                                        <InputField name="email" icon={Mail} type="email" placeholder="Email da empresa *" value={form.email} onChange={handleChange} colors={colors} required />
                                        <InputField name="telefone" icon={Phone} placeholder="Telefone *" value={form.telefone} onChange={handleChange} colors={colors} maxLength={9} required />
                                        <InputField name="nome_banco" icon={Landmark} placeholder="Nome do Banco" value={form.nome_banco ?? ""} onChange={handleChange} colors={colors} />
                                        <InputField name="numero_conta" icon={CreditCard} placeholder="Número da Conta" value={form.numero_conta ?? ""} onChange={(e) => { const raw = e.target.value.replace(/\D/g, '').slice(0, 11); setForm({ ...form, numero_conta: raw }); }} colors={colors} maxLength={11} />
                                        <InputField name="iban" icon={Banknote} placeholder="Digite os 21 dígitos do IBAN" value={form.iban?.replace(/^AO06/, "") ?? ""} onChange={(e) => { const raw = e.target.value.replace(/\D/g, '').slice(0, 21); setForm({ ...form, iban: `AO06${raw}` }); }} colors={colors} maxLength={21} />
                                        <InputField name="subdomain" icon={Globe} placeholder="Subdomínio * (ex: minhaempresa)" value={form.subdomain} onChange={handleChange} colors={colors} required />
                                        <div className="md:col-span-2">
                                            <InputField name="endereco" icon={MapPin} placeholder="Endereço completo *" value={form.endereco} onChange={handleChange} colors={colors} required />
                                        </div>
                                    </div>

                                    {/* SELEÇÃO DO MODO */}
                                    <div className="mt-6">
                                        <label className="mb-3 block text-sm font-medium" style={{ color: colors.text }}>
                                            <Database size={16} className="mr-2 inline" style={{ color: colors.textSecondary }} />
                                            Modo de Funcionamento *
                                        </label>

                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                                            {/* Opção Colectivo */}
                                            <div
                                                onClick={() => toggleModo("colectivo")}
                                                className="cursor-pointer rounded border p-3 transition-colors sm:p-4"
                                                style={{
                                                    borderColor: form.modo === "colectivo" ? colors.primary : colors.border,
                                                    backgroundColor: form.modo === "colectivo" ? `${colors.primary}0D` : "transparent",
                                                }}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1 flex-shrink-0">
                                                        <input
                                                            type="radio"
                                                            title="Todas as empresas partilham a mesma base de dados. Ideal para empresas que pretendem uma gestão centralizada com custos reduzidos."
                                                            name="modo_radio"
                                                            value="colectivo"
                                                            checked={form.modo === "colectivo"}
                                                            onChange={() => toggleModo("colectivo")}
                                                            className="mt-1 h-4 w-4"
                                                            style={{ accentColor: colors.primary }}
                                                        />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <Users size={18} className="shrink-0" style={{ color: form.modo === "colectivo" ? colors.secondary : colors.textSecondary }} />
                                                            <span className="font-medium" style={{ color: form.modo === "colectivo" ? colors.secondary : colors.text }}>
                                                                Colectivo
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-xs leading-snug sm:hidden" style={{ color: colors.textSecondary }}>
                                                            Base de dados partilhada, gestão centralizada e custos reduzidos.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Opção Singular */}
                                            <div
                                                onClick={() => toggleModo("singular")}
                                                className="cursor-pointer rounded border p-3 transition-colors sm:p-4"
                                                style={{
                                                    borderColor: form.modo === "singular" ? colors.primary : colors.border,
                                                    backgroundColor: form.modo === "singular" ? `${colors.primary}0D` : "transparent",
                                                }}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1 flex-shrink-0">
                                                        <input
                                                            type="radio"
                                                            title="Cada empresa tem a sua própria base de dados dedicada. Ideal para empresas que necessitam de isolamento rigoroso de dados."
                                                            name="modo_radio"
                                                            value="singular"
                                                            checked={form.modo === "singular"}
                                                            onChange={() => toggleModo("singular")}
                                                            className="mt-1 h-4 w-4"
                                                            style={{ accentColor: colors.primary }}
                                                        />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <Server size={18} className="shrink-0" style={{ color: form.modo === "singular" ? colors.secondary : colors.textSecondary }} />
                                                            <span className="font-medium" style={{ color: form.modo === "singular" ? colors.secondary : colors.text }}>
                                                                Singular
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-xs leading-snug sm:hidden" style={{ color: colors.textSecondary }}>
                                                            Base de dados dedicada e isolamento rigoroso dos dados.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* REGIME FISCAL E IVA */}
                                    <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
                                        <InputField
                                            name="regime_fiscal"
                                            icon={Briefcase}
                                            placeholder="Regime Fiscal"
                                            value={form.regime_fiscal}
                                            onChange={handleRegimeChange}
                                            colors={colors}
                                            isSelect
                                            options={regimeOptions}
                                        />
                                        <label className="flex items-center gap-3 py-3">
                                            <input
                                                type="checkbox"
                                                name="sujeito_iva"
                                                checked={form.sujeito_iva}
                                                onChange={handleIvaChange}
                                                className="h-4 w-4 shrink-0"
                                                style={{ accentColor: colors.primary }}
                                            />
                                            <span className="text-sm" style={{ color: colors.text }}>Sujeito a IVA</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                        <InputField name="admin_name" icon={User} placeholder="Nome completo *" value={form.admin_name} onChange={handleChange} colors={colors} required />
                                        <InputField name="admin_email" icon={Mail} type="email" placeholder="Email *" value={form.admin_email} onChange={handleChange} colors={colors} required />
                                        <InputField name="admin_password" icon={Lock} type="password" placeholder="Senha * (mínimo 8 caracteres)" value={form.admin_password} onChange={handleChange} colors={colors} required />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-4 border-t p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6" style={{ borderColor: colors.border }}>
                            <Link href="/login" className="group inline-flex items-center justify-center gap-2 text-sm font-medium transition-colors sm:justify-start" style={{ color: colors.secondary }}>
                                <UserPlus size={18} /> Já tenho conta <ArrowRight size={16} className="opacity-0 transition-opacity group-hover:opacity-100" />
                            </Link>
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
                                {step === 2 && (
                                    <button type="button" onClick={handlePrevStep} className="flex w-full items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-70 sm:w-auto" style={{ color: colors.textSecondary }}>
                                        <ChevronLeft size={18} /> Voltar
                                    </button>
                                )}
                                {step === 1 ? (
                                    <button type="button" onClick={handleNextStep} className="flex w-full items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80 sm:w-auto" style={{ backgroundColor: colors.primary }}>
                                        Próximo <ChevronRight size={18} />
                                    </button>
                                ) : (
                                    <button type="submit" disabled={loading || uploadingLogo} className="flex w-full items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50 sm:w-auto" style={{ backgroundColor: colors.primary }}>
                                        {loading && <Loader2 size={18} className="animate-spin" />}
                                        {loading ? "Criando empresa..." : "Criar empresa"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}