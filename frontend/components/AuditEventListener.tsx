"use client";

import { useEffect } from "react";
import { getTenant, tenantApi } from "@/services/axios";

// Cache para evitar registos duplicados
const eventCache = new Map<string, number>();
const CACHE_DURATION_MS = 1000; // 1 segundo

async function sendAuditEvent(action: string, payload: Record<string, unknown>) {
  const tenantId = getTenant();
  if (!tenantId) return;

  // Criar chave única para o evento
  const cacheKey = `${action}:${JSON.stringify(payload)}`;
  const now = Date.now();

  // Verificar se evento semelhante foi registado há pouco
  if (eventCache.has(cacheKey)) {
    const lastTime = eventCache.get(cacheKey) || 0;
    if (now - lastTime < CACHE_DURATION_MS) {
      return; // Ignorar duplicata
    }
  }

  eventCache.set(cacheKey, now);

  try {
    await tenantApi.post(
      "/api/auditoria/eventos",
      {
        acao: action,
        detalhes: payload,
        emoji: "",
      },
      {
        withCredentials: true,
        headers: {
          "X-Empresa-ID": tenantId,
          "X-Tenant-ID": tenantId,
        },
      }
    );
  } catch {
    // Silenciar para não quebrar a experiência do utilizador
  }
}

function getLabel(target: HTMLElement): string {
  const labels = [
    target.getAttribute("data-audit-label"),
    target.getAttribute("data-action"),
    target.getAttribute("aria-label"),
    target.getAttribute("title"),
    target.getAttribute("placeholder"),
    target.getAttribute("value"),
    target.getAttribute("name"),
    target.id,
  ];

  for (const label of labels) {
    if (label && label.trim()) return label.trim();
  }

  const text = target.textContent?.replace(/\s+/g, " ").trim();
  if (text) return text.slice(0, 120);

  return target.tagName.toLowerCase();
}

export default function AuditEventListener() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-audit-ignore='true']")) return;

      const interactive = target.closest<HTMLElement>(
        "button, a, input, select, textarea, [role='button'], [role='link'], [data-audit-action]"
      );
      if (!interactive) return;

      const caminho = window.location.pathname + window.location.search;
      const elemento = getLabel(interactive);
      const tipo = interactive.tagName.toLowerCase();

      void sendAuditEvent("Elemento Clicado", {
        elemento,
        tipo,
        href: interactive instanceof HTMLAnchorElement ? interactive.href : null,
        id: interactive.id || null,
        classe: interactive.className || null,
        caminho,
      });
    };

    const handleSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement | null;
      if (!form) return;
      if (form.closest("[data-audit-ignore='true']")) return;

      const campos = Array.from(form.elements).filter(
        (element) => element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement
      ).length;

      void sendAuditEvent("Formulário Enviado", {
        formulario: form.id || form.getAttribute("name") || "formulario",
        caminho: window.location.pathname + window.location.search,
        campos,
      });
    };

    // Registar visualização de página (apenas uma vez por mudança de página)
    const currentPath = window.location.pathname + window.location.search;
    void sendAuditEvent("Página Visualizada", {
      caminho: currentPath,
      query: window.location.search,
    });

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, []);

  return null;
}
