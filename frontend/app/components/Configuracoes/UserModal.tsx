"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Save, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { registerUser, updateUser, User as UserType, RegisterData, UpdateUserData } from "@/services/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogDescription,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ThemeColors, RoleType } from "./ConfiguracoesComuns";

export function UserModal({
    open, onClose, onSaved, editUser, colors,
}: {
    open: boolean; onClose: () => void; onSaved: () => void;
    editUser?: UserType | null; colors: ThemeColors;
}) {
    const isEdit = !!editUser;
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [errors, setErrors] = useState<{
        name?: string; email?: string; password?: string;
    }>({});
    const [form, setForm] = useState({
        name: "", email: "", password: "",
        role: "operador" as RoleType, ativo: true,
    });

    useEffect(() => {
        if (editUser) {
            setForm({
                name: editUser.name, email: editUser.email,
                password: "", role: editUser.role as RoleType, ativo: editUser.ativo,
            });
        } else {
            setForm({ name: "", email: "", password: "", role: "operador", ativo: true });
        }
        setErrors({});
        setShowPass(false);
    }, [editUser, open]);

    const validate = (): boolean => {
        const e: typeof errors = {};
        if (!form.name.trim()) e.name = "Nome é obrigatório";
        if (!form.email.trim()) e.email = "E-mail é obrigatório";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "E-mail inválido";
        if (!isEdit && form.password.length < 6) e.password = "Mínimo 6 caracteres";
        if (isEdit && form.password && form.password.length < 6) e.password = "Mínimo 6 caracteres";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            if (isEdit && editUser) {
                const payload: UpdateUserData = {
                    name: form.name, email: form.email,
                    role: form.role, ativo: form.ativo,
                };
                if (form.password.trim()) payload.password = form.password;
                await updateUser(editUser.id, payload);
                toast.success("Utilizador atualizado!");
            } else {
                await registerUser({
                    name: form.name, email: form.email,
                    password: form.password, role: form.role, ativo: form.ativo,
                } as RegisterData);
                toast.success("Utilizador criado!");
            }
            onSaved();
            onClose();
        } catch (err: unknown) {
            const errObj = err as {
                response?: { data?: { message?: string; errors?: Record<string, string[]> } };
            };
            const serverErrors = errObj?.response?.data?.errors;
            if (serverErrors) {
                const mapped: typeof errors = {};
                if (serverErrors.name) mapped.name = serverErrors.name[0];
                if (serverErrors.email) mapped.email = serverErrors.email[0];
                if (serverErrors.password) mapped.password = serverErrors.password[0];
                setErrors(mapped);
            } else {
                toast.error(errObj?.response?.data?.message ?? "Erro ao salvar utilizador");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={v => { if (!v && !loading) onClose(); }}>
            <DialogContent
                className="sm:max-w-[480px] p-0"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
                <DialogHeader className="p-4 border-b" style={{ borderColor: colors.border }}>
                    <DialogTitle className="text-base" style={{ color: colors.secondary }}>
                        {isEdit ? "Editar Utilizador" : "Novo Utilizador"}
                    </DialogTitle>
                    <DialogDescription className="text-xs" style={{ color: colors.textSecondary }}>
                        {isEdit ? "Atualize os dados do utilizador" : "Preencha os dados para criar um novo utilizador"}
                    </DialogDescription>
                </DialogHeader>

                <div className="p-4 space-y-4">
                    <div className="space-y-1">
                        <Label style={{ color: colors.text }}>Nome completo *</Label>
                        <Input type="text" value={form.name}
                            onChange={e => { setForm(p => ({ ...p, name: e.target.value })); if (errors.name) setErrors(p => ({ ...p, name: undefined })); }}
                            placeholder="Ex: João Silva"
                            style={{ backgroundColor: colors.background, borderColor: errors.name ? colors.danger : colors.border, color: colors.text }}
                        />
                        {errors.name && <p className="text-xs flex items-center gap-1" style={{ color: colors.danger }}><AlertCircle className="w-3 h-3" /> {errors.name}</p>}
                    </div>

                    <div className="space-y-1">
                        <Label style={{ color: colors.text }}>E-mail *</Label>
                        <Input type="email" value={form.email}
                            onChange={e => { setForm(p => ({ ...p, email: e.target.value })); if (errors.email) setErrors(p => ({ ...p, email: undefined })); }}
                            placeholder="Ex: joao@empresa.com"
                            style={{ backgroundColor: colors.background, borderColor: errors.email ? colors.danger : colors.border, color: colors.text }}
                        />
                        {errors.email && <p className="text-xs flex items-center gap-1" style={{ color: colors.danger }}><AlertCircle className="w-3 h-3" /> {errors.email}</p>}
                    </div>

                    <div className="space-y-1">
                        <Label style={{ color: colors.text }}>
                            {isEdit ? "Nova senha (em branco = não altera)" : "Senha *"}
                        </Label>
                        <div className="relative">
                            <Input
                                type={showPass ? "text" : "password"} value={form.password}
                                onChange={e => { setForm(p => ({ ...p, password: e.target.value })); if (errors.password) setErrors(p => ({ ...p, password: undefined })); }}
                                placeholder={isEdit ? "••••••••" : "Mínimo 6 caracteres"}
                                style={{ backgroundColor: colors.background, borderColor: errors.password ? colors.danger : colors.border, color: colors.text }}
                            />
                            <button type="button" onClick={() => setShowPass(p => !p)}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                style={{ color: colors.textSecondary }}>
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {errors.password && <p className="text-xs flex items-center gap-1" style={{ color: colors.danger }}><AlertCircle className="w-3 h-3" /> {errors.password}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label style={{ color: colors.text }}>Função (Role)</Label>
                        <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v as RoleType }))}>
                            <SelectTrigger style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="operador">Operador</SelectItem>
                                <SelectItem value="contablista">Contabilista</SelectItem>
                                <SelectItem value="gestor">Gestor de Stock</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between py-1">
                        <div>
                            <p className="text-sm font-medium" style={{ color: colors.text }}>Conta ativa</p>
                            <p className="text-xs" style={{ color: colors.textSecondary }}>Utilizador pode fazer login</p>
                        </div>
                        <Switch checked={form.ativo} onCheckedChange={v => setForm(p => ({ ...p, ativo: v }))} />
                    </div>
                </div>

                <div className="p-4 pt-0">
                    <div className="flex gap-2 pt-2 border-t" style={{ borderColor: colors.border }}>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}
                            className="flex-1 h-8 text-xs"
                            style={{ borderColor: colors.border, color: colors.textSecondary }}>
                            Cancelar
                        </Button>
                        <Button type="button" onClick={() => void handleSubmit()} disabled={loading}
                            className="flex-1 h-8 gap-1 text-white text-xs" style={{ backgroundColor: colors.primary }}>
                            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            {loading ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}