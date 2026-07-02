"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/authprovider";
import { useThemeColors } from "@/context/ThemeContext";
import { Loader2, AlertCircle, CheckCircle, Save, Upload, Trash2 } from "lucide-react";
import api from "@/services/axios";
import { toast } from "sonner";

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
  nif: string;
  telefone: string;
  nome_banco: string;
  numero_conta: string;
  iban: string;
  endereco: string;
  logo_file?: File;
}

export interface FreelancerConfigTabProps {
  colors: ThemeColors;
  incompleteFields?: string[];
}

export const FreelancerConfigTab = ({ colors, incompleteFields = [] }: FreelancerConfigTabProps) => {
  const { user, refetch: refetchAuth } = useAuth();
  const [form, setForm] = useState<FormData>({
    nif: "",
    telefone: "",
    nome_banco: "",
    numero_conta: "",
    iban: "",
    endereco: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [incomplete, setIncomplete] = useState<string[]>(incompleteFields);

  // 📋 Carregar dados atuais
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await api.get("/api/landlord/freelancer/onboarding");
        const { data } = response.data;

        if (data?.empresa) {
          setForm((prev) => ({
            ...prev,
            nif: data.empresa.nif || "",
            telefone: data.empresa.telefone || "",
            nome_banco: data.empresa.nome_banco || "",
            numero_conta: data.empresa.numero_conta || "",
            iban: data.empresa.iban || "",
            endereco: data.empresa.endereco || "",
          }));
          setLogoPreview(data.empresa.logo || null);
          setIncomplete(data.incomplete_fields || []);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        toast.error("Erro ao carregar dados de configuração");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({ ...prev, logo_file: "Apenas imagens são permitidas" }));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, logo_file: "Arquivo muito grande (máx 5MB)" }));
        return;
      }

      setForm((prev) => ({ ...prev, logo_file: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setErrors((prev) => ({ ...prev, logo_file: "" }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (form.nif && !form.nif.match(/^\d{10}$|^\d{9}[A-Z]{2}\d{3}$/)) {
      newErrors.nif = "NIF inválido (10 dígitos ou BI: 9+2+3)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("nif", form.nif);
      formData.append("telefone", form.telefone);
      formData.append("nome_banco", form.nome_banco);
      formData.append("numero_conta", form.numero_conta);
      formData.append("iban", form.iban);
      formData.append("endereco", form.endereco);

      if (form.logo_file) {
        formData.append("logo", form.logo_file);
      }

      const response = await api.put("/api/landlord/freelancer/empresa", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        toast.success(response.data.message);

        if (response.data.data?.empresa) {
          setForm((prev) => ({
            ...prev,
            nif: response.data.data.empresa.nif || "",
            telefone: response.data.data.empresa.telefone || "",
            nome_banco: response.data.data.empresa.nome_banco || "",
            numero_conta: response.data.data.empresa.numero_conta || "",
            iban: response.data.data.empresa.iban || "",
            endereco: response.data.data.empresa.endereco || "",
          }));
          setIncomplete(response.data.data.incomplete_fields || []);
        }

        await refetchAuth?.();
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Erro ao atualizar dados";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: colors.primary }} />
      </div>
    );
  }

  const progressPercent = Math.round(((6 - incomplete.length) / 6) * 100);

  return (
    <div className="space-y-6">
      {/* Progress */}
      {incomplete.length > 0 && (
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: `${colors.primary}10`,
            borderColor: `${colors.primary}40`,
          }}>
          <div className="flex items-center justify-between mb-2">
            <p style={{ color: colors.text }}>Progresso: {progressPercent}% completo</p>
            {incomplete.length > 0 && (
              <p style={{ color: colors.textSecondary }} className="text-sm">
                {incomplete.length} campo(s) faltando
              </p>
            )}
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${colors.primary}30` }}>
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: progressPercent === 100 ? colors.success : colors.primary,
              }}
            />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo */}
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}>
          <h3 className="font-semibold mb-4" style={{ color: colors.text }}>
            Logo da Empresa
          </h3>

          <div className="space-y-4">
            {logoPreview && (
              <div className="relative inline-block">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-24 w-24 object-cover rounded-lg border-2"
                  style={{ borderColor: colors.border }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setLogoPreview(null);
                    setForm((prev) => ({ ...prev, logo_file: undefined }));
                  }}
                  className="absolute -top-2 -right-2 p-1 rounded-full"
                  style={{ backgroundColor: colors.danger }}>
                  <Trash2 size={14} className="text-white" />
                </button>
              </div>
            )}

            <label
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors"
              style={{
                borderColor: colors.border,
                backgroundColor: `${colors.primary}05`,
              }}>
              <Upload size={24} style={{ color: colors.primary }} />
              <p className="mt-2 font-medium text-sm" style={{ color: colors.text }}>
                Clique para fazer upload
              </p>
              <p style={{ color: colors.textSecondary }} className="text-xs">
                Máx 5MB • PNG, JPG
              </p>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
            {errors.logo_file && (
              <p style={{ color: colors.danger }} className="text-sm">
                {errors.logo_file}
              </p>
            )}
          </div>
        </div>

        {/* Dados Fiscais */}
        <div
          className="p-4 rounded-lg border space-y-4"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}>
          <h3 className="font-semibold" style={{ color: colors.text }}>
            Dados Fiscais
          </h3>

          {/* NIF */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
              NIF/BI {incomplete.includes("nif") && <span style={{ color: colors.danger }}>*</span>}
            </label>
            <input
              type="text"
              name="nif"
              value={form.nif}
              onChange={handleInputChange}
              placeholder="Ex: 1234567890"
              className="w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm"
              style={{
                backgroundColor: colors.background,
                borderColor: errors.nif ? colors.danger : colors.border,
                color: colors.text,
              }}
            />
            {errors.nif && (
              <p style={{ color: colors.danger }} className="text-xs mt-1">
                {errors.nif}
              </p>
            )}
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
              Telefone {incomplete.includes("telefone") && <span style={{ color: colors.danger }}>*</span>}
            </label>
            <input
              type="tel"
              name="telefone"
              value={form.telefone}
              onChange={handleInputChange}
              placeholder="+244 923 456 789"
              className="w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
              }}
            />
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
              Endereço
            </label>
            <textarea
              name="endereco"
              value={form.endereco}
              onChange={handleInputChange}
              placeholder="Avenida 4 de Fevereiro"
              rows={3}
              className="w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm resize-none"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
              }}
            />
          </div>
        </div>

        {/* Dados Bancários */}
        <div
          className="p-4 rounded-lg border space-y-4"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}>
          <h3 className="font-semibold" style={{ color: colors.text }}>
            Dados Bancários
          </h3>

          {/* Nome do Banco */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
              Nome do Banco {incomplete.includes("nome_banco") && <span style={{ color: colors.danger }}>*</span>}
            </label>
            <input
              type="text"
              name="nome_banco"
              value={form.nome_banco}
              onChange={handleInputChange}
              placeholder="BAI"
              className="w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
              }}
            />
          </div>

          {/* Número da Conta */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
              Número da Conta {incomplete.includes("numero_conta") && <span style={{ color: colors.danger }}>*</span>}
            </label>
            <input
              type="text"
              name="numero_conta"
              value={form.numero_conta}
              onChange={handleInputChange}
              placeholder="0123456789"
              className="w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
              }}
            />
          </div>

          {/* IBAN */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
              IBAN {incomplete.includes("iban") && <span style={{ color: colors.danger }}>*</span>}
            </label>
            <input
              type="text"
              name="iban"
              value={form.iban}
              onChange={handleInputChange}
              placeholder="AO06 0010 0000 0000"
              className="w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
              }}
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 font-semibold text-white flex items-center justify-center gap-2 rounded-lg transition-all"
          style={{ backgroundColor: isSubmitting ? `${colors.primary}B3` : colors.primary }}>
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save size={18} />
              Salvar Alterações
            </>
          )}
        </button>

        {/* Status Message */}
        {incomplete.length === 0 && (
          <div
            className="p-3 rounded-lg border flex items-center gap-2 text-sm"
            style={{
              backgroundColor: `${colors.success}15`,
              borderColor: colors.success,
              color: colors.success,
            }}>
            <CheckCircle size={18} />✅ Perfil completo! Você pode gerar faturas normalmente.
          </div>
        )}
      </form>
    </div>
  );
};
