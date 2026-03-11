"use client";

import React, { useEffect, useState, useCallback } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import {
  clienteService,
  formatarNIF,
  getTipoClienteLabel,
  getStatusClienteLabel,
  getStatusClienteBadge,
} from "@/services/clientes";
import type { Cliente, CriarClienteInput, AtualizarClienteInput } from "@/services/clientes";
import {
  Users, Plus, Search, Edit2, Eye, Building2, User,
  Phone, Mail, MapPin, Calendar, X, AlertCircle,
  CheckCircle, XCircle, Power, Globe, RefreshCw,
} from "lucide-react";
import { useThemeColors } from "@/context/ThemeContext";

/* ─── Constantes ─────────────────────────────────────────────────── */
const CODIGOS_PAIS = [
  { codigo: "+244", pais: "Angola", bandeira: "🇦🇴" },
  { codigo: "+351", pais: "Portugal", bandeira: "🇵🇹" },
  { codigo: "+55", pais: "Brasil", bandeira: "🇧🇷" },
  { codigo: "+258", pais: "Moçambique", bandeira: "🇲🇿" },
  { codigo: "+238", pais: "Cabo Verde", bandeira: "🇨🇻" },
  { codigo: "+245", pais: "Guiné-Bissau", bandeira: "🇬🇼" },
  { codigo: "+239", pais: "S. Tomé e Príncipe", bandeira: "🇸🇹" },
  { codigo: "+1", pais: "EUA/Canadá", bandeira: "🇺🇸" },
  { codigo: "+44", pais: "Reino Unido", bandeira: "🇬🇧" },
  { codigo: "+33", pais: "França", bandeira: "🇫🇷" },
  { codigo: "+49", pais: "Alemanha", bandeira: "🇩🇪" },
  { codigo: "+34", pais: "Espanha", bandeira: "🇪🇸" },
];

/* ─── Modal genérico ─────────────────────────────────────────────── */
function Modal({
  isOpen, onClose, title, children,
}: {
  isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  const colors = useThemeColors();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        style={{ backgroundColor: colors.card }}>
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: colors.border }}>
          <h3 className="text-base font-semibold" style={{ color: colors.primary }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:opacity-70"
            style={{ color: colors.textSecondary }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-68px)]">{children}</div>
      </div>
    </div>
  );
}

