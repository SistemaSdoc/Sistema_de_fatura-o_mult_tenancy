// app/landlord/register/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/services/axios";
import { useThemeColors } from "@/context/ThemeContext";
import { Mail, Lock, ArrowRight, AlertCircle, Loader2, UserPlus, User, Eye, EyeOff } from "lucide-react";
import { AxiosError } from "axios";

export default function LandlordRegisterPage() {
  const router = useRouter();
  const colors = useThemeColors();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !email.trim() || !password || !passwordConfirmation) {
      setError("Preencha todos os campos.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);
    try {
      await api.get("/sanctum/csrf-cookie");
      await api.post("/api/landlord/register", {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      setSuccess("Registo efetuado com sucesso! Redirecionando...");
      setName("");
      setEmail("");
      setPassword("");
      setPasswordConfirmation("");
      setTimeout(() => {
        router.push("/landlord/login");
      }, 2000);
    } catch (err: unknown) {
      let errorMessage = "Erro ao registar. Tente novamente.";
      if (err instanceof AxiosError) {
        errorMessage = err.response?.data?.message ?? errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: colors.background }}
    >
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${colors.primary} 1px, transparent 1px), linear-gradient(90deg, ${colors.primary} 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <div className="relative w-full max-w-md z-10">
        <div
          className="backdrop-blur-xl border p-8 overflow-hidden relative transition-shadow duration-300"
          style={{ backgroundColor: `${colors.card}CC`, borderColor: colors.border }}
        >
          <div className="flex justify-center mb-6">
            <Image src="/images/3.png" alt="Logo do Sistema" width={80} height={80} className="rounded-2xl cursor-pointer" priority />
          </div>

          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-2" style={{ color: colors.secondary }}>
              Criar Conta
            </h2>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Registo para administradores
            </p>
          </div>

          {error && (
            <div
              className="mb-4 border-l-4 p-4 rounded-r-xl flex items-center gap-3 shadow-sm"
              style={{ backgroundColor: `${colors.danger}20`, borderColor: colors.danger, color: colors.danger }}
            >
              <AlertCircle size={20} />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {success && (
            <div
              className="mb-4 border-l-4 p-4 rounded-r-xl flex items-center gap-3 shadow-sm"
              style={{ backgroundColor: "#22c55e20", borderColor: "#22c55e", color: "#22c55e" }}
            >
              <AlertCircle size={20} />
              <span className="text-sm font-medium">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {/* Nome */}
            <div className="relative w-full">
              <User
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10"
                style={{ color: colors.textSecondary }}
              />
              <input
                id="name"
                type="text"
                placeholder="Digite seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 outline-none transition-all duration-300"
                style={{
                  backgroundColor: `${colors.card}80`,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              />
            </div>

            {/* Email */}
            <div className="relative w-full">
              <Mail
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10"
                style={{ color: colors.textSecondary }}
              />
              <input
                id="email"
                type="email"
                placeholder="Digite seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 outline-none transition-all duration-300"
                style={{
                  backgroundColor: `${colors.card}80`,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              />
            </div>

            {/* Senha */}
            <div className="relative w-full">
              <Lock
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10"
                style={{ color: colors.textSecondary }}
              />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Crie uma senha (mín. 8 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full pl-10 pr-12 py-3 rounded-xl border-2 outline-none transition-all duration-300"
                style={{
                  backgroundColor: `${colors.card}80`,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: colors.textSecondary }}
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>

            {/* Confirmar senha */}
            <div className="relative w-full">
              <Lock
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10"
                style={{ color: colors.textSecondary }}
              />
              <input
                id="password_confirmation"
                type={showConfirm ? "text" : "password"}
                placeholder="Confirme sua senha"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                disabled={isLoading}
                className="w-full pl-10 pr-12 py-3 rounded-xl border-2 outline-none transition-all duration-300"
                style={{
                  backgroundColor: `${colors.card}80`,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: colors.textSecondary }}
              >
                {showConfirm ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 mt-2 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300"
              style={{ backgroundColor: isLoading ? `${colors.primary}B3` : colors.primary }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  A registar...
                </>
              ) : (
                <>
                  Criar Conta
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

          <div className="text-center">
            <Link
              href="/landlord/login"
              className="group inline-flex items-center gap-2 transition-colors font-medium"
              style={{ color: colors.secondary }}
            >
              <UserPlus size={18} />
              Já tem conta? Faça login
              <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: colors.textSecondary }}>
          © {new Date().getFullYear()} SDOCA. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}