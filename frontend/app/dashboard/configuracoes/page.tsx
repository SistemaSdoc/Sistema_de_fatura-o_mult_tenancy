"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Eye, EyeOff, Save, Upload, Loader2, Trash2, Sun, Moon,
    Download, RefreshCcw, Globe, LogOut, Settings, Bell, User,
    Building2, Plus, Pencil, Search, Shield, UserCheck, UserX,
    MoreVertical, AlertCircle,
} from "lucide-react";
import MainEmpresa from "@/app/components/MainEmpresa";
import { useThemeColors, useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/authprovider";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Switch }   from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge }    from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import {
    fetchUsers, registerUser, updateUser, deleteUser,
    User as UserType, RegisterData, UpdateUserData,
} from "@/services/User";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ThemeColors {
    text: string; textSecondary: string; background: string;
    card: string; border: string; primary: string; secondary: string;
    success: string; warning: string; danger: string; error: string; hover: string; fp: string;
}

type RoleType = "admin" | "operador" | "contablista";

interface PassForm {
    nova_senha: string;
    confirmar_senha: string;
}

interface NotifForm {
    email_notificacoes: boolean; sms_notificacoes: boolean;
    push_notificacoes: boolean;  marketing_emails: boolean;
    relatorios_automaticos: boolean; alertas_estoque: boolean;
    alertas_pagamentos: boolean;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const initials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const formatDate = (d?: string | null) =>
    d ? new Date(d).toLocaleString("pt-PT") : "—";

// ─── REUSABLE COMPONENTS ──────────────────────────────────────────────────────

const FormInput = ({
    label, name, value, onChange, type = "text", colors, disabled, placeholder,
}: {
    label: string; name: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string; colors: ThemeColors; disabled?: boolean; placeholder?: string;
}) => (
    <div className="space-y-2">
        <Label htmlFor={name} style={{ color: colors.text }}>{label}</Label>
        <Input
            id={name} name={name} type={type} value={value}
            onChange={onChange} disabled={disabled} placeholder={placeholder}
            style={{
                backgroundColor: disabled ? colors.hover : colors.card,
                borderColor: colors.border,
                color: colors.text,
            }}
        />
    </div>
);

const PasswordInput = ({
    label, name, value, onChange, show, setShow, colors,
}: {
    label: string; name: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    show: boolean; setShow: (v: boolean) => void; colors: ThemeColors;
}) => (
    <div className="space-y-2">
        <Label htmlFor={name} style={{ color: colors.text }}>{label}</Label>
        <div className="relative">
            <Input
                id={name} name={name} type={show ? "text" : "password"}
                value={value} onChange={onChange}
                style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
            />
            <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: colors.textSecondary }}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    </div>
);

const SaveButton = ({
    onClick, loading, colors, children = "Salvar alterações", disabled,
}: {
    onClick: () => void | Promise<void>; loading: boolean;
    colors: ThemeColors; children?: string; disabled?: boolean;
}) => (
    <Button
        type="button"
        onClick={onClick} disabled={loading || disabled}
        className="gap-2 text-white" style={{ backgroundColor: colors.primary }}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {loading ? "Salvando..." : children}
    </Button>
);

const RoleBadge = ({ role, colors }: { role: string; colors: ThemeColors }) => {
    const map: Record<string, { label: string; color: string }> = {
        admin:       { label: "Admin",        color: colors.secondary  },
        operador:    { label: "Operador",     color: colors.secondary },
        contablista: { label: "Contabilista", color: colors.success },
    };
    const c = map[role] ?? { label: role, color: colors.textSecondary };
    return (
        <Badge style={{ backgroundColor: `${c.color}20`, color: c.color, border: `1px solid ${c.color}40` }}>
            {c.label}
        </Badge>
    );
};

// ─── MODAL CRIAR / EDITAR UTILIZADOR ─────────────────────────────────────────

