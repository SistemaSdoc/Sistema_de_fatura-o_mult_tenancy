'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/authprovider";
import { useThemeColors } from "@/context/ThemeContext";
import { AxiosError } from "axios";
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2, UserPlus } from "lucide-react";
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
}) => {
  const [isFocused, setIsFocused] = useState<boolean>(false);

  return (
    <div
      className="relative w-full"
      style={
        {
          "--login-input-icon-color": colors.textSecondary,
          "--login-input-icon-color-focused": colors.secondary,
        } as React.CSSProperties
      }
    >
      <div
        className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 transition-transform duration-300 ${styles.inputIcon}`}
        data-focused={isFocused}
      >
        <Icon size={20} />
      </div>

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        required
        className={`w-full pl-10 pr-${showPasswordToggle ? '12' : '4'} py-3 rounded-xl border-2 outline-none transition-all duration-300`}
        style={{
          backgroundColor: isFocused ? colors.card : `${colors.card}80`,
          borderColor: isFocused ? colors.secondary : colors.border,
          color: colors.text,
          boxShadow: isFocused ? `0 10px 15px -3px ${colors.secondary}20` : 'none',
        }}
      />

      {showPasswordToggle && onTogglePassword && (
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-transform hover:scale-110 active:scale-90"
          style={{ color: colors.textSecondary }}
        >
          {type === "password" ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      )}
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
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (error) setError("");
  }, [email, password, error]);

  useEffect(() => {
    if (!user) return;

    const redirectMap: Record<string, string> = {
      admin: "/dashboard",
      contablista: "/dashboard/",
      operador: "/dashboard/Vendas/Nova_venda",
    };
    const destination = redirectMap[user.role] || "/login";
    setTimeout(() => router.push(destination), 500);
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err: unknown) {
      let errorMessage = "Ocorreu um erro desconhecido";
      if (err instanceof AxiosError) errorMessage = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) errorMessage = err.message;
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || authLoading;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: colors.background }}
    >
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(${colors.primary} 1px, transparent 1px), linear-gradient(90deg, ${colors.primary} 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      <div className="relative w-full max-w-md z-10">
        <div
          className="backdrop-blur-xl   border p-8 overflow-hidden relative transition-shadow duration-300]"
          style={{
            backgroundColor: `${colors.card}CC`,
            borderColor: colors.border,
          }}
        >
          {/* LOGO */}
          <div className="flex justify-center mb-6">
            <Image
              src="/images/3.png"
              alt="Logo do Sistema"
              width={80}
              height={80}
              className="rounded-2xl cursor-pointer "
              priority
            />
          </div>

          {/* Título */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-2" style={{ color: colors.secondary }}>Bem-vindo</h2>
            <p className="text-sm" style={{ color: colors.textSecondary }}>Faça login para acessar o sistema</p>
          </div>

          {/* Erro */}
          {error && (
            <div className="mb-4 border-l-4 p-4 rounded-r-xl flex items-center gap-3 shadow-sm"
              style={{ backgroundColor: `${colors.danger}20`, borderColor: colors.danger, color: colors.danger }}
            >
              <AlertCircle size={20} />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <InputField
              type="email"
              placeholder="Digite seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              colors={colors}
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
            />

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs font-medium transition-colors" style={{ color: colors.secondary }}>
                Esqueceu a senha?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 mt-2 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300`}
              style={{ backgroundColor: isLoading ? `${colors.primary}B3` : colors.primary }}
            >
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

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: colors.border }}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4" style={{ backgroundColor: colors.card, color: colors.textSecondary }}>ou</span>
            </div>
          </div>

          {/* Link Cadastro */}
          <div className="text-center">
            <Link href="/cadastro" className="group inline-flex items-center gap-2 transition-colors font-medium" style={{ color: colors.secondary }}>
              <UserPlus size={18} />
              Não tem conta? Cadastre-se
              <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: colors.textSecondary }}>
          © {new Date().getFullYear()} SDOCA. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
