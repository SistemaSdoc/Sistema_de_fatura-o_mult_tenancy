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

// ─── Funções de validação do NIF/BI ──────────────────────────────
type TipoDocumento = 'NIF' | 'BI' | 'INVALIDO' | null;

function identificarTipoDocumento(valor: string): TipoDocumento {
  if (!valor || valor.trim() === '') return null;
  
  const clean = valor.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  
  // NIF: 10 dígitos
  if (/^[0-9]{10}$/.test(clean)) {
    return 'NIF';
  }
  
  // BI: 9 números + 2 letras + 3 números
  if (/^[0-9]{9}[A-Z]{2}[0-9]{3}$/.test(clean)) {
    return 'BI';
  }
  
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
    return { valido: true }; // Consumidor final pode ter NIF vazio
  }
  
  const clean = nif.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const tipoDoc = identificarTipoDocumento(clean);
  
  if (tipo === 'empresa') {
    if (tipoDoc === 'NIF') {
      return { valido: true, tipo: 'NIF', clean };
    }
    return { 
      valido: false, 
      mensagem: 'Empresa deve ter NIF com exatamente 10 dígitos numéricos'
    };
  }
  
  // Consumidor final
  if (tipoDoc === 'NIF' || tipoDoc === 'BI') {
    return { valido: true, tipo: tipoDoc, clean };
  }
  
  return { 
    valido: false, 
    mensagem: 'Formato inválido. Use NIF (10 dígitos) ou BI (9 números + 2 letras + 3 números)'
  };
}

function aplicarMascaraNIF(valor: string, tipo: 'empresa' | 'consumidor_final'): string {
  // Remove tudo que não é alfanumérico
  let clean = valor.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  
  // Limita o tamanho máximo
  const maxLen = tipo === 'empresa' ? 10 : 14;
  if (clean.length > maxLen) {
    clean = clean.slice(0, maxLen);
  }
  
  // Se for empresa (apenas NIF - 10 dígitos)
  if (tipo === 'empresa') {
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return clean.replace(/(\d{3})(\d+)/, '$1 $2');
    if (clean.length <= 10) return clean.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
    return clean;
  }
  
  // Consumidor final: pode ser NIF ou BI
  // Se for apenas números e tem até 10 dígitos, aplica máscara de NIF
  if (/^[0-9]+$/.test(clean) && clean.length <= 10) {
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return clean.replace(/(\d{3})(\d+)/, '$1 $2');
    if (clean.length <= 10) return clean.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
  }
  
  // Se tem letras, provavelmente é BI
  if (/[A-Z]/.test(clean)) {
    // BI: 123 456 789 AB 123
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
  const [nifTipo, setNifTipo] = useState<TipoDocumento>(null);
  const [nifValido, setNifValido] = useState<boolean>(false);

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
        
        // Valida NIF existente
        if (cliente.nif) {
          const validacao = validarNIF(cliente.nif, cliente.tipo);
          if (validacao.valido) {
            setNifTipo(validacao.tipo || null);
            setNifValido(true);
          }
        }
        
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
        setNifTipo(null);
        setNifValido(false);
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
    if (name === "tipo") {
      setField("tipo", value);
      setField("nif", "");
      setNifTipo(null);
      setNifValido(false);
    } else {
      setField(name, value);
    }
  };

  // Handler específico para NIF com máscara e validação
  const handleNifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    const mascara = aplicarMascaraNIF(valor, form.tipo || 'consumidor_final' );
    
    setForm((p) => ({ ...p, nif: mascara }));
    if (errors.nif) setErrors((p) => ({ ...p, nif: "" }));
    
    // Validação em tempo real
    if (mascara.length > 0) {
      const clean = mascara.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const validacao = validarNIF(clean, form.tipo || 'consumidor_final' );
      
      if (validacao.valido) {
        setNifTipo(validacao.tipo || null);
        setNifValido(true);
        setErrors((p) => ({ ...p, nif: "" }));
      } else {
        // Só mostra erro se tiver digitado o mínimo necessário
        const minLen = form.tipo === 'empresa' ? 10 : 10;
        if (clean.length >= minLen) {
          setNifTipo(null);
          setNifValido(false);
          setErrors((p) => ({ ...p, nif: validacao.mensagem || 'Formato inválido' }));
        } else {
          setNifTipo(null);
          setNifValido(false);
          setErrors((p) => ({ ...p, nif: "" }));
        }
      }
    } else {
      setNifTipo(null);
      setNifValido(false);
      if (form.tipo === 'empresa') {
        setErrors((p) => ({ ...p, nif: "NIF é obrigatório para empresas" }));
      } else {
        setErrors((p) => ({ ...p, nif: "" }));
      }
    }
  };

  const handleTelNum = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 9);
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
      } else {
        const validacao = validarNIF(form.nif, form.tipo || 'consumidor_final' );
        if (!validacao.valido) {
          e.nif = validacao.mensagem || "NIF inválido";
        }
      }
    } else {
      // Consumidor final: opcional, mas se preenchido deve ser válido
      if (form.nif && form.nif.trim() !== "") {
        const cleanNif = form.nif.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        // 🔥 CORREÇÃO: 3 números no final do BI
        if (!/^\d{10}$/.test(cleanNif) && !/^\d{9}[A-Z]{2}\d{3}$/.test(cleanNif)) {
          e.nif = "NIF deve ter 10 números ou BI (9 números + 2 letras + 3 números)";
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
        if (validate()) {
          // 🔥 Limpa o NIF antes de enviar
          const dadosLimpos = {
            ...form,
            nif: form.nif ? form.nif.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : ''
          };
          onSubmit(dadosLimpos);
        }
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
          <div className="relative">
            <input
              type="text"
              name="nif"
              value={form.nif}
              onChange={handleNifChange}
              placeholder={empresa ? "000 000 0000" : "000 000 0000  ou  000 000 000 AB 000"}
              maxLength={empresa ? 17 : 20} // Com espaços
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
                  backgroundColor: nifTipo === 'NIF' 
                    ? `${colors.primary}20` 
                    : `${colors.secondary}20`,
                  color: nifTipo === 'NIF' 
                    ? colors.primary 
                    : colors.secondary
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
          {errors.nif && (
            <p className="mt-1 text-xs" style={{ color: colors.danger }}>
              {errors.nif}
            </p>
          )}
          {!errors.nif && form.nif && nifValido && (
            <p className="mt-1 text-xs" style={{ color: colors.success }}>
              ✓ {nifTipo} válido
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