"use client";

import React, { useState } from "react";
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
    X,
    ChevronLeft,
    UserPlus,
    ArrowRight,
    Globe,
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
    logo: string;
    subdomain: string;
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
}) => {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <div className="relative">
            <Icon
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: isFocused ? colors.primary : colors.textSecondary }}
            />
            {isSelect ? (
                <select
                    name={name}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    required={required}
                    className="w-full pl-10 pr-4 py-3 border outline-none text-sm transition-colors appearance-none"
                    style={{
                        backgroundColor: colors.card,
                        borderColor: isFocused ? colors.primary : colors.border,
                        color: colors.text,
                    }}
                >
                    <option value="" disabled>{placeholder}</option>
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
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
                    className="w-full pl-10 pr-4 py-3 border outline-none text-sm transition-colors"
                    style={{
                        backgroundColor: colors.card,
                        borderColor: isFocused ? colors.primary : colors.border,
                        color: colors.text,
                    }}
                />
            )}
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
        regime_fiscal: "geral",
        sujeito_iva: true,
        logo: "",
        subdomain: "",
        admin_name: "",
        admin_email: "",
        admin_password: "",
    });

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const value =
            e.target.type === "checkbox"
                ? (e.target as HTMLInputElement).checked
                : e.target.value;
        setForm({ ...form, [e.target.name]: value });
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("Por favor, selecione um arquivo de imagem válido.");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setError("A imagem deve ter no máximo 2MB.");
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
            setError("Nome da empresa é obrigatório");
            return false;
        }
        if (!form.nif.trim()) {
            setError("NIF é obrigatório");
            return false;
        }
        if (!form.email.trim()) {
            setError("Email da empresa é obrigatório");
            return false;
        }
        if (!form.telefone.trim()) {
            setError("Telefone é obrigatório");
            return false;
        }
        if (!form.endereco.trim()) {
            setError("Endereço é obrigatório");
            return false;
        }
        if (!form.subdomain.trim()) {
            setError("Subdomínio é obrigatório");
            return false;
        }
        const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
        if (!subdomainRegex.test(form.subdomain)) {
            setError("Subdomínio inválido. Use apenas letras minúsculas, números e hífen (não pode começar ou terminar com hífen).");
            return false;
        }
        setError("");
        return true;
    };

    const handleNextStep = () => {
        if (validateStep1()) setStep(2);
    };

    const handlePrevStep = () => {
        setStep(1);
        setError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.admin_name.trim()) {
            setError("Nome do administrador é obrigatório");
            return;
        }
        if (!form.admin_email.trim()) {
            setError("Email do administrador é obrigatório");
            return;
        }
        if (!form.admin_password || form.admin_password.length < 8) {
            setError("Senha deve ter no mínimo 8 caracteres");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess(false);

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
                nif: form.nif,
                email: form.email,
                telefone: form.telefone,
                endereco: form.endereco,
                regime_fiscal: form.regime_fiscal,
                sujeito_iva: form.sujeito_iva,
                logo: logoUrl || "images/3.png",
                subdomain: form.subdomain,
                admin_name: form.admin_name,
                admin_email: form.admin_email,
                admin_password: form.admin_password,
            };

            await api.post("/api/empresas", submitData);
            setSuccess(true);
            setTimeout(() => router.push("/login"), 2000);
        } catch (err: unknown) {
            let errorMessage = "Erro ao criar empresa. Verifique os dados e tente novamente.";
            if (err instanceof AxiosError && err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }
            setError(errorMessage);
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
        <div className="min-h-screen py-12 px-4" style={{ backgroundColor: colors.background }}>
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 transition-opacity hover:opacity-70" style={{ color: colors.primary }}>
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold" style={{ color: colors.secondary }}>
                                Criar nova empresa
                            </h1>
                            <p className="text-base mt-2" style={{ color: colors.textSecondary }}>
                                Preencha os dados abaixo para começar a usar o FaturaJá
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex mb-8 border-b" style={{ borderColor: colors.border }}>
                    <div className="flex-1 py-3 text-center">
                        <div className={`inline-flex items-center gap-2 text-sm font-medium ${step === 1 ? "opacity-100" : "opacity-50"}`} style={{ color: step === 1 ? colors.primary : colors.text }}>
                            <span className="w-6 h-6 flex items-center justify-center text-xs rounded-full" style={{ backgroundColor: step === 1 ? colors.primary : colors.border, color: step === 1 ? "white" : colors.text }}>
                                1
                            </span>
                            Dados da Empresa
                        </div>
                    </div>
                    <div className="flex-1 py-3 text-center">
                        <div className={`inline-flex items-center gap-2 text-sm font-medium ${step === 2 ? "opacity-100" : "opacity-50"}`} style={{ color: step === 2 ? colors.primary : colors.text }}>
                            <span className="w-6 h-6 flex items-center justify-center text-xs rounded-full" style={{ backgroundColor: step === 2 ? colors.primary : colors.border, color: step === 2 ? "white" : colors.text }}>
                                2
                            </span>
                            Administrador do sistema
                        </div>
                    </div>
                </div>

                <div className="border shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <form onSubmit={handleSubmit}>
                        <div className="p-8">
                            {error && (
                                <div className="flex items-center gap-3 p-4 mb-6 border-l-4" style={{ backgroundColor: `${colors.danger}10`, borderColor: colors.danger }}>
                                    <AlertCircle size={20} style={{ color: colors.danger }} />
                                    <span className="text-sm" style={{ color: colors.danger }}>{error}</span>
                                </div>
                            )}
                            {success && (
                                <div className="flex items-center gap-3 p-4 mb-6 border-l-4" style={{ backgroundColor: `${colors.primary}10`, borderColor: colors.primary }}>
                                    <CheckCircle size={20} style={{ color: colors.primary }} />
                                    <span className="text-sm" style={{ color: colors.primary }}>Empresa criada com sucesso! Redirecionando para o login...</span>
                                </div>
                            )}

                            {step === 1 && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>Logo da Empresa</label>
                                        <div className="flex items-center gap-4">
                                            {logoPreview ? (
                                                <div className="relative">
                                                    <Image src={logoPreview} alt="Logo" width={64} height={64} className="object-cover border" style={{ borderColor: colors.border }} />
                                                    <button type="button" onClick={removeLogo} className="absolute -top-2 -right-2 p-1 text-white" style={{ background: colors.secondary }}>
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="flex flex-col items-center justify-center w-16 h-16 border-2 border-dashed cursor-pointer hover:border-primary" style={{ borderColor: colors.border }}>
                                                    <Upload size={20} style={{ color: colors.text }} />
                                                    <span className="text-xs mt-1" style={{ color: colors.textSecondary }}>Upload</span>
                                                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                                                </label>
                                            )}
                                            <div className="flex items-center gap-4">
                                                <div className="w-px h-10" style={{ backgroundColor: colors.border }} />
                                                <span className="text-xs" style={{ color: colors.textSecondary }}>Adicione a logo da tua empresa (JPG/PNG até 2MB)</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <InputField name="nome" icon={Building2} placeholder="Nome da empresa *" value={form.nome} onChange={handleChange} colors={colors} required />
                                        <InputField name="nif" icon={FileText} placeholder="NIF *" value={form.nif} onChange={handleChange} colors={colors} required />
                                        <InputField name="email" icon={Mail} type="email" placeholder="Email da empresa *" value={form.email} onChange={handleChange} colors={colors} required />
                                        <InputField name="telefone" icon={Phone} placeholder="Telefone *" value={form.telefone} onChange={handleChange} colors={colors} required />
                                        <InputField name="subdomain" icon={Globe} placeholder="Subdomínio * (ex: minhaempresa)" value={form.subdomain} onChange={handleChange} colors={colors} required />
                                        <div className="md:col-span-2">
                                            <InputField name="endereco" icon={MapPin} placeholder="Endereço completo *" value={form.endereco} onChange={handleChange} colors={colors} required />
                                        </div>
                                        <div className="md:col-span-2">
                                            <InputField name="regime_fiscal" icon={Briefcase} placeholder="Regime Fiscal" value={form.regime_fiscal} onChange={handleChange} colors={colors} isSelect options={regimeOptions} />
                                        </div>
                                        <label className="flex items-center gap-3 py-3">
                                            <input type="checkbox" name="sujeito_iva" checked={form.sujeito_iva} onChange={handleChange} className="w-5 h-5" style={{ accentColor: colors.primary }} />
                                            <span className="text-sm" style={{ color: colors.text }}>Sujeito a IVA</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <InputField name="admin_name" icon={User} placeholder="Nome completo *" value={form.admin_name} onChange={handleChange} colors={colors} required />
                                        <InputField name="admin_email" icon={Mail} type="email" placeholder="Email *" value={form.admin_email} onChange={handleChange} colors={colors} required />
                                        <InputField name="admin_password" icon={Lock} type="password" placeholder="Senha * (mínimo 8 caracteres)" value={form.admin_password} onChange={handleChange} colors={colors} required />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-center p-6 border-t" style={{ borderColor: colors.border }}>
                            <Link href="/login" className="group inline-flex items-center gap-2 transition-colors font-medium text-sm" style={{ color: colors.secondary }}>
                                <UserPlus size={18} /> Já tenho conta <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                            <div className="flex gap-4">
                                {step === 2 && (
                                    <button type="button" onClick={handlePrevStep} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-70" style={{ color: colors.textSecondary }}>
                                        <ChevronLeft size={18} /> Voltar
                                    </button>
                                )}
                                {step === 1 ? (
                                    <button type="button" onClick={handleNextStep} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80" style={{ backgroundColor: colors.primary }}>
                                        Próximo <ChevronRight size={18} />
                                    </button>
                                ) : (
                                    <button type="submit" disabled={loading || uploadingLogo} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50" style={{ backgroundColor: colors.primary }}>
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