"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/authprovider";
import { Loader2, CheckCircle, Save, Upload, Trash2 } from "lucide-react";
import api from "@/services/axios";
import { WithToast } from "./ConfiguracoesComuns";

/* ------------------------------------------------------------------ */
/*  Helper: mensagens amigáveis                                        */
/* ------------------------------------------------------------------ */
type ApiLikeError = {
  response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } };
  code?: string;
  message?: string;
};

function friendlyError(error: unknown, fallback = "Ocorreu um erro. Tente novamente."): string {
  const err = error as ApiLikeError;

  if (!err?.response) {
    if (err?.code === "ECONNABORTED") return "O pedido demorou demasiado. Tente novamente.";
    return "Sem ligação ao servidor. Verifique a sua internet.";
  }

  switch (err.response.status) {
    case 400: return "Dados inválidos. Verifique os campos e tente novamente.";
    case 401: return "A sua sessão expirou. Inicie sessão novamente.";
    case 403: return "Não tem permissão para realizar esta ação.";
    case 404: return "Informação não encontrada.";
    case 409: return "Os dados foram alterados por outro utilizador. Recarregue a página.";
    case 422: {
      const errors = err.response.data?.errors;
      if (errors) {
        const first = Object.values(errors)[0]?.[0];
        if (first) return first;
      }
      return "Alguns campos não estão corretos. Verifique e tente novamente.";
    }
    case 429: return "Demasiados pedidos. Aguarde um momento.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "Serviço temporariamente indisponível. Tente novamente dentro de instantes.";
    default:
      return fallback;
  }
}

/* ------------------------------------------------------------------ */
/*  Tipos                                                              */
/* ------------------------------------------------------------------ */
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
  remover_logo?: boolean; //  novo: sinaliza ao backend para apagar logo
}

export interface FreelancerConfigTabProps extends WithToast {
  colors: ThemeColors;
  incompleteFields?: string[];
}

