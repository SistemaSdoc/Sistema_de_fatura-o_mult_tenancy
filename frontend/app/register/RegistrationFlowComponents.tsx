"use client";

import type { ComponentType, CSSProperties } from "react";
import { Database, Server, Users } from "lucide-react";
import type { ThemeColors } from "@/context/ThemeContext";

type RegistrationStep = 1 | 2 | 3;
type CompanyMode = "colectivo" | "singular";

interface RegistrationStepIndicatorProps {
  step: RegistrationStep;
  hasPlan: boolean;
  colors: ThemeColors;
}

export function RegistrationStepIndicator({
  step,
  hasPlan,
  colors,
}: RegistrationStepIndicatorProps) {
  const steps = [
    { number: 1, title: "Dados da Empresa" },
    { number: 2, title: "Administrador do sistema" },
    ...(hasPlan ? [{ number: 3, title: "Confirmar Plano" }] : []),
  ];

  return (
    <div
      className="mb-6 flex flex-row border-b sm:mb-8"
      style={{ borderColor: colors.border }}
    >
      {steps.map(({ number, title }) => {
        const active = step === number;

        return (
          <div key={number} className="flex-1 py-3 text-center">
            <div
              className={`inline-flex flex-col items-center gap-1 text-xs font-medium sm:flex-row sm:gap-2 sm:text-sm ${active ? "opacity-100" : "opacity-50"}`}
              style={{ color: active ? colors.primary : colors.text }}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                style={{
                  backgroundColor: active ? colors.primary : colors.border,
                  color: active ? "white" : colors.text,
                }}
              >
                {number}
              </span>
              <span className="leading-tight">{title}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface CompanyModeSelectorProps {
  mode: CompanyMode;
  colors: ThemeColors;
  onChange: (mode: CompanyMode) => void;
}

const COMPANY_MODES: {
  value: CompanyMode;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; className?: string; style?: CSSProperties }>;
}[] = [
  {
    value: "colectivo",
    label: "Colectivo",
    description:
      "Todas as empresas partilham a mesma base de dados. Ideal para empresas que pretendem uma gestão centralizada com custos reduzidos.",
    icon: Users,
  },
  {
    value: "singular",
    label: "Singular",
    description:
      "Cada empresa tem a sua própria base de dados dedicada. Ideal para empresas que necessitam de isolamento rigoroso de dados.",
    icon: Server,
  },
];

export function CompanyModeSelector({
  mode,
  colors,
  onChange,
}: CompanyModeSelectorProps) {
  return (
    <div className="mt-6">
      <label
        className="mb-3 block text-sm font-medium"
        style={{ color: colors.text }}
      >
        <Database
          size={16}
          className="mr-2 inline"
          style={{ color: colors.textSecondary }}
        />
        Modo de Funcionamento *
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {COMPANY_MODES.map(({ value, label, description, icon: Icon }) => {
          const selected = mode === value;

          return (
            <div
              key={value}
              onClick={() => onChange(value)}
              className="cursor-pointer rounded border p-3 transition-colors sm:p-4"
              style={{
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? `${colors.primary}0D` : "transparent",
              }}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  title={description}
                  name="modo_radio"
                  value={value}
                  checked={selected}
                  onChange={() => onChange(value)}
                  className="mt-2 h-4 w-4"
                  style={{ accentColor: colors.primary }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon
                      size={18}
                      className="shrink-0"
                      style={{
                        color: selected ? colors.secondary : colors.textSecondary,
                      }}
                    />
                    <span
                      className="font-medium"
                      style={{
                        color: selected ? colors.secondary : colors.text,
                      }}
                    >
                      {label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
