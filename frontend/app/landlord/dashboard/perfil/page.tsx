"use client";

import { useState, useEffect, forwardRef, useMemo, useCallback, useRef } from "react";
import { useLandlordAuth } from "@/context/LandlordAuthContext";
import { useThemeColors } from "@/context/ThemeContext";
import { perfilApi } from "@/services/axios";
import { User, Mail, Shield, Lock, Save, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ============================================================================
// HELPERS E VALIDAÇÕES
// ============================================================================

function calcularForcaSenha(senha: string) {
  if (!senha) return { nivel: 0, label: "", cor: "#e5e7eb" };
  let pontos = 0;
  if (senha.length >= 8) pontos++;
  if (senha.length >= 12) pontos++;
  if (/[A-Z]/.test(senha) && /[a-z]/.test(senha)) pontos++;
  if (/[0-9]/.test(senha)) pontos++;
  if (/[^A-Za-z0-9]/.test(senha)) pontos++;

  if (pontos <= 1) return { nivel: 1, label: "Fraca", cor: "#ef4444" };
  if (pontos <= 3) return { nivel: 2, label: "Razoável", cor: "#f59e0b" };
  return { nivel: 3, label: "Forte", cor: "#22c55e" };
}

function validarSenha(atual: string, nova: string, confirmacao: string): string | null {
  if (!atual || !nova || !confirmacao) return "Preencha todos os campos para alterar a senha.";
  if (nova.length < 8) return "A nova senha deve ter pelo menos 8 caracteres.";
  if (nova !== confirmacao) return "As senhas não coincidem.";
  if (nova === atual) return "A nova senha deve ser diferente da atual.";
  return null;
}

// ============================================================================
// COMPONENTE InputWithIcon (com forwardRef)
// ============================================================================

interface InputWithIconProps {
  id: string;
  label: string;
  type?: "text" | "password" | "email";
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  error?: string | null;
  showToggle?: boolean;
  onToggle?: () => void;
  isVisible?: boolean;
  className?: string;
}

const InputWithIcon = forwardRef<HTMLInputElement, InputWithIconProps>(
  (
    {
      id,
      label,
      type = "text",
      value,
      onChange,
      icon,
      placeholder,
      disabled = false,
      error = null,
      showToggle = false,
      onToggle,
      isVisible = false,
      className = "",
    },
    ref
  ) => {
    const colors = useThemeColors();

    return (
      <div className={`space-y-1.5 ${className}`}>
        <label htmlFor={id} className="text-xs font-medium block" style={{ color: colors.textSecondary }}>
          {label}
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.textSecondary }}>
            {icon}
          </div>
          <Input
            id={id}
            ref={ref}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`
              pl-9 pr-10 rounded-lg
              ${error ? "border-red-500 focus:ring-red-500" : ""}
            `}
            style={{
              backgroundColor: colors.background,
              borderColor: error ? colors.danger : colors.border,
              color: colors.blue,
            }}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          {showToggle && onToggle && (
            <button
              type="button"
              onClick={onToggle}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-transform hover:scale-110"
              style={{ color: colors.textSecondary }}
              aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}>
              {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
          {error && (
            <p id={`${id}-error`} className="text-xs mt-1 flex items-center gap-1" style={{ color: colors.danger }}>
              <AlertCircle size={12} />
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }
);

InputWithIcon.displayName = "InputWithIcon";

// ============================================================================
// COMPONENTE PasswordStrengthMeter
// ============================================================================

interface PasswordStrengthMeterProps {
  password: string;
}

function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
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

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================

export default function PerfilPage() {
  const { user, loading: authLoading, refreshUser } = useLandlordAuth();
  const colors = useThemeColors();

  // ===== ESTADOS DO PERFIL =====
  const [nome, setNome] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [nomeError, setNomeError] = useState<string | null>(null);

  // ===== ESTADOS DA SENHA =====
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // ===== REFS =====
  const nomeInputRef = useRef<HTMLInputElement>(null);

  // ===== SINCORNIZAR NOME COM O USER =====
  useEffect(() => {
    if (user?.name) setNome(user.name);
  }, [user]);

  const nomeAlterado = useMemo(() => nome.trim() !== "" && nome.trim() !== user?.name, [nome, user?.name]);

  // ===== VALIDAÇÃO DO NOME =====
  const validateNome = useCallback((value: string) => {
    if (!value.trim()) return "O nome não pode estar vazio.";
    if (value.trim().length < 2) return "O nome deve ter pelo menos 2 caracteres.";
    return null;
  }, []);

  const handleNomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNome(val);
    const err = validateNome(val);
    setNomeError(err);
  };

  // ===== GUARDAR PERFIL =====
  const handleSaveProfile = useCallback(async () => {
    const err = validateNome(nome);
    if (err) {
      setNomeError(err);
      nomeInputRef.current?.focus();
      toast.error(err);
      return;
    }

    setSavingProfile(true);
    try {
      await perfilApi.atualizar({ name: nome.trim() });
      toast.success("Perfil atualizado com sucesso!");
      if (typeof refreshUser === "function") {
        await refreshUser();
      }
      setNomeError(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Erro ao atualizar perfil.";
      setNomeError(msg);
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  }, [nome, refreshUser, validateNome]);

  const handleCancelarNome = () => {
    setNome(user?.name || "");
    setNomeError(null);
  };

  // ===== ALTERAR SENHA =====
  const handleChangePassword = useCallback(async () => {
    const erro = validarSenha(senhaAtual, novaSenha, confirmarSenha);
    if (erro) {
      setPasswordError(erro);
      toast.error(erro);
      return;
    }

    if (!window.confirm("Deseja realmente alterar a sua senha?")) {
      return;
    }

    setSavingPassword(true);
    setPasswordError(null);

    try {
      await perfilApi.alterarSenha({
        senha_atual: senhaAtual,
        nova_senha: novaSenha,
        nova_senha_confirmation: confirmarSenha,
      });
      toast.success("Senha alterada com sucesso!");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Erro ao alterar a senha.";
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  }, [senhaAtual, novaSenha, confirmarSenha]);

  // ===== KEYDOWN HANDLERS =====
  const handleKeyDownProfile = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && nomeAlterado && !savingProfile) {
      e.preventDefault();
      handleSaveProfile();
    }
  };

  const handleKeyDownSenha = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !savingPassword) {
      e.preventDefault();
      handleChangePassword();
    }
  };

  // ===== LOADING =====
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
        <span className="sr-only">A carregar perfil...</span>
      </div>
    );
  }

  if (!user) return null;

  const userInitial = (user?.name?.charAt(0) || "A").toUpperCase();

  return (
    <div className="space-y-6 max-w-3xl mx-auto px-4 sm:px-0">
      {/* Cabeçalho */}
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: colors.secondary }}>
          Meu Perfil
        </h1>
        <p className="text-sm sm:text-base mt-1" style={{ color: colors.textSecondary }}>
          Gerencie as suas informações pessoais e segurança da conta
        </p>
      </header>

      {/* Cartão de Identidade */}
      <Card className=" border-0" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0 shadow-sm"
              style={{
                background: colors.secondary,
                color: colors.blue,
              }}>
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold truncate" style={{ color: colors.blue }}>
                {user.name}
              </p>
              <p className="text-sm truncate" style={{ color: colors.textSecondary }}>
                {user.email}
              </p>
              <Badge
                className="mt-2 font-medium"
                style={{
                  backgroundColor: `${colors.secondary}15`,
                  color: colors.secondary,
                  border: `1px solid ${colors.secondary}30`,
                }}>
                <Shield size={12} className="mr-1" />
                {user.role === "super_admin" ? "Super Admin" : "Suporte"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Pessoais */}
      <Card className=" border-0" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <CardContent className="p-4 sm:p-5 space-y-4" onKeyDown={handleKeyDownProfile}>
          <div className="flex items-center gap-2">
            <User size={18} style={{ color: colors.blue }} />
            <h2 className="text-base font-semibold" style={{ color: colors.blue }}>
              Informações Pessoais
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputWithIcon
              ref={nomeInputRef}
              id="nome"
              label="Nome completo"
              type="text"
              value={nome}
              onChange={handleNomeChange}
              icon={<User size={16} />}
              placeholder="Seu nome"
              error={nomeError}
              disabled={savingProfile}
              className="w-full"
            />

            <div>
              <label htmlFor="email" className="text-xs font-medium mb-1.5 block" style={{ color: colors.textSecondary }}>
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.textSecondary }} />
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="pl-9 rounded-lg opacity-60 cursor-not-allowed"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                />
              </div>
              <p className="text-xs mt-1.5" style={{ color: colors.textSecondary }}>
                O email não pode ser alterado. Contacte o suporte se precisar de mudá-lo.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            {nomeAlterado && (
              <Button variant="outline" onClick={handleCancelarNome} disabled={savingProfile} className="rounded-lg">
                Cancelar
              </Button>
            )}
            <Button
              onClick={handleSaveProfile}
              disabled={!nomeAlterado || savingProfile || !!nomeError}
              className="rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: colors.primary, color: "#fff" }}>
              {savingProfile ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
              Guardar Alterações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Segurança / Senha */}
      <Card className="border-0" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <CardContent className="p-4 sm:p-5 space-y-4" onKeyDown={handleKeyDownSenha}>
          <div className="flex items-center gap-2">
            <Lock size={18} style={{ color: colors.blue }} />
            <h2 className="text-base font-semibold" style={{ color: colors.blue }}>
              Segurança
            </h2>
          </div>

          {passwordError && (
            <div
              className="flex items-center gap-2 p-3 rounded-lg text-sm"
              style={{
                backgroundColor: `${colors.danger}15`,
                color: colors.danger,
                border: `1px solid ${colors.danger}30`,
              }}
              role="alert"
              aria-live="polite">
              <AlertCircle size={16} className="shrink-0" />
              {passwordError}
            </div>
          )}

          <div className="space-y-3">
            <InputWithIcon
              id="senha-atual"
              label="Senha atual"
              type={showSenhaAtual ? "text" : "password"}
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              icon={<Lock size={16} />}
              placeholder="Digite sua senha atual"
              error={null}
              showToggle
              onToggle={() => setShowSenhaAtual(!showSenhaAtual)}
              isVisible={showSenhaAtual}
              disabled={savingPassword}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <InputWithIcon
                  id="nova-senha"
                  label="Nova senha"
                  type={showNovaSenha ? "text" : "password"}
                  value={novaSenha}
                  onChange={(e) => {
                    setNovaSenha(e.target.value);
                    setPasswordError(null);
                  }}
                  icon={<Lock size={16} />}
                  placeholder="Mínimo 8 caracteres"
                  error={null}
                  showToggle
                  onToggle={() => setShowNovaSenha(!showNovaSenha)}
                  isVisible={showNovaSenha}
                  disabled={savingPassword}
                />
                <PasswordStrengthMeter password={novaSenha} />
              </div>

              <div>
                <InputWithIcon
                  id="confirmar-senha"
                  label="Confirmar nova senha"
                  type={showNovaSenha ? "text" : "password"}
                  value={confirmarSenha}
                  onChange={(e) => {
                    setConfirmarSenha(e.target.value);
                    setPasswordError(null);
                  }}
                  icon={<Lock size={16} />}
                  placeholder="Repita a nova senha"
                  error={confirmarSenha && novaSenha && confirmarSenha !== novaSenha ? "As senhas não coincidem" : null}
                  disabled={savingPassword}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs" style={{ color: colors.textSecondary }}>
              <CheckCircle2 size={14} />
              <span>A senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas, números e símbolos.</span>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              onClick={handleChangePassword}
              disabled={savingPassword || !senhaAtual || !novaSenha || !confirmarSenha}
              className="rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: colors.secondary, color: colors.blue }}>
              {savingPassword ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Lock size={16} className="mr-2" />}
              Alterar Senha
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
