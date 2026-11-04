"use client";

import { useState } from "react";
import type { ChangeEvent, ElementType } from "react";
import { ChevronDown } from "lucide-react";
import type { ThemeColors } from "@/context/ThemeContext";

interface RegistrationInputFieldProps {
  name: string;
  icon: ElementType;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  colors: Pick<ThemeColors, "border" | "card" | "danger" | "secondary" | "text" | "textSecondary">;
  required?: boolean;
  isSelect?: boolean;
  options?: { value: string; label: string }[];
  prefix?: string;
  maxLength?: number;
  disabled?: boolean;
}

export function RegistrationInputField({
  name,
  icon: Icon,
  type = "text",
  placeholder,
  value,
  onChange,
  colors,
  required = false,
  isSelect = false,
  options = [],
  prefix,
  maxLength,
  disabled = false,
}: RegistrationInputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative w-full">
      <Icon
        size={18}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: isFocused ? colors.secondary : colors.textSecondary }}
      />
      {prefix && (
        <div
          className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-sm"
          style={{ color: colors.textSecondary }}
        >
          {prefix}
        </div>
      )}
      {isSelect ? (
        <>
          <select
            name={name}
            value={value}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            required={required}
            disabled={disabled}
            className="w-full appearance-none border py-3 pl-10 pr-9 text-sm outline-none transition-colors"
            style={{
              backgroundColor: disabled ? `${colors.border}40` : colors.card,
              borderColor: isFocused ? colors.secondary : colors.border,
              color: colors.text,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            <option value="" disabled>{placeholder}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: colors.textSecondary }}
          />
        </>
      ) : (
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          required={required}
          disabled={disabled}
          inputMode={type === "number" ? "numeric" : undefined}
          className="w-full border py-3 pl-10 pr-4 text-sm outline-none transition-colors"
          style={{
            backgroundColor: disabled ? `${colors.border}40` : colors.card,
            borderColor: isFocused ? colors.secondary : colors.border,
            color: colors.text,
            cursor: disabled ? "not-allowed" : "default",
            paddingLeft: prefix ? "3.75rem" : undefined,
          }}
          maxLength={maxLength}
        />
      )}
    </div>
  );
}
