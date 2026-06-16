import React, { useState, useEffect } from "react";
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { Cliente, CriarClienteInput, AtualizarClienteInput } from "@/services/clientes";
import { CODIGOS_PAIS, ThemeColors } from "./ClientesComuns";

export function FormCliente({
  cliente,
  onSubmit,
  onCancel,
  loading,
  colors,
}: {
  cliente?: Cliente | null;
  onSubmit: (d: CriarClienteInput | AtualizarClienteInput) => void;
  onCancel: () => void;
  loading?: boolean;
  colors: ThemeColors;
}) {
  const [form, setForm] = useState<CriarClienteInput>({
    nome: "",
    nif: "",
    tipo: "consumidor_final",
    status: "ativo",
    telefone: "",
    email: "",
    endereco: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [codPais, setCodPais] = useState("+244");
  const [numTel, setNumTel] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;

      if (cliente) {
        setForm({
          nome: cliente.nome,
          nif: cliente.nif || "",
          tipo: cliente.tipo,
          status: cliente.status,
          telefone: cliente.telefone || "",
          email: cliente.email || "",
          endereco: cliente.endereco || "",
        });
        if (cliente.telefone) {
          const found = CODIGOS_PAIS.find((c) =>
            cliente.telefone?.startsWith(c.codigo),
          );
          if (found) {
            setCodPais(found.codigo);
            setNumTel(cliente.telefone.replace(found.codigo, "").trim());
          } else setNumTel(cliente.telefone);
        }
      } else {
        setForm({
          nome: "",
          nif: "",
          tipo: "consumidor_final",
          status: "ativo",
          telefone: "",
          email: "",
          endereco: "",
        });
        setCodPais("+244");
        setNumTel("");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cliente]);

  const setField = (name: string, value: string) => {
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
) => {
  const { name, value } = e.target;
  if (name === "nif") {
    const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const maxLen = form.tipo === "empresa" ? 10 : 14; // BI tem 14 caracteres
    const clean = raw.slice(0, maxLen);
    setField("nif", clean);
  } else {
    setField(name, value);
  }
};

  const handleTelNum = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 14);
    setNumTel(v);
    setField("telefone", v ? `${codPais} ${v}` : "");
  };

  const handleCodPais = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCodPais(e.target.value);
    setField("telefone", numTel ? `${e.target.value} ${numTel}` : "");
  };

 const validate = () => {
  const e: Record<string, string> = {};
  const empresa = form.tipo === "empresa";
  
  if (!form.nome?.trim()) e.nome = "Nome é obrigatório";
  
  // Validação NIF
  if (empresa) {
    if (!form.nif?.trim()) {
      e.nif = "NIF é obrigatório para empresas";
    } else if (!/^\d{10}$/.test(form.nif)) {
      e.nif = "NIF deve ter exatamente 10 dígitos numéricos";
    }
  } else {
    // Consumidor final: opcional, mas se preenchido deve ser válido
    if (form.nif && form.nif.trim() !== "") {
      const cleanNif = form.nif.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (!/^\d{10}$|^\d{9}[A-Z]{2}\d{2}$/.test(cleanNif)) {
        e.nif = "NIF deve ter 10 números ou BI (9 números + 2 letras + 2 números)";
      }
    }
  }
  
  // Telefone
  if (empresa) {
    if (!form.telefone?.trim()) {
      e.telefone = "Telefone é obrigatório para empresas";
    } else if (numTel.length !== 9) {
      e.telefone = "Telefone deve ter 9 dígitos";
    }
  } else {
    if (numTel.length > 0 && numTel.length !== 9) {
      e.telefone = "Telefone deve ter 9 dígitos";
    }
  }
  
  // Email
  if (empresa) {
    if (!form.email?.trim()) {
      e.email = "Email é obrigatório para empresas";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "Email inválido";
    }
  } else {
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "Email inválido";
    }
  }
  
  // Endereço
  if (empresa && !form.endereco?.trim()) {
    e.endereco = "Endereço é obrigatório para empresas";
  }
  
  setErrors(e);
  return Object.keys(e).length === 0;
};

  const empresa = form.tipo === "empresa";

  /* Estilos reutilizáveis - SEM ROUNDED */
  const inputCls =
    "w-full px-3 py-2 border outline-none transition-all text-sm";
  const inputStyle = (err?: string) => ({
    backgroundColor: colors.card,
    borderColor: err ? colors.danger : colors.border,
    color: colors.text,
  });
  const labelCls = "block text-xs font-medium mb-1";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (validate()) onSubmit(form);
      }}
      className="space-y-4"
    >
      {/* Tipo - linha compacta */}
      <div className="grid grid-cols-2 gap-3">
        {(["consumidor_final", "empresa"] as const).map((t) => {
          const active = form.tipo === t;
          const clr = t === "empresa" ? colors.secondary : colors.secondary;
          return (
            <label
              key={t}
              className="flex items-center gap-2 p-2 border cursor-pointer transition-all"
              style={{
                borderColor: active ? clr : colors.border,
                backgroundColor: active ? `${clr}10` : "transparent",
              }}
            >
              <input
                type="radio"
                name="tipo"
                value={t}
                checked={active}
                onChange={() => {
                  setField("tipo", t);
                  setField("nif", "");
                }}
                className="hidden"
              />
              {t === "empresa" ? (
                <Building2
                  className="w-4 h-4"
                  style={{ color: active ? clr : colors.textSecondary }}
                />
              ) : (
                <User
                  className="w-4 h-4"
                  style={{ color: active ? clr : colors.textSecondary }}
                />
              )}
              <span
                className="text-xs font-medium"
                style={{ color: active ? clr : colors.text }}
              >
                {t === "empresa" ? "Empresa" : "Consumidor"}
              </span>
            </label>
          );
        })}
      </div>

      {/* Nome + Email lado a lado */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={{ color: colors.text }}>
            Nome
          </label>
          <input
            type="text"
            name="nome"
            value={form.nome}
            onChange={handleChange}
            placeholder={empresa ? "Empresa XYZ" : "João Silva"}
            className={inputCls}
            style={inputStyle(errors.nome)}
          />
          {errors.nome && (
            <p className="mt-1 text-xs" style={{ color: colors.danger }}>
              {errors.nome}
            </p>
          )}
        </div>

        <div>
          <label className={labelCls} style={{ color: colors.text }}>
            Email
          </label>
          <div className="relative">
            <Mail
              className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
              style={{ color: colors.textSecondary }}
            />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="email@exemplo.com"
              className={`${inputCls} pl-7`}
              style={inputStyle(errors.email)}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs" style={{ color: colors.danger }}>
              {errors.email}
            </p>
          )}
        </div>
      </div>

      {/* Status + NIF */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={{ color: colors.text }}>
            Status
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["ativo", "inativo"] as const).map((s) => {
              const active = form.status === s;
              const clr = s === "ativo" ? colors.success : colors.textSecondary;
              return (
                <label
                  key={s}
                  className="flex items-center gap-1.5 p-2 border cursor-pointer"
                  style={{
                    borderColor: active ? clr : colors.border,
                    backgroundColor: active ? `${clr}10` : "transparent",
                  }}
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={active}
                    onChange={handleChange}
                    className="hidden"
                  />
                  {s === "ativo" ? (
                    <CheckCircle
                      className="w-3.5 h-3.5"
                      style={{ color: active ? clr : colors.textSecondary }}
                    />
                  ) : (
                    <XCircle
                      className="w-3.5 h-3.5"
                      style={{ color: active ? clr : colors.textSecondary }}
                    />
                  )}
                  <span className="text-xs">
                    {s === "ativo" ? "Ativo" : "Inativo"}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
<label className={labelCls} style={{ color: colors.text }}>
  {empresa ? "NIF (10 dígitos)" : "NIF/BI (opcional)"}
</label>
<input
  type="text"
  name="nif"
  value={form.nif}
  onChange={handleChange}
  placeholder={empresa ? "0000000000" : "0000000000 ou 123456789AB01"}
  maxLength={empresa ? 10 : 14} // BI tem 14 caracteres
  className={`${inputCls} font-mono text-xs uppercase`}
  style={inputStyle(errors.nif)}
/>
{!empresa && (
  <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
    Consumidor final: deixe em branco ou informe 10 números (NIF) ou 13 caracteres (9 números + 2 letras + 2 números)
  </p>
)}
{errors.nif && (
  <p className="mt-1 text-xs" style={{ color: colors.danger }}>
    {errors.nif}
  </p>
)}
        </div>
      </div>

      {/* Telefone + Código País */}
      <div>
        <label className={labelCls} style={{ color: colors.text }}>
          Telefone
        </label>
        <div className="flex gap-2">
          <div className="relative w-24">
            <Globe
              className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
              style={{ color: colors.textSecondary }}
            />
            <select
              value={codPais}
              onChange={handleCodPais}
              className="w-full pl-7 pr-1 py-2 border outline-none text-xs appearance-none"
              style={inputStyle(errors.telefone)}
            >
              {CODIGOS_PAIS.map((p) => (
                <option key={p.codigo} value={p.codigo}>
                  {p.bandeira} {p.codigo}
                </option>
              ))}
            </select>
          </div>
          <div className="relative flex-1">
            <Phone
              className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
              style={{ color: colors.textSecondary }}
            />
            <input
              type="tel"
              value={numTel}
              onChange={handleTelNum}
              placeholder="900 000 000"
              maxLength={9}
              className={`${inputCls} pl-7`}
              style={inputStyle(errors.telefone)}
            />
          </div>
        </div>
        {errors.telefone && (
          <p className="mt-1 text-xs" style={{ color: colors.danger }}>
            {errors.telefone}
          </p>
        )}
      </div>

      {/* Endereço */}
      <div>
        <label className={labelCls} style={{ color: colors.text }}>
          Endereço
        </label>
        <div className="relative">
          <MapPin
            className="absolute left-2 top-2.5 w-3.5 h-3.5"
            style={{ color: colors.textSecondary }}
          />
          <textarea
            name="endereco"
            value={form.endereco}
            onChange={handleChange}
            rows={2}
            placeholder="Rua, número, bairro, cidade…"
            className={`${inputCls} pl-7 resize-none text-xs`}
            style={inputStyle(errors.endereco)}
          />
        </div>
        {errors.endereco && (
          <p className="mt-1 text-xs" style={{ color: colors.danger }}>
            {errors.endereco}
          </p>
        )}
      </div>

      {/* Botões compactos */}
      <div
        className="flex gap-2 pt-2 border-t"
        style={{ borderColor: colors.border }}
      >
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-2 text-xs font-medium transition-colors"
          style={{
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-3 py-2 text-white text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-60"
          style={{ backgroundColor: colors.primary }}
        >
          {loading ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin" />
              Guardar
            </>
          ) : (
            `${cliente ? "Atualizar" : "Criar"}`
          )}
        </button>
      </div>
    </form>
  );
}