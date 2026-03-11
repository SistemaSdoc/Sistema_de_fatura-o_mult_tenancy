// src/app/(dashboard)/configuracoes/page.tsx
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MainEmpresa from "@/app/components/MainEmpresa";
import { useThemeColors, useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/authprovider";
import {
    Settings,
    User,
    Building2,
    Bell,
    Shield,
    Globe,
    Moon,
    Sun,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Eye,
    EyeOff,
    Key,
    RefreshCcw,
    Download,
    Upload,
    Trash2,
    LogOut,
} from "lucide-react";
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// ===== TYPES =====
interface User {
    name?: string;
    email?: string;
}

interface ThemeColors {
    text: string;
    textSecondary: string;
    background: string;
    card: string;
    border: string;
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    error: string;
    hover: string;
}

interface PerfilFormData {
    nome: string;
    email: string;
    telefone: string;
    cargo: string;
    avatar: string;
}

interface EmpresaFormData {
    nome: string;
    nif: string;
    email: string;
    telefone: string;
    endereco: string;
    website: string;
    logo: string;
}

interface SenhaFormData {
    senha_atual: string;
    nova_senha: string;
    confirmar_senha: string;
}

interface NotificacoesFormData {
    email_notificacoes: boolean;
    sms_notificacoes: boolean;
    push_notificacoes: boolean;
    marketing_emails: boolean;
    relatorios_automaticos: boolean;
    alertas_estoque: boolean;
    alertas_pagamentos: boolean;
}

// ===== REUSABLE COMPONENTS =====

const AlertMessage = ({
    type,
    message,
    colors,
}: {
    type: "success" | "error";
    message: string;
    colors: ThemeColors;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="p-4 rounded-lg flex items-center gap-3"
        style={{
            backgroundColor: `${colors[type]}20`,
            border: `1px solid ${colors[type]}`,
            color: colors[type],
        }}
    >
        {type === "success" ? (
            <CheckCircle2 className="w-5 h-5" />
        ) : (
            <AlertCircle className="w-5 h-5" />
        )}
        <span className="text-sm font-medium">{message}</span>
    </motion.div>
);

const FormInput = ({
    label,
    name,
    value,
    onChange,
    type = "text",
    colors,
    ...props
}: {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    colors: ThemeColors;
    [key: string]: unknown;
}) => (
    <div className="space-y-2">
        <Label htmlFor={name} style={{ color: colors.text }}>
            {label}
        </Label>
        <Input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
            }}
            {...props}
        />
    </div>
);

const PasswordInput = ({
    label,
    name,
    value,
    onChange,
    show,
    setShow,
    colors,
}: {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    show: boolean;
    setShow: (show: boolean) => void;
    colors: ThemeColors;
}) => (
    <div className="space-y-2">
        <Label htmlFor={name} style={{ color: colors.text }}>
            {label}
        </Label>
        <div className="relative">
            <Input
                id={name}
                name={name}
                type={show ? "text" : "password"}
                value={value}
                onChange={onChange}
                style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text,
                }}
            />
            <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: colors.textSecondary }}
            >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    </div>
);

const SaveButton = ({
    onClick,
    loading,
    colors,
    children = "Salvar alterações",
}: {
    onClick: () => void | Promise<void>;
    loading: boolean;
    colors: ThemeColors;
    children?: string;
    disabled?: boolean;
}) => (
    <Button
        onClick={onClick}
        disabled={loading}
        className="gap-2 text-white"
        style={{ backgroundColor: colors.primary }}
    >
        {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
            <Save className="w-4 h-4" />
        )}
        {loading ? "Salvando..." : children}
    </Button>
);

// ===== TAB COMPONENTS =====

