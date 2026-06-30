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
import { isValidPhoneNumber, CountryCode } from 'libphonenumber-js';

// ─── Funções de validação do NIF/BI (mantidas) ──────────────────
type TipoDocumento = 'NIF' | 'BI' | 'INVALIDO' | null;

function identificarTipoDocumento(valor: string): TipoDocumento {
  if (!valor || valor.trim() === '') return null;
  const clean = valor.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (/^[0-9]{10}$/.test(clean)) return 'NIF';
  if (/^[0-9]{9}[A-Z]{2}[0-9]{3}$/.test(clean)) return 'BI';
  return 'INVALIDO';
}

function validarNIF(nif: string, tipo: 'empresa' | 'consumidor_final'): { 
  valido: boolean; 
  tipo?: TipoDocumento;
  mensagem?: string;
  clean?: string;
} {
  if (!nif || nif.trim() === '') {
    if (tipo === 'empresa') {
      return { valido: false, mensagem: 'NIF é obrigatório para empresas' };
    }
    return { valido: true };
  }
  const clean = nif.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const tipoDoc = identificarTipoDocumento(clean);
  if (tipo === 'empresa') {
    if (tipoDoc === 'NIF') {
      return { valido: true, tipo: 'NIF', clean };
    }
    return { valido: false, mensagem: 'Empresa deve ter NIF com exatamente 10 dígitos numéricos' };
  }
  if (tipoDoc === 'NIF' || tipoDoc === 'BI') {
    return { valido: true, tipo: tipoDoc, clean };
  }
  return { valido: false, mensagem: 'Formato inválido. Use NIF (10 dígitos) ou BI (9 números + 2 letras + 3 números)' };
}

function aplicarMascaraNIF(valor: string, tipo: 'empresa' | 'consumidor_final'): string {
  let clean = valor.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const maxLen = tipo === 'empresa' ? 10 : 14;
  if (clean.length > maxLen) clean = clean.slice(0, maxLen);
  if (tipo === 'empresa') {
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return clean.replace(/(\d{3})(\d+)/, '$1 $2');
    if (clean.length <= 10) return clean.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
    return clean;
  }
  if (/^[0-9]+$/.test(clean) && clean.length <= 10) {
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return clean.replace(/(\d{3})(\d+)/, '$1 $2');
    if (clean.length <= 10) return clean.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
  }
  if (/[A-Z]/.test(clean)) {
    const match = clean.match(/^(\d{0,3})(\d{0,3})(\d{0,3})([A-Z]{0,2})(\d{0,3})/);
    if (match) {
      let resultado = '';
      if (match[1]) resultado += match[1];
      if (match[2]) resultado += (resultado ? ' ' : '') + match[2];
      if (match[3]) resultado += (resultado ? ' ' : '') + match[3];
      if (match[4]) resultado += (resultado ? ' ' : '') + match[4];
      if (match[5]) resultado += (resultado ? ' ' : '') + match[5];
      return resultado;
    }
  }
  return clean;
}

