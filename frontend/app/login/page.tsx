"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";

/* ---------------- TIPOS ---------------- */
interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface ApiTenant {
  id: string;
  nome: string;
  email: string;
}

interface LoginResponse {
  token: string;
  user: ApiUser;
  tenant: ApiTenant;
}

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

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post<LoginResponse>(
        "http://localhost:8000/api/login",
        { email, password }
      );

      const { token, user, tenant } = response.data;

      // 🔐 Persistência
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("tenant", JSON.stringify(tenant));

      // 🚀 Redirect por role
      switch (user.role) {
        case "admin":
          router.push("/dashboard/Vendas");
          break;
        case "caixa":
          router.push("/dashboard/Vendas");
        case "operador":
          router.push("/dashboard");
          break;
        default:
          router.push("/dashboard");
      }

    } catch (err) {
      const errorAxios = err as AxiosError<{ message: string }>;

      setError(
        errorAxios.response?.data?.message ??
        "Email ou senha incorretos"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gray-100">
      <div className="absolute inset-0 bg-linear-to-r from-[#123859] via-[#F9941F] to-[#123859] opacity-20 z-0" />

      <motion.div
        className="self-start mb-4 z-10 w-full max-w-md"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <button
          onClick={() => window.history.back()}
          className="border border-[#123859] text-[#123859] font-semibold rounded-xl px-4 py-2 hover:bg-[#123859] hover:text-white transition"
        >
          &larr; Voltar
        </button>
      </motion.div>

      <motion.div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 p-6"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.img
          src="/images/3.png"
          alt="Logo"
          className="w-24 h-24 mb-4 mx-auto"
          whileHover={{ scale: 1.1, rotate: 10 }}
        />

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
