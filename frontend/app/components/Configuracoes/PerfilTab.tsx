"use client";

import React, { useState, useEffect } from "react";
import { User, AtSign, Shield, UserCheck, UserX, AlertCircle, Building2 } from "lucide-react";
import { useAuth } from "@/context/authprovider";
import { updateUser } from "@/services/User";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ThemeColors,
  formatDate,
  RoleBadge,
  FormInput,
  ReadonlyField,
  PasswordInput,
  SaveButton,
  friendlyError,
  WithToast,
} from "./ConfiguracoesComuns";

interface PassForm {
  nova_senha: string;
  confirmar_senha: string;
}

export interface PerfilTabProps extends WithToast {
  colors: ThemeColors;
}

export function PerfilTab({ colors, showToast }: PerfilTabProps) {
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [showNova, setShowNova] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    printer_ip: "",
  });

  const [passForm, setPassForm] = useState<PassForm>({
    nova_senha: "",
    confirmar_senha: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name ?? "",
        email: user.email ?? "",
        printer_ip: user.printer_ip ?? "",
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handlePassChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPassForm((p) => ({ ...p, [name]: value }));
  };

  const getStrength = (s: string) => {
    if (!s) return { color: colors.border, text: "", progress: 0 };
    if (s.length < 6) return { color: colors.danger, text: "Fraca", progress: 33 };
    if (s.length < 10) return { color: colors.warning, text: "Média", progress: 66 };
    return { color: colors.success, text: "Forte", progress: 100 };
  };
  const strength = getStrength(passForm.nova_senha);

  /* -------------------- Guardar Perfil -------------------- */
  const handleSavePerfil = async (): Promise<void> => {
    if (!user) return;

    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();

    if (!trimmedName) {
      showToast("Aviso", "warning", "O nome não pode estar vazio.");
      return;
    }

    // Validação simples de e-mail
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showToast("Aviso", "warning", "Introduza um e-mail válido.");
      return;
    }

    setLoading(true);
    try {
      await updateUser(user.id, {
        name: trimmedName,
        email: trimmedEmail,
        printer_ip: form.printer_ip || undefined,
      });
      await refreshUser();
      showToast("Sucesso", "success", "Perfil atualizado com sucesso!");
    } catch (err) {
      console.error("[PerfilTab] erro ao guardar perfil:", err);
      showToast("Erro", "error", friendlyError(err, "Erro ao atualizar o perfil."));
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- Alterar Senha -------------------- */
  const handleSaveSenha = async () => {
    if (!user) return;

    if (passForm.nova_senha.length < 6) {
      showToast("Aviso", "warning", "A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (passForm.nova_senha !== passForm.confirmar_senha) {
      showToast("Aviso", "warning", "As senhas não coincidem.");
      return;
    }

    setPassLoading(true);
    try {
      await updateUser(user.id, { password: passForm.nova_senha });
      await refreshUser();
      showToast("Sucesso", "success", "Senha alterada com sucesso!");
      setPassForm({ nova_senha: "", confirmar_senha: "" });
    } catch (err) {
      console.error("[PerfilTab] erro ao alterar senha:", err);
      showToast("Erro", "error", friendlyError(err, "Erro ao alterar a senha."));
    } finally {
      setPassLoading(false);
    }
  };

  const isContaAtiva = user?.ativo === true;
  const isContaInativa = user?.ativo === false;
  const isBusy = loading || passLoading;

  // Bloqueia guardar se nada mudou
  const perfilSemAlteracoes =
    form.name.trim() === (user?.name ?? "") &&
    form.email.trim() === (user?.email ?? "") &&
    form.printer_ip === (user?.printer_ip ?? "");

  const senhaInvalida =
    !passForm.nova_senha ||
    !passForm.confirmar_senha ||
    passForm.nova_senha !== passForm.confirmar_senha ||
    passForm.nova_senha.length < 6;

  return (
    <div className="space-y-6">
      {/* Informações da Conta */}
      <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <CardHeader>
          <CardTitle style={{ color: colors.secondary }}>Informações da sua conta</CardTitle>
          <CardDescription style={{ color: colors.textSecondary }}>
            Os seus dados pessoais e de acesso
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <Separator style={{ backgroundColor: colors.border }} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Nome completo"
              name="name"
              value={form.name}
              onChange={handleChange}
              colors={colors}
              icon={User}
              disabled={loading}
            />
            <FormInput
              label="E-mail"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              colors={colors}
              icon={AtSign}
              disabled={loading}
            />
            <FormInput
              label="IP da impressora"
              name="printer_ip"
              value={form.printer_ip}
              onChange={handleChange}
              colors={colors}
              placeholder="Ex: 192.168.1.100"
              disabled
            />
            <ReadonlyField label="Função (Role)" colors={colors} icon={Shield}>
              {user && <RoleBadge role={user.role} colors={colors} />}
            </ReadonlyField>
          </div>

          <Separator style={{ backgroundColor: colors.border }} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadonlyField label="Estado da conta" colors={colors}>
              {isContaAtiva ? (
                <span
                  className="flex items-center gap-1.5 text-sm"
                  style={{ color: colors.secondary }}>
                  <UserCheck className="w-4 h-4" /> Ativa
                </span>
              ) : isContaInativa ? (
                <span
                  className="flex items-center gap-1.5 text-sm"
                  style={{ color: colors.primary }}>
                  <UserX className="w-4 h-4" /> Inativa
                </span>
              ) : (
                <span
                  className="flex items-center gap-1.5 text-sm"
                  style={{ color: colors.textSecondary }}>
                  <AlertCircle className="w-4 h-4" /> Desconhecido
                </span>
              )}
            </ReadonlyField>

            <ReadonlyField
              label="Empresa"
              colors={colors}
              icon={Building2}
              value={user?.empresa?.nome ?? "—"}
            />

            <ReadonlyField
              label="Último login"
              colors={colors}
              value={formatDate(user?.ultimo_login ?? null)}
            />

            <ReadonlyField
              label="Membro desde"
              colors={colors}
              value={user?.created_at ? new Date(user.created_at).toLocaleDateString("pt-PT") : "—"}
            />
          </div>
        </CardContent>

        <CardFooter
          className="flex justify-end border-t pt-6"
          style={{ borderColor: colors.border }}>
          <SaveButton
            onClick={() => void handleSavePerfil()}
            loading={loading}
            loadingText="A guardar perfil..."
            colors={colors}
            disabled={perfilSemAlteracoes || passLoading}
          />
        </CardFooter>
      </Card>

      {/* Alterar Senha */}
      <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <CardHeader>
          <CardTitle style={{ color: colors.secondary }}>Alterar Senha</CardTitle>
          <CardDescription style={{ color: colors.textSecondary }}>
            Define uma nova senha para a tua conta
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PasswordInput
              label="Nova senha"
              name="nova_senha"
              value={passForm.nova_senha}
              onChange={handlePassChange}
              show={showNova}
              setShow={setShowNova}
              colors={colors}
              disabled={passLoading}
              placeholder="Mínimo 6 caracteres"
            />
            <PasswordInput
              label="Confirmar nova senha"
              name="confirmar_senha"
              value={passForm.confirmar_senha}
              onChange={handlePassChange}
              show={showConfirmar}
              setShow={setShowConfirmar}
              colors={colors}
              disabled={passLoading}
              placeholder="Repita a senha"
            />
          </div>

          {passForm.nova_senha && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span style={{ color: colors.textSecondary }}>Força:</span>
                <span style={{ color: strength.color }}>{strength.text}</span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full"
                style={{ backgroundColor: colors.border }}>
                <div
                  className="h-full transition-all duration-300 rounded-full"
                  style={{ width: `${strength.progress}%`, backgroundColor: strength.color }}
                />
              </div>
            </div>
          )}

          {passForm.nova_senha &&
            passForm.confirmar_senha &&
            passForm.nova_senha !== passForm.confirmar_senha && (
              <p
                className="text-sm flex items-center gap-1.5"
                style={{ color: colors.danger }}>
                <AlertCircle className="w-4 h-4" /> As senhas não coincidem
              </p>
            )}
        </CardContent>

        <CardFooter
          className="flex justify-end border-t pt-6"
          style={{ borderColor: colors.border }}>
          <SaveButton
            onClick={() => void handleSaveSenha()}
            loading={passLoading}
            loadingText="A alterar senha..."
            colors={colors}
            disabled={senhaInvalida || loading}>
            Alterar senha
          </SaveButton>
        </CardFooter>
      </Card>
    </div>
  );
}