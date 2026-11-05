"use client";

import Image from "next/image";
import type { ChangeEvent } from "react";
import {
  Banknote,
  Briefcase,
  Building2,
  CreditCard,
  FileText,
  Globe,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Upload,
  X,
} from "lucide-react";
import type { ThemeColors } from "@/context/ThemeContext";
import { RegistrationInputField } from "@/app/components/Formularios/RegistrationInputField";
import { CompanyModeSelector } from "./RegistrationFlowComponents";
import type { RegistrationFormData } from "./registration.types";

interface RegistrationCompanyStepProps {
  form: RegistrationFormData;
  colors: ThemeColors;
  logoPreview: string | null;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onNifChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onAccountChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onIbanChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onRegimeChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onIvaChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLogoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
  onModeChange: (mode: RegistrationFormData["modo"]) => void;
}

const REGIME_OPTIONS = [
  { value: "simplificado", label: "Regime Simplificado" },
  { value: "geral", label: "Regime Geral" },
];

export function RegistrationCompanyStep({
  form,
  colors,
  logoPreview,
  onChange,
  onNifChange,
  onAccountChange,
  onIbanChange,
  onRegimeChange,
  onIvaChange,
  onLogoChange,
  onRemoveLogo,
  onModeChange,
}: RegistrationCompanyStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <label
          className="mb-2 block text-sm font-medium"
          style={{ color: colors.text }}
        >
          Logo da Empresa
        </label>
        <div className="flex flex-wrap items-center gap-4">
          {logoPreview ? (
            <div className="relative shrink-0">
              <Image
                src={logoPreview}
                alt="Logo"
                width={64}
                height={64}
                className="border object-cover"
                style={{ borderColor: colors.border }}
              />
              <button
                type="button"
                onClick={onRemoveLogo}
                className="absolute -right-2 -top-2 p-1 text-white"
                style={{ background: colors.secondary }}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label
              className="hover:border-primary flex h-16 w-16 shrink-0 cursor-pointer flex-col items-center justify-center border-2 border-dashed"
              style={{ borderColor: colors.border }}
            >
              <Upload size={20} style={{ color: colors.text }} />
              <span
                className="mt-1 text-xs"
                style={{ color: colors.textSecondary }}
              >
                Upload
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={onLogoChange}
                className="hidden"
              />
            </label>
          )}
          <div className="flex min-w-0 items-center gap-4">
            <div
              className="hidden h-10 w-px sm:block"
              style={{ backgroundColor: colors.border }}
            />
            <span className="text-xs" style={{ color: colors.textSecondary }}>
              Adicione a logo da tua empresa (JPG/PNG até 2MB)
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <RegistrationInputField
          name="nome"
          icon={Building2}
          placeholder="Nome da empresa *"
          value={form.nome}
          onChange={onChange}
          colors={colors}
          required
        />
        <RegistrationInputField
          name="nif"
          icon={FileText}
          placeholder="NIF (10 dígitos) *"
          value={form.nif}
          onChange={onNifChange}
          colors={colors}
          required
          maxLength={10}
        />
        <RegistrationInputField
          name="email"
          icon={Mail}
          type="email"
          placeholder="Email da empresa *"
          value={form.email}
          onChange={onChange}
          colors={colors}
          required
        />
        <RegistrationInputField
          name="telefone"
          icon={Phone}
          placeholder="Telefone *"
          value={form.telefone}
          onChange={onChange}
          colors={colors}
          maxLength={9}
          required
        />
        <RegistrationInputField
          name="nome_banco"
          icon={Landmark}
          placeholder="Nome do Banco"
          value={form.nome_banco ?? ""}
          onChange={onChange}
          colors={colors}
        />
        <RegistrationInputField
          name="numero_conta"
          icon={CreditCard}
          placeholder="Número da Conta"
          value={form.numero_conta ?? ""}
          onChange={onAccountChange}
          colors={colors}
          maxLength={11}
        />
        <RegistrationInputField
          name="iban"
          icon={Banknote}
          placeholder="Digite os 21 dígitos do IBAN"
          value={form.iban?.replace(/^AO06/, "") ?? ""}
          onChange={onIbanChange}
          colors={colors}
          maxLength={21}
        />
        <RegistrationInputField
          name="subdomain"
          icon={Globe}
          placeholder="Subdomínio * (ex: minhaempresa)"
          value={form.subdomain}
          onChange={onChange}
          colors={colors}
          required
        />
        <div className="md:col-span-2">
          <RegistrationInputField
            name="endereco"
            icon={MapPin}
            placeholder="Endereço completo *"
            value={form.endereco}
            onChange={onChange}
            colors={colors}
            required
          />
        </div>
      </div>

      <CompanyModeSelector
        mode={form.modo}
        colors={colors}
        onChange={onModeChange}
      />

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        <RegistrationInputField
          name="regime_fiscal"
          icon={Briefcase}
          placeholder="Regime Fiscal"
          value={form.regime_fiscal}
          onChange={onRegimeChange}
          colors={colors}
          isSelect
          options={REGIME_OPTIONS}
        />
        <label className="flex items-center gap-3 py-3">
          <input
            type="checkbox"
            name="sujeito_iva"
            checked={form.sujeito_iva}
            onChange={onIvaChange}
            className="h-4 w-4 shrink-0"
            style={{ accentColor: colors.primary }}
          />
          <span className="text-sm" style={{ color: colors.text }}>
            Sujeito a IVA
          </span>
        </label>
        <label className="flex items-center gap-3 py-3 md:col-span-2">
          <input
            type="checkbox"
            name="is_seguradora"
            checked={form.is_seguradora}
            onChange={onChange}
            className="h-4 w-4 shrink-0"
            style={{ accentColor: colors.primary }}
          />
          <span className="text-sm" style={{ color: colors.text }}>
            Esta empresa é uma seguradora
          </span>
        </label>
      </div>
    </div>
  );
}
