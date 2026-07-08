// app/onboarding/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useThemeColors } from "@/context/ThemeContext";
import { clearTenant, landAuthApi, setTenant } from "@/services/axios";
import { Mail, Globe, Loader2, AlertCircle, CheckCircle, X, ArrowRight, Building, User } from "lucide-react";
import styles from "../login/login.module.css";

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

interface LandlordUser {
  id: string;
  name: string;
  email: string;
}

interface InputFieldProps {
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ElementType;
  colors: ThemeColors;
  autoComplete?: string;
  id?: string;
  label?: string;
  error?: string;
}

/* ---------------- COMPONENTS ---------------- */
const InputField: React.FC<InputFieldProps> = ({
  type,
  placeholder,
  value,
  onChange,
  icon: Icon,
  colors,
  autoComplete,
  id,
  label,
  error,
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
        className={`w-full pl-10 pr-4 py-3 border-2 outline-none transition-all duration-300 min-h-12 ${
          error ? "border-red-500" : ""
        }`}
        style={{
          backgroundColor: isFocused ? colors.card : `${colors.card}80`,
          borderColor: error ? colors.danger : isFocused ? colors.secondary : colors.border,
          color: colors.text,
          boxShadow: isFocused ? `0 10px 15px -3px ${colors.secondary}20` : "none",
        }}
      />

      {error && (
        <p className="mt-1 text-xs" style={{ color: colors.danger }}>
          {error}
        </p>
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
export default function OnboardingPage(): React.ReactElement {
  const router = useRouter();
  const colors = useThemeColors();

  const [landlordUser, setLandlordUser] = useState<LandlordUser | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [nome, setNome] = useState<string>("");
  const [subdomain, setSubdomain] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    clearTenant();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Busca dados do usuário landlord (não do tenant!)
  useEffect(() => {
    landAuthApi
      .me()
      .then((res) => {
        setLandlordUser(res.data.user);
        // Pré-preenche o nome com o nome do usuário
        if (res.data.user?.name) {
          setNome(res.data.user.name);
        }
      })
      .catch(() => {
        showToast("Sessão expirada, faça login novamente.", "error");
        setTimeout(() => {
          router.replace("/login");
        }, 2000);
      })
      .finally(() => setLoadingUser(false));
  }, [router]);

  const sanitizeSubdomain = (value: string): string => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100);
  };

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeSubdomain(e.target.value);
    setSubdomain(sanitized);
    if (errors.subdomain) setErrors((prev) => ({ ...prev, subdomain: "" }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!nome.trim()) newErrors.nome = "Nome da empresa é obrigatório";
    if (!subdomain.trim()) newErrors.subdomain = "Subdomínio é obrigatório";
    if (subdomain && !subdomain.match(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)) {
      newErrors.subdomain = "Subdomínio inválido (apenas letras, números e hífen)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);

    try {
      const response = await landAuthApi.criarEmpresaFreelancer({ 
        nome: nome.trim(), 
        subdomain: subdomain.trim(),
        modo: "colectivo",
      });

      if (response.data?.success) {
        const { empresa_id, subdomain: sub } = response.data.data;

        // 1️⃣ Guarda o tenant em localStorage
        setTenant({ id: empresa_id, subdomain: sub });

        // 2️⃣ Aguarda um pouco para garantir que localStorage foi atualizado
        await new Promise((resolve) => setTimeout(resolve, 150));

        // 3️⃣ Mostra toast de sucesso e redireciona
        showToast("Empresa criada com sucesso! Redirecionando para o dashboard...", "success");
        
        setTimeout(() => {
          router.replace("/dashboard");
        }, 2000);
      }
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      const errorMessage = apiError.response?.data?.message || "Erro ao criar empresa";
      showToast(errorMessage, "error");
      setErrors((prev) => ({ ...prev, submit: errorMessage }));
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = loadingUser || submitting;

  if (loadingUser) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: colors.background }}>
        <Loader2 size={40} className="animate-spin" style={{ color: colors.primary }} />
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: colors.background }}
      aria-labelledby="onboarding-title">
      
      {/* Toast Notification */}
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} colors={colors} />}

      {/* Grid Background */}
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
              <Image src="/images/3.png" alt="Logo do Sistema" width={80} height={80} className="rounded-2xl cursor-pointer" priority />
            </div>
          </div>

          {/* Título */}
          <div className="text-center mb-6">
            <h2 id="onboarding-title" className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: colors.secondary }}>
              Bem-vindo ao Faturaja
            </h2>
            <p className="text-sm sm:text-base" style={{ color: colors.textSecondary }}>
              {landlordUser?.name ? `Olá ${landlordUser.name}, ` : ""}
              configure o seu nome e o subdomínio para começar a faturar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {/* Nome da Empresa */}
            <InputField
              type="text"
              placeholder="Insira o seu nome ou o nome da sua empresa"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                if (errors.nome) setErrors((prev) => ({ ...prev, nome: "" }));
              }}
              icon={Building}
              colors={colors}
              id="nome"
              label="Nome da Empresa"
              autoComplete="organization"
              error={errors.nome}
            />

            {/* Subdomínio */}
            <div>
              <InputField
                type="text"
                placeholder="Insira o subdomínio"
                value={subdomain}
                onChange={handleSubdomainChange}
                icon={Globe}
                colors={colors}
                id="subdomain"
                label="Subdomínio"
                autoComplete="on"
                error={errors.subdomain}
              />
            </div>

            {/* Info Box */}
            <div
              className="p-4 rounded-lg border mt-2"
              style={{
                backgroundColor: `${colors.secondary}10`,
              }}>
              <p className="text-sm" style={{ color: colors.text }}>
                Você poderá completar seus dados fiscais (NIF, telefone, dados bancários) após criar a empresa.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 mt-4 font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 rounded-lg touch-target"
              style={{ backgroundColor: isLoading ? `${colors.primary}B3` : colors.primary }}>
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Criando empresa...
                </>
              ) : (
                <>
                  Criar Empresa
                </>
              )}
            </button>
          </form>


          
        </div>
      </div>
    </main>
  );
}
