"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/authprovider";
import { useThemeColors } from "@/context/ThemeContext";
import { AxiosError } from "axios";
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2, UserPlus, X, CheckCircle } from "lucide-react";
import styles from "./login.module.css";

/* ---------------- TYPES ---------------- */
interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  danger: string;
  success: string;
}

interface InputFieldProps {
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ElementType;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  colors: ThemeColors;
  autoComplete?: string;
  id?: string;
  label?: string;
}

/* ---------------- COMPONENTS ---------------- */
const InputField: React.FC<InputFieldProps> = ({
  type,
  placeholder,
  value,
  onChange,
  icon: Icon,
  showPasswordToggle = false,
  onTogglePassword,
  colors,
  autoComplete,
  id,
  label,
}) => {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const paddingClass = showPasswordToggle ? "pr-12" : "pr-4";

  return (
    <div
      className="relative w-full"
      style={
        {
          "--login-input-icon-color": colors.textSecondary,
          "--login-input-icon-color-focused": colors.secondary,
        } as React.CSSProperties
      }>
      <div
        className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 transition-transform duration-300 ${styles.inputIcon}`}
        data-focused={isFocused}>
        <Icon size={20} />
      </div>

      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        required
        aria-label={label || placeholder}
        autoComplete={autoComplete}
        className={`w-full pl-10 ${paddingClass} py-3 border-2 outline-none transition-all duration-300 min-h-12`}
        style={{
          backgroundColor: isFocused ? colors.card : `${colors.card}80`,
          borderColor: isFocused ? colors.secondary : colors.border,
          color: colors.text,
          boxShadow: isFocused ? `0 10px 15px -3px ${colors.secondary}20` : "none",
        }}
      />

      {showPasswordToggle && onTogglePassword && (
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-transform hover:scale-110 active:scale-90"
          style={{ color: colors.textSecondary }}>
          {type === "password" ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      )}
    </div>
  );
};

/* ---------------- COMPONENTE TOAST ---------------- */
interface ToastNotificationProps {
  message: string;
  type: "success" | "error";
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

  return (
    <div
      className="fixed top-3 right-2 left-2 z-50 max-w-[calc(100vw-1rem)] animate-slide-in-right sm:right-6 sm:left-auto sm:max-w-md"
      style={{
        backgroundColor: colors.card,
        borderLeft: `4px solid ${type === "success" ? colors.success : colors.danger}`,
        boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
      }}>
      <div className="flex items-center gap-4 p-4">
        <div className="shrink-0">
          {type === "success" ? (
            <CheckCircle size={24} style={{ color: colors.success }} />
          ) : (
            <AlertCircle size={24} style={{ color: colors.danger }} />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: colors.text }}>
            {message}
          </p>
        </div>
        <button onClick={onClose} className="shrink-0 transition-opacity hover:opacity-70" style={{ color: colors.textSecondary }}>
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

/* ---------------- MAIN PAGE ---------------- */
export default function LoginPage(): React.ReactElement {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();
  const colors = useThemeColors();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!user) return;

    const redirectMap: Record<string, string> = {
      admin: "/dashboard",
      contablista: "/dashboard/",
      operador: "/dashboard/Vendas/Nova_venda",
      gestor: "/dashboard/Produtos_servicos/Stock",
    };
    const destination = redirectMap[user.role] || "/login";

    // Mostrar toast de boas-vindas
    showToast(` Bem-vindo, ${user.name || "usuário"}! Redirecionando...`, "success");

    setTimeout(() => router.push(destination), 1500);
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await login(email, password);
      // O toast de sucesso será mostrado no useEffect acima
    } catch (err: unknown) {
      let errorMessage = "Ocorreu um erro desconhecido";
      if (err instanceof AxiosError) errorMessage = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) errorMessage = err.message;
      showToast(` ${errorMessage}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || authLoading;

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: colors.background }}
      aria-labelledby="login-title">
      <a
        href="#login-form"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg">
        Saltar para o formulário de login
      </a>
      {/* Toast Notification */}
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} colors={colors} />}

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(${colors.primary} 1px, transparent 1px), linear-gradient(90deg, ${colors.primary} 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <div className="relative w-full max-w-[min(92vw,28rem)] z-10">
        <div
          className="backdrop-blur-xl border p-4 sm:p-8 overflow-hidden relative transition-shadow duration-300 rounded-2xl"
          style={{
            backgroundColor: `${colors.card}CC`,
            borderColor: colors.border,
          }}>
          {/* LOGO */}
          <div className="flex justify-center mb-6">
            <div className="logo-float">
              <Image src="/images/3.png" alt="Logo do Sistema" width={80} height={80} className="rounded-2xl cursor-pointer " priority />
            </div>
          </div>

          {/* Título */}
          <div className="text-center mb-6">
            <h2 id="login-title" className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: colors.secondary }}>
              Bem-vindo
            </h2>
            <p className="text-sm sm:text-base" style={{ color: colors.textSecondary }}>
              Faça login para acessar o sistema
            </p>
          </div>

          {/* Form */}
          <form id="login-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <InputField
              type="email"
              placeholder="Digite seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              colors={colors}
              id="email"
              label="Email"
              autoComplete="email"
            />

            <InputField
              type={showPassword ? "text" : "password"}
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={Lock}
              showPasswordToggle
              onTogglePassword={() => setShowPassword(!showPassword)}
              colors={colors}
              id="password"
              label="Senha"
              autoComplete="current-password"
            />

            {/* Forgot password link - aligned right */}
            <div className="flex justify-end -mt-2">
              <Link
                href="/forgot-password"
                className="text-xs font-medium transition-colors hover:underline"
                style={{ color: colors.secondary }}>
                Esqueceu a senha?
              </Link>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 mt-2 font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 rounded-lg touch-target"
              style={{ backgroundColor: isLoading ? `${colors.primary}B3` : colors.primary }}>
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: colors.border }}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4" style={{ backgroundColor: colors.card, color: colors.textSecondary }}>
                ou
              </span>
            </div>
          </div>

          {/* Google Login Button */}
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL}/api/landlord/auth/google`}
            className="w-full py-3 px-4 mb-4 font-semibold flex items-center justify-center gap-3 transition-all duration-300 rounded-lg border-2 touch-target hover:bg-opacity-80"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Entrar com Google
          </a>

          {/* Dentro do bloco onde está o link "Não tem conta? Cadastre-se" */}
          <div className="text-center mt-2">
            <Link
              href="/login-email-only"
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:underline"
              style={{ color: colors.secondary }}>
              <Mail size={16} />
              Entrar com email
            </Link>
          </div>

          {/* Link Cadastro */}
          <div className="text-center">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 transition-colors font-medium touch-target"
              style={{ color: colors.secondary }}>
              <UserPlus size={18} />
              Não tem conta? Cadastre-se
              <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </div>
        {/* Footer */}
      </div>
    </main>
  );
}
