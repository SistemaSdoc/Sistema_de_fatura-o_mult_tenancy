"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2, Star, Check, Loader2 } from "lucide-react";
import { useThemeColors } from "@/context/ThemeContext";
import Cookies from "js-cookie";

type Impressora = {
  id: string;
  nome: string;
  queue: string;
  tipo: string;
  is_default: boolean;
  ativo: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  baseUrl: string;
  onChange: () => void; // avisa o pai que a lista mudou
};

function xsrf(): string {
  return decodeURIComponent(Cookies.get("XSRF-TOKEN") ?? "");
}

function tenantId(): string | null {
  return localStorage.getItem("tenant_id");
}

export default function ImpressoraManagerModal({ isOpen, onClose, baseUrl, onChange }: Props) {
  const colors = useThemeColors();
  const [impressoras, setImpressoras] = useState<Impressora[]>([]);
  const [cups, setCups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [queue, setQueue] = useState("");
  const [tipo, setTipo] = useState<"cups" | "windows" | "usb">("cups");

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const r = await fetch(`${baseUrl}/api/impressoras`, {
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-XSRF-TOKEN": xsrf(),
          "X-Empresa-ID": tenantId() ?? "",
        },
      });
      const j = await r.json();
      if (j.success) setImpressoras(j.data);
    } catch {
      setErro("Falha ao carregar impressoras");
    } finally {
      setLoading(false);
    }
  }

  async function carregarCups() {
    try {
      const r = await fetch(`${baseUrl}/api/impressoras/cups`, {
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-XSRF-TOKEN": xsrf(),
          "X-Empresa-ID": tenantId() ?? "",
        },
      });
      const j = await r.json();
      if (j.success) setCups(j.data);
    } catch {
      /* silencioso */
    }
  }

  useEffect(() => {
    if (isOpen) {
      carregar();
      carregarCups();
    }
  }, [isOpen]);

  async function criar() {
    if (!nome.trim() || !queue.trim()) {
      setErro("Nome e queue são obrigatórios");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch(`${baseUrl}/api/impressoras`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": xsrf(),
          "X-Empresa-ID": tenantId() ?? "",
        },
        body: JSON.stringify({ nome, queue, tipo }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message ?? "Erro ao criar");
      setNome("");
      setQueue("");
      await carregar();
      onChange();
    } catch (e: any) {
      setErro(e.message ?? "Erro");
    } finally {
      setSalvando(false);
    }
  }

  async function definirDefault(id: string) {
    const anteriores = impressoras;

    // ⚡ Optimistic update — a UI muda no instante do clique
    setImpressoras((prev) =>
        prev.map((i) => ({ ...i, is_default: i.id === id }))
    );

    try {
      await fetch(`${baseUrl}/api/impressoras/${id}/default`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-XSRF-TOKEN": xsrf(),
          "X-Empresa-ID": tenantId() ?? "",
        },
      });
      await carregar();
      onChange();
    } catch {
      setErro("Erro ao definir default");
    }
  }


  async function apagar(id: string) {
    if (!confirm("Apagar esta impressora?")) return;
    try {
      await fetch(`${baseUrl}/api/impressoras/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-XSRF-TOKEN": xsrf(),
          "X-Empresa-ID": tenantId() ?? "",
        },
      });
      await carregar();
      onChange();
    } catch {
      setErro("Erro ao apagar");
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-2xl rounded-lg border shadow-xl"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: `0.5px solid ${colors.border}` }}>
          <h2 className="text-lg font-bold" style={{ color: colors.text }}>
            Gerir impressoras
          </h2>
          <button onClick={onClose} style={{ color: colors.text }}>
            <X size={20} />
          </button>
        </div>

        {/* Corpo */}
        <div className="space-y-4 p-5">
          {erro && (
            <div className="rounded border px-3 py-2 text-sm" style={{ borderColor: colors.danger, color: colors.danger }}>
              {erro}
            </div>
          )}

          {/* Lista */}
          <div>
            <p className="mb-2 text-sm font-medium" style={{ color: colors.text }}>
              Impressoras configuradas
            </p>
            {loading ? (
              <div className="flex items-center gap-2 py-3 text-sm" style={{ color: colors.textSecondary }}>
                <Loader2 className="animate-spin" size={16} /> A carregar…
              </div>
            ) : impressoras.length === 0 ? (
              <p className="py-3 text-sm" style={{ color: colors.textSecondary }}>
                Nenhuma impressora configurada. Adiciona a primeira abaixo.
              </p>
            ) : (
              <ul className="divide-y" style={{ borderColor: colors.border }}>
                {impressoras.map((imp) => (
                  <li key={imp.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium" style={{ color: colors.text }}>{imp.nome}</span>
                        {imp.is_default && (
                          <span
                            className="rounded px-2 py-0.5 text-xs font-semibold text-white"
                            style={{ backgroundColor: colors.primary }}>
                            default
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: colors.textSecondary }}>
                        {imp.queue} · {imp.tipo}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!imp.is_default && (
                        <button
                          onClick={() => definirDefault(imp.id)}
                          title="Definir como default"
                          style={{ color: colors.primary }}>
                          <Star size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => apagar(imp.id)}
                        title="Apagar"
                        style={{ color: colors.danger }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Form */}
          <div
            className="space-y-3 rounded border p-3"
            style={{ borderColor: colors.border }}>
            <p className="text-sm font-medium" style={{ color: colors.text }}>
              Adicionar impressora
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome (ex.: Epson Caixa 1)"
                className="rounded border px-3 py-2 text-sm"
                style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
              />
              <select
                value={queue}
                onChange={(e) => setQueue(e.target.value)}
                className="rounded border px-3 py-2 text-sm"
                style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}>
                <option value="">— Escolher queue CUPS —</option>
                {cups.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
                {cups.length === 0 && (
                  <option value="">(nenhuma fila CUPS encontrada)</option>
                )}
              </select>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as any)}
                className="rounded border px-3 py-2 text-sm"
                style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}>
                <option value="cups">CUPS</option>
                <option value="usb">USB direto</option>
                <option value="windows">Windows</option>
              </select>
            </div>
            <button
              onClick={criar}
              disabled={salvando || !nome.trim() || !queue.trim()}
              className="flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: colors.primary }}>
              {salvando ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Adicionar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}