const UserModal = ({
    open, onClose, onSaved, editUser, colors,
}: {
    open: boolean; onClose: () => void; onSaved: () => void;
    editUser?: UserType | null; colors: ThemeColors;
}) => {
    const isEdit = !!editUser;
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    // ── Erros de validação inline ──────────────────────────────────────────
    const [errors, setErrors] = useState<{
        name?: string; email?: string; password?: string;
    }>({});

    const [form, setForm] = useState({
        name: "", email: "", password: "",
        role: "operador" as RoleType,
        ativo: true,
    });

    useEffect(() => {
        if (editUser) {
            setForm({
                name:     editUser.name,
                email:    editUser.email,
                password: "",
                role:     editUser.role as RoleType,
                ativo:    editUser.ativo,
            });
        } else {
            setForm({ name: "", email: "", password: "", role: "operador", ativo: true });
        }
        setErrors({});
        setShowPass(false);
    }, [editUser, open]);

    // ── Validação inline ───────────────────────────────────────────────────
    const validate = (): boolean => {
        const newErrors: typeof errors = {};

        if (!form.name.trim())
            newErrors.name = "Nome é obrigatório";

        if (!form.email.trim())
            newErrors.email = "E-mail é obrigatório";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
            newErrors.email = "E-mail inválido";

        if (!isEdit && form.password.length < 6)
            newErrors.password = "A senha deve ter no mínimo 6 caracteres";

        if (isEdit && form.password && form.password.length < 6)
            newErrors.password = "A senha deve ter no mínimo 6 caracteres";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            if (isEdit && editUser) {
                const payload: UpdateUserData = {
                    name:  form.name,
                    email: form.email,
                    role:  form.role,
                    ativo: form.ativo,
                };
                if (form.password.trim()) payload.password = form.password;
                await updateUser(editUser.id, payload);
                toast.success("Utilizador atualizado!");
            } else {
                const payload: RegisterData = {
                    name:     form.name,
                    email:    form.email,
                    password: form.password,
                    role:     form.role,
                    ativo:    form.ativo,
                };
                await registerUser(payload);
                toast.success("Utilizador criado!");
            }
            onSaved();
            onClose();
        } catch (err: unknown) {
            const errObj = err as {
                response?: { data?: { message?: string; errors?: Record<string, string[]> } };
            };
            const serverMsg = errObj?.response?.data?.message;
            const serverErrors = errObj?.response?.data?.errors;

            // Mapear erros de validação do Laravel para os campos
            if (serverErrors) {
                const mapped: typeof errors = {};
                if (serverErrors.name)     mapped.name     = serverErrors.name[0];
                if (serverErrors.email)    mapped.email    = serverErrors.email[0];
                if (serverErrors.password) mapped.password = serverErrors.password[0];
                setErrors(mapped);
            } else {
                toast.error(serverMsg ?? "Erro ao salvar utilizador");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={v => { if (!v && !loading) onClose(); }}>
            <DialogContent style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <DialogHeader>
                    <DialogTitle style={{ color: colors.primary }}>
                        {isEdit ? "Editar Utilizador" : "Novo Utilizador"}
                    </DialogTitle>
                    <DialogDescription style={{ color: colors.textSecondary }}>
                        {isEdit
                            ? "Atualize os dados do utilizador"
                            : "Preencha os dados para criar um novo utilizador"}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Nome */}
                    <div className="space-y-1">
                        <Label style={{ color: colors.text }}>Nome completo *</Label>
                        <Input
                            type="text"
                            value={form.name}
                            onChange={e => {
                                setForm(p => ({ ...p, name: e.target.value }));
                                if (errors.name) setErrors(p => ({ ...p, name: undefined }));
                            }}
                            placeholder="Ex: João Silva"
                            style={{
                                backgroundColor: colors.background,
                                borderColor: errors.name ? colors.danger : colors.border,
                                color: colors.text,
                            }}
                        />
                        {errors.name && (
                            <p className="text-xs flex items-center gap-1" style={{ color: colors.danger }}>
                                <AlertCircle className="w-3 h-3" /> {errors.name}
                            </p>
                        )}
                    </div>

                    {/* E-mail */}
                    <div className="space-y-1">
                        <Label style={{ color: colors.text }}>E-mail *</Label>
                        <Input
                            type="email"
                            value={form.email}
                            onChange={e => {
                                setForm(p => ({ ...p, email: e.target.value }));
                                if (errors.email) setErrors(p => ({ ...p, email: undefined }));
                            }}
                            placeholder="Ex: joao@empresa.com"
                            style={{
                                backgroundColor: colors.background,
                                borderColor: errors.email ? colors.danger : colors.border,
                                color: colors.text,
                            }}
                        />
                        {errors.email && (
                            <p className="text-xs flex items-center gap-1" style={{ color: colors.danger }}>
                                <AlertCircle className="w-3 h-3" /> {errors.email}
                            </p>
                        )}
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                        <Label style={{ color: colors.text }}>
                            {isEdit ? "Nova senha (em branco = não altera)" : "Senha *"}
                        </Label>
                        <div className="relative">
                            <Input
                                type={showPass ? "text" : "password"}
                                value={form.password}
                                onChange={e => {
                                    setForm(p => ({ ...p, password: e.target.value }));
                                    if (errors.password) setErrors(p => ({ ...p, password: undefined }));
                                }}
                                placeholder={isEdit ? "••••••••" : "Mínimo 6 caracteres"}
                                style={{
                                    backgroundColor: colors.background,
                                    borderColor: errors.password ? colors.danger : colors.border,
                                    color: colors.text,
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(p => !p)}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                style={{ color: colors.textSecondary }}>
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-xs flex items-center gap-1" style={{ color: colors.danger }}>
                                <AlertCircle className="w-3 h-3" /> {errors.password}
                            </p>
                        )}
                    </div>

                    {/* Role */}
                    <div className="space-y-2">
                        <Label style={{ color: colors.text }}>Função (Role)</Label>
                        <Select
                            value={form.role}
                            onValueChange={v => setForm(p => ({ ...p, role: v as RoleType }))}>
                            <SelectTrigger style={{
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                                color: colors.text,
                            }}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent style={{
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                            }}>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="operador">Operador</SelectItem>
                                <SelectItem value="contablista">Contabilista</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Ativo */}
                    <div className="flex items-center justify-between py-1">
                        <div>
                            <p className="text-sm font-medium" style={{ color: colors.text }}>
                                Conta ativa
                            </p>
                            <p className="text-xs" style={{ color: colors.textSecondary }}>
                                Utilizador pode fazer login
                            </p>
                        </div>
                        <Switch
                            checked={form.ativo}
                            onCheckedChange={v => setForm(p => ({ ...p, ativo: v }))}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                        style={{ borderColor: colors.border, color: colors.text }}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="gap-2 text-white"
                        style={{ backgroundColor: colors.primary }}>
                        {loading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Save className="w-4 h-4" />}
                        {loading ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// ─── TAB: PERFIL ──────────────────────────────────────────────────────────────

const PerfilTab = ({
    colors, user, onUserUpdated,
}: {
    colors: ThemeColors; user: UserType | null; onUserUpdated: (u: UserType) => void;
}) => {
    const [loading, setLoading]             = useState(false);
    const [passLoading, setPassLoading]     = useState(false);
    const [showNova, setShowNova]           = useState(false);
    const [showConfirmar, setShowConfirmar] = useState(false);

    const [form, setForm] = useState({
        name:  user?.name  ?? "",
        email: user?.email ?? "",
    });
    const [passForm, setPassForm] = useState<PassForm>({
        nova_senha: "", confirmar_senha: "",
    });

    useEffect(() => {
        if (user) setForm({ name: user.name, email: user.email });
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm(p => ({ ...p, [name]: value }));
    };

    const handlePassChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPassForm(p => ({ ...p, [name]: value }));
    };

    const getStrength = (s: string) => {
        if (!s)            return { color: colors.border,  text: "",      progress: 0   };
        if (s.length < 6)  return { color: colors.danger,  text: "Fraca", progress: 33  };
        if (s.length < 10) return { color: colors.warning, text: "Média", progress: 66  };
        return               { color: colors.success, text: "Forte", progress: 100 };
    };
    const strength = getStrength(passForm.nova_senha);

    const handleSavePerfil = async (): Promise<void> => {
        if (!user) return;
        setLoading(true);
        try {
            const updated = await updateUser(user.id, {
                name:  form.name,
                email: form.email,
            });
            onUserUpdated(updated);
            toast.success("Perfil atualizado!");
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })
                ?.response?.data?.message;
            toast.error(msg ?? "Erro ao atualizar perfil");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSenha = async () => {
        if (!user) return;
        if (passForm.nova_senha !== passForm.confirmar_senha)
            return toast.error("As senhas não coincidem");
        if (passForm.nova_senha.length < 6)
            return toast.error("A senha deve ter no mínimo 6 caracteres");
        setPassLoading(true);
        try {
            await updateUser(user.id, { password: passForm.nova_senha });
            toast.success("Senha alterada com sucesso!");
            setPassForm({ nova_senha: "", confirmar_senha: "" });
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })
                ?.response?.data?.message;
            toast.error(msg ?? "Erro ao alterar senha");
        } finally {
            setPassLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                    <CardTitle style={{ color: colors.secondary }} >Informações da Conta</CardTitle>
                    <CardDescription style={{ color: colors.textSecondary }}>
                        Edite o seu nome e e-mail
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">


                    <Separator style={{ backgroundColor: colors.border }} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                            label="Nome completo" name="name" value={form.name}
                            onChange={handleChange} colors={colors}
                        />
                        <FormInput
                            label="E-mail" name="email" type="email" value={form.email}
                            onChange={handleChange} colors={colors}
                        />
                    </div>

                    <Separator style={{ backgroundColor: colors.border }} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label style={{ color: colors.text }}>
                                <Shield className="w-3.5 h-3.5 inline mr-1.5" />
                                Função (Role)
                            </Label>
                            <div className="flex items-center h-10 px-3 border"
                                style={{ borderColor: colors.border, backgroundColor: colors.hover }}>
                                {user && <RoleBadge role={user.role} colors={colors} />}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label style={{ color: colors.text }}>Estado da conta</Label>
                            <div className="flex items-center h-10 px-3 border gap-2"
                                style={{ borderColor: colors.border, backgroundColor: colors.hover }}>
                                {user?.ativo
                                    ? <><UserCheck className="w-4 h-4" style={{ color: colors.success }} />
                                        <span className="text-sm" style={{ color: colors.success }}>Ativa</span></>
                                    : <><UserX className="w-4 h-4" style={{ color: colors.danger }} />
                                        <span className="text-sm" style={{ color: colors.danger }}>Inativa</span></>
                                }
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label style={{ color: colors.text }}>
                                <Building2 className="w-3.5 h-3.5 inline mr-1.5" />
                                Empresa
                            </Label>
                            <div className="flex items-center h-10 px-3 border"
                                style={{ borderColor: colors.border, backgroundColor: colors.hover }}>
                                <span className="text-sm" style={{ color: colors.textSecondary }}>
                                    {user?.empresa?.nome ?? "—"}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label style={{ color: colors.text }}>Último login</Label>
                            <div className="flex items-center h-10 px-3 border"
                                style={{ borderColor: colors.border, backgroundColor: colors.hover }}>
                                <span className="text-sm" style={{ color: colors.textSecondary }}>
                                    {formatDate(user?.ultimo_login)}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="flex justify-end border-t pt-6"
                    style={{ borderColor: colors.border }}>
                    <SaveButton onClick={() => void handleSavePerfil()} loading={loading} colors={colors} />
                </CardFooter>
            </Card>

<Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
    
    <CardHeader>
        <CardTitle style={{ color: colors.secondary }}>
            Alterar Senha
        </CardTitle>
        <CardDescription style={{ color: colors.textSecondary }}>
            Define uma nova senha para a tua conta
        </CardDescription>
    </CardHeader>

    <CardContent className="space-y-4">

        {/* Inputs lado a lado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PasswordInput
                label="Nova senha"
                name="nova_senha"
                value={passForm.nova_senha}
                onChange={handlePassChange}
                show={showNova}
                setShow={setShowNova}
                colors={colors}
            />

            <PasswordInput
                label="Confirmar nova senha"
                name="confirmar_senha"
                value={passForm.confirmar_senha}
                onChange={handlePassChange}
                show={showConfirmar}
                setShow={setShowConfirmar}
                colors={colors}
            />
        </div>

        {/* Força da senha em baixo */}
        {passForm.nova_senha && (
            <div className="space-y-1">
                <div className="flex justify-between text-xs">
                    <span style={{ color: colors.textSecondary }}>Força:</span>
                    <span style={{ color: strength.color }}>{strength.text}</span>
                </div>
                <div
                    className="h-1.5 overflow-hidden"
                    style={{ backgroundColor: colors.border }}
                >
                    <div
                        className="h-full transition-all duration-300"
                        style={{
                            width: `${strength.progress}%`,
                            backgroundColor: strength.color
                        }}
                    />
                </div>
            </div>
        )}

        {/* Validação */}
        {passForm.nova_senha &&
            passForm.confirmar_senha &&
            passForm.nova_senha !== passForm.confirmar_senha && (
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
            onClick={() => void handleSaveSenha()}
            loading={passLoading}
            colors={colors}
            disabled={
                !passForm.nova_senha ||
                !passForm.confirmar_senha ||
                passForm.nova_senha !== passForm.confirmar_senha
            }
        >
            Alterar senha
        </SaveButton>
    </CardFooter>

</Card>
        </div>
    );
};

// ─── TAB: EMPRESA ─────────────────────────────────────────────────────────────

const EmpresaTab = ({ colors, user }: { colors: ThemeColors; user: UserType | null }) => {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        nome: "", nif: "", email: "", telefone: "",
        endereco: "", website: "", serie_padrao: "FT", iva_padrao: "14",
    });

    useEffect(() => {
        if (user?.empresa) {
            setForm(p => ({
                ...p,
                nome:     user.empresa!.nome      ?? "",
                nif:      user.empresa!.nif        ?? "",
                email:    user.empresa!.email      ?? "",
                telefone: user.empresa!.telefone   ?? "",
                endereco: user.empresa!.endereco   ?? "",
            }));
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(p => ({ ...p, [name]: value }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await new Promise(r => setTimeout(r, 10));
            toast.success("Dados da empresa atualizados!");
        } catch {
            toast.error("Erro ao atualizar empresa");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                    <CardTitle style={{ color: colors.secondary }}>Dados da Empresa</CardTitle>
                    <CardDescription style={{ color: colors.textSecondary }}>
                        Informações para documentos fiscais
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput label="Nome" name="nome" value={form.nome} onChange={handleChange} colors={colors} />
                        <FormInput label="NIF" name="nif" value={form.nif} onChange={handleChange} colors={colors} />
                        <FormInput label="E-mail" name="email" type="email" value={form.email} onChange={handleChange} colors={colors} />
                        <FormInput label="Telefone" name="telefone" value={form.telefone} onChange={handleChange} colors={colors} />
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="endereco" style={{ color: colors.text }}>Endereço</Label>
                            <Textarea
                                id="endereco" name="endereco" value={form.endereco}
                                onChange={handleChange} rows={3}
                                style={{
                                    backgroundColor: colors.card,
                                    borderColor: colors.border,
                                    color: colors.text,
                                }}
                            />
                        </div>
                        <FormInput label="Website" name="website" value={form.website} onChange={handleChange} colors={colors} />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t pt-6" style={{ borderColor: colors.border }}>
                    <SaveButton onClick={handleSubmit} loading={loading} colors={colors} />
                </CardFooter>
            </Card>

            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                    <CardTitle style={{ color: colors.primary }}>Configurações Fiscais</CardTitle>
                    <CardDescription style={{ color: colors.textSecondary }}>
                        Padrões para emissão de documentos
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput label="Série padrão" name="serie_padrao" value={form.serie_padrao} onChange={handleChange} colors={colors} />
                        <FormInput label="IVA padrão (%)" name="iva_padrao" type="number" value={form.iva_padrao} onChange={handleChange} colors={colors} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// ─── TAB: UTILIZADORES ────────────────────────────────────────────────────────

const UsuariosTab = ({
    colors, currentUser,
}: {
    colors: ThemeColors; currentUser: UserType | null;
}) => {
    const [users, setUsers]                 = useState<UserType[]>([]);
    const [loading, setLoading]             = useState(true);
    const [loadError, setLoadError]         = useState<string | null>(null);
    const [search, setSearch]               = useState("");
    const [roleFilter, setRoleFilter]       = useState("todos");
    const [modalOpen, setModalOpen]         = useState(false);
    const [editTarget, setEditTarget]       = useState<UserType | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<UserType | null>(null);
    const [deleting, setDeleting]           = useState(false);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const data = await fetchUsers();
            setUsers(data);
        } catch (err: unknown) {
            const errObj = err as {
                response?: { data?: { message?: string }; status?: number };
                message?: string;
            };
            const status = errObj?.response?.status;
            const msg =
                status === 403 ? "Sem permissão para listar utilizadores" :
                status === 401 ? "Sessão expirada — faça login novamente" :
                errObj?.response?.data?.message ?? errObj?.message ?? "Erro ao carregar utilizadores";

            setLoadError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void loadUsers(); }, [loadUsers]);

    const filtered = users.filter(u => {
        const matchSearch =
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase());
        const matchRole = roleFilter === "todos" || u.role === roleFilter;
        return matchSearch && matchRole;
    });

    const openCreate = () => { setEditTarget(null); setModalOpen(true); };
    const openEdit   = (u: UserType) => { setEditTarget(u); setModalOpen(true); };
    const closeModal = () => { setModalOpen(false); setEditTarget(null); };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        setDeleting(true);
        try {
            await deleteUser(deleteConfirm.id);
            toast.success("Utilizador removido!");
            setDeleteConfirm(null);
            void loadUsers();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })
                ?.response?.data?.message;
            toast.error(msg ?? "Erro ao remover utilizador");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <CardTitle style={{ color: colors.secondary }}>Gestão de Utilizadores</CardTitle>
                            <CardDescription style={{ color: colors.textSecondary }}>
                                Crie, edite e gerencie os utilizadores do sistema
                            </CardDescription>
                        </div>
                        <Button
                            type="button"
                            onClick={openCreate}
                            className="gap-2 text-white"
                            style={{ backgroundColor: colors.primary }}>
                            <Plus className="w-4 h-4" /> Novo Utilizador
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                                style={{ color: colors.textSecondary }} />
                            <Input
                                placeholder="Buscar por nome ou e-mail..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9"
                                style={{
                                    borderColor: colors.border,
                                    color: colors.text,
                                }}
                            />
                        </div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-full sm:w-44" style={{
                                borderColor: colors.border,
                                color: colors.text,
                            }}>
                                <SelectValue placeholder="Função" />
                            </SelectTrigger>
                            <SelectContent style={{
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                            }}>
                                <SelectItem value="todos">Todos</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="operador">Operador</SelectItem>
                                <SelectItem value="contablista">Contabilista</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Estado de erro ao carregar */}
                    {loadError && !loading && (
                        <div
                            className="flex items-center gap-3 p-4 border"
                            style={{
                                backgroundColor: `${colors.danger}10`,
                                borderColor: `${colors.danger}30`,
                            }}>
                            <AlertCircle className="w-5 h-5 shrink-0" style={{ color: colors.danger }} />
                            <div className="flex-1">
                                <p className="text-sm font-medium" style={{ color: colors.danger }}>
                                    Erro ao carregar utilizadores
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                                    {loadError}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline" size="sm"
                                onClick={() => void loadUsers()}
                                style={{ borderColor: colors.danger, color: colors.danger }}>
                                <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Tentar novamente
                            </Button>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
                        </div>
                    ) : !loadError && filtered.length === 0 ? (
                        <div className="text-center py-12" style={{ color: colors.textSecondary }}>
                            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>
                                {users.length === 0
                                    ? "Nenhum utilizador registado"
                                    : "Nenhum utilizador encontrado"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <AnimatePresence>
                                {filtered.map((u, i) => (
                                    <motion.div
                                        key={u.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="flex items-center justify-between p-4 gap-4"
                                        style={{
                                            border: `1px solid ${colors.border}`,
                                        }}>

                                        <div className="flex items-center gap-3 min-w-0">
                                            <Avatar className="w-9 h-9 shrink-0">
                                                <AvatarFallback style={{
                                                    backgroundColor: colors.secondary,
                                                    color: "white",
                                                    fontSize: "0.75rem",
                                                }}>
                                                    {initials(u.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-medium text-sm truncate"
                                                        style={{ color: colors.text }}>
                                                        {u.name}
                                                    </p>
                                                    {u.id === currentUser?.id && (
                                                        <Badge style={{
                                                            backgroundColor: `${colors.secondary}20`,
                                                            color: colors.text,
                                                            fontSize: "0.65rem",
                                                        }}>
                                                            Você
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs truncate"
                                                    style={{ color: colors.textSecondary }}>
                                                    {u.email}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <RoleBadge role={u.role} colors={colors} />

                                            <div className="hidden sm:flex items-center gap-1.5">
                                                {u.ativo
                                                    ? <><UserCheck className="w-4 h-4" style={{ color: colors.success }} />
                                                        <span className="text-xs" style={{ color: colors.success }}>Ativo</span></>
                                                    : <><UserX className="w-4 h-4" style={{ color: colors.danger }} />
                                                        <span className="text-xs" style={{ color: colors.danger }}>Inativo</span></>
                                                }
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost" size="icon" className="h-8 w-8"
                                                        style={{ color: colors.textSecondary }}>
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" style={{
                                                    backgroundColor: colors.card,
                                                    borderColor: colors.border,
                                                }}>
                                                    <DropdownMenuItem
                                                        onClick={() => openEdit(u)}
                                                        style={{ color: colors.text }}>
                                                        <Pencil className="w-4 h-4 mr-2" /> Editar
                                                    </DropdownMenuItem>
                                                    {u.id !== currentUser?.id && (
                                                        <DropdownMenuItem
                                                            onClick={() => setDeleteConfirm(u)}
                                                            style={{ color: colors.danger }}>
                                                            <Trash2 className="w-4 h-4 mr-2" /> Remover
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}

                    {!loading && !loadError && (
                        <p className="text-xs text-right" style={{ color: colors.textSecondary }}>
                            {filtered.length} de {users.length} utilizador(es)
                        </p>
                    )}
                </CardContent>
            </Card>

            <UserModal
                open={modalOpen}
                onClose={closeModal}
                onSaved={() => void loadUsers()}
                editUser={editTarget}
                colors={colors}
            />

            <Dialog open={!!deleteConfirm} onOpenChange={v => { if (!v) setDeleteConfirm(null); }}>
                <DialogContent style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <DialogHeader>
                        <DialogTitle style={{ color: colors.danger }}>Remover utilizador</DialogTitle>
                        <DialogDescription style={{ color: colors.textSecondary }}>
                            Tem certeza que deseja remover{" "}
                            <strong style={{ color: colors.text }}>{deleteConfirm?.name}</strong>?
                            Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteConfirm(null)}
                            disabled={deleting}
                            style={{ borderColor: colors.border, color: colors.text }}>
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={() => void handleDelete()}
                            disabled={deleting}
                            style={{ backgroundColor: colors.danger, color: "white" }}>
                            {deleting
                                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                : <Trash2 className="w-4 h-4 mr-2" />}
                            {deleting ? "Removendo..." : "Remover"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

// ─── TAB: NOTIFICAÇÕES ────────────────────────────────────────────────────────

const NotificacoesTab = ({ colors }: { colors: ThemeColors }) => {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<NotifForm>({
        email_notificacoes: true,  sms_notificacoes: false,
        push_notificacoes: true,   marketing_emails: false,
        relatorios_automaticos: true, alertas_estoque: true,
        alertas_pagamentos: true,
    });

    const canais = [
        { key: "email_notificacoes" as const, label: "E-mail", desc: "Notificações por e-mail"   },
        { key: "sms_notificacoes"   as const, label: "SMS",    desc: "Notificações por SMS"      },
        { key: "push_notificacoes"  as const, label: "Push",   desc: "Notificações no navegador" },
    ];
    const tipos = [
        { key: "alertas_estoque"        as const, label: "Alertas de estoque",   desc: "Produtos com estoque baixo"       },
        { key: "alertas_pagamentos"     as const, label: "Alertas de pagamento", desc: "Faturas próximas do vencimento"   },
        { key: "relatorios_automaticos" as const, label: "Relatórios",           desc: "Relatórios periódicos por e-mail" },
        { key: "marketing_emails"       as const, label: "Marketing",            desc: "Novidades e ofertas"              },
    ];

    return (
        <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <CardHeader>
                <CardTitle style={{ color: colors.primary }}>Preferências de Notificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {[{ title: "Canais", items: canais }, { title: "Tipos", items: tipos }].map((group, gi) => (
                    <React.Fragment key={gi}>
                        {gi > 0 && <Separator style={{ backgroundColor: colors.border }} />}
                        <div className="space-y-4">
                            <h3 className="font-medium" style={{ color: colors.text }}>{group.title}</h3>
                            <div className="space-y-3">
                                {group.items.map(item => (
                                    <div key={item.key} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium" style={{ color: colors.text }}>
                                                {item.label}
                                            </p>
                                            <p className="text-xs" style={{ color: colors.textSecondary }}>
                                                {item.desc}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={form[item.key]}
                                            onCheckedChange={v => setForm(p => ({ ...p, [item.key]: v }))}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </React.Fragment>
                ))}
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-6" style={{ borderColor: colors.border }}>
                <SaveButton
                    onClick={async () => {
                        setLoading(true);
                        await new Promise(r => setTimeout(r, 10));
                        toast.success("Preferências salvas!");
                        setLoading(false);
                    }}
                    loading={loading} colors={colors}>
                    Salvar preferências
                </SaveButton>
            </CardFooter>
        </Card>
    );
};

// ─── TAB: SISTEMA ─────────────────────────────────────────────────────────────

const SistemaTab = ({
    colors, theme, toggleTheme,
}: {
    colors: ThemeColors; theme: string; toggleTheme: () => void;
}) => (
    <div className="space-y-6">
        <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <CardHeader>
                <CardTitle style={{ color: colors.primary }}>Aparência</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium" style={{ color: colors.text }}>Tema</p>
                        <p className="text-sm" style={{ color: colors.textSecondary }}>
                            Alterne entre claro e escuro
                        </p>
                    </div>
                    <Button type="button" onClick={toggleTheme} variant="outline" className="gap-2"
                        style={{ borderColor: colors.border, color: colors.text }}>
                        {theme === "dark"
                            ? <><Sun className="w-4 h-4" /> Tema Claro</>
                            : <><Moon className="w-4 h-4" /> Tema Escuro</>}
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
                        { icon: Download,   label: "Exportar",     fn: () => toast.success("Exportação iniciada!") },
                        { icon: Upload,     label: "Importar",     fn: () => toast.info("Em desenvolvimento...")   },
                        { icon: RefreshCcw, label: "Limpar cache", fn: () => toast.success("Cache limpo!")         },
                    ].map(btn => (
                        <Button key={btn.label} type="button" onClick={btn.fn} variant="outline" className="gap-2"
                            style={{ borderColor: colors.border, color: colors.text }}>
                            <btn.icon className="w-4 h-4" /> {btn.label}
                        </Button>
                    ))}
                </div>
                <div className="p-4 text-sm"
                    style={{ backgroundColor: colors.hover, color: colors.textSecondary }}>
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
                    { device: "Chrome • Windows", location: "Luanda, Angola • Ativo agora", current: true  },
                    { device: "Safari • iPhone",  location: "Luanda, Angola • há 2 dias",   current: false },
                ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 "
                        style={{ backgroundColor: colors.hover }}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 " style={{
                                backgroundColor: s.current
                                    ? `${colors.success}20`
                                    : `${colors.textSecondary}20`,
                            }}>
                                <Globe className="w-4 h-4" style={{
                                    color: s.current ? colors.success : colors.textSecondary,
                                }} />
                            </div>
                            <div>
                                <p className="font-medium" style={{ color: colors.text }}>{s.device}</p>
                                <p className="text-xs" style={{ color: colors.textSecondary }}>{s.location}</p>
                            </div>
                        </div>
                        {s.current
                            ? <Badge style={{ backgroundColor: `${colors.success}20`, color: colors.success }}>Atual</Badge>
                            : <Button type="button" variant="ghost" size="sm" style={{ color: colors.danger }}>
                                <LogOut className="w-4 h-4" />
                              </Button>
                        }
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
                    <div>
                        <p className="font-medium" style={{ color: colors.danger }}>Excluir conta</p>
                        <p className="text-sm" style={{ color: colors.textSecondary }}>
                            Ação irreversível. Todos os dados serão perdidos.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="destructive" className="gap-2"
                        style={{ backgroundColor: colors.danger }}
                        onClick={() => toast.error("Funcionalidade restrita")}>
                        <Trash2 className="w-4 h-4" /> Excluir
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
    const colors = useThemeColors();
    const { theme, toggleTheme } = useTheme();
    const { user, setUser } = useAuth();
    const [activeTab, setActiveTab] = useState("perfil");

    const handleUserUpdated = useCallback((updated: UserType) => {
        if (setUser) setUser(updated);
    }, [setUser]);

    const tabs = [
        { value: "perfil",       icon: User,      label: "Perfil"       },
        { value: "empresa",      icon: Building2, label: "Empresa"      },
        { value: "usuarios",     icon: User,      label: "Utilizadores" },
        { value: "notificacoes", icon: Bell,      label: "Notificações" },
        { value: "sistema",      icon: Settings,  label: "Sistema"      },
    ];

    return (
        <MainEmpresa>
            <div
                className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 min-h-screen"
                style={{ backgroundColor: colors.background }}>

                <div className="flex items-center gap-3">
                    <Settings className="w-8 h-8" style={{ color: colors.secondary }} />
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold"
                            style={{ color: colors.secondary }}>
                            Configurações
                        </h1>
                        <p className="text-sm" style={{ color: colors.textSecondary }}>
                            Gerencie sua conta e preferências do sistema
                        </p>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList
                        className="w-full justify-start overflow-x-auto flex-nowrap"
                        style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        {tabs.map(tab => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="data-[state=active]:bg-opacity-20 gap-2"
                                style={{ color: colors.textSecondary }}>
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="perfil">
                        <PerfilTab colors={colors} user={user} onUserUpdated={handleUserUpdated} />
                    </TabsContent>
                    <TabsContent value="empresa">
                        <EmpresaTab colors={colors} user={user} />
                    </TabsContent>
                    <TabsContent value="usuarios">
                        <UsuariosTab colors={colors} currentUser={user} />
                    </TabsContent>
                    <TabsContent value="notificacoes">
                        <NotificacoesTab colors={colors} />
                    </TabsContent>
                    <TabsContent value="sistema">
                        <SistemaTab colors={colors} theme={theme} toggleTheme={toggleTheme} />
                    </TabsContent>
                </Tabs>
            </div>
        </MainEmpresa>
    );
}