// ─── Componente Principal ──────────────────────────────────────────
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
  // ─── Estado do formulário ──────────────────────────────────────
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
  const [numTel, setNumTel] = useState("");                 // apenas dígitos locais
  const [isoPais, setIsoPais] = useState<CountryCode>("AO"); // ISO do país
  const [telefoneError, setTelefoneError] = useState("");
  const [nifTipo, setNifTipo] = useState<TipoDocumento>(null);
  const [nifValido, setNifValido] = useState<boolean>(false);

  // ─── Validação telefone ────────────────────────────────────────
  const validateTelefone = (numero: string, iso: string): boolean => {
    if (!numero) {
      setTelefoneError("");
      return true;
    }
    try {
      // Cast para CountryCode, pois a biblioteca espera esse tipo
      const isValid = isValidPhoneNumber(numero, iso as CountryCode);
      setTelefoneError(isValid ? "" : "Número inválido para o país selecionado");
      return isValid;
    } catch {
      setTelefoneError("Formato inválido");
      return false;
    }
  };

  // ─── Carregar cliente (edição) ─────────────────────────────────
  useEffect(() => {
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

      if (cliente.nif) {
        const validacao = validarNIF(cliente.nif, cliente.tipo);
        if (validacao.valido) {
          setNifTipo(validacao.tipo || null);
          setNifValido(true);
        }
      }

      if (cliente.telefone) {
        const found = CODIGOS_PAIS.find((c) =>
          cliente.telefone?.startsWith(c.codigo)
        );
        if (found) {
          setIsoPais(found.iso as CountryCode);
          const localNum = cliente.telefone.replace(found.codigo, "").trim();
          setNumTel(localNum);
        } else {
          setNumTel(cliente.telefone);
        }
      }
    } else {
      // Reset
      setForm({
        nome: "",
        nif: "",
        tipo: "consumidor_final",
        status: "ativo",
        telefone: "",
        email: "",
        endereco: "",
      });
      setIsoPais("AO");
      setNumTel("");
      setTelefoneError("");
      setNifTipo(null);
      setNifValido(false);
    }
  }, [cliente]);

  // ─── Handlers ──────────────────────────────────────────────────
  const setField = (name: keyof CriarClienteInput, value: string) => {
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "tipo") {
      setField("tipo", value as any);
      setField("nif", "");
      setNifTipo(null);
      setNifValido(false);
    } else {
      setField(name as keyof CriarClienteInput, value);
    }
  };

  const handleNifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    const tipo = form.tipo || "consumidor_final";
    const mascara = aplicarMascaraNIF(valor, tipo);
    setForm((p) => ({ ...p, nif: mascara }));
    if (errors.nif) setErrors((p) => ({ ...p, nif: "" }));

    if (mascara.length > 0) {
      const clean = mascara.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      const validacao = validarNIF(clean, tipo);
      if (validacao.valido) {
        setNifTipo(validacao.tipo || null);
        setNifValido(true);
        setErrors((p) => ({ ...p, nif: "" }));
      } else {
        const minLen = tipo === "empresa" ? 10 : 10;
        if (clean.length >= minLen) {
          setNifTipo(null);
          setNifValido(false);
          setErrors((p) => ({ ...p, nif: validacao.mensagem || "Formato inválido" }));
        } else {
          setNifTipo(null);
          setNifValido(false);
          setErrors((p) => ({ ...p, nif: "" }));
        }
      }
    } else {
      setNifTipo(null);
      setNifValido(false);
      if (tipo === "empresa") {
        setErrors((p) => ({ ...p, nif: "NIF é obrigatório para empresas" }));
      } else {
        setErrors((p) => ({ ...p, nif: "" }));
      }
    }
  };

  const handleTelNum = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 15);
    setNumTel(v);
    setForm((p) => ({ ...p, telefone: v }));
    if (v.length > 0 && isoPais) {
      validateTelefone(v, isoPais);
    } else {
      setTelefoneError("");
    }
  };

  const handleIsoPais = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novoIso = e.target.value as CountryCode;
    setIsoPais(novoIso);
    if (numTel.length > 0) {
      validateTelefone(numTel, novoIso);
    }
  };

  // ─── Validação final ────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const tipo = form.tipo || "consumidor_final";
    const empresa = tipo === "empresa";

    if (!form.nome?.trim()) e.nome = "Nome é obrigatório";

    // NIF
    if (empresa) {
      if (!form.nif?.trim()) {
        e.nif = "NIF é obrigatório para empresas";
      } else {
        const validacao = validarNIF(form.nif, tipo);
        if (!validacao.valido) {
          e.nif = validacao.mensagem || "NIF inválido";
        }
      }
    } else {
      if (form.nif && form.nif.trim() !== "") {
        const cleanNif = form.nif.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        if (!/^\d{10}$/.test(cleanNif) && !/^\d{9}[A-Z]{2}\d{3}$/.test(cleanNif)) {
          e.nif = "NIF deve ter 10 números ou BI (9 números + 2 letras + 3 números)";
        }
      }
    }

    // Telefone (validação com libphonenumber)
    const telefoneValido = numTel ? validateTelefone(numTel, isoPais) : true;
    if (empresa) {
      if (!numTel) {
        e.telefone = "Telefone é obrigatório para empresas";
      } else if (!telefoneValido) {
        e.telefone = telefoneError || "Telefone inválido";
      }
    } else {
      if (numTel && !telefoneValido) {
        e.telefone = telefoneError || "Telefone inválido";
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

  // ─── Envio ──────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const dadosParaEnviar: CriarClienteInput = {
      ...form,
      nif: form.nif ? form.nif.replace(/[^A-Za-z0-9]/g, "").toUpperCase() : "",
      telefone: numTel,        // apenas dígitos locais
      iso_pais: isoPais,       // código ISO do país
    };

    onSubmit(dadosParaEnviar);
  };

  // ─── Renderização ──────────────────────────────────────────────
  const empresa = form.tipo === "empresa";
  const inputCls = "w-full px-3 py-2 border outline-none transition-all text-sm";
  const inputStyle = (err?: string) => ({
    backgroundColor: colors.card,
    borderColor: err ? colors.danger : colors.border,
    color: colors.text,
  });
  const labelCls = "block text-xs font-medium mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tipo */}
      <div className="grid grid-cols-2 gap-3">
        {(["consumidor_final", "empresa"] as const).map((t) => {
          const active = form.tipo === t;
          const clr = colors.secondary;
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
                onChange={handleChange}
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

      {/* Nome + Email */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={{ color: colors.text }}>Nome</label>
          <input
            type="text"
            name="nome"
            value={form.nome}
            onChange={handleChange}
            placeholder={empresa ? "Empresa XYZ" : "João Silva"}
            className={inputCls}
            style={inputStyle(errors.nome)}
          />
          {errors.nome && <p className="mt-1 text-xs" style={{ color: colors.danger }}>{errors.nome}</p>}
        </div>
        <div>
          <label className={labelCls} style={{ color: colors.text }}>Email</label>
          <div className="relative">
            <Mail className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: colors.textSecondary }} />
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
          {errors.email && <p className="mt-1 text-xs" style={{ color: colors.danger }}>{errors.email}</p>}
        </div>
      </div>

      {/* Status + NIF */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={{ color: colors.text }}>Status</label>
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
                  <input type="radio" name="status" value={s} checked={active} onChange={handleChange} className="hidden" />
                  {s === "ativo" ? (
                    <CheckCircle className="w-3.5 h-3.5" style={{ color: active ? clr : colors.textSecondary }} />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" style={{ color: active ? clr : colors.textSecondary }} />
                  )}
                  <span className="text-xs">{s === "ativo" ? "Ativo" : "Inativo"}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div>
          <label className={labelCls} style={{ color: colors.text }}>
            {empresa ? "NIF (10 dígitos)" : "NIF/BI (opcional)"}
          </label>
          <div className="relative">
            <input
              type="text"
              name="nif"
              value={form.nif}
              onChange={handleNifChange}
              placeholder={empresa ? "000 000 0000" : "000 000 0000  ou  000 000 000 AB 000"}
              maxLength={empresa ? 17 : 20}
              className={`${inputCls} font-mono text-xs`}
              style={{
                ...inputStyle(errors.nif),
                paddingRight: nifTipo ? '40px' : '10px'
              }}
            />
            {nifTipo && nifValido && (
              <span 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: nifTipo === 'NIF' ? `${colors.primary}20` : `${colors.secondary}20`,
                  color: nifTipo === 'NIF' ? colors.primary : colors.secondary
                }}
              >
                {nifTipo}
              </span>
            )}
          </div>
          {!empresa && (
            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
              Deixe em branco ou informe: 10 números (NIF) ou 9 números + 2 letras + 3 números (BI)
            </p>
          )}
          {errors.nif && <p className="mt-1 text-xs" style={{ color: colors.danger }}>{errors.nif}</p>}
          {!errors.nif && form.nif && nifValido && (
            <p className="mt-1 text-xs" style={{ color: colors.success }}>✓ {nifTipo} válido</p>
          )}
        </div>
      </div>

      {/* Telefone com seleção de país e validação */}
      <div>
        <label className={labelCls} style={{ color: colors.text }}>Telefone</label>
        <div className="flex gap-2">
          <div className="relative w-24">
            <Globe className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: colors.textSecondary }} />
            <select
              value={isoPais}
              onChange={handleIsoPais}
              className="w-full pl-7 pr-1 py-2 border outline-none text-xs appearance-none"
              style={inputStyle(errors.telefone || telefoneError)}
            >
              {CODIGOS_PAIS.map((p) => (
                <option key={p.iso} value={p.iso}>
                  {p.bandeira} {p.codigo}
                </option>
              ))}
            </select>
          </div>
          <div className="relative flex-1">
            <Phone className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: colors.textSecondary }} />
            <input
              type="tel"
              value={numTel}
              onChange={handleTelNum}
              placeholder="900 000 000"
              maxLength={15}
              className={`${inputCls} pl-7`}
              style={inputStyle(errors.telefone || telefoneError)}
            />
          </div>
        </div>
        {(errors.telefone || telefoneError) && (
          <p className="mt-1 text-xs" style={{ color: colors.danger }}>
            {errors.telefone || telefoneError}
          </p>
        )}
      </div>

      {/* Endereço */}
      <div>
        <label className={labelCls} style={{ color: colors.text }}>Endereço</label>
        <div className="relative">
          <MapPin className="absolute left-2 top-2.5 w-3.5 h-3.5" style={{ color: colors.textSecondary }} />
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
        {errors.endereco && <p className="mt-1 text-xs" style={{ color: colors.danger }}>{errors.endereco}</p>}
      </div>

      {/* Botões */}
      <div className="flex gap-2 pt-2 border-t" style={{ borderColor: colors.border }}>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-2 text-xs font-medium transition-colors"
          style={{ color: colors.textSecondary, border: `1px solid ${colors.border}` }}
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