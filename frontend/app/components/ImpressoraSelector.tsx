"use client";

import { useEffect, useRef, useState } from "react";
import { Printer, Settings, ChevronDown, Check } from "lucide-react";
import { useThemeColors } from "@/context/ThemeContext";
import Cookies from "js-cookie";
import ImpressoraManagerModal from "./ImpressoraManagerModal";

type Impressora = {
  id: string;
  nome: string;
  queue: string;
  is_default: boolean;
  ativo: boolean;
};

type Props = {
  baseUrl: string;
  onChange?: (queue: string) => void;
};

function xsrf(): string {
  return decodeURIComponent(Cookies.get("XSRF-TOKEN") ?? "");
}

function tenantId(): string | null {
  return localStorage.getItem("tenant_id");
}

export default function ImpressoraSelector({ baseUrl, onChange }: Props) {
  const colors = useThemeColors();
  const [impressoras, setImpressoras] = useState<Impressora[]>([]);
  const [ativa, setAtiva] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function carregar() {
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
      if (j.success) {
        setImpressoras(j.data);
        // Preferência: sessão (atual) → default → primeira
        const sessao = j.atual as string | null;
        const def = j.data.find((i: Impressora) => i.is_default);
        setAtiva(sessao ?? def?.queue ?? j.data[0]?.queue ?? null);
      }
    } catch {
      /* silencioso */
    }
  }

  useEffect(() => {
    carregar();
  }, [baseUrl]);

  useEffect(() => {
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    if (aberto) {
      document.addEventListener("mousedown", fora);
      return () => document.removeEventListener("mousedown", fora);
    }
  }, [aberto]);

async function selecionar(queue: string) {
    setAtiva(queue);
    setAberto(false);
    // ⭐ Guarda para o FaturasPage ler imediatamente
    if (typeof window !== "undefined") {
        localStorage.setItem("impressora_queue_ativa", queue);
    }
    try {
        await fetch(`${baseUrl}/api/impressoras/selecionar`, {
            method: "POST",
            credentials: "include",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "X-XSRF-TOKEN": xsrf(),
                "X-Empresa-ID": tenantId() ?? "",
            },
            body: JSON.stringify({ queue }),
        });
        onChange?.(queue);
    } catch { /* silencioso */ }
}

  function setAberta(q: string) {
    setAtiva(q);
  }

  const atual = impressoras.find((i) => i.queue === ativa);

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setAberto((v) => !v)}
          className="flex items-center gap-2 rounded border px-3 py-2 text-sm"
          style={{ borderColor: colors.border, color: colors.text, backgroundColor: colors.card }}>
          <Printer size={16} style={{ color: colors.secondary }} />
          <span className="max-w-[160px] truncate">
            {atual ? atual.nome : "Sem impressora"}
          </span>
          <ChevronDown size={14} className={`transition-transform ${aberto ? "rotate-180" : ""}`} />
        </button>

        {aberto && (
          <div
            className="absolute right-0 z-40 mt-2 w-64 rounded shadow-lg"
            style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}>
            {impressoras.length === 0 ? (
              <p className="px-4 py-3 text-sm" style={{ color: colors.textSecondary }}>
                Nenhuma impressora configurada.
              </p>
            ) : (
              impressoras.map((imp) => (
                <button
                  key={imp.id}
                  onClick={() => selecionar(imp.queue)}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                  style={{ color: colors.text }}>
                  <div>
                    <div className="font-medium">{imp.nome}</div>
                    <div className="text-xs" style={{ color: colors.textSecondary }}>
                      {imp.queue}
                    </div>
                  </div>
                  {ativa === imp.queue && <Check size={16} style={{ color: colors.primary }} />}
                </button>
              ))
            )}
            <button
              onClick={() => {
                setAberto(false);
                setManagerOpen(true);
              }}
              className="flex w-full items-center gap-2 border-t px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{ borderColor: colors.border, color: colors.secondary }}>
              <Settings size={14} /> Gerir impressoras
            </button>
          </div>
        )}
      </div>

      <ImpressoraManagerModal
        isOpen={managerOpen}
        onClose={() => setManagerOpen(false)}
        baseUrl={baseUrl}
        onChange={async () => {
          await carregar();
          onChange?.(ativa ?? "");
        }}
      />
    </>
  );
}