const PerfilTab = ({
    colors,
    user,
}: {
    colors: ThemeColors;
    user: User | undefined;
}) => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState<PerfilFormData>({
        nome: user?.name || "João Silva",
        email: user?.email || "joao.silva@email.com",
        telefone: "+244 923 456 789",
        cargo: "Administrador",
        avatar: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            setSuccess(true);
            toast.success("Perfil atualizado com sucesso!");
        } catch (err) {
            setError("Erro ao atualizar perfil");
            toast.error("Erro ao atualizar perfil");
        } finally {
            setLoading(false);
            setTimeout(() => setSuccess(false), 3000);
        }
    };

    return (
        <div className="space-y-6">
            <AnimatePresence>
                {success && (
                    <AlertMessage
                        type="success"
                        message="Alterações salvas com sucesso!"
                        colors={colors}
                    />
                )}
                {error && <AlertMessage type="error" message={error} colors={colors} />}
            </AnimatePresence>

            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                    <CardTitle style={{ color: colors.primary }}>
                        Informações do Perfil
                    </CardTitle>
                    <CardDescription style={{ color: colors.textSecondary }}>
                        Atualize suas informações pessoais
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                        <Avatar className="w-20 h-20">
                            <AvatarImage src={form.avatar} />
                            <AvatarFallback
                                style={{ backgroundColor: colors.secondary, color: "white" }}
                            >
                                {form.nome
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                            <Button
                                variant="outline"
                                size="sm"
                                style={{ borderColor: colors.border, color: colors.text }}
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Alterar foto
                            </Button>
                            <p className="text-xs" style={{ color: colors.textSecondary }}>
                                JPG, PNG ou GIF. Máximo 2MB.
                            </p>
                        </div>
                    </div>

                    <Separator style={{ backgroundColor: colors.border }} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                            label="Nome completo"
                            name="nome"
                            value={form.nome}
                            onChange={handleChange}
                            colors={colors}
                        />
                        <FormInput
                            label="E-mail"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            colors={colors}
                        />
                        <FormInput
                            label="Telefone"
                            name="telefone"
                            value={form.telefone}
                            onChange={handleChange}
                            colors={colors}
                        />
                        <FormInput
                            label="Cargo"
                            name="cargo"
                            value={form.cargo}
                            onChange={handleChange}
                            colors={colors}
                        />
                    </div>
                </CardContent>
                <CardFooter
                    className="flex justify-end border-t pt-6"
                    style={{ borderColor: colors.border }}
                >
                    <SaveButton onClick={handleSubmit} loading={loading} colors={colors} />
                </CardFooter>
            </Card>

            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                    <CardTitle style={{ color: colors.primary }}>
                        Preferências Regionais
                    </CardTitle>
                    <CardDescription style={{ color: colors.textSecondary }}>
                        Configure idioma e fuso horário
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label style={{ color: colors.text }}>Idioma</Label>
                            <Select defaultValue="pt">
                                <SelectTrigger
                                    style={{
                                        backgroundColor: colors.card,
                                        borderColor: colors.border,
                                    }}
                                >
                                    <SelectValue placeholder="Selecione o idioma" />
                                </SelectTrigger>
                                <SelectContent
                                    style={{
                                        backgroundColor: colors.card,
                                        borderColor: colors.border,
                                    }}
                                >
                                    <SelectItem value="pt">Português (Angola)</SelectItem>
                                    <SelectItem value="pt-br">Português (Brasil)</SelectItem>
                                    <SelectItem value="en">English</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label style={{ color: colors.text }}>Fuso horário</Label>
                            <Select defaultValue="africa/luanda">
                                <SelectTrigger
                                    style={{
                                        backgroundColor: colors.card,
                                        borderColor: colors.border,
                                    }}
                                >
                                    <SelectValue placeholder="Selecione o fuso" />
                                </SelectTrigger>
                                <SelectContent
                                    style={{
                                        backgroundColor: colors.card,
                                        borderColor: colors.border,
                                    }}
                                >
                                    <SelectItem value="africa/luanda">
                                        Africa/Luanda (GMT+1)
                                    </SelectItem>
                                    <SelectItem value="europe/lisbon">
                                        Europe/Lisbon (GMT+0)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const EmpresaTab = ({ colors }: { colors: ThemeColors }) => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [form, setForm] = useState<EmpresaFormData>({
        nome: "Minha Empresa, Lda",
        nif: "123456789LA000",
        email: "geral@minhaempresa.ao",
        telefone: "+244 222 123 456",
        endereco: "Rua Principal, 123, Luanda, Angola",
        website: "www.minhaempresa.ao",
        logo: "",
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            setSuccess(true);
            toast.success("Dados da empresa atualizados!");
        } finally {
            setLoading(false);
            setTimeout(() => setSuccess(false), 3000);
        }
    };

    return (
        <div className="space-y-6">
            <AnimatePresence>
                {success && (
                    <AlertMessage
                        type="success"
                        message="Dados salvos com sucesso!"
                        colors={colors}
                    />
                )}
            </AnimatePresence>

            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                    <CardTitle style={{ color: colors.primary }}>Dados da Empresa</CardTitle>
                    <CardDescription style={{ color: colors.textSecondary }}>
                        Informações para documentos fiscais
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                            label="Nome da Empresa"
                            name="nome"
                            value={form.nome}
                            onChange={handleChange}
                            colors={colors}
                        />
                        <FormInput
                            label="NIF"
                            name="nif"
                            value={form.nif}
                            onChange={handleChange}
                            colors={colors}
                        />
                        <FormInput
                            label="E-mail"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            colors={colors}
                        />
                        <FormInput
                            label="Telefone"
                            name="telefone"
                            value={form.telefone}
                            onChange={handleChange}
                            colors={colors}
                        />
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="endereco" style={{ color: colors.text }}>
                                Endereço
                            </Label>
                            <Textarea
                                id="endereco"
                                name="endereco"
                                value={form.endereco}
                                onChange={handleChange}
                                rows={3}
                                style={{
                                    backgroundColor: colors.card,
                                    borderColor: colors.border,
                                    color: colors.text,
                                }}
                            />
                        </div>
                        <FormInput
                            label="Website"
                            name="website"
                            value={form.website}
                            onChange={handleChange}
                            colors={colors}
                        />
                    </div>
                </CardContent>
                <CardFooter
                    className="flex justify-end border-t pt-6"
                    style={{ borderColor: colors.border }}
                >
                    <SaveButton onClick={handleSubmit} loading={loading} colors={colors} />
                </CardFooter>
            </Card>

            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                    <CardTitle style={{ color: colors.primary }}>
                        Configurações Fiscais
                    </CardTitle>
                    <CardDescription style={{ color: colors.textSecondary }}>
                        Padrões para emissão de documentos
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                            label="Série padrão"
                            defaultValue="FT"
                            colors={colors}
                        />
                        <FormInput
                            label="IVA padrão (%)"
                            type="number"
                            defaultValue="14"
                            colors={colors}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const SegurancaTab = ({ colors }: { colors: ThemeColors }) => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showAtual, setShowAtual] = useState(false);
    const [showNova, setShowNova] = useState(false);
    const [showConfirmar, setShowConfirmar] = useState(false);

    const [form, setForm] = useState<SenhaFormData>({
        senha_atual: "",
        nova_senha: "",
        confirmar_senha: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const getStrength = (senha: string) => {
        if (!senha) return { color: colors.border, text: "", progress: 0 };
        if (senha.length < 6)
            return { color: colors.danger, text: "Fraca", progress: 33 };
        if (senha.length < 10)
            return { color: colors.warning, text: "Média", progress: 66 };
        return { color: colors.success, text: "Forte", progress: 100 };
    };

    const strength = getStrength(form.nova_senha);

    const handleSubmit = async () => {
        if (form.nova_senha !== form.confirmar_senha) {
            toast.error("As senhas não coincidem");
            return;
        }
        if (form.nova_senha.length < 6) {
            toast.error("Mínimo 6 caracteres");
            return;
        }

        setLoading(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            setSuccess(true);
            toast.success("Senha alterada!");
            setForm({ senha_atual: "", nova_senha: "", confirmar_senha: "" });
        } finally {
            setLoading(false);
            setTimeout(() => setSuccess(false), 3000);
        }
    };

    return (
        <div className="space-y-6">
            <AnimatePresence>
                {success && (
                    <AlertMessage
                        type="success"
                        message="Senha alterada com sucesso!"
                        colors={colors}
                    />
                )}
            </AnimatePresence>

            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                    <CardTitle style={{ color: colors.primary }}>Alterar Senha</CardTitle>
                    <CardDescription style={{ color: colors.textSecondary }}>
                        Atualize sua senha regularmente
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <PasswordInput
                        label="Senha atual"
                        name="senha_atual"
                        value={form.senha_atual}
                        onChange={handleChange}
                        show={showAtual}
                        setShow={setShowAtual}
                        colors={colors}
                    />

                    <PasswordInput
                        label="Nova senha"
                        name="nova_senha"
                        value={form.nova_senha}
                        onChange={handleChange}
                        show={showNova}
                        setShow={setShowNova}
                        colors={colors}
                    />

                    {form.nova_senha && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span style={{ color: colors.textSecondary }}>
                                    Força da senha:
                                </span>
                                <span style={{ color: strength.color }}>{strength.text}</span>
                            </div>
                            <Progress
                                value={strength.progress}
                                style={{ backgroundColor: colors.border }}
                                // @ts-ignore
                                indicatorStyle={{ backgroundColor: strength.color }}
                            />
                        </div>
                    )}

                    <PasswordInput
                        label="Confirmar nova senha"
                        name="confirmar_senha"
                        value={form.confirmar_senha}
                        onChange={handleChange}
                        show={showConfirmar}
                        setShow={setShowConfirmar}
                        colors={colors}
                    />

                    {form.nova_senha &&
                        form.confirmar_senha &&
                        form.nova_senha !== form.confirmar_senha && (
                            <p className="text-sm" style={{ color: colors.danger }}>
                                As senhas não coincidem
                            </p>
                        )}
                </CardContent>
                <CardFooter
                    className="flex justify-end border-t pt-6"
                    style={{ borderColor: colors.border }}
                >
                    <SaveButton
                        onClick={handleSubmit}
                        loading={loading}
                        colors={colors}
                        disabled={!form.senha_atual || !form.nova_senha || !form.confirmar_senha}
                    >
                        Alterar senha
                    </SaveButton>
                </CardFooter>
            </Card>

            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                    <CardTitle style={{ color: colors.primary }}>
                        Autenticação 2FA
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[
                        { label: "Autenticação 2FA", desc: "Código adicional de segurança", checked: false },
                        { label: "Alertas de login", desc: "Notificar novos dispositivos", checked: true },
                    ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="font-medium" style={{ color: colors.text }}>
                                    {item.label}
                                </p>
                                <p className="text-sm" style={{ color: colors.textSecondary }}>
                                    {item.desc}
                                </p>
                            </div>
                            <Switch
                                defaultChecked={item.checked}
                                style={{
                                    backgroundColor: item.checked ? colors.success : colors.border,
                                }}
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
};

const NotificacoesTab = ({ colors }: { colors: ThemeColors }) => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [form, setForm] = useState<NotificacoesFormData>({
        email_notificacoes: true,
        sms_notificacoes: false,
        push_notificacoes: true,
        marketing_emails: false,
        relatorios_automaticos: true,
        alertas_estoque: true,
        alertas_pagamentos: true,
    });

    const handleChange = (name: keyof NotificacoesFormData) => (checked: boolean) => {
        setForm((prev) => ({ ...prev, [name]: checked }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            setSuccess(true);
            toast.success("Preferências atualizadas!");
        } finally {
            setLoading(false);
            setTimeout(() => setSuccess(false), 3000);
        }
    };

    const canais = [
        { key: "email_notificacoes", label: "E-mail", desc: "Notificações por e-mail" },
        { key: "sms_notificacoes", label: "SMS", desc: "Notificações por SMS" },
        { key: "push_notificacoes", label: "Push", desc: "Notificações no navegador" },
    ] as const;

    const tipos = [
        { key: "alertas_estoque", label: "Alertas de estoque", desc: "Produtos com estoque baixo" },
        { key: "alertas_pagamentos", label: "Alertas de pagamento", desc: "Faturas próximas do vencimento" },
        { key: "relatorios_automaticos", label: "Relatórios automáticos", desc: "Relatórios periódicos por e-mail" },
        { key: "marketing_emails", label: "Marketing", desc: "Novidades e ofertas" },
    ] as const;

    return (
        <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <CardHeader>
                <CardTitle style={{ color: colors.primary }}>
                    Preferências de Notificação
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <AnimatePresence>
                    {success && (
                        <AlertMessage
                            type="success"
                            message="Preferências salvas!"
                            colors={colors}
                        />
                    )}
                </AnimatePresence>

                <div className="space-y-4">
                    <h3 className="font-medium" style={{ color: colors.text }}>
                        Canais
                    </h3>
                    <div className="space-y-3">
                        {canais.map((item) => (
                            <div key={item.key} className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium" style={{ color: colors.text }}>
                                        {item.label}
                                    </p>
                                    <p className="text-xs" style={{ color: colors.textSecondary }}>
                                        {item.desc}
                                    </p>
                                </div>
                                <Switch
                                    checked={form[item.key]}
                                    onCheckedChange={handleChange(item.key)}
                                    style={{
                                        backgroundColor: form[item.key] ? colors.success : colors.border,
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <Separator style={{ backgroundColor: colors.border }} />

                <div className="space-y-4">
                    <h3 className="font-medium" style={{ color: colors.text }}>
                        Tipos
                    </h3>
                    <div className="space-y-3">
                        {tipos.map((item) => (
                            <div key={item.key} className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium" style={{ color: colors.text }}>
                                        {item.label}
                                    </p>
                                    <p className="text-xs" style={{ color: colors.textSecondary }}>
                                        {item.desc}
                                    </p>
                                </div>
                                <Switch
                                    checked={form[item.key]}
                                    onCheckedChange={handleChange(item.key)}
                                    style={{
                                        backgroundColor: form[item.key] ? colors.success : colors.border,
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
            <CardFooter
                className="flex justify-end border-t pt-6"
                style={{ borderColor: colors.border }}
            >
                <SaveButton onClick={handleSubmit} loading={loading} colors={colors}>
                    Salvar preferências
                </SaveButton>
            </CardFooter>
        </Card>
    );
};

const SistemaTab = ({ colors, theme, toggleTheme }: {
    colors: ThemeColors;
    theme: string;
    toggleTheme: () => void;
}) => {
    const handleExportar = () => toast.success("Exportação iniciada! Verifique seu e-mail.");
    const handleImportar = () => toast.info("Em desenvolvimento...");
    const handleLimparCache = () => toast.success("Cache limpo!");

    return (
        <div className="space-y-6">
            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                    <CardTitle style={{ color: colors.primary }}>Aparência</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="font-medium" style={{ color: colors.text }}>
                                Tema
                            </p>
                            <p className="text-sm" style={{ color: colors.textSecondary }}>
                                Alterne entre claro e escuro
                            </p>
                        </div>
                        <Button
                            onClick={toggleTheme}
                            variant="outline"
                            className="gap-2"
                            style={{ borderColor: colors.border, color: colors.text }}
                        >
                            {theme === "dark" ? (
                                <Sun className="w-4 h-4" />
                            ) : (
                                <Moon className="w-4 h-4" />
                            )}
                            {theme === "dark" ? "Tema Claro" : "Tema Escuro"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                    <CardTitle style={{ color: colors.primary }}>Backup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { icon: Download, label: "Exportar", onClick: handleExportar },
                            { icon: Upload, label: "Importar", onClick: handleImportar },
                            { icon: RefreshCcw, label: "Limpar cache", onClick: handleLimparCache },
                        ].map((btn) => (
                            <Button
                                key={btn.label}
                                onClick={btn.onClick}
                                variant="outline"
                                className="gap-2"
                                style={{ borderColor: colors.border, color: colors.text }}
                            >
                                <btn.icon className="w-4 h-4" />
                                {btn.label}
                            </Button>
                        ))}
                    </div>
                    <div
                        className="p-4 rounded-lg text-sm"
                        style={{
                            backgroundColor: colors.hover,
                            color: colors.textSecondary,
                        }}
                    >
                        Último backup: {new Date().toLocaleDateString("pt-PT")} às 23:00
                    </div>
                </CardContent>
            </Card>

            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                    <CardTitle style={{ color: colors.primary }}>Sessões Ativas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[
                        {
                            device: "Chrome • Windows",
                            location: "Luanda, Angola • Ativo agora",
                            current: true,
                        },
                        {
                            device: "Safari • iPhone",
                            location: "Luanda, Angola • há 2 dias",
                            current: false,
                        },
                    ].map((session, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between p-3 rounded-lg"
                            style={{ backgroundColor: colors.hover }}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="p-2 rounded-full"
                                    style={{
                                        backgroundColor: session.current
                                            ? `${colors.success}20`
                                            : `${colors.textSecondary}20`,
                                    }}
                                >
                                    <Globe
                                        className="w-4 h-4"
                                        style={{
                                            color: session.current ? colors.success : colors.textSecondary,
                                        }}
                                    />
                                </div>
                                <div>
                                    <p className="font-medium" style={{ color: colors.text }}>
                                        {session.device}
                                    </p>
                                    <p className="text-xs" style={{ color: colors.textSecondary }}>
                                        {session.location}
                                    </p>
                                </div>
                            </div>
                            {session.current ? (
                                <Badge
                                    style={{
                                        backgroundColor: `${colors.success}20`,
                                        color: colors.success,
                                    }}
                                >
                                    Atual
                                </Badge>
                            ) : (
                                <Button variant="ghost" size="sm" style={{ color: colors.danger }}>
                                    <LogOut className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                    <CardTitle style={{ color: colors.danger }}>Zona de Perigo</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="font-medium" style={{ color: colors.danger }}>
                                Excluir conta
                            </p>
                            <p className="text-sm" style={{ color: colors.textSecondary }}>
                                Ação irreversível. Todos os dados serão perdidos.
                            </p>
                        </div>
                        <Button
                            variant="destructive"
                            className="gap-2"
                            style={{ backgroundColor: colors.danger }}
                            onClick={() => toast.error("Funcionalidade restrita")}
                        >
                            <Trash2 className="w-4 h-4" />
                            Excluir
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// ===== MAIN PAGE =====
export default function ConfiguracoesPage() {
    const colors = useThemeColors();
    const { theme, toggleTheme } = useTheme();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("perfil");

    const tabs = [
        { value: "perfil", icon: User, label: "Perfil" },
        { value: "empresa", icon: Building2, label: "Empresa" },
        { value: "seguranca", icon: Shield, label: "Segurança" },
        { value: "notificacoes", icon: Bell, label: "Notificações" },
        { value: "sistema", icon: Settings, label: "Sistema" },
    ];

    return (
        <MainEmpresa>
            <div
                className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 min-h-screen"
                style={{ backgroundColor: colors.background }}
            >
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Settings className="w-8 h-8" style={{ color: colors.primary }} />
                    <div>
                        <h1
                            className="text-2xl md:text-3xl font-bold"
                            style={{ color: colors.primary }}
                        >
                            Configurações
                        </h1>
                        <p className="text-sm" style={{ color: colors.textSecondary }}>
                            Gerencie sua conta e preferências do sistema
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="space-y-6"
                >
                    <TabsList
                        className="w-full justify-start overflow-x-auto flex-nowrap"
                        style={{ backgroundColor: colors.card, borderColor: colors.border }}
                    >
                        {tabs.map((tab) => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="data-[state=active]:bg-opacity-20 gap-2"
                                style={{ color: colors.textSecondary }}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="perfil">
                        <PerfilTab colors={colors} user={user} />
                    </TabsContent>

                    <TabsContent value="empresa">
                        <EmpresaTab colors={colors} />
                    </TabsContent>

                    <TabsContent value="seguranca">
                        <SegurancaTab colors={colors} />
                    </TabsContent>

                    <TabsContent value="notificacoes">
                        <NotificacoesTab colors={colors} />
                    </TabsContent>

                    <TabsContent value="sistema">
                        <SistemaTab
                            colors={colors}
                            theme={theme}
                            toggleTheme={toggleTheme}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </MainEmpresa>
    );
}