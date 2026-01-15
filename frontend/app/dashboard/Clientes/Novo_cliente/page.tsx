"use client";

import React, { useState } from "react";
import MainEmpresa from "../../../components/MainEmpresa";

export default function NovoClientePage() {
    const [nome, setNome] = useState("");
    const [tipo, setTipo] = useState<"Consumidor Final" | "Empresa">("Consumidor Final");
    const [telefone, setTelefone] = useState("");
    const [email, setEmail] = useState("");
    const [endereco, setEndereco] = useState("");

    const salvarCliente = () => {
        if (!nome || !telefone || !email || !endereco) {
            alert("Por favor, preencha todos os campos obrigatórios!");
            return;
        }

        const novoCliente = {
            id: Math.floor(Math.random() * 10000), // ID mock
            nome,
            tipo,
            telefone,
            email,
            endereco,
        };

        console.log("Cliente salvo:", novoCliente);
        alert(`Cliente ${nome} cadastrado com sucesso!`);

        // Limpar formulário
        setNome("");
        setTipo("Consumidor Final");
        setTelefone("");
        setEmail("");
        setEndereco("");
    };

    return (
        <MainEmpresa>
            <div className="p-6 max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold text-[#123859] mb-6">Novo Cliente</h1>

                <div className="bg-white rounded-xl shadow p-6 space-y-4">
                    {/* Nome */}
                    <div>
                        <label className="block text-sm font-semibold mb-1">Nome do Cliente *</label>
                        <input
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#123859]"
                            placeholder="Digite o nome do cliente"
                        />
                    </div>
                    {/* Telefone */}
                    <div>
                        <label className="block text-sm font-semibold mb-1">Telefone *</label>
                        <input
                            type="text"
                            value={telefone}
                            onChange={(e) => setTelefone(e.target.value)}
                            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#123859]"
                            placeholder="+244 900 000 000"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-semibold mb-1">Email *</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#123859]"
                            placeholder="exemplo@empresa.com"
                        />
                    </div>

                    {/* Endereço */}
                    <div>
                        <label className="block text-sm font-semibold mb-1">Endereço *</label>
                        <textarea
                            value={endereco}
                            onChange={(e) => setEndereco(e.target.value)}
                            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#123859]"
                            placeholder="Rua, número, bairro, cidade"
                            rows={3}
                        />
                    </div>

                    {/* Botão Salvar */}
                    <div className="flex justify-end mt-4">
                        <button
                            onClick={salvarCliente}
                            className="bg-[#123859] text-white px-6 py-2 rounded font-semibold hover:bg-[#0f2a4a] transition"
                        >
                            Salvar Cliente
                        </button>
                    </div>
                </div>
            </div>
        </MainEmpresa>
    );
}
