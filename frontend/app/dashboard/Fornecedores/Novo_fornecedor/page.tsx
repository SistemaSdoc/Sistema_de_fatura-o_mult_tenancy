"use client";

import React, { useEffect, useState } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import { Trash2, Edit } from "lucide-react";
import { fornecedorService } from "@/services/vendas";

interface Fornecedor {
  id: number;
  nome: string;
  nif: string;
  telefone?: string | null;
  email: string;
  endereco?: string | null;
}

type FormFornecedor = Omit<Fornecedor, "id">;

export default function NovoFornecedorPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // 🔔 BANNER
  const [banner, setBanner] = useState<{
    tipo: "success" | "error";
    texto: string;
  } | null>(null);

  const mostrarBanner = (tipo: "success" | "error", texto: string) => {
    setBanner({ tipo, texto });
    setTimeout(() => setBanner(null), 4000);
  };

  const [form, setForm] = useState<FormFornecedor>({
    nome: "",
    nif: "",
    telefone: "",
    email: "",
    endereco: "",
  });

  // 🔄 CARREGAR
  const carregarFornecedores = async () => {
    try {
      setLoading(true);
      const data = await fornecedorService.listar();
      setFornecedores(data);
    } catch (error) {
      console.error(error);
      mostrarBanner("error", "Erro ao carregar fornecedores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarFornecedores();
  }, []);

  // ✏️ FORM CHANGE
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // ➕ CRIAR
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nome) {
      mostrarBanner("error", "Nome é obrigatório");
      return;
    }

    try {
      setSalvando(true);

      const novo = await fornecedorService.criar({
        nome: form.nome,
        nif: form.nif,
        telefone: form.telefone || null,
        email: form.email,
        endereco: form.endereco || null,
      });

      setFornecedores((prev) => [...prev, novo]);

      mostrarBanner("success", "Fornecedor cadastrado com sucesso!");

      setForm({
        nome: "",
        nif: "",
        telefone: "",
        email: "",
        endereco: "",
      });
    } catch (error: any) {
      console.error(error);

      if (error?.response?.status === 422) {
        mostrarBanner("error", error.response.data.message);
      } else {
        mostrarBanner("error", "Erro ao cadastrar fornecedor");
      }
    } finally {
      setSalvando(false);
    }
  };

  // 🗑️ APAGAR
  const apagarFornecedor = async (id: number) => {
    try {
      await fornecedorService.deletar(String(id));
      setFornecedores((prev) => prev.filter((f) => f.id !== id));
      mostrarBanner("success", "Fornecedor apagado com sucesso");
    } catch (error) {
      mostrarBanner("error", "Erro ao apagar fornecedor");
    }
  };

  // ✏️ EDITAR (simples)
  const editarFornecedor = async (fornecedor: Fornecedor) => {
    const nome = window.prompt("Novo nome", fornecedor.nome);
    if (!nome) return;

    try {
      const atualizado = await fornecedorService.atualizar(
        String(fornecedor.id),
        { nome }
      );

      setFornecedores((prev) =>
        prev.map((f) => (f.id === fornecedor.id ? atualizado : f))
      );

      mostrarBanner("success", "Fornecedor atualizado");
    } catch (error) {
      mostrarBanner("error", "Erro ao atualizar fornecedor");
    }
  };

  return (
    <MainEmpresa>
      <div className="p-6 flex flex-col items-center space-y-6">
        <h1 className="text-2xl font-bold text-[#123859]">
          Novo Fornecedor
        </h1>

        {/* 🔔 BANNER */}
        {banner && (
          <div
            className={`w-full max-w-md px-4 py-3 rounded-lg text-sm font-semibold ${
              banner.tipo === "success"
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-red-100 text-red-700 border border-red-300"
            }`}
          >
            {banner.texto}
          </div>
        )}

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-xl shadow w-full max-w-md space-y-4"
        >
          <div>
            <label className="block font-semibold mb-1">Nome *</label>
            <input
              type="text"
              name="nome"
              value={form.nome}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">NIF</label>
            <input
              type="text"
              name="nif"
              value={form.nif}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Telefone</label>
            <input
              type="text"
              name="telefone"
              value={form.telefone || ""}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Endereço</label>
            <input
              type="text"
              name="endereco"
              value={form.endereco || ""}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={salvando}
              className="bg-[#F9941F] text-white px-4 py-2 rounded font-semibold hover:bg-[#d87e17] disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Adicionar Fornecedor"}
            </button>
          </div>
        </form>
      </div>
    </MainEmpresa>
  );
}
