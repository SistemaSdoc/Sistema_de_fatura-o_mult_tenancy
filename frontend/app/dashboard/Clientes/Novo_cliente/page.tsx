"use client";

import React, { useState } from "react";
import axios from "axios";
import MainEmpresa from "../../../components/MainEmpresa";
import { clienteService } from "@/services/vendas";
import api from "@/services/axios";

type ClienteTipo = "consumidor_final" | "empresa";

interface ValidationErrors {
  [key: string]: string[];
}

export default function NovoClientePage() {
  const [nome, setNome] = useState<string>("");
  const [tipo, setTipo] = useState<ClienteTipo>("consumidor_final");
  const [telefone, setTelefone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [endereco, setEndereco] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const salvarCliente = async (): Promise<void> => {
    if (!nome.trim()) {
      alert("O nome é obrigatório");
      return;
    }

    try {
      setLoading(true);

      await clienteService.criar({
        nome,
        tipo,
        telefone: telefone || undefined,
        email: email || undefined,
        endereco: endereco || undefined,
      });

      alert(`Cliente ${nome} cadastrado com sucesso!`);

      setNome("");
      setTipo("consumidor_final");
      setTelefone("");
      setEmail("");
      setEndereco("");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 422) {
          const data = error.response.data as {
            errors?: ValidationErrors;
          };

          if (data.errors) {
            const mensagens = Object.values(data.errors).flat();
            alert(mensagens.join("\n"));
          } else {
            alert("Erro de validação");
          }
        } else {
          alert("Erro ao salvar cliente");
          console.error(error.message);
        }
      } else {
        alert("Erro inesperado");
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainEmpresa>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-[#123859] mb-6">
          Novo Cliente
        </h1>

        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          {/* Nome */}
          <div>
            <label htmlFor="nome" className="block text-sm font-semibold mb-1">
              Nome do Cliente *
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite o nome do cliente"
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-[#123859]"
            />
          </div>

          {/* Tipo */}
          <div>
            <label htmlFor="tipo" className="block text-sm font-semibold mb-1">
              Tipo de Cliente
            </label>
            <select
              id="tipo"
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as ClienteTipo)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="consumidor_final">Consumidor Final</option>
              <option value="empresa">Empresa</option>
            </select>
          </div>

          {/* Telefone */}
          <div>
            <label htmlFor="telefone" className="block text-sm font-semibold mb-1">
              Telefone
            </label>
            <input
              id="telefone"
              name="telefone"
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="+244 900 000 000"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@empresa.com"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {/* Endereço */}
          <div>
            <label htmlFor="endereco" className="block text-sm font-semibold mb-1">
              Endereço
            </label>
            <textarea
              id="endereco"
              name="endereco"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, número, bairro, cidade"
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>

          {/* Botão */}
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={salvarCliente}
              disabled={loading}
              className="bg-[#123859] text-white px-6 py-2 rounded font-semibold hover:bg-[#0f2a4a] transition disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar Cliente"}
            </button>
          </div>
        </div>
      </div>
    </MainEmpresa>
  );
}
