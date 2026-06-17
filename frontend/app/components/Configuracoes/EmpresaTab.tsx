"use client";

import React, { useState, useEffect, useRef } from "react";
import { Building2, Hash, AtSign, Phone, MapPin, Globe, AlertCircle, Loader2, Camera, Upload, ImageIcon } from "lucide-react";
import { useAuth } from "@/context/authprovider";

import { toast } from "sonner";
import { api } from "@/services/axios";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Card, CardContent, CardDescription,
    CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ThemeColors, FormInput, ReadonlyField, SaveButton, getLogoUrl } from "./ConfiguracoesComuns";

const LogoUploader = ({
    colors, currentLogo, onUploaded, disabled,
}: {
    colors: ThemeColors;
    currentLogo?: string | null;
    onUploaded: (url: string) => void;
    disabled?: boolean;
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(getLogoUrl(currentLogo));
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        setPreview(getLogoUrl(currentLogo));
    }, [currentLogo]);

    const handleFile = async (file: File) => {
        if (!file.type.startsWith("image/")) {
            toast.error("Selecione uma imagem válida");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error("Imagem deve ter no máximo 2MB");
            return;
        }

        const reader = new FileReader();
        reader.onload = e => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("logo", file);
            const response = await api.post<{ success: boolean; logo_url: string }>(
                "/api/empresa/logo",
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );
            if (!response.data.success) throw new Error("Upload falhou");
            onUploaded(response.data.logo_url);
            toast.success("Logo atualizado com sucesso!");
        } catch {
            toast.error("Erro ao fazer upload do logo");
            setPreview(getLogoUrl(currentLogo));
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-3">
            <Label style={{ color: colors.text }} className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" style={{ color: colors.textSecondary }} />
                Logótipo da empresa
            </Label>

            <div
                className="relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-6 transition-colors"
                style={{
                    borderColor: disabled ? colors.border : `${colors.primary}60`,
                    backgroundColor: disabled ? colors.hover : colors.background,
                    opacity: disabled ? 0.6 : 1,
                    cursor: disabled ? "not-allowed" : "pointer",
                }}
                onClick={() => !disabled && inputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                    e.preventDefault();
                    if (disabled) return;
                    const file = e.dataTransfer.files[0];
                    if (file) void handleFile(file);
                }}
            >
                {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${colors.card}cc`, zIndex: 10 }}>
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
                    </div>
                )}

                {preview ? (
                    <div className="relative group">
                        <img
                            src={preview} alt="Logo da empresa"
                            className="w-28 h-28 object-contain rounded-lg"
                            style={{ border: `1px solid ${colors.border}` }}
                        />
                        {!disabled && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: colors.hover }}>
                        <Upload className="w-7 h-7" style={{ color: colors.textSecondary }} />
                    </div>
                )}

                <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: colors.text }}>
                        {preview ? "Clique para trocar o logo" : "Clique ou arraste uma imagem"}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                        PNG, JPG, GIF — máx. 2MB
                    </p>
                </div>

                <input
                    ref={inputRef} type="file" accept="image/*"
                    className="hidden" disabled={disabled}
                    onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) void handleFile(file);
                        e.target.value = "";
                    }}
                />
            </div>
        </div>
    );
};

export function EmpresaTab({ colors }: { colors: ThemeColors }) {
    const { user, logout, refreshUser } = useAuth();
    const empresa = user?.empresa;

    const [loading, setLoading] = useState(false);
    const [togglingStatus, setTogglingStatus] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    const [form, setForm] = useState({
        nome: "",
        nif: "",
        email: "",
        telefone: "",
        endereco: "",
        regime_fiscal: "simplificado" as "simplificado" | "geral",
        sujeito_iva: true,
        nome_banco: "",
        iban: "",
        numero_conta: "",
        logo: null as string | null,
    });

    useEffect(() => {
        if (empresa) {
            setForm({
                nome: empresa.nome ?? "",
                nif: empresa.nif ?? "",
                email: empresa.email ?? "",
                telefone: empresa.telefone ?? "",
                endereco: empresa.endereco ?? "",
                regime_fiscal: (empresa.regime_fiscal ?? "simplificado") as "simplificado" | "geral",
                sujeito_iva: empresa.sujeito_iva === true,
                nome_banco: empresa.nome_banco ?? "",
                numero_conta: empresa.numero_conta ?? "",
                iban: empresa.iban ?? "",
                logo: empresa.logo ?? null,
            });
        }
    }, [empresa]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(p => ({ ...p, [name]: value }));
    };

    const handleSubmit = async () => {
        if (empresa?.status === "suspenso") {
            toast.error("Empresa suspensa — não é possível editar os dados.");
            return;
        }

        setLoading(true);
        try {
            const response = await api.put("/api/empresa", {
                nome: form.nome,
                nif: form.nif,
                email: form.email,
                telefone: form.telefone,
                endereco: form.endereco,
                regime_fiscal: form.regime_fiscal,
                iban: form.iban,
                numero_conta: form.numero_conta,
                nome_banco: form.nome_banco,
                sujeito_iva: form.sujeito_iva,
            });

            if (response.data.success) {
                await refreshUser();
                toast.success("Dados da empresa atualizados com sucesso!");
            } else {
                toast.error("Resposta inválida do servidor");
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || "Erro ao atualizar empresa");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!empresa?.id) {
            toast.error("Empresa não identificada");
            return;
        }

        setTogglingStatus(true);
        try {
            const response = await api.patch(`/api/empresa/toggle-status/`);

            toast.success(response.data.message);
            setShowConfirmDialog(false);
             setTimeout(async () => {
                    await logout();
                }, 1500);
            
            if (response.data.redirect_to_login) {
                toast.info("Empresa suspensa. A sessão será encerrada...", {
                    duration: 2000,
                });
            }
            
            await refreshUser();
            
        } catch (err: unknown) {
            const error = err as { 
                response?: { 
                    status?: number;
                    data?: { message?: string };
                } 
            };
            
            if (error.response?.status === 409) {
                toast.error("Status foi alterado por outro utilizador. Recarregando...");
                await refreshUser();
            } else {
                const msg = error.response?.data?.message;
                toast.error(msg ?? "Erro ao alterar status da empresa");
            }
        } finally {
            setTogglingStatus(false);
        }
    };

    const empresaStatus = empresa?.status ?? "ativo";
    const isSuspended = empresaStatus === "suspenso";

    return (
        <div className="space-y-6">
            {/* Situação da Empresa */}
            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                    <CardTitle style={{ color: colors.secondary }}>Situação da Empresa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="space-y-1">
                            <p className="text-sm font-medium" style={{ color: colors.text }}>
                                Status actual:
                            </p>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                isSuspended
                                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                    : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                    isSuspended ? "bg-red-500" : "bg-green-500"
                                }`}></span>
                                {isSuspended ? "Suspensa" : "Ativa"}
                            </span>
                        </div>
                        
                        <button
                            onClick={() => setShowConfirmDialog(true)}
                            disabled={togglingStatus}
                            className={`px-4 py-2 rounded-lg font-medium text-white transition-all ${
                                isSuspended
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-red-600 hover:bg-red-700"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {togglingStatus ? (
                                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                            ) : isSuspended ? (
                                "Reativar empresa"
                            ) : (
                                "Suspender empresa"
                            )}
                        </button>
                    </div>

                    {isSuspended && (
                        <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                ⚠️ Empresa suspensa. Algumas funcionalidades podem estar limitadas.
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {empresa?.subdomain && (
                            <ReadonlyField label="Subdomínio" colors={colors} icon={Globe}
                                value={empresa.subdomain} />
                        )}
                        {(empresa as any)?.created_at && (
                            <ReadonlyField label="Data de registro" colors={colors}
                                value={new Date((empresa as any).created_at).toLocaleDateString("pt-PT")} />
                        )}
                        {empresa?.nif && (
                            <ReadonlyField label="NIF" colors={colors} icon={Hash}
                                value={empresa.nif} />
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Logo */}
            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                    <CardTitle style={{ color: colors.secondary }}>Logótipo</CardTitle>
                    <CardDescription style={{ color: colors.textSecondary }}>
                        Aparece em documentos fiscais e no sistema
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <LogoUploader
                        colors={colors}
                        currentLogo={form.logo}
                        disabled={isSuspended}
                        onUploaded={async (url) => {
                            setForm(p => ({ ...p, logo: url }));
                            await refreshUser();
                            toast.success("Logo atualizado com sucesso!");
                        }}
                    />
                </CardContent>
            </Card>

            {/* Dados da Empresa */}
            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                    <CardTitle style={{ color: colors.secondary }}>Dados da Empresa</CardTitle>
                    <CardDescription style={{ color: colors.textSecondary }}>
                        Informações principais
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput label="Nome da empresa" name="nome" value={form.nome}
                            onChange={handleChange} colors={colors} disabled={isSuspended}
                            icon={Building2} />
                        <FormInput label="NIF" name="nif" value={form.nif} 
                            onChange={handleChange} colors={colors} disabled={isSuspended}
                            icon={Hash} />
                        <FormInput label="E-mail" name="email" type="email" value={form.email}
                            onChange={handleChange} colors={colors} disabled={isSuspended}
                            icon={AtSign} />
                        <FormInput label="Telefone" name="telefone" value={form.telefone}
                            onChange={handleChange} colors={colors} disabled={isSuspended}
                            icon={Phone} />

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="endereco" style={{ color: colors.text }}
                                className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" style={{ color: colors.textSecondary }} />
                                Endereço
                            </Label>
                            <Textarea
                                id="endereco" name="endereco" value={form.endereco}
                                onChange={handleChange} rows={3} disabled={isSuspended}
                                style={{
                                    backgroundColor: isSuspended ? colors.hover : colors.card,
                                    borderColor: colors.border,
                                    color: colors.text,
                                }}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t pt-6"
                    style={{ borderColor: colors.border }}>
                    <SaveButton
                        onClick={() => void handleSubmit()}
                        loading={loading} colors={colors} disabled={isSuspended}
                    />
                </CardFooter>
            </Card>

            {/* Configurações Fiscais */}
            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                    <CardTitle style={{ color: colors.secondary }}>Configurações Fiscais</CardTitle>
                    <CardDescription style={{ color: colors.textSecondary }}>
                        Padrões gerais
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label style={{ color: colors.text }}>Regime fiscal</Label>
                            <Select
                                value={form.regime_fiscal}
                                disabled={isSuspended}
                                onValueChange={v => setForm(p => ({
                                    ...p, regime_fiscal: v as "simplificado" | "geral",
                                }))}>
                                <SelectTrigger style={{
                                    backgroundColor: isSuspended ? colors.hover : colors.card,
                                    borderColor: colors.border, color: colors.text,
                                }}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent style={{
                                    backgroundColor: colors.card, borderColor: colors.border,
                                }}>
                                    <SelectItem value="simplificado">Simplificado</SelectItem>
                                    <SelectItem value="geral">Geral</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label style={{ color: colors.text }}>Sujeito a IVA</Label>
                            <div className="flex items-center gap-3 h-10 px-3 border rounded-md"
                                style={{
                                    borderColor: colors.border,
                                    backgroundColor: isSuspended ? colors.hover : colors.card,
                                }}>
                                <Switch
                                    checked={form.sujeito_iva === true}
                                    disabled={isSuspended}
                                    onCheckedChange={v => setForm(p => ({ ...p, sujeito_iva: v }))}
                                />
                                <span className="text-sm" style={{ color: colors.textSecondary }}>
                                    {form.sujeito_iva === true ? "Sim" : "Não"}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t pt-6"
                    style={{ borderColor: colors.border }}>
                    <SaveButton
                        onClick={() => void handleSubmit()}
                        loading={loading} colors={colors} disabled={isSuspended}
                    />
                </CardFooter>
            </Card>

            {/* Dados Bancários */}
            <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                    <CardTitle style={{ color: colors.secondary }}>Dados Bancários</CardTitle>
                    <CardDescription style={{ color: colors.textSecondary }}>
                        Informações para pagamentos e transferências
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput 
                            label="Nome do Banco" 
                            name="nome_banco" 
                            value={form.nome_banco}
                            onChange={handleChange} 
                            colors={colors} 
                            disabled={isSuspended}
                            icon={Building2} 
                        />
                        <FormInput 
                            label="Número de Conta" 
                            name="numero_conta" 
                            value={form.numero_conta}
                            onChange={handleChange} 
                            colors={colors} 
                            disabled={isSuspended}
                            icon={Hash} 
                        />
                        <div className="md:col-span-2">
                            <FormInput 
                                label="IBAN" 
                                name="iban" 
                                value={form.iban}
                                onChange={handleChange} 
                                colors={colors} 
                                disabled={isSuspended}
                                icon={Globe} 
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t pt-6"
                    style={{ borderColor: colors.border }}>
                    <SaveButton
                        onClick={() => void handleSubmit()}
                        loading={loading} colors={colors} disabled={isSuspended}
                    />
                </CardFooter>
            </Card>

            {/* Diálogo de confirmação */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <DialogHeader>
                        <DialogTitle style={{ color: isSuspended ? colors.success : colors.danger }}>
                            {isSuspended ? "Reativar Empresa" : "Suspender Empresa"}
                        </DialogTitle>
                        <DialogDescription style={{ color: colors.textSecondary }}>
                            {isSuspended
                                ? "Tem certeza que deseja reativar esta empresa? Todas as funcionalidades serão restauradas."
                                : "Tem certeza que deseja suspender esta empresa? Os utilizadores não poderão aceder ao sistema até que seja reativada."}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmDialog(false)}
                            style={{ borderColor: colors.border, color: colors.text }}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={() => void handleToggleStatus()} 
                            disabled={togglingStatus}
                            style={{ 
                                backgroundColor: isSuspended ? colors.success : colors.danger,
                                color: "white"
                            }}
                        >
                            {togglingStatus && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                            {isSuspended ? "Sim, reativar" : "Sim, suspender"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}