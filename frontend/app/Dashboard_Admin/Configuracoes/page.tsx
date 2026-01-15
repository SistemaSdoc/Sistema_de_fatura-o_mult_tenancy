"use client";

import React, { useState } from "react";
import MainAdmin from "../../components/MainAdmin";
import { Users, Settings, Key, FileText } from "lucide-react";

export default function ConfiguracoesAdminPage() {
    const [tema, setTema] = useState<"Claro" | "Escuro">("Claro");

    const alterarTema = (novoTema: "Claro" | "Escuro") => setTema(novoTema);

    return (
        <MainAdmin>
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-[#123859] flex items-center gap-2">
                    <Settings /> Configurações do Admin
                </h1>

                {/* CARD 1: Gestão de Empresas */}
                <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
                    <div className="flex items-center gap-4">
                        <FileText className="w-8 h-8 text-[#F9941F]" />
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-[#123859]">Gestão de Empresas</h2>
                            <p className="text-gray-500 text-sm">
                                Ative, desative empresas, gerencie planos e monitorize cadastros.
                            </p>
                        </div>
                        <button
                            className="px-4 py-2 bg-[#123859] text-white rounded-xl font-semibold hover:bg-[#0f2b4c] transition"
                        >
                            Abrir
                        </button>
                    </div>
                </div>

                {/* CARD 2: Gestão de Usuários */}
                <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
                    <div className="flex items-center gap-4">
                        <Users className="w-8 h-8 text-[#F9941F]" />
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-[#123859]">Gestão de Usuários</h2>
                            <p className="text-gray-500 text-sm">
                                Adicione, remova e configure permissões de administradores e colaboradores.
                            </p>
                        </div>
                        <button
                            className="px-4 py-2 bg-[#123859] text-white rounded-xl font-semibold hover:bg-[#0f2b4c] transition"
                        >
                            Abrir
                        </button>
                    </div>
                </div>

                {/* CARD 3: Permissões */}
                <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
                    <div className="flex items-center gap-4">
                        <Key className="w-8 h-8 text-[#F9941F]" />
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-[#123859]">Permissões do Sistema</h2>
                            <p className="text-gray-500 text-sm">
                                Configure níveis de acesso, regras e restrições para todos os usuários.
                            </p>
                        </div>
                        <button
                            className="px-4 py-2 bg-[#123859] text-white rounded-xl font-semibold hover:bg-[#0f2b4c] transition"
                        >
                            Abrir
                        </button>
                    </div>
                </div>

                {/* CARD 4: Preferências do Sistema */}
                <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
                    <div className="flex items-center gap-4">
                        <Settings className="w-8 h-8 text-[#F9941F]" />
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-[#123859]">Preferências do Sistema</h2>
                            <p className="text-gray-500 text-sm">
                                Ajuste tema, cores e configurações globais do painel.
                            </p>
                            <div className="mt-2 flex gap-2">
                                <button
                                    onClick={() => alterarTema("Claro")}
                                    className={`px-4 py-2 rounded-xl font-semibold border ${tema === "Claro" ? "bg-[#123859] text-white" : "bg-white border"}`}
                                >
                                    Claro
                                </button>
                                <button
                                    onClick={() => alterarTema("Escuro")}
                                    className={`px-4 py-2 rounded-xl font-semibold border ${tema === "Escuro" ? "bg-[#123859] text-white" : "bg-white border"}`}
                                >
                                    Escuro
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CARD 5: Logs e Auditoria */}
                <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
                    <div className="flex items-center gap-4">
                        <FileText className="w-8 h-8 text-[#F9941F]" />
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-[#123859]">Logs e Auditoria</h2>
                            <p className="text-gray-500 text-sm">
                                Visualize todas as ações realizadas no sistema e audite eventos críticos.
                            </p>
                        </div>
                        <button
                            className="px-4 py-2 bg-[#123859] text-white rounded-xl font-semibold hover:bg-[#0f2b4c] transition"
                        >
                            Abrir
                        </button>
                    </div>
                </div>
            </div>
        </MainAdmin>
    );
}
