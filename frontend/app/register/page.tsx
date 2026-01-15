'use client';

import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, Building, Mail, Smartphone, MapPin, FileImage } from "lucide-react";

const COLOR_PRIMARY = "#123859";
const COLOR_ACCENT = "#F9941F";

/* ---------------- INPUT COM ICON ---------------- */
const InputWithIcon = ({
    type,
    placeholder,
    value,
    onChange,
    icon: Icon,
    name,
}: {
    type: string;
    placeholder: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    name: string;
}) => (
    <div className="flex items-center border border-gray-300 rounded-xl px-3 py-3 focus-within:ring-2 focus-within:ring-[#F9941F]">
        <Icon className="w-6 h-6 text-[#F9941F] mr-3" />
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            name={name}
            onChange={onChange}
            required
            className="w-full text-lg focus:outline-none"
        />
    </div>
);

export default function RegisterPage() {
    const [form, setForm] = useState({
        nome: "",
        nomeEmpresa: "",
        email: "",
        logo: null as File | null,
        nif: "",
        endereco: "",
        contacto: "",
    });

    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const target = e.target;

        if (target.type === "file") {
            const files = target.files;
            if (files && files.length > 0) {
                const file = files[0];
                setForm((prev) => ({ ...prev, logo: file }));
                setLogoPreview(URL.createObjectURL(file));
            }
        } else {
            setForm((prev) => ({ ...prev, [target.name]: target.value }));
        }
    };

    const handleRemoveLogo = () => {
        setForm((prev) => ({ ...prev, logo: null }));
        setLogoPreview(null);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log("Form submitted:", form);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gray-100">
            {/* Background decorativo */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#123859] via-[#F9941F] to-[#123859] opacity-10 z-0" />

            {/* Botão Voltar */}
            <motion.div
                className="self-start mb-4 z-10"
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
                className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl z-10 p-10"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                {/* Logo do formulário */}
                <motion.img
                    src="/images/3.png"
                    alt="Logo FacturaJá"
                    className="w-28 h-28 mb-6 mx-auto"
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 200 }}
                />

                <h2 className="text-3xl font-bold text-center text-[#123859] mb-2">
                    Registo
                </h2>
                <p className="text-lg text-gray-600 text-center mb-6">
                    Crie sua conta e registre sua empresa
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputWithIcon
                            type="text"
                            placeholder="Nome"
                            value={form.nome}
                            onChange={handleChange}
                            icon={User}
                            name="nome"
                        />
                        <InputWithIcon
                            type="text"
                            placeholder="Nome da Empresa"
                            value={form.nomeEmpresa}
                            onChange={handleChange}
                            icon={Building}
                            name="nomeEmpresa"
                        />
                        <InputWithIcon
                            type="email"
                            placeholder="Email"
                            value={form.email}
                            onChange={handleChange}
                            icon={Mail}
                            name="email"
                        />
                        <InputWithIcon
                            type="text"
                            placeholder="NIF"
                            value={form.nif}
                            onChange={handleChange}
                            icon={Smartphone}
                            name="nif"
                        />
                        <InputWithIcon
                            type="text"
                            placeholder="Contacto"
                            value={form.contacto}
                            onChange={handleChange}
                            icon={Smartphone}
                            name="contacto"
                        />
                        <InputWithIcon
                            type="text"
                            placeholder="Endereço"
                            value={form.endereco}
                            onChange={handleChange}
                            icon={MapPin}
                            name="endereco"
                        />
                    </div>

                    {/* Upload da logo ajustado */}
                    <div className="flex flex-col">
                        <motion.label
                            className="flex items-center gap-2 border border-gray-300 rounded-xl px-3 h-14 cursor-pointer focus-within:ring-2 focus-within:ring-[#F9941F]"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <FileImage className="w-6 h-6 text-[#F9941F]" />
                            <span className="text-lg">
                                {logoPreview ? "Alterar logo" : "Selecionar logo"}
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                name="logo"
                                onChange={handleChange}
                                className="hidden"
                            />
                        </motion.label>

                        {logoPreview && (
                            <motion.div
                                className="mt-2 flex items-center gap-2"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <img
                                    src={logoPreview}
                                    alt="Logo Preview"
                                    className="w-14 h-14 object-cover rounded"
                                />
                                <motion.button
                                    type="button"
                                    onClick={handleRemoveLogo}
                                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Eliminar
                                </motion.button>
                            </motion.div>
                        )}
                    </div>

                    {/* Botão registrar maior e centralizado */}
                    <div className="flex justify-center">
                        <motion.button
                            type="submit"
                            className="w-64 py-4 mt-4 rounded-xl font-semibold bg-[#123859] text-white text-lg hover:bg-[#0f2b4c] transition"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            Registar
                        </motion.button>
                    </div>
                </form>

                <div className="mt-4 text-center text-sm">
                    <a href="/login" className="text-[#123859] hover:text-[#F9941F]">
                        Já tem conta? Faça login
                    </a>
                </div>
            </motion.div>
        </div>
    );
}
