"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/authprovider";
import { useThemeColors } from "@/context/ThemeContext";
import { Mail, Globe, Loader2, AlertCircle, CheckCircle, X } from "lucide-react";
import api from "@/services/axios";
import styles from "../login/login.module.css";

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

interface FormData {
  nome: string;
  subdomain: string;
}

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

export default function FreelancerOnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const colors = useThemeColors();

  const [form, setForm] = useState<FormData>({
    nome: "",
    subdomain: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (authLoading) return;

    // ✅ Se não tem usuário, redireciona para login
    if (!user) {
      router.push("/login");
      return;
    }

    // ✅ Se tem empresa_id, já fez onboarding - vai para dashboard
    if (user.empresa?.id) {
      router.push("/dashboard");
      return;
    }

    // ✅ Pre-fill nome com nome do usuário
    if (user.name && !form.nome) {
      setForm((prev) => ({ ...prev, nome: user.name }));
    }
  }, [user, authLoading, router, form.nome]);

  const sanitizeSubdomain = (value: string): string => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100);
  };

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeSubdomain(e.target.value);
    setForm((prev) => ({ ...prev, subdomain: sanitized }));
    if (errors.subdomain) setErrors((prev) => ({ ...prev, subdomain: "" }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!form.nome.trim()) newErrors.nome = "Nome é obrigatório";
    if (!form.subdomain.trim()) newErrors.subdomain = "Subdomínio é obrigatório";
    if (form.subdomain && !form.subdomain.match(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)) {
      newErrors.subdomain = "Subdomínio inválido (apenas letras, números e hífen)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post("/api/landlord/freelancer/empresa", {
        nome: form.nome.trim(),
        subdomain: form.subdomain.trim(),
      });

      if (response.data.success) {
        showToast("Empresa criada! Redirecionando para configurações...", "success");
        setTimeout(() => {
          router.push("/dashboard/configuracoes");
        }, 2000);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Erro ao criar empresa";
      showToast(errorMessage, "error");
      setErrors((prev) => ({ ...prev, submit: errorMessage }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <Loader2 size={40} className="animate-spin" style={{ color: colors.primary }} />
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: colors.background }}>
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
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: colors.secondary }}>
              Bem-vindo! 👋
            </h1>
            <p className="text-sm sm:text-base" style={{ color: colors.textSecondary }}>
              {user?.name ? `Olá ${user.name}, ` : ""}
              Configure sua empresa para começar a faturar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                Nome da Empresa
              </label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, nome: e.target.value }));
                  if (errors.nome) setErrors((prev) => ({ ...prev, nome: "" }));
                }}
                placeholder="Ex: João Silva Consultoria"
                className="w-full px-4 py-3 border-2 outline-none transition-all rounded-lg"
                style={{
                  backgroundColor: colors.card,
                  borderColor: errors.nome ? colors.danger : colors.border,
                  color: colors.text,
                }}
              />
              {errors.nome && (
                <p className="mt-1 text-xs" style={{ color: colors.danger }}>
                  {errors.nome}
                </p>
              )}
            </div>

            {/* Subdomain */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                Subdomínio
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={form.subdomain}
                  onChange={handleSubdomainChange}
                  placeholder="joaosilva"
                  className="flex-1 px-4 py-3 border-2 outline-none transition-all rounded-lg"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: errors.subdomain ? colors.danger : colors.border,
                    color: colors.text,
                  }}
                />
                <span style={{ color: colors.textSecondary }}>.faturaja.net</span>
              </div>
              <p className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
                Apenas letras, números e hífen
              </p>
              {errors.subdomain && (
                <p className="mt-1 text-xs" style={{ color: colors.danger }}>
                  {errors.subdomain}
                </p>
              )}
            </div>

            {/* Info Box */}
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: `${colors.primary}10`,
                borderColor: `${colors.primary}40`,
              }}>
              <p className="text-sm" style={{ color: colors.text }}>
                ℹ️ Você poderá completar seus dados fiscais (NIF, telefone, dados bancários) após criar a empresa.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 mt-4 font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 rounded-lg touch-target"
              style={{ backgroundColor: isSubmitting ? `${colors.primary}B3` : colors.primary }}>
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Criando empresa...
                </>
              ) : (
                <>
                  Criar Empresa
                  <CheckCircle size={20} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