/* ─── Modal de confirmação ───────────────────────────────────────── */
function ConfirmModal({
  isOpen, onClose, onConfirm, title, message, loading,
  confirmText = "Confirmar", cancelText = "Cancelar",
  type = "warning",
}: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void;
  title: string; message: string; loading?: boolean;
  confirmText?: string; cancelText?: string; type?: "warning" | "danger" | "info";
}) {
  const colors = useThemeColors();
  if (!isOpen) return null;

  const btnColor = type === "danger" ? colors.danger : type === "info" ? colors.primary : colors.warning;
  const iconBg = type === "danger" ? `${colors.danger}20` : type === "info" ? `${colors.secondary}20` : `${colors.warning}20`;
  const iconClr = type === "danger" ? colors.danger : type === "info" ? colors.secondary : colors.warning;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="rounded-xl shadow-xl max-w-md w-full p-5" style={{ backgroundColor: colors.card }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-full" style={{ backgroundColor: iconBg }}>
            <AlertCircle className="w-5 h-5" style={{ color: iconClr }} />
          </div>
          <h3 className="text-base font-semibold" style={{ color: colors.text }}>{title}</h3>
        </div>
        <p className="text-sm mb-5 ml-[52px]" style={{ color: colors.textSecondary }}>{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ color: colors.textSecondary, border: `1px solid ${colors.border}` }}>
            {cancelText}
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2 text-white rounded-lg text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
            style={{ backgroundColor: btnColor }}>
            {loading
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processando…</>
              : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Skeletons ──────────────────────────────────────────────────── */
function SkeletonStats({ colors }: { colors: any }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-4 rounded-xl border animate-pulse"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: colors.border }} />
            <div className="space-y-1.5">
              <div className="h-5 rounded w-10" style={{ backgroundColor: colors.border }} />
              <div className="h-3.5 rounded w-14" style={{ backgroundColor: colors.border }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonTabela({ colors }: { colors: any }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
      <div className="h-11" style={{ backgroundColor: colors.primary }} />
      <div className="divide-y" style={{ borderColor: colors.border }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
            <div className="w-9 h-9 rounded-full" style={{ backgroundColor: colors.border }} />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 rounded w-36" style={{ backgroundColor: colors.border }} />
              <div className="h-3 rounded w-28" style={{ backgroundColor: colors.border }} />
            </div>
            <div className="w-20 h-6 rounded-full" style={{ backgroundColor: colors.border }} />
            <div className="w-20 h-6 rounded-full" style={{ backgroundColor: colors.border }} />
            <div className="w-28 h-4 rounded" style={{ backgroundColor: colors.border }} />
            <div className="flex gap-1.5">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="w-8 h-8 rounded-lg" style={{ backgroundColor: colors.border }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Formulário de cliente ──────────────────────────────────────── */
function FormCliente({
  cliente, onSubmit, onCancel, loading,
}: {
  cliente?: Cliente | null;
  onSubmit: (d: CriarClienteInput | AtualizarClienteInput) => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const colors = useThemeColors();

  const [form, setForm] = useState<CriarClienteInput>({
    nome: "", nif: "", tipo: "consumidor_final", status: "ativo",
    telefone: "", email: "", endereco: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [codPais, setCodPais] = useState("+244");
  const [numTel, setNumTel] = useState("");

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
      if (cliente.telefone) {
        const found = CODIGOS_PAIS.find(c => cliente.telefone?.startsWith(c.codigo));
        if (found) { setCodPais(found.codigo); setNumTel(cliente.telefone.replace(found.codigo, "").trim()); }
        else setNumTel(cliente.telefone);
      }
    } else {
      setForm({ nome: "", nif: "", tipo: "consumidor_final", status: "ativo", telefone: "", email: "", endereco: "" });
      setCodPais("+244"); setNumTel("");
    }
  }, [cliente]);

  const setField = (name: string, value: string) => {
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: "" }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "nif") {
      const clean = form.tipo === "empresa" ? value.replace(/\D/g, "").slice(0, 10) : value.slice(0, 14);
      setField("nif", clean);
    } else {
      setField(name, value);
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
    if (empresa) {
      if (!form.nif?.trim()) e.nif = "NIF é obrigatório para empresas";
      else if (form.nif.length !== 10) e.nif = "NIF deve ter exactamente 10 dígitos";
      if (!form.telefone?.trim()) e.telefone = "Telefone é obrigatório para empresas";
      else if (numTel.length !== 9) e.telefone = "Telefone deve ter 9 dígitos";
      if (!form.email?.trim()) e.email = "Email é obrigatório para empresas";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email inválido";
      if (!form.endereco?.trim()) e.endereco = "Endereço é obrigatório para empresas";
    } else {
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email inválido";
      if (numTel.length > 0 && numTel.length !== 9) e.telefone = "Telefone deve ter 9 dígitos";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const empresa = form.tipo === "empresa";

  /* Estilos reutilizáveis */
  const inputCls = "w-full px-3.5 py-2.5 rounded-lg border outline-none transition-all text-sm";
  const inputStyle = (err?: string) => ({
    backgroundColor: colors.card,
    borderColor: err ? colors.danger : colors.border,
    color: colors.text,
  });
  const labelCls = "block text-sm font-medium mb-1.5";

  return (
    <form onSubmit={e => { e.preventDefault(); if (validate()) onSubmit(form); }} className="space-y-5">

      {/* Tipo */}
      <div>
        <label className={labelCls} style={{ color: colors.text }}>Tipo de Cliente</label>
        <div className="grid grid-cols-2 gap-3">
          {(["consumidor_final", "empresa"] as const).map(t => {
            const active = form.tipo === t;
            const clr = t === "empresa" ? colors.secondary : colors.primary;
            return (
              <label key={t} className="flex items-center gap-3 p-3.5 rounded-lg border-2 cursor-pointer transition-all"
                style={{ borderColor: active ? clr : colors.border, backgroundColor: active ? `${clr}10` : "transparent" }}>
                <input type="radio" name="tipo" value={t} checked={active}
                  onChange={() => { setField("tipo", t); setField("nif", ""); }} className="hidden" />
                {t === "empresa"
                  ? <Building2 className="w-4 h-4" style={{ color: active ? clr : colors.textSecondary }} />
                  : <User className="w-4 h-4" style={{ color: active ? clr : colors.textSecondary }} />}
                <div>
                  <div className="text-sm font-medium" style={{ color: active ? clr : colors.text }}>
                    {t === "empresa" ? "Empresa" : "Consumidor Final"}
                  </div>
                  <div className="text-xs" style={{ color: colors.textSecondary }}>
                    {t === "empresa" ? "Pessoa jurídica" : "Particular"}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Nome */}
      <div>
        <label className={labelCls} style={{ color: colors.text }}>
          {empresa ? "Nome da Empresa" : "Nome Completo"}
        </label>
        <input type="text" name="nome" value={form.nome} onChange={handleChange}
          placeholder={empresa ? "Ex: Empresa XYZ, Lda" : "Ex: João Silva"}
          className={inputCls} style={inputStyle(errors.nome)} />
        {errors.nome && <p className="mt-1 text-sm" style={{ color: colors.danger }}>{errors.nome}</p>}
      </div>

      {/* Status */}
      <div>
        <label className={labelCls} style={{ color: colors.text }}>Status</label>
        <div className="grid grid-cols-2 gap-3">
          {(["ativo", "inativo"] as const).map(s => {
            const active = form.status === s;
            const clr = s === "ativo" ? colors.success : colors.textSecondary;
            return (
              <label key={s} className="flex items-center gap-3 p-3.5 rounded-lg border-2 cursor-pointer transition-all"
                style={{ borderColor: active ? clr : colors.border, backgroundColor: active ? `${clr}10` : "transparent" }}>
                <input type="radio" name="status" value={s} checked={active} onChange={handleChange} className="hidden" />
                {s === "ativo"
                  ? <CheckCircle className="w-4 h-4" style={{ color: active ? clr : colors.textSecondary }} />
                  : <XCircle className="w-4 h-4" style={{ color: active ? clr : colors.textSecondary }} />}
                <div>
                  <div className="text-sm font-medium" style={{ color: active ? clr : colors.text }}>
                    {s === "ativo" ? "Ativo" : "Inativo"}
                  </div>
                  <div className="text-xs" style={{ color: colors.textSecondary }}>
                    {s === "ativo" ? "Pode realizar compras" : "Sem acesso a compras"}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* NIF + Telefone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} style={{ color: colors.text }}>
            NIF {empresa ? "da Empresa" : "do Cliente"}
            <span className="text-xs ml-1.5 font-normal" style={{ color: colors.textSecondary }}>
              {empresa ? "(10 dígitos)" : "(máx. 14 caracteres)"}
            </span>
          </label>
          <input type="text" name="nif" value={form.nif} onChange={handleChange}
            placeholder={empresa ? "0000000000" : "000000000LA000"}
            maxLength={empresa ? 10 : 14}
            className={`${inputCls} font-mono`} style={inputStyle(errors.nif)} />
          {errors.nif && <p className="mt-1 text-sm" style={{ color: colors.danger }}>{errors.nif}</p>}
          {empresa && form.nif && (
            <p className="mt-1 text-xs" style={{ color: colors.textSecondary }}>{form.nif.length}/10</p>
          )}
        </div>

        <div>
          <label className={labelCls} style={{ color: colors.text }}>
            Telefone
            <span className="text-xs ml-1.5 font-normal" style={{ color: colors.textSecondary }}>(9 dígitos)</span>
          </label>
          <div className="flex gap-2">
            <div className="relative">
              <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: colors.textSecondary }} />
              <select value={codPais} onChange={handleCodPais}
                className="pl-7 pr-2 py-2.5 rounded-lg border outline-none text-sm appearance-none"
                style={inputStyle(errors.telefone)}>
                {CODIGOS_PAIS.map(p => (
                  <option key={p.codigo} value={p.codigo}>{p.bandeira} {p.codigo}</option>
                ))}
              </select>
            </div>
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textSecondary }} />
              <input type="tel" value={numTel} onChange={handleTelNum}
                placeholder="900 000 000" maxLength={9}
                className={`${inputCls} pl-9`} style={inputStyle(errors.telefone)} />
            </div>
          </div>
          {errors.telefone && <p className="mt-1 text-sm" style={{ color: colors.danger }}>{errors.telefone}</p>}
          {numTel && <p className="mt-1 text-xs" style={{ color: colors.textSecondary }}>{numTel.length}/9</p>}
        </div>
      </div>

      {/* Email */}
      <div>
        <label className={labelCls} style={{ color: colors.text }}>Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textSecondary }} />
          <input type="email" name="email" value={form.email} onChange={handleChange}
            placeholder="email@exemplo.com"
            className={`${inputCls} pl-9`} style={inputStyle(errors.email)} />
        </div>
        {errors.email && <p className="mt-1 text-sm" style={{ color: colors.danger }}>{errors.email}</p>}
      </div>

      {/* Endereço */}
      <div>
        <label className={labelCls} style={{ color: colors.text }}>Endereço</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-4 h-4" style={{ color: colors.textSecondary }} />
          <textarea name="endereco" value={form.endereco} onChange={handleChange} rows={3}
            placeholder="Rua, número, bairro, cidade…"
            className={`${inputCls} pl-9 resize-none`} style={inputStyle(errors.endereco)} />
        </div>
        {errors.endereco && <p className="mt-1 text-sm" style={{ color: colors.danger }}>{errors.endereco}</p>}
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-3 border-t" style={{ borderColor: colors.border }}>
        <button type="button" onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{ color: colors.textSecondary, border: `1px solid ${colors.border}` }}>
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: colors.primary }}>
          {loading
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />A guardar…</>
            : `${cliente ? "Atualizar" : "Criar"} Cliente`}
        </button>
      </div>
    </form>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════════ */
export default function ClientesPage() {
  const colors = useThemeColors();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativos" | "inativos">("ativos");

  const [modalForm, setModalForm] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [modalStatus, setModalStatus] = useState(false);
  const [selecao, setSelecao] = useState<Cliente | null>(null);
  const [loadingAcao, setLoadingAcao] = useState(false);

  /* ── Filtro local ── */
  useEffect(() => {
    const t = busca.toLowerCase();
    setClientesFiltrados(
      clientes.filter(c =>
        c.nome.toLowerCase().includes(t) ||
        (c.nif && c.nif.toLowerCase().includes(t)) ||
        (c.email && c.email.toLowerCase().includes(t)) ||
        (c.telefone && c.telefone.includes(t)),
      ),
    );
  }, [busca, clientes]);

  /* ── Carregar ── */
  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data =
        filtroStatus === "todos" ? await clienteService.listarClientes(true) :
          filtroStatus === "ativos" ? await clienteService.listarClientesAtivos() :
            await clienteService.listarClientesInativos();
      setClientes(data);
      setClientesFiltrados(data);
    } catch {
      /* silencioso — utilizador vê lista vazia */
    } finally {
      setLoading(false);
    }
  }, [filtroStatus]);

  useEffect(() => { carregar(); }, [carregar]);

  /* ── Handlers de modal ── */
  const abrirCriar = () => { setSelecao(null); setModalForm(true); };
  const abrirEditar = (c: Cliente) => { setSelecao(c); setModalForm(true); };
  const abrirDetalhes = (c: Cliente) => { setSelecao(c); setModalDetalhes(true); };
  const abrirStatus = (c: Cliente) => { setSelecao(c); setModalStatus(true); };

  const fecharForm = () => { setModalForm(false); setSelecao(null); };
  const fecharDetalhes = () => { setModalDetalhes(false); setSelecao(null); };
  const fecharStatus = () => { setModalStatus(false); setSelecao(null); };

  /* ── Submeter formulário ── */
  const handleSubmit = async (dados: CriarClienteInput | AtualizarClienteInput) => {
    setLoadingAcao(true);
    try {
      if (selecao) await clienteService.atualizarCliente(selecao.id, dados as AtualizarClienteInput);
      else await clienteService.criarCliente(dados as CriarClienteInput);
      fecharForm();
      await carregar();
    } catch (err: any) {
      alert(err.response?.data?.message || "Erro ao guardar cliente");
    } finally {
      setLoadingAcao(false);
    }
  };

  /* ── Alterar status ── */
  const handleStatus = async () => {
    if (!selecao) return;
    setLoadingAcao(true);
    try {
      if (selecao.status === "ativo") await clienteService.inativarCliente(selecao.id);
      else await clienteService.ativarCliente(selecao.id);
      fecharStatus();
      await carregar();
    } catch (err: any) {
      alert(err.response?.data?.message || "Erro ao alterar status");
    } finally {
      setLoadingAcao(false);
    }
  };

  /* ── Estatísticas ── */
  const stats = [
    { icon: Users, label: "Total", value: clientes.length, color: colors.primary },
    { icon: CheckCircle, label: "Ativos", value: clientes.filter(c => c.status === "ativo").length, color: colors.success },
    { icon: XCircle, label: "Inativos", value: clientes.filter(c => c.status !== "ativo").length, color: colors.textSecondary },
    { icon: Building2, label: "Empresas", value: clientes.filter(c => c.tipo === "empresa").length, color: colors.secondary },
  ];

  return (
    <MainEmpresa>
      <div className="space-y-4 max-w-7xl mx-auto pb-6 transition-colors duration-300"
        style={{ backgroundColor: colors.background }}>

        {/* ── Cabeçalho ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: colors.primary }}>Clientes</h1>
            <p className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
              Gerencie os seus clientes e empresas
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Pesquisa */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textSecondary }} />
              <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Nome, NIF, email ou telefone…"
                className="w-full pl-9 pr-4 py-2 rounded-lg border outline-none text-sm"
                style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }} />
            </div>
            {/* Filtro status */}
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as any)}
              className="px-3 py-2 rounded-lg border outline-none text-sm"
              style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}>
              <option value="ativos">Apenas Ativos</option>
              <option value="inativos">Apenas Inativos</option>
              <option value="todos">Todos</option>
            </select>
            {/* Atualizar */}
            <button onClick={carregar}
              className="p-2 rounded-lg border transition-colors"
              style={{ borderColor: colors.border, color: colors.textSecondary, backgroundColor: colors.card }}
              title="Recarregar">
              <RefreshCw className="w-4 h-4" />
            </button>
            {/* Novo */}
            <button onClick={abrirCriar}
              className="flex items-center gap-1.5 px-4 py-2 text-white rounded-lg text-sm font-medium"
              style={{ backgroundColor: colors.secondary }}>
              <Plus className="w-4 h-4" />Novo Cliente
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        {loading ? <SkeletonStats colors={colors} /> : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="p-4 rounded-xl border"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}18` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xl font-bold leading-none" style={{ color: colors.text }}>{value}</p>
                    <p className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>{label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabela ── */}
        {loading ? <SkeletonTabela colors={colors} /> : clientes.length === 0 ? (
          <div className="rounded-xl border text-center py-14"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <Users className="w-14 h-14 mx-auto mb-3" style={{ color: colors.border }} />
            <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
              {filtroStatus === "ativos" ? "Nenhum cliente ativo encontrado." :
                filtroStatus === "inativos" ? "Nenhum cliente inativo encontrado." :
                  "Nenhum cliente encontrado."}
            </p>
            <button onClick={abrirCriar}
              className="px-4 py-2 text-white rounded-lg text-sm"
              style={{ backgroundColor: colors.primary }}>
              Cadastrar primeiro cliente
            </button>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden shadow-sm"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: colors.primary }}>
                    {["Cliente", "Tipo", "Status", "Contacto", "NIF", "Ações"].map((h, i) => (
                      <th key={h}
                        className={`py-3 px-5 font-semibold text-white text-xs uppercase tracking-wider ${i === 5 ? "text-center" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: colors.border }}>
                  {clientesFiltrados.map(c => {
                    const statusBadge = getStatusClienteBadge(c.status);
                    return (
                      <tr key={c.id} className="transition-colors"
                        style={{ backgroundColor: c.status === "inativo" ? `${colors.hover}80` : "transparent" }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.hover)}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = c.status === "inativo" ? `${colors.hover}80` : "transparent")}>

                        {/* Cliente */}
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: c.tipo === "empresa" ? `${colors.secondary}20` : colors.hover }}>
                              {c.tipo === "empresa"
                                ? <Building2 className="w-4 h-4" style={{ color: colors.secondary }} />
                                : <User className="w-4 h-4" style={{ color: colors.textSecondary }} />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate" style={{ color: colors.text }}>{c.nome}</div>
                              {c.email && <div className="text-xs truncate max-w-[160px]" style={{ color: colors.textSecondary }}>{c.email}</div>}
                            </div>
                          </div>
                        </td>

                        {/* Tipo */}
                        <td className="py-3 px-5">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: `${colors.primary}18`, color: colors.primary }}>
                            {getTipoClienteLabel(c.tipo)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: c.status === "ativo" ? `${colors.success}18` : `${colors.textSecondary}18`,
                              color: c.status === "ativo" ? colors.success : colors.textSecondary,
                            }}>
                            {c.status === "ativo"
                              ? <CheckCircle className="w-3 h-3" />
                              : <XCircle className="w-3 h-3" />}
                            {statusBadge.texto}
                          </span>
                        </td>

                        {/* Contacto */}
                        <td className="py-3 px-5">
                          {c.telefone
                            ? <div className="flex items-center gap-1.5 text-sm" style={{ color: colors.textSecondary }}>
                              <Phone className="w-3.5 h-3.5 flex-shrink-0" />{c.telefone}
                            </div>
                            : <span style={{ color: colors.textSecondary }}>—</span>}
                        </td>

                        {/* NIF */}
                        <td className="py-3 px-5 font-mono text-sm" style={{ color: colors.textSecondary }}>
                          {formatarNIF(c.nif) || "—"}
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-5">
                          <div className="flex items-center justify-center gap-1">
                            {[
                              { Icon: Eye, title: "Ver detalhes", fn: () => abrirDetalhes(c), color: colors.primary },
                              { Icon: Edit2, title: "Editar", fn: () => abrirEditar(c), color: colors.secondary },
                              {
                                Icon: Power, title: c.status === "ativo" ? "Inativar" : "Ativar",
                                fn: () => abrirStatus(c),
                                color: c.status === "ativo" ? colors.warning : colors.success
                              },
                            ].map(({ Icon, title, fn, color }) => (
                              <button key={title} onClick={fn}
                                className="p-2 rounded-lg transition-colors hover:opacity-70"
                                style={{ color }} title={title}>
                                <Icon className="w-4 h-4" />
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Sem resultados na pesquisa */}
              {clientesFiltrados.length === 0 && busca && (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 mx-auto mb-3" style={{ color: colors.border }} />
                  <p className="text-sm" style={{ color: colors.textSecondary }}>
                    Nenhum cliente encontrado para "{busca}"
                  </p>
                  <button onClick={() => setBusca("")} className="mt-2 text-sm underline"
                    style={{ color: colors.primary }}>
                    Limpar pesquisa
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Formulário ── */}
      <Modal isOpen={modalForm} onClose={fecharForm}
        title={selecao ? "Editar Cliente" : "Novo Cliente"}>
        <FormCliente cliente={selecao} onSubmit={handleSubmit} onCancel={fecharForm} loading={loadingAcao} />
      </Modal>

      {/* ── Modal Detalhes ── */}
      <Modal isOpen={modalDetalhes} onClose={fecharDetalhes} title="Detalhes do Cliente">
        {selecao && (
          <div className="space-y-5">
            {/* Avatar + nome */}
            <div className="flex items-center gap-4 pb-5 border-b" style={{ borderColor: colors.border }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${colors.secondary}20` }}>
                {selecao.tipo === "empresa"
                  ? <Building2 className="w-7 h-7" style={{ color: colors.secondary }} />
                  : <User className="w-7 h-7" style={{ color: colors.text }} />}
              </div>
              <div>
                <h4 className="text-lg font-semibold" style={{ color: colors.text }}>{selecao.nome}</h4>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${colors.primary}18`, color: colors.primary }}>
                    {getTipoClienteLabel(selecao.tipo)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: selecao.status === "ativo" ? `${colors.success}18` : `${colors.textSecondary}18`,
                      color: selecao.status === "ativo" ? colors.success : colors.textSecondary,
                    }}>
                    {selecao.status === "ativo" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {getStatusClienteLabel(selecao.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid de detalhes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { Icon: Phone, label: "Telefone", value: selecao.telefone || "—" },
                { Icon: Mail, label: "Email", value: selecao.email || "—" },
                { Icon: Calendar, label: "Data de Registo", value: new Date(selecao.data_registro).toLocaleDateString("pt-PT") },
                { Icon: Building2, label: "NIF", value: formatarNIF(selecao.nif) || "—" },
              ].map(({ Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 p-3 rounded-lg"
                  style={{ backgroundColor: colors.hover }}>
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.textSecondary }} />
                  <div>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>{label}</p>
                    <p className="text-sm font-medium mt-0.5" style={{ color: colors.text }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {selecao.endereco && (
              <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: colors.hover }}>
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.textSecondary }} />
                <div>
                  <p className="text-xs" style={{ color: colors.textSecondary }}>Endereço</p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: colors.text }}>{selecao.endereco}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => { fecharDetalhes(); abrirEditar(selecao); }}
                className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                style={{ backgroundColor: colors.primary }}>
                <Edit2 className="w-4 h-4" />Editar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal Alterar Status ── */}
      <ConfirmModal
        isOpen={modalStatus}
        onClose={fecharStatus}
        onConfirm={handleStatus}
        title={selecao?.status === "ativo" ? "Inativar Cliente" : "Ativar Cliente"}
        message={
          selecao?.status === "ativo"
            ? `Tem a certeza que deseja inativar "${selecao?.nome}"? Clientes inativos não podem realizar novas compras.`
            : `Tem a certeza que deseja ativar "${selecao?.nome}"? Clientes activos podem realizar compras normalmente.`
        }
        confirmText={selecao?.status === "ativo" ? "Inativar" : "Ativar"}
        type={selecao?.status === "ativo" ? "warning" : "info"}
        loading={loadingAcao}
      />
    </MainEmpresa>
  );
}