/* ------------------------------------------------------------------ */
/*  Componente                                                         */
/* ------------------------------------------------------------------ */
export const FreelancerConfigTab = ({
  colors,
  incompleteFields = [],
  showToast,
}: FreelancerConfigTabProps) => {
  const { refreshUser } = useAuth();

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

  // FIX #2: ref para evitar loop infinito quando showToast muda a cada render
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  // Carregar dados atuais (só uma vez)
  useEffect(() => {
    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const response = await api.get("/api/landlord/freelancer/onboarding");
        if (cancelled) return;

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
        if (cancelled) return;
        console.error("[FreelancerConfigTab] erro ao carregar:", err);
        showToastRef.current("Erro", "error", friendlyError(err, "Não foi possível carregar os dados."));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchStatus();
    return () => {
      cancelled = true;
    };
  }, []); // dependências vazias

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, logo_file: "Apenas imagens são permitidas." }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, logo_file: "A imagem deve ter no máximo 5MB." }));
      return;
    }

    setForm((prev) => ({ ...prev, logo_file: file, remover_logo: false }));
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
    setErrors((prev) => ({ ...prev, logo_file: "" }));
  };

  const handleRemoverLogo = () => {
    setLogoPreview(null);
    setForm((prev) => ({ ...prev, logo_file: undefined, remover_logo: true }));
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
      newErrors.nif = "NIF inválido. Use 10 dígitos ou o formato do BI.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast("Aviso", "warning", "Verifique os campos destacados.");
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

      // FIX #5: se removeu logo, avisa o backend
      if (form.remover_logo) {
        formData.append("remover_logo", "1");
      }

      const response = await api.put("/api/landlord/freelancer/empresa", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        showToast("Sucesso", "success", response.data.message ?? "Dados atualizados com sucesso!");

        if (response.data.data?.empresa) {
          setForm((prev) => ({
            ...prev,
            nif: response.data.data.empresa.nif || "",
            telefone: response.data.data.empresa.telefone || "",
            nome_banco: response.data.data.empresa.nome_banco || "",
            numero_conta: response.data.data.empresa.numero_conta || "",
            iban: response.data.data.empresa.iban || "",
            endereco: response.data.data.empresa.endereco || "",
            logo_file: undefined,
            remover_logo: false,
          }));
          setIncomplete(response.data.data.incomplete_fields || []);
        }

        await refreshUser();
      } else {
        showToast("Aviso", "warning", "Não foi possível guardar. Tente novamente.");
      }
    } catch (err) {
      console.error("[FreelancerConfigTab] erro ao guardar:", err);
      showToast("Erro", "error", friendlyError(err, "Erro ao atualizar os dados."));
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

  const totalCampos = 6;
  const progressPercent = Math.round(((totalCampos - incomplete.length) / totalCampos) * 100);

  //  FIX #7: helper para desativar inputs durante submissão
  const inputDisabled = isSubmitting;

  return (
    <div className="space-y-6">
      {/* Progress */}
      {incomplete.length > 0 && (
        <div
          className="p-4 rounded-lg border"
          style={{ backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}40` }}>
          <div className="flex items-center justify-between mb-2">
            <p style={{ color: colors.text }}>Progresso: {progressPercent}% completo</p>
            <p style={{ color: colors.textSecondary }} className="text-sm">
              {incomplete.length} campo(s) em falta
            </p>
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
          style={{ backgroundColor: colors.card, borderColor: colors.border }}>
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
                {!inputDisabled && (
                  <button
                    type="button"
                    onClick={handleRemoverLogo}
                    className="absolute -top-2 -right-2 p-1 rounded-full"
                    style={{ backgroundColor: colors.danger }}>
                    <Trash2 size={14} className="text-white" />
                  </button>
                )}
              </div>
            )}

            <label
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors"
              style={{
                borderColor: colors.border,
                backgroundColor: `${colors.primary}05`,
                cursor: inputDisabled ? "not-allowed" : "pointer",
                opacity: inputDisabled ? 0.6 : 1,
              }}>
              <Upload size={24} style={{ color: colors.primary }} />
              <p className="mt-2 font-medium text-sm" style={{ color: colors.text }}>
                Clique para fazer upload
              </p>
              <p style={{ color: colors.textSecondary }} className="text-xs">
                Máx 5MB • PNG, JPG
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={inputDisabled}
              />
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
          style={{ backgroundColor: colors.card, borderColor: colors.border }}>
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
              disabled={inputDisabled}
              className="w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm disabled:opacity-60"
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
              placeholder="923 456 789"
              disabled={inputDisabled}
              className="w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm disabled:opacity-60"
              style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
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
              disabled={inputDisabled}
              className="w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm resize-none disabled:opacity-60"
              style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
            />
          </div>
        </div>

        {/* Dados Bancários */}
        <div
          className="p-4 rounded-lg border space-y-4"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}>
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
              disabled={inputDisabled}
              className="w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm disabled:opacity-60"
              style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
            />
          </div>

          {/* Número da Conta */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
              Número da Conta {incomplete.includes("numero_conta") && <span style={{ color: colors.danger }}>*</span>}
            </label>
            <input
              type="text"
              inputMode="numeric"
              name="numero_conta"
              maxLength={12}
              value={form.numero_conta}
              onChange={handleInputChange}
              placeholder="0123456789"
              disabled={inputDisabled}
              className="w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm disabled:opacity-60"
              style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
            />
          </div>

          {/* IBAN -  FIX #3: type=text para permitir letras (AO06...) */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
              IBAN {incomplete.includes("iban") && <span style={{ color: colors.danger }}>*</span>}
            </label>
            <input
              type="text"
              name="iban"
              maxLength={25}
              value={form.iban}
              onChange={handleInputChange}
              placeholder="AO06 0010 0000 0000 0000 0"
              disabled={inputDisabled}
              className="w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm disabled:opacity-60"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
                textTransform: "uppercase",
              }}
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 font-semibold text-white flex items-center justify-center gap-2 rounded-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          style={{ backgroundColor: isSubmitting ? `${colors.primary}B3` : colors.primary }}>
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              A guardar...
            </>
          ) : (
            <>
              <Save size={18} />
              Guardar Alterações
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
            <CheckCircle size={18} /> Perfil completo! Já pode emitir faturas normalmente.
          </div>
        )}
      </form>
    </div>
  );
};