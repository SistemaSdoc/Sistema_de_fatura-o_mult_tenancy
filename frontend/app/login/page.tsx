"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

/* ---------------- INPUT ---------------- */
const InputField = ({
    type,
    placeholder,
    value,
    onChange,
}: {
    type: string;
    placeholder: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
    <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F9941F]"
    />
);

/* ---------------- PAGE ---------------- */
export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log("Form submitted", { email, password });
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gray-100">
            {/* Background decorativo */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#123859] via-[#F9941F] to-[#123859] opacity-20 z-0" />

            {/* Botão Voltar */}
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

            {/* Formulário */}
            <motion.div
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 p-6"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                {/* Logo / imagem */}
                <motion.img
                    src="/images/3.png" // substitua pela sua logo
                    alt="Logo"
                    className="w-24 h-24 mb-4 mx-auto"
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    transition={{ type: "spring", stiffness: 200 }}
                />

                <h2 className="text-2xl font-bold text-center text-[#123859] mb-2">
                    Login
                </h2>

                <p className="text-sm text-gray-500 text-center mb-4">
                    Entre com seu email e senha
                </p>

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
                        className="w-full py-2 mt-2 rounded-xl font-semibold bg-[#123859] text-white hover:bg-[#0f2b4c] transition"
                    >
                        Entrar
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
