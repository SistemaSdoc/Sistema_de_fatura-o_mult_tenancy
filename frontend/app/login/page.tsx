'use client';

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/authprovider";
import { AxiosError } from "axios";

/* ---------------- INPUT ---------------- */
const InputField = ({
  type,
  placeholder,
  value,
  onChange,
}: {
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    required
    className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F9941F]"
  />
);

/* ---------------- PAGE ---------------- */
export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);
      // 🚫 nada de localStorage aqui
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.message ?? err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocorreu um erro desconhecido");
      }
    }
  };

  /* 🔁 Redireciona assim que o usuário estiver disponível */
  useEffect(() => {
    if (!user) return;

    switch (user.role) {
      case "admin":
        router.push("/dashboard/Vendas/relatorios");
        break;
      case "caixa":
        router.push("/dashboard/Vendas/Nova_venda");
        break;
      case "operador":
        router.push("/dashboard");
        break;
      default:
        router.push("/login");
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gray-100">
      <motion.div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 p-6"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-2xl font-bold text-center text-[#123859] mb-2">
          Login
        </h2>

        {error && (
          <div className="bg-red-100 text-red-600 p-2 rounded-xl text-sm mb-3 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <InputField
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <InputField
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 mt-2 rounded-xl font-semibold bg-[#123859] text-white hover:bg-[#0f2b4c] transition disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          <Link href="/register" className="text-[#123859] hover:text-[#F9941F]">
            Não tem conta? Cadastre-